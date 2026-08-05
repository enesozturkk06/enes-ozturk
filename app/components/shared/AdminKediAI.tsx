"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ChevronDown, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { getKediMessages } from "@/lib/db";
import KediAvatar, { type KediAvatarState, type KediMood } from "./KediAvatar";
import KediBriefToast from "./KediBriefToast";
import { useKediVoice } from "@/hooks/useKediVoice";

interface Msg { id: string; role: "ai" | "user"; text: string; ts: number }

const KEDI_MOOD_DELIM = " KEDI_MOOD::";
const QUICK_QUESTIONS = [
  "Bu hafta hangi öğrencilere ağırlık vermeliyim?",
  "Bu ay ne kadar kazanırım?",
  "Gelirimi nasıl artırırım?",
  "Riskli öğrenciler kimler?",
];

function MsgBubble({ msg, mouthPulseKey }: { msg: Msg; mouthPulseKey: number }) {
  const parsed = msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: "#C4B5FD" }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );

  if (msg.role === "ai") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, x: -8, scale: 0.96, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="flex gap-2.5 items-end"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)" }}>
          <KediAvatar size={20} mouthPulseKey={mouthPulseKey} />
        </div>
        <div className="glass px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap max-w-[85%]"
          style={{ color: "rgba(255,255,255,0.88)", fontFamily: "var(--font-label)", borderRadius: "0 14px 14px 14px" }}>
          {parsed}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, x: 8, scale: 0.96, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="flex justify-end"
    >
      <div className="glass px-3.5 py-2.5 text-sm leading-relaxed"
        style={{ color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-label)", borderRadius: "14px 0 14px 14px" }}>
        {msg.text}
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
      className="flex items-end gap-2.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)" }}>
        <KediAvatar size={20} state="thinking" />
      </div>
      <div className="glass px-4 py-3 flex items-center gap-1" style={{ borderRadius: "0 14px 14px 14px" }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-violet)" }}
            animate={{ y: [0, -4, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Kedi AI Ultra — Admin (antrenör) sohbet paneli. BlackCatAI'nin (öğrenci)
 * mimarisiyle aynı /api/kedi-ai/chat uç noktasını, actorType="admin" ile
 * kullanır. Öğrenciye özel görev/XP/hediye-ders yan etkileri burada yok —
 * bu bileşen salt sohbet arayüzü. Ses altyapısı hooks/useKediVoice.ts'ten
 * paylaşılır (BlackCatAI ile aynı — artık kopyalanmıyor).
 */
export default function AdminKediAI() {
  const [open, setOpen] = useState(false);
  const [minimized, setMin] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [avatarState, setAvatarState] = useState<KediAvatarState>("idle");
  const [mood, setMood] = useState<KediMood>(null);
  /* Kelime-senkronlu ağız vuruşu — her arttığında KediAvatar kısa bir vurgu ekler */
  const [mouthPulseKey, setMouthPulseKey] = useState(0);
  /* Proaktif günlük özet — girişte, panel kapalıyken bile, günde en fazla 1 kez */
  const [brief, setBrief] = useState<{ text: string; mood: KediMood } | null>(null);
  const briefTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendMessageRef = useRef<(text?: string) => void>(() => {});

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const voice = useKediVoice({
    storageKey: "kedi_ai_admin_voice_out",
    onInterimTranscript: setInput,
    onFinalTranscript: (transcript) => {
      const trimmed = transcript.trim();
      if (trimmed) sendMessageRef.current?.(trimmed);
    },
    onSpeechStart: () => setAvatarState("speaking"),
    onSpeechEnd: () => setAvatarState("idle"),
    onMouthPulse: () => setMouthPulseKey(k => k + 1),
  });

  useEffect(() => {
    if (voice.listening) setAvatarState("listening");
    else setAvatarState(s => s === "listening" ? "idle" : s);
  }, [voice.listening]);

  useEffect(() => {
    const h = () => { setOpen(true); setMin(false); };
    window.addEventListener("kedi-admin-open", h);
    return () => window.removeEventListener("kedi-admin-open", h);
  }, []);

  /* Proaktif günlük özet — panel kapalıyken bile, admin panele girişte günde
     en fazla 1 kez. Model kendi karar verir; gerçekten önemli bir şey yoksa
     hiçbir şey göstermez. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const gateKey = "kedi_ai_admin_brief_date";
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(gateKey) === today) return;
    localStorage.setItem(gateKey, today);

    fetch("/api/kedi-ai/brief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actorType: "admin" }),
    })
      .then(res => res.json())
      .then((data: { brief: string | null; mood?: string }) => {
        if (!data.brief) return;
        const briefMood = (data.mood as KediMood) ?? null;
        setBrief({ text: data.brief, mood: briefMood });
        if (briefMood) setMood(briefMood);
        setMsgs(prev => [...prev, { id: `brief-${Date.now()}`, role: "ai", text: data.brief!, ts: Date.now() }]);
        briefTimerRef.current = setTimeout(() => setBrief(null), 16000);
      })
      .catch(() => {});

    return () => { if (briefTimerRef.current) clearTimeout(briefTimerRef.current); };
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);
  useEffect(() => { if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 200); }, [open, minimized]);

  const sendMessage = useCallback((overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    const userMsg: Msg = { id: Date.now().toString(), role: "user", text, ts: Date.now() };
    const aiMsgId = (Date.now() + 1).toString();
    setMsgs(prev => [...prev, userMsg, { id: aiMsgId, role: "ai", text: "", ts: Date.now() }]);
    setInput("");
    setTyping(true);
    setAvatarState("thinking");

    (async () => {
      try {
        const res = await fetch("/api/kedi-ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ actorType: "admin", message: text }),
        });
        if (!res.ok || !res.body) throw new Error("Kedi AI yanıt veremedi");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        let firstChunk = true;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          raw += decoder.decode(value, { stream: true });
          if (firstChunk) { setTyping(false); firstChunk = false; }
          const display = raw.split(KEDI_MOOD_DELIM)[0];
          setMsgs(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: display } : m));
        }

        const [finalText, moodPart] = raw.split(KEDI_MOOD_DELIM);
        const finalMood = (moodPart?.trim() as KediMood) || null;
        const cleanText = finalText.trim();
        setMsgs(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: cleanText } : m));
        if (finalMood) setMood(finalMood);
        setTyping(false);
        if (voice.voiceOut) voice.speak(cleanText);
        else setAvatarState("idle");
      } catch {
        setMsgs(prev => prev.map(m => m.id === aiMsgId
          ? { ...m, text: "Kedi şu an düşüncelerini toparlayamadı, birazdan tekrar dener misin? 🐈" }
          : m));
        setTyping(false);
        setAvatarState("idle");
      }
    })();
  }, [input, voice]);

  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  /* Kalıcı hafıza yükle; hiç geçmiş yoksa Kedi'nin kendisi proaktif bir
     günlük özetle karşılasın (madde 12 — "Hoş geldin ... bugün 5 dersin var...") */
  useEffect(() => {
    if (!open || historyLoaded) return;
    getKediMessages("admin")
      .then(history => {
        if (history.length > 0) {
          setMsgs(history.map(m => ({
            id: m.id, role: m.role === "assistant" ? "ai" : "user",
            text: m.content, ts: new Date(m.createdAt).getTime(),
          })));
          const lastMood = [...history].reverse().find(m => m.mood)?.mood;
          if (lastMood) setMood(lastMood as KediMood);
        } else {
          sendMessageRef.current?.("Bana bugünkü kısa bir özetle karşılama yap.");
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, [open, historyLoaded]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      <AnimatePresence>
        {brief && !open && (
          <KediBriefToast
            text={brief.text}
            mood={brief.mood}
            onOpen={() => { setOpen(true); setMin(false); setBrief(null); }}
            onDismiss={() => setBrief(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 sm:hidden"
            style={{ zIndex: 54, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 24, scale: 0.96, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed flex flex-col glass-strong rounded-2xl left-2 right-2 bottom-4 h-[70dvh] max-h-[70dvh] sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px]"
            style={{ zIndex: 55 }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px] flex-shrink-0 gradient-animated gradient-violet-pink-orange rounded-t-2xl" />

            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
              <div className="flex items-center gap-2.5">
                <div className="relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  {/* Sinematik giriş — panel açılınca bir kerelik ışık patlaması */}
                  <motion.div
                    aria-hidden
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(196,181,253,0.9) 0%, transparent 70%)" }}
                    initial={{ opacity: 0.9, scale: 0.3 }}
                    animate={{ opacity: 0, scale: 2.2 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                  />
                  <KediAvatar size={24} state={avatarState} mood={mood} mouthPulseKey={mouthPulseKey} />
                </div>
                <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
                  <div className="text-sm font-semibold tracking-wider"
                    style={{ color: "#C4B5FD", fontFamily: "var(--font-display)", letterSpacing: "0.12em" }}>
                    KEDİ AI
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
                      Antrenör Danışmanın
                    </span>
                  </div>
                </motion.div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={voice.toggleVoiceOut}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
                  style={{ color: voice.voiceOut ? "#A78BFA" : "rgba(255,255,255,0.3)" }}
                  title={voice.voiceOut ? "Sesli oku: Açık" : "Sesli oku: Kapalı"} aria-label="Sesli oku aç/kapat">
                  {voice.voiceOut ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                <button onClick={() => setMin(m => !m)}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
                  style={{ color: "rgba(255,255,255,0.3)" }} aria-label="Küçült">
                  <ChevronDown size={15} style={{ transform: minimized ? "rotate(180deg)" : "none" }} />
                </button>
                <button onClick={() => setOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-white/5"
                  style={{ color: "rgba(255,255,255,0.3)" }} aria-label="Kapat">
                  <X size={15} />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                  style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                  <AnimatePresence initial={false}>
                    {msgs.map(m => <MsgBubble key={m.id} msg={m} mouthPulseKey={mouthPulseKey} />)}
                    {typing && <TypingIndicator key="typing" />}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </div>

                {msgs.length <= 1 && (
                  <div className="flex-shrink-0 px-4 pb-2 flex gap-2 flex-wrap">
                    {QUICK_QUESTIONS.map(q => (
                      <button key={q} onClick={() => sendMessage(q)}
                        className="glass text-[10px] px-2.5 py-1.5 rounded-lg transition-transform duration-200 hover:scale-[1.04] active:scale-95"
                        style={{ fontFamily: "var(--font-label)", color: "#A78BFA" }}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {voice.voiceError && (
                  <div className="flex-shrink-0 px-4 pb-1.5 text-[11px]" style={{ color: "var(--color-error)", fontFamily: "var(--font-label)" }}>
                    ⚠️ {voice.voiceError}
                  </div>
                )}

                <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3"
                  style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
                  {voice.speechSupported && (
                    <button onClick={voice.toggleListening}
                      className="glass w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0"
                      title={voice.listening ? "Dinleniyor — durdurmak için tıkla" : "Sesli komut"}
                      style={{
                        background: voice.listening ? "rgba(239,68,68,0.2)" : undefined,
                        borderColor: voice.listening ? "rgba(239,68,68,0.5)" : undefined,
                        color: voice.listening ? "var(--color-error)" : "rgba(255,255,255,0.3)",
                        animation: voice.listening ? "glowPulse 1s ease-in-out infinite" : "none",
                      }}
                      aria-label={voice.listening ? "Dinlemeyi durdur" : "Sesli komut başlat"}>
                      {voice.listening ? <MicOff size={13} /> : <Mic size={13} />}
                    </button>
                  )}
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={voice.listening ? "Dinleniyor…" : "Öğrenciler, gelir, strateji sor…"}
                    className="glass flex-1 outline-none text-sm text-white placeholder-white/20 px-3.5 py-2 rounded-full"
                    style={{ fontFamily: "var(--font-label)" }}
                  />
                  <button onClick={() => sendMessage()} disabled={!input.trim() || typing}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-transform duration-200 flex-shrink-0 hover:scale-105 active:scale-95 ${input.trim() && !typing ? "gradient-animated gradient-fast gradient-violet-pink-orange" : "glass"}`}
                    style={{ color: input.trim() && !typing ? "#fff" : "rgba(255,255,255,0.2)" }}
                    aria-label="Gönder">
                    <Send size={14} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </>
  );
}
