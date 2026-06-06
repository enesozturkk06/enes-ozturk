"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getStudentAppointments, getLessonRecords } from "@/lib/db";
import { getWaterLog, todayDate } from "@/lib/health";
import type { Appointment, LessonRecord } from "@/lib/types";
import { X, Send, ChevronDown } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";

/* ── Tipler ───────────────────────────────────────────────────────── */

interface Msg {
  id:   string;
  role: "ai" | "user";
  text: string;
  ts:   number;
}

/* ── Kedi SVG ikonu ───────────────────────────────────────────────── */

function CatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sol kulak */}
      <path d="M10 22L5 5L20 15Z" fill="#1a1a2e" stroke="#4c1d95" strokeWidth="1" />
      <path d="M10.5 21L6.5 7.5L18.5 15.5Z" fill="#2d1b4e" />
      {/* Sağ kulak */}
      <path d="M38 22L43 5L28 15Z" fill="#1a1a2e" stroke="#4c1d95" strokeWidth="1" />
      <path d="M37.5 21L41.5 7.5L29.5 15.5Z" fill="#2d1b4e" />
      {/* Kafa */}
      <ellipse cx="24" cy="30" rx="16" ry="14" fill="#1a1a2e" stroke="#4c1d95" strokeWidth="0.8" />
      {/* Sol göz — Parlak Mavi */}
      <ellipse cx="18" cy="28" rx="4.8" ry="4.2" fill="#38BDF8" />
      <ellipse cx="18" cy="28" rx="2.3" ry="3.6" fill="#001830" />
      <circle cx="16.5" cy="26.5" r="1.1" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="18" cy="28" rx="4.8" ry="4.2" fill="none" stroke="#0EA5E9" strokeWidth="0.5" />
      {/* Sağ göz — Parlak Yeşil */}
      <ellipse cx="30" cy="28" rx="4.8" ry="4.2" fill="#4ADE80" />
      <ellipse cx="30" cy="28" rx="2.3" ry="3.6" fill="#001210" />
      <circle cx="28.5" cy="26.5" r="1.1" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="30" cy="28" rx="4.8" ry="4.2" fill="none" stroke="#22C55E" strokeWidth="0.5" />
      {/* Burun */}
      <path d="M22.5 33.5L24 35.5L25.5 33.5L24 32.5Z" fill="#8B5CF6" opacity="0.95" />
      {/* Bıyıklar */}
      <line x1="5"  y1="33" x2="17" y2="33.5" stroke="rgba(200,200,255,0.35)" strokeWidth="0.8" />
      <line x1="5"  y1="36" x2="17" y2="35"   stroke="rgba(200,200,255,0.28)" strokeWidth="0.8" />
      <line x1="43" y1="33" x2="31" y2="33.5" stroke="rgba(200,200,255,0.35)" strokeWidth="0.8" />
      <line x1="43" y1="36" x2="31" y2="35"   stroke="rgba(200,200,255,0.28)" strokeWidth="0.8" />
    </svg>
  );
}

/* ── AI yanıt motoru ─────────────────────────────────────────────── */

interface StudentContext {
  name:             string;
  remainingLessons: number;
  completedLessons: number;
  totalLessons:     number;
  level:            string;
  appointments:     Appointment[];
  records:          LessonRecord[];
  waterGlasses:     number;
  waterTarget:      number;
  subscriptionType?: string;
}

function buildContext(ctx: StudentContext): string {
  const firstName    = ctx.name.split(" ")[0];
  const lastRecord   = ctx.records[0];
  const upcoming     = ctx.appointments.filter(a => a.status === "onaylandi" && isFuture(a.date));
  const lastApt      = ctx.appointments.filter(a => a.status === "tamamlandi")[0];
  const daysSinceApt = lastApt ? differenceInDays(new Date(), parseISO(lastApt.date)) : 999;
  const lowLessons   = ctx.subscriptionType !== "monthly" && ctx.remainingLessons <= 4;

  const parts: string[] = [`Merhaba **${firstName}**! 🐾 Ben **KEDİ AI**, senin kişisel AI antrenör koçunum.`];

  if (ctx.subscriptionType === "monthly") {
    parts.push(`Aylık üyeliğinle istediğin kadar ders alabilirsin. Randevu almanı öneriyorum!`);
  } else {
    parts.push(`Şu an **${ctx.remainingLessons}** ders hakkın var, toplamda **${ctx.completedLessons}** ders tamamladın.`);
    if (lowLessons) parts.push(`⚠️ Ders hakkın azalıyor — yeni paket almayı düşünmelisin!`);
  }

  if (upcoming.length > 0) {
    const next = upcoming[0];
    parts.push(`📅 Yaklaşan randevun: **${format(parseISO(next.date), "d MMMM", { locale: tr })}** saat **${next.startTime}**.`);
  } else if (daysSinceApt > 14) {
    parts.push(`⏰ **${daysSinceApt} gündür** randevu almamışsın. Eksik hissediyorum!`);
  }

  if (lastRecord) {
    const weakScore = Math.min(lastRecord.punch, lastRecord.kick, lastRecord.defense, lastRecord.combination, lastRecord.sparring);
    const weakKey   = Object.entries({
      "yumruk": lastRecord.punch, "tekme": lastRecord.kick, "savunma": lastRecord.defense,
      "kombinasyon": lastRecord.combination, "serbest çalışma": lastRecord.sparring,
    }).find(([, v]) => v === weakScore)?.[0] ?? "kondisyon";

    if (lastRecord.overall >= 9) {
      parts.push(`🌟 Son dersinde **${lastRecord.overall}/10** aldın — olağanüstü performans!`);
    } else if (lastRecord.overall >= 8) {
      parts.push(`⭐ Son dersinde **${lastRecord.overall}/10** aldın. Harika gidiyorsun!`);
    } else {
      parts.push(`📊 Son dersinde **${lastRecord.overall}/10** — **${weakKey}** alanını biraz daha çalışmalısın.`);
    }
  } else {
    parts.push(`Daha hiç ders kaydın yok. İlk dersin seni bekliyor!`);
  }

  parts.push(`\nNe hakkında konuşmak istersin?`);
  return parts.join(" \n");
}

function isFuture(dateStr: string): boolean {
  return parseISO(dateStr) > new Date();
}

function aiRespond(userMsg: string, ctx: StudentContext, history: Msg[]): string {
  const msg      = userMsg.toLowerCase();
  const name     = ctx.name.split(" ")[0];
  const last     = ctx.records[0];
  const lowL     = ctx.subscriptionType !== "monthly" && ctx.remainingLessons <= 4;
  const upcoming = ctx.appointments.filter(a => a.status === "onaylandi" && isFuture(a.date));

  if (/paket|ders hakkı|kalan|yenile|satın|al/.test(msg)) {
    if (ctx.subscriptionType === "monthly")
      return `${name}, aylık üyeliğin aktif. İstediğin kadar ders alabilirsin — sadece randevu oluştur!`;
    if (ctx.remainingLessons === 0)
      return `${name}, ders hakkın kalmadı 😿 Hemen yeni paket almalısın! Antrenörünle iletişime geç.`;
    if (lowL)
      return `${name}, sadece **${ctx.remainingLessons}** ders hakkın kaldı. Çok yakında biter — yeni paket almayı planla. Antrenörüne mesaj atabilirsin veya WhatsApp butonunu kullanabilirsin!`;
    return `${name}, şu an **${ctx.remainingLessons}** ders hakkın var. Toplamda ${ctx.completedLessons} ders tamamladın. Paketi ne zaman yenilemek istersen söyle, tavsiye ederim!`;
  }

  if (/randevu|yer|saat|zaman|gün|ne zaman|booking/.test(msg)) {
    if (upcoming.length > 0) {
      const next = upcoming[0];
      return `${name}, yaklaşan randevun **${format(parseISO(next.date), "d MMMM EEEE", { locale: tr })}** saat **${next.startTime}**. Hazır mısın? 🥊`;
    }
    return `${name}, aktif randevun görünmüyor. Hemen randevu almak için "Randevu" sayfasına git! Seninle çalışmak için sabırsızlanıyorum.`;
  }

  if (/teknik|yumruk|tekme|savunma|kombinasyon|nasıl|gelişt|egzersiz|antrenman/.test(msg)) {
    if (!last) return `Henüz ders kaydın yok ${name}. Ama ilk dersten sonra senin için özel teknik analizler yapacağım!`;
    const scores: [string, number][] = [
      ["Yumruk", last.punch], ["Tekme", last.kick], ["Savunma", last.defense],
      ["Kombinasyon", last.combination], ["Serbest Çalışma", last.sparring],
    ];
    const weak   = [...scores].sort((a, b) => a[1] - b[1])[0];
    const strong = [...scores].sort((a, b) => b[1] - a[1])[0];
    return `Son ders analizine göre ${name}:\n\n💪 **Güçlü yönün**: ${strong[0]} (${strong[1]}/10)\n🎯 **Geliştirmesi gereken**: ${weak[0]} (${weak[1]}/10)\n\n**${weak[0]}** için antrenörünle hedefli çalışma isteyebilirsin!`;
  }

  if (/motivasyon|vazgeç|bırak|yorgun|zor|üzgün|kötü|sinir|duy|hisse/.test(msg)) {
    const quotes = [
      `${name}, her şampiyon bir gün başlangıç seviyesindeydi. Önemli olan devam etmek! 🐾`,
      `Zor günler bile seni güçlendiriyor ${name}. Ring seni bekliyor.`,
      `${name}, ${ctx.completedLessons} ders tamamladın — kolay değil bu. Kendi gücüne güven!`,
      `En iyi kedi bile bazen tökezler ${name}. Önemli olan ayağa kalkmak. 🥊`,
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  if (/ilerleme|gelişim|skor|puan|performans|ne kadar|nasıl gidiy/.test(msg)) {
    if (ctx.records.length === 0)
      return `${name}, henüz puanın yok ama bu çok yakında değişecek! İlk ders kaydından sonra sana detaylı analiz yapacağım.`;
    if (ctx.records.length === 1)
      return `${name}, ilk derste genel notun **${last!.overall}/10** idi. Gelişimini takip etmek için en az 3-4 ders gerekiyor — devam et!`;
    const older = ctx.records[ctx.records.length - 1];
    const diff  = last!.overall - older.overall;
    const trend = diff > 0 ? `📈 +${diff.toFixed(1)} puan artış` : diff < 0 ? `📉 ${diff.toFixed(1)} puan düşüş` : `➡️ Stabil`;
    return `${name}, ilk dersine göre trend:\n\n${trend}\n\nİlk: **${older.overall}/10** → Son: **${last!.overall}/10**\n\n${diff > 0 ? "Harika ilerliyorsun! 🌟" : "Dalgalanmalar normal — antrenörünle konuşmanı öneririm."}`;
  }

  if (/su|kalori|sağlık|diyet|beslenme|kilo|ağırlık/.test(msg)) {
    const waterPct = ctx.waterTarget > 0 ? Math.round((ctx.waterGlasses / ctx.waterTarget) * 100) : 0;
    return `${name}, bugün **${ctx.waterGlasses}** bardak su içtin — hedefin **${ctx.waterTarget}** bardak (${waterPct}%).\n\nAntrenman yapan biri olarak günlük **2.5-3L** su kritik! 💧`;
  }

  if (/merhaba|selam|hey|nasılsın|iyi misin|naber/.test(msg)) {
    const hour  = new Date().getHours();
    const greet = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
    return `${greet} ${name}! 🐾 Ben de iyiyim, teşekkürler. Bugün ne hakkında konuşacağız?`;
  }

  if (/rozet|ödül|başarı|koleksiyon/.test(msg)) {
    return `${name}, şu ana kadar **${ctx.completedLessons}** ders tamamladın.\n\nRozetlerini görmek için "Rozetlerim" sayfasını ziyaret et! 🏅`;
  }

  if (/kim|ne|ne sin|ai|yapay zeka|robot|kedi|shadow/.test(msg)) {
    return `Ben **KEDİ AI** — senin kişisel AI antrenör koçunum. 🐾\n\nBir gözüm mavi, diğeri yeşil. Her zaman seninle çalışmaya hazırım.\n\nTeknik analiz, motivasyon, ders planlaması — ne istersen sorabilirsini!`;
  }

  const defaults = [
    `${name}, sana nasıl yardımcı olabilirim? Teknik, randevu, motivasyon veya paket hakkında konuşabiliriz.`,
    `Bunu tam anlamadım ${name}, ama buradayım! Teknik sorular, ilerleme analizi veya motivasyon için yaz.`,
    `${name}, ${ctx.completedLessons} derslik bir geçmişin var. Nerede daha iyileşmek istiyorsun? 🥊`,
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

/* ── Mesaj bubble ─────────────────────────────────────────────────── */

function MsgBubble({ msg }: { msg: Msg }) {
  const parsed = msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: "#C4B5FD" }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );

  if (msg.role === "ai") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, x: -8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.25 }}
        className="flex gap-2.5 items-end"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
          <CatIcon size={20} />
        </div>
        <div className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)",
            color:"rgba(255,255,255,0.85)", fontFamily:"var(--font-inter)", borderRadius:"0 12px 12px 12px" }}>
          {parsed}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, x: 8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed"
        style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)",
          color:"rgba(255,255,255,0.9)", fontFamily:"var(--font-inter)", borderRadius:"12px 0 12px 12px" }}>
        {msg.text}
      </div>
    </motion.div>
  );
}

/* ── Yazıyor göstergesi ───────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
      className="flex items-end gap-2.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.3)" }}>
        <CatIcon size={20} />
      </div>
      <div className="px-4 py-3 flex items-center gap-1"
        style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)", borderRadius:"0 12px 12px 12px" }}>
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:"#8B5CF6" }}
            animate={{ y:[0,-4,0] }} transition={{ duration:0.7, repeat:Infinity, delay:i*0.15 }} />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Ana bileşen ─────────────────────────────────────────────────── */

export default function BlackCatAI() {
  const { student }         = useAuth();
  const [open, setOpen]     = useState(false);
  const [msgs, setMsgs]     = useState<Msg[]>([]);
  const [input, setInput]   = useState("");
  const [typing, setTyping] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [minimized, setMin] = useState(false);

  /* Sürükleme */
  const constraintRef = useRef<HTMLDivElement>(null);
  const [didDrag, setDidDrag] = useState(false);

  /* Gecikmeli görünürlük (initial animation delay) */
  const [appeared, setAppeared] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const [ctx, setCtx] = useState<StudentContext | null>(null);

  /* Veri yükle */
  useEffect(() => {
    if (!student || loaded) return;
    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getWaterLog(student.id, todayDate()).catch(() => null),
    ]).then(([apts, recs, water]) => {
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      setCtx({
        name:             student.fullName,
        remainingLessons: student.remainingLessons,
        completedLessons: student.completedLessons,
        totalLessons:     student.totalLessons,
        level:            student.level,
        appointments:     [...apts].sort((a, b) => b.date.localeCompare(a.date)),
        records:          sorted,
        waterGlasses:     water?.glasses ?? 0,
        waterTarget:      8,
        subscriptionType: student.subscriptionType,
      });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [student, loaded]);

  /* İlk açılışta karşılama */
  useEffect(() => {
    if (!open || !ctx || msgs.length > 0) return;
    setTyping(true);
    const timer = setTimeout(() => {
      setMsgs([{ id:"init", role:"ai", text: buildContext(ctx), ts: Date.now() }]);
      setTyping(false);
      if (typeof window !== "undefined") localStorage.setItem("kedi_ai_used", "1");
    }, 900);
    return () => clearTimeout(timer);
  }, [open, ctx, msgs.length]);

  /* Scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs, typing]);

  /* Input focus */
  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open, minimized]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !ctx) return;
    const userMsg: Msg = { id: Date.now().toString(), role:"user", text: input.trim(), ts: Date.now() };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const reply = aiRespond(userMsg.text, ctx, msgs);
      setMsgs(prev => [...prev, { id:(Date.now()+1).toString(), role:"ai", text:reply, ts:Date.now() }]);
      setTyping(false);
    }, 600 + Math.random() * 800);
  }, [input, ctx, msgs]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!student) return null;

  return (
    <>
      {/* ── Drag sınırı: tüm ekranı kapsar, pointer-events yok ─── */}
      <div
        ref={constraintRef}
        style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:49 }}
      />

      {/* ── Floating buton ─────────────────────────────────────── */}
      <motion.button
        drag
        dragMomentum={false}
        dragConstraints={constraintRef}
        dragElastic={0.05}
        onDragStart={() => setDidDrag(true)}
        onDragEnd={() => setTimeout(() => setDidDrag(false), 100)}
        onClick={() => { if (!didDrag) { setOpen(o => !o); setMin(false); } }}
        initial={false}
        animate={{
          scale:   appeared ? 1 : 0,
          opacity: appeared ? (open ? 1 : 0.72) : 0,
        }}
        whileHover={{ opacity: 1, scale: 1.07 }}
        whileTap={{ scale: 0.91 }}
        transition={{ type:"spring", stiffness:280, damping:22 }}
        aria-label="KEDİ AI Koç — tıkla veya sürükle"
        style={{
          position:     "fixed",
          bottom:       "calc(env(safe-area-inset-bottom, 0px) + 88px)",
          right:        20,
          zIndex:       50,
          width:        56,
          height:       56,
          borderRadius: "50%",
          background:   "radial-gradient(circle at 38% 38%, #1e1040, #0a0718)",
          border:       open ? "2px solid rgba(139,92,246,0.9)" : "2px solid rgba(139,92,246,0.5)",
          boxShadow:    open
            ? "0 0 0 3px rgba(139,92,246,0.22), 0 0 28px rgba(139,92,246,0.75), 0 0 56px rgba(139,92,246,0.22)"
            : "0 0 18px rgba(139,92,246,0.45), 0 4px 14px rgba(0,0,0,0.5)",
          cursor:       "grab",
          touchAction:  "none",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
        }}
      >
        {/* Beyaz daire arka plan — kedi kontrast için */}
        <div style={{
          position:     "absolute",
          width:        40,
          height:       40,
          borderRadius: "50%",
          background:   "rgba(255,255,255,0.93)",
          boxShadow:    "inset 0 0 0 1px rgba(139,92,246,0.15)",
        }} />

        {/* Kedi SVG */}
        <div style={{ position:"relative", zIndex:1 }}>
          <CatIcon size={34} />
        </div>

        {/* Nabız glow — sadece kapalıyken */}
        {!open && appeared && (
          <motion.div
            style={{
              position:     "absolute",
              inset:        0,
              borderRadius: "50%",
              border:       "1.5px solid rgba(139,92,246,0.55)",
              pointerEvents:"none",
            }}
            animate={{ scale:[1, 1.4, 1], opacity:[0.6, 0, 0.6] }}
            transition={{ duration:2.4, repeat:Infinity }}
          />
        )}
      </motion.button>

      {/* ── Chat paneli ─────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Mobil overlay */}
            <motion.div
              className="fixed inset-0 sm:hidden"
              style={{ zIndex:54, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)" }}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity:0, y:24, scale:0.96 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:24, scale:0.96 }}
              transition={{ type:"spring", stiffness:320, damping:28 }}
              className="fixed flex flex-col kara-panel"
              style={{
                zIndex:     55,
                background: "rgba(10,7,20,0.98)",
                border:     "1px solid rgba(139,92,246,0.28)",
                boxShadow:  "0 0 0 1px rgba(139,92,246,0.1), 0 24px 80px rgba(0,0,0,0.85), 0 0 60px rgba(139,92,246,0.14)",
              }}
            >
              {/* Üst neon şerit */}
              <div className="absolute top-0 left-0 right-0 h-0.5 flex-shrink-0"
                style={{ background:"linear-gradient(90deg,transparent,#7C3AED,#A78BFA,#7C3AED,transparent)" }} />

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom:"1px solid rgba(139,92,246,0.12)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background:"rgba(255,255,255,0.9)", border:"1px solid rgba(139,92,246,0.3)" }}>
                    <CatIcon size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-wider"
                      style={{ color:"#C4B5FD", fontFamily:"var(--font-bebas)", letterSpacing:"0.12em" }}>
                      KEDİ AI
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                        Kişisel Antrenör Koçun
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMin(m => !m)}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    style={{ color:"rgba(255,255,255,0.3)" }}
                    aria-label="Küçült"
                  >
                    <ChevronDown size={15} style={{ transform: minimized ? "rotate(180deg)" : "none" }} />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    style={{ color:"rgba(255,255,255,0.3)" }}
                    aria-label="Kapat"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Mesaj alanı + input */}
              {!minimized && (
                <>
                  <div
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                    style={{ overscrollBehavior:"contain", WebkitOverflowScrolling:"touch" } as React.CSSProperties}
                  >
                    <AnimatePresence initial={false}>
                      {msgs.map(m => <MsgBubble key={m.id} msg={m} />)}
                      {typing && <TypingIndicator key="typing" />}
                    </AnimatePresence>
                    <div ref={bottomRef} />
                  </div>

                  {/* Hızlı sorular */}
                  {msgs.length <= 1 && (
                    <div className="flex-shrink-0 px-4 pb-2 flex gap-2 flex-wrap">
                      {["Teknik analizim", "Ders hakkım", "Motivasyon ver!", "İlerlemem nerede?"].map(q => (
                        <button
                          key={q}
                          onClick={() => {
                            if (!ctx) return;
                            const userMsg: Msg = { id:Date.now().toString(), role:"user", text:q, ts:Date.now() };
                            setMsgs(prev => [...prev, userMsg]);
                            setTyping(true);
                            setTimeout(() => {
                              const reply = aiRespond(q, ctx, msgs);
                              setMsgs(prev => [...prev, { id:(Date.now()+1).toString(), role:"ai", text:reply, ts:Date.now() }]);
                              setTyping(false);
                            }, 700 + Math.random() * 600);
                          }}
                          className="text-[10px] px-2.5 py-1 transition-all duration-200"
                          style={{
                            fontFamily:  "var(--font-barlow-condensed)",
                            background:  "rgba(139,92,246,0.08)",
                            border:      "1px solid rgba(139,92,246,0.22)",
                            color:       "#A78BFA",
                            borderRadius: 6,
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3"
                    style={{ borderTop:"1px solid rgba(139,92,246,0.1)" }}>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Bir şey sor…"
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/20"
                      style={{ fontFamily:"var(--font-inter)" }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || typing}
                      className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0"
                      style={{
                        background: input.trim() && !typing ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${input.trim() && !typing ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: input.trim() && !typing ? "#C4B5FD" : "rgba(255,255,255,0.2)",
                      }}
                      aria-label="Gönder"
                    >
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
