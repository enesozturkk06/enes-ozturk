"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * hooks/useKediVoice.ts — Kedi AI'nin sesli konuşma altyapısı (Web Speech API,
 * tamamen ücretsiz/tarayıcı-yerli). BlackCatAI.tsx (öğrenci) ve AdminKediAI.tsx
 * (admin) daha önce bu mantığı ayrı ayrı kopyalamıştı — artık tek gerçek kaynak.
 *
 * Kapsam bilinçli olarak sınırlı: `speechSynthesis` bir kara kutu, ham ses
 * dalgasına erişim yok — bu yüzden gerçek fonem-bazlı lip sync mümkün değil.
 * Chrome'da `onboundary` kelime olayları güvenilir şekilde ateşlenir (`onMouthPulse`
 * bunu kullanır); Firefox/Safari'de bu event hiç ateşlenmeyebilir — çağıran
 * taraf (KediAvatar) bu durumda kendi doğal/rastgele döngüsüne zarifçe düşer.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

export interface UseKediVoiceOptions {
  /** localStorage anahtarı — mevcut tercihler kaybolmasın diye her yüzeyin kendi anahtarı olmalı. */
  storageKey: string;
  /** Ses tanıma ara sonuç (henüz kesin değil) geldikçe çağrılır — genelde input kutusuna yansıtmak için. */
  onInterimTranscript?: (text: string) => void;
  /** Ses tanıma KESİN sonucu geldiğinde çağrılır (mesaj gönderilecek an). */
  onFinalTranscript: (text: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  /** TTS konuşurken kelime sınırında (Chrome) tetiklenir — avatarın ağzını senkronlamak için. */
  onMouthPulse?: () => void;
}

export interface UseKediVoice {
  listening: boolean;
  speechSupported: boolean;
  voiceError: string | null;
  voiceOut: boolean;
  toggleListening: () => void;
  toggleVoiceOut: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":   "Mikrofon izni reddedildi. Tarayıcı ayarlarından izin vermen gerekiyor.",
  "no-speech":     "Ses algılanamadı, tekrar dener misin?",
  "audio-capture": "Mikrofon bulunamadı.",
  "network":       "Ses tanıma için internet bağlantısı gerekiyor.",
};

export function useKediVoice(opts: UseKediVoiceOptions): UseKediVoice {
  const { storageKey } = opts;
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceOut, setVoiceOut] = useState(false);

  const recognitionRef = useRef<AnyRecognition>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  // Callback'lerin en güncel halini tutar — toggleListening/speak'in her
  // render'da yeniden oluşmasını gerektirmeden en son opts'a erişebilsinler.
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSpeechSupported(!!(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    ));
    setVoiceOut(localStorage.getItem(storageKey) === "1");

    const loadVoices = () => { voicesRef.current = window.speechSynthesis?.getVoices() ?? []; };
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, [storageKey]);

  /** En "doğal" duran tr-TR sesini seçmeye çalışır — sonuç OS/tarayıcıya göre değişir, garanti edilemez. */
  const pickTurkishVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current.length > 0 ? voicesRef.current : (window.speechSynthesis?.getVoices() ?? []);
    const tr = voices.filter(v => v.lang?.toLowerCase().startsWith("tr"));
    if (tr.length === 0) return null;
    const priority = ["google", "natural", "online", "yelda", "filiz"];
    for (const key of priority) {
      const match = tr.find(v => v.name.toLowerCase().includes(key));
      if (match) return match;
    }
    return tr[0];
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    if (typeof window === "undefined") return;
    const SR = (
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    ) as AnyRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "tr-TR";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => { setListening(true); setVoiceError(null); };
    recognition.onerror = (e: AnyRecognition) => {
      setListening(false);
      setVoiceError(ERROR_MESSAGES[e?.error] ?? "Ses tanıma başarısız oldu, yazarak devam edebilirsin.");
      setTimeout(() => setVoiceError(null), 4500);
    };
    recognition.onend = () => setListening(false);

    recognition.onresult = (event: AnyRecognition) => {
      const transcript = Array.from(event.results as AnyRecognition[])
        .map((r: AnyRecognition) => r[0].transcript)
        .join("");
      optsRef.current.onInterimTranscript?.(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        setListening(false);
        optsRef.current.onFinalTranscript(transcript);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch {
      setListening(false);
      setVoiceError("Mikrofon başlatılamadı, yazarak devam edebilirsin.");
      setTimeout(() => setVoiceError(null), 4500);
    }
  }, [listening]);

  const toggleVoiceOut = useCallback(() => {
    setVoiceOut(v => {
      const next = !v;
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, next ? "1" : "0");
        if (!next) window.speechSynthesis?.cancel();
      }
      return next;
    });
  }, [storageKey]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const clean = text.replace(/\*\*/g, "").replace(/[#_~`]/g, "").replace(/\n+/g, ". ");
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "tr-TR";
      u.rate = 1.02;
      const voice = pickTurkishVoice();
      if (voice) u.voice = voice;
      u.onstart = () => optsRef.current.onSpeechStart?.();
      u.onend = () => optsRef.current.onSpeechEnd?.();
      u.onerror = () => optsRef.current.onSpeechEnd?.();
      // Kelime sınırı — Chrome'da güvenilir ateşlenir, Firefox/Safari'de hiç
      // ateşlenmeyebilir. Ateşlenmezse avatar kendi doğal döngüsüne düşer.
      u.onboundary = (event: AnyRecognition) => {
        if (event.name === "word" || event.name === undefined) {
          optsRef.current.onMouthPulse?.();
        }
      };
      window.speechSynthesis.speak(u);
    } catch { optsRef.current.onSpeechEnd?.(); }
  }, [pickTurkishVoice]);

  return { listening, speechSupported, voiceError, voiceOut, toggleListening, toggleVoiceOut, speak, stopSpeaking };
}
