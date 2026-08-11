"use client";

/**
 * app/ogrenci/kedi-ai/page.tsx — Kedi AI'nin tam ekran premium deneyimi.
 *
 * Mevcut floating BlackCatAI.tsx sohbet widget'ının YERİNE GEÇMEZ — o,
 * mevcut mantığıyla (Smart Notification Center, proaktif brief, her sayfada
 * açılabilme) AYNEN çalışmaya devam eder (bkz. app/ogrenci/layout.tsx, bu
 * sayfada da mount edilir). Bu sayfa AYRI, isteğe bağlı bir "Kedi AI'nin evi"
 * — aynı backend'i (/api/kedi-ai/chat, aynı sohbet geçmişi) paylaşır ama
 * kendi büyük 3D/2D karakter sahnesiyle.
 *
 * İKİNCİ CANVAS RİSKİNDEN KAÇINMA: Bu AYRI BİR ROUTE (floating overlay değil)
 * — Next.js App Router bir sayfadan diğerine geçişte önceki sayfayı
 * UNMOUNT eder, yani buraya gelindiğinde Dashboard/Fight Card/Randevu/Sağlık/
 * Avatar sayfasının kendi AvatarEngine3D'si zaten unmount olmuş olur. Bu
 * sayfanın kendi 3D alanı da (KediMascotStage → LazyAvatarEngine3D) şu an
 * PENDING_ARTIST_DELIVERY olduğu için hiç mount edilmiyor (bkz.
 * KediMascotStage.tsx) — yani bugün itibarıyla EK bir WebGL canvas'ı bile
 * yok, sadece mevcut 2D KediAvatar. Gerçek GLB geldiğinde bile, bu sayfa
 * kendi route'unda olduğu için aynı anda ikinci bir öğrenci-avatarı
 * canvas'ıyla asla çakışmaz.
 *
 * sendMessage/stream mantığı BlackCatAI.tsx'teki AYNI mantığın bilinçli bir
 * KOPYASI (BİRLEŞTİRİLMEDİ) — zaten çalışan/test edilmiş widget'a dokunma
 * riskini almamak için küçük, gerekçeli bir tekrar (bkz. proje raporundaki not).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentXPAdjustments, getKediMessages,
} from "@/lib/db";
import { computeFullXP, getCurrentSeason, sumManualXP } from "@/lib/xp";
import { useKediVoice } from "@/hooks/useKediVoice";
import KediMascotStage from "@/app/components/kedi-ai-screen/KediMascotStage";
import SportDecor from "@/app/components/shared/SportDecor";
import {
  KEDI_MASCOT_IDLE_STATE, KEDI_MASCOT_ACTION_FALLBACK_MS,
  type KediMascotState, type KediMascotActivity, type KediMascotAction,
} from "@/lib/kediMascotState";
import { Mic, MicOff, Send, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { KEDI_NAV_ACTIONS } from "@/lib/kediNavActions";

interface Msg { id: string; role: "ai" | "user"; text: string; ts: number; links?: { label: string; href: string }[] }

const KEDI_MOOD_DELIM = " KEDI_MOOD::";
const KEDI_NAV_DELIM = " KEDI_NAV::";

const QUICK_CHIPS = [
  { icon: "📅", label: "Bugünkü Dersim", q: "Bugün dersim var mı, ne zaman?" },
  { icon: "🎯", label: "Kaç Dersim Kaldı?", q: "Kaç dersim kaldı?" },
  { icon: "🥊", label: "Antrenman Planı", q: "Bugün ne çalışayım?" },
  { icon: "📊", label: "İlerlememi Analiz Et", q: "Son 10 dersimde nasıl gelişmişim?" },
  { icon: "📆", label: "Randevularım", q: "Randevularımı göster." },
  { icon: "⚡", label: "Seviye Durumum", q: "Seviye durumum ne, level atlamak için ne yapmalıyım?" },
];

/** Öğrencinin ömür boyu seviyesi değişti mi — Smart Notification
 * Center'daki (BlackCatAI.tsx) `lastLevelId` mantığıyla AYNI desen
 * (bootstrap'ta sessizce kaydet, SONRA değişirse tetikle), ama BİLEREK AYRI
 * bir localStorage anahtarı kullanır — bu sayfa ile floating panel'in
 * "görülmüş" durumu birbirine KARIŞMASIN diye. Yeni DB sorgusu YOK — aynı
 * appointments/records/xpAdjustments zaten bu sayfada da yükleniyor. */
function levelUpKey(studentId: string) { return `kedi_ai_screen_last_level_${studentId}`; }

export default function KediAiScreenPage() {
  const { student } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  /* PERF (Faz 3/4): BlackCatAI.tsx'teki AYNI DOM-sınırlama deseni — bkz. o
     dosyadaki ayrıntılı yorum. `msgs` (veri/DB geçmişi) DEĞİŞMEDİ, sadece
     ekrana basılan pencere sınırlandı. AI context sunucu tarafında ayrı bir
     DB sorgusuyla kuruluyor, client state'e bağlı değil. */
  const [visibleCount, setVisibleCount] = useState(20);
  const visibleMsgs = useMemo(
    () => (msgs.length > visibleCount ? msgs.slice(-visibleCount) : msgs),
    [msgs, visibleCount]
  );
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [kediState, setKediState] = useState<KediMascotState>(KEDI_MASCOT_IDLE_STATE);

  const actionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessageRef = useRef<(text?: string) => void>(() => {});

  const setActivity = useCallback((activity: KediMascotActivity) => {
    setKediState(s => ({ ...s, activity }));
  }, []);

  /** TEK SEFERLİK bir action tetikler (success/levelUp), verilen süre sonunda
   * otomatik idle'a döner — gerçek GLB gelince bu geri dönüş yerini
   * AvatarEngine3D'nin kendi `onActionEnd` callback'ine (clip süresine göre)
   * bırakacak; asset yokken sabit bir süreyle simüle ediliyor (bkz.
   * lib/kediMascotState.ts KEDI_MASCOT_ACTION_FALLBACK_MS). */
  const fireAction = useCallback((action: KediMascotAction) => {
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    setKediState(s => ({ ...s, action }));
    actionTimerRef.current = setTimeout(() => {
      setKediState(s => ({ ...s, action: null, activity: "idle" }));
    }, KEDI_MASCOT_ACTION_FALLBACK_MS);
  }, []);

  useEffect(() => () => { if (actionTimerRef.current) clearTimeout(actionTimerRef.current); }, []);

  const voice = useKediVoice({
    storageKey: "kedi_ai_screen_voice_out",
    onInterimTranscript: setInput,
    onFinalTranscript: (text) => { if (text.trim()) sendMessageRef.current?.(text.trim()); },
    onSpeechStart: () => setActivity("speaking"),
    onSpeechEnd: () => setActivity("idle"),
  });

  /* Dinleme durumunu mascot durumuna yansıt — BlackCatAI.tsx'teki AYNI desen. */
  useEffect(() => {
    if (voice.listening) setActivity("listening");
    else setKediState(s => (s.activity === "listening" ? { ...s, activity: "idle" } : s));
  }, [voice.listening, setActivity]);

  /* Kalıcı sohbet geçmişi — BlackCatAI ile AYNI kaynak (getKediMessages),
   * yani floating panelde başlanan bir konuşma burada da görünür. */
  useEffect(() => {
    if (!student || historyLoaded) return;
    getKediMessages("student", student.id)
      .then(history => {
        setMsgs(history.map(m => ({
          id: m.id, role: m.role === "assistant" ? "ai" : "user",
          text: m.content, ts: new Date(m.createdAt).getTime(),
        })));
      })
      .catch(() => {})
      .finally(() => setHistoryLoaded(true));
  }, [student, historyLoaded]);

  /* Seviye atlama tespiti — mevcut XP hesaplama fonksiyonları, YENİ sorgu
   * yok (appointments/records/xpAdjustments zaten bu sayfanın kendi ihtiyacı
   * için çekiliyor). Bootstrap'ta sessizce kaydeder, sonraki bir ziyarette
   * seviye GERÇEKTEN değiştiyse kısa bir levelUp action'ı tetikler. */
  useEffect(() => {
    if (!student) return;
    let cancelled = false;
    Promise.all([
      getStudentAppointments(student.id).catch(() => []),
      getLessonRecords(student.id).catch(() => []),
      getStudentXPAdjustments(student.id).catch(() => []),
    ]).then(([apts, recs, xpAdjustments]) => {
      if (cancelled) return;
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      const summary = computeFullXP(student.completedLessons, apts, sorted, getCurrentSeason(), xpAdjustments);
      void sumManualXP(xpAdjustments); // mevcut fonksiyon imzasıyla tutarlılık, ekstra veri üretmiyor
      const currentLevelId = summary.lifetimeResult.level.current.id;
      const key = levelUpKey(student.id);
      const prevLevelId = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      if (typeof window !== "undefined") localStorage.setItem(key, currentLevelId);
      if (prevLevelId && prevLevelId !== currentLevelId) fireAction("levelUp");
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [student, fireAction]);

  /* Scroll */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const sendMessage = useCallback((overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || !student) return;
    const userMsg: Msg = { id: Date.now().toString(), role: "user", text, ts: Date.now() };
    const aiMsgId = (Date.now() + 1).toString();
    setMsgs(prev => [...prev, userMsg, { id: aiMsgId, role: "ai", text: "", ts: Date.now() }]);
    setInput("");
    setTyping(true);
    setActivity("thinking");

    (async () => {
      try {
        const res = await fetch("/api/kedi-ai/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ actorType: "student", studentId: student.id, message: text }),
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
          if (firstChunk) { setTyping(false); setActivity("speaking"); firstChunk = false; }
          const display = raw.split(KEDI_MOOD_DELIM)[0].split(KEDI_NAV_DELIM)[0];
          setMsgs(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: display } : m));
        }

        const [beforeMood] = raw.split(KEDI_MOOD_DELIM);
        const [finalText, navKey] = beforeMood.split(KEDI_NAV_DELIM);
        const cleanText = finalText.trim();
        const navAction = navKey?.trim() ? KEDI_NAV_ACTIONS[navKey.trim()] : undefined;
        const links = navAction ? [{ label: navAction.label, href: navAction.href }] : undefined;
        setMsgs(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: cleanText, links } : m));
        setTyping(false);
        if (voice.voiceOut) voice.speak(cleanText);
        else setActivity("idle");
      } catch {
        setMsgs(prev => prev.map(m => m.id === aiMsgId
          ? { ...m, text: "Kedi şu an düşüncelerini toparlayamadı, birazdan tekrar dener misin? 🐈" }
          : m));
        setTyping(false);
        setActivity("idle");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, student, voice.voiceOut]);

  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!student) return null;

  const lastAiMsg = [...msgs].reverse().find(m => m.role === "ai" && m.text);

  return (
    <div className="relative max-w-4xl mx-auto flex flex-col" style={{ minHeight: "calc(100dvh - 200px)" }}>
      <SportDecor />

      {/* Başlık */}
      <div className="relative z-10 flex items-center justify-between mb-3">
        <div>
          <div className="text-xl font-semibold tracking-wider" style={{ color: "#38BDF8", fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>
            KEDİ AI
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
              Dijital Antrenör Aktif
            </span>
          </div>
        </div>
        <button
          onClick={voice.toggleVoiceOut}
          className="w-9 h-9 flex items-center justify-center rounded-full glass"
          style={{ color: voice.voiceOut ? "#38BDF8" : "rgba(255,255,255,0.3)" }}
          title={voice.voiceOut ? "Sesli oku: Açık" : "Sesli oku: Kapalı"}
          aria-label="Sesli oku aç/kapat"
        >
          {voice.voiceOut ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* Karakter sahnesi */}
      <div className="relative z-10 kedi-panel-glass rounded-3xl flex-shrink-0" style={{ height: "min(46vh, 380px)", minHeight: 260 }}>
        <KediMascotStage state={kediState} caption={typing ? null : lastAiMsg?.text} />
      </div>

      {/* Sohbet günlüğü — karakterin ÜZERİNE binmez, ayrı bir bölüm */}
      {/* BUG FIX (V8 Live QA'da kanıtlandı): mobilde bu panelin alt sınırındaki
          Gönder butonu, global WhatsAppButton.tsx'in sabit `bottom: env(safe-area)+80px`
          konumuyla ÇAKIŞIYORDU (getBoundingClientRect ile doğrulandı — iki
          buton aynı 52px'lik alanda üst üste biniyordu). WhatsAppButton.tsx
          TÜM sayfalarda paylaşılan global bir component, oraya dokunmak riskli
          — bunun yerine SADECE bu sayfada, sadece mobilde (lg:mb-0 ile
          masaüstünde sıfırlanır) panelin altına WhatsApp butonunun rezerve
          alanını (52px + 80px + safe-area) net şekilde temizleyecek bir
          alt boşluk eklendi. */}
      <div className="relative z-10 mt-3 mb-24 lg:mb-0 flex-1 min-h-0 flex flex-col kedi-panel-glass rounded-2xl overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ maxHeight: 260 }}>
          {msgs.length === 0 && !typing && (
            <div className="text-center text-[12px] py-6" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-label)" }}>
              Kedi AI ile konuşmaya başla — yazabilir ya da mikrofonu kullanabilirsin.
            </div>
          )}
          {msgs.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(c => c + 20)}
              className="kedi-chip-glass w-full text-[11px] py-2 rounded-lg text-center transition-colors"
              style={{ fontFamily: "var(--font-label)", color: "rgba(56,189,248,0.75)" }}
            >
              ↑ Önceki mesajları göster ({msgs.length - visibleCount} daha)
            </button>
          )}
          {visibleMsgs.map(m => (
            <div key={m.id} className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={m.role === "ai" ? "kedi-msg-ai-glass" : "kedi-msg-user-glass"}
                style={{
                  maxWidth: "82%", padding: "8px 13px", borderRadius: m.role === "ai" ? "0 12px 12px 12px" : "12px 0 12px 12px",
                  fontSize: 13, lineHeight: 1.5, color: "rgba(255,255,255,0.88)", fontFamily: "var(--font-label)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.text || (m.role === "ai" && typing ? "…" : "")}
              </div>
              {m.role === "ai" && m.links && m.links.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {m.links.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="kedi-chip-glass inline-flex items-center text-[11px] px-3 py-1.5 rounded-lg"
                      style={{ fontFamily: "var(--font-label)", color: "#38BDF8", textDecoration: "none" }}
                    >
                      {link.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Hızlı aksiyonlar */}
        {msgs.length === 0 && (
          <div className="flex-shrink-0 px-4 pb-2 flex gap-2 flex-wrap">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip.label}
                onClick={() => sendMessage(chip.q)}
                className="kedi-chip-glass text-[10px] px-2.5 py-1.5 rounded-lg transition-transform duration-200 hover:scale-[1.04] active:scale-95"
                style={{ fontFamily: "var(--font-label)", color: "#E9D5FF" }}
              >
                <span className="mr-1">{chip.icon}</span>{chip.label}
              </button>
            ))}
          </div>
        )}

        {voice.voiceError && (
          <div className="flex-shrink-0 px-4 pb-1.5 text-[11px]" style={{ color: "var(--color-error)", fontFamily: "var(--font-label)" }}>
            ⚠️ {voice.voiceError}
          </div>
        )}

        {/* Giriş alanı */}
        <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3" style={{ borderTop: "1px solid rgba(56,189,248,0.14)" }}>
          {voice.speechSupported && (
            <button
              onClick={voice.toggleListening}
              className="glass w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0"
              title={voice.listening ? "Dinleniyor — durdurmak için tıkla" : "Sesli komut"}
              style={{
                background: voice.listening ? "rgba(239,68,68,0.2)" : undefined,
                borderColor: voice.listening ? "rgba(239,68,68,0.5)" : undefined,
                color: voice.listening ? "var(--color-error)" : "rgba(255,255,255,0.3)",
                animation: voice.listening ? "glowPulse 1s ease-in-out infinite" : "none",
              }}
              aria-label={voice.listening ? "Dinlemeyi durdur" : "Sesli komut başlat"}
            >
              {voice.listening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={voice.listening ? "Dinleniyor…" : "Mesajını yaz…"}
            className="kedi-input-glass flex-1 outline-none text-sm text-white placeholder-white/20 px-4 py-2.5 rounded-full"
            style={{ fontFamily: "var(--font-label)" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || typing}
            className={`w-9 h-9 flex items-center justify-center rounded-full flex-shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95 ${input.trim() && !typing ? "gradient-animated gradient-fast gradient-violet-pink-orange" : "glass"}`}
            style={{ color: input.trim() && !typing ? "#fff" : "rgba(255,255,255,0.2)" }}
            aria-label="Gönder"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
