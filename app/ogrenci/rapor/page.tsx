"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getLessonRecords, getStudentAppointments, getStudentXPAdjustments,
  getStudentGiftClaimsForSeason,
} from "@/lib/db";
import type { LessonRecord, Appointment } from "@/lib/types";
import {
  computeFullXP, getCurrentSeason, getSeasonLabel,
  sumManualXP, getLevelForXP,
} from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import { PageHeader } from "@/app/components/ui";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths } from "date-fns";
import { tr } from "date-fns/locale";
import { FileText, Printer, TrendingUp, TrendingDown, Minus } from "lucide-react";

const SCORE_KEYS = ["conditioning", "punch", "kick", "defense", "combination", "sparring"] as const;
const SCORE_LABELS: Record<typeof SCORE_KEYS[number], string> = {
  conditioning: "Kondisyon", punch: "Yumruk", kick: "Tekme",
  defense: "Savunma", combination: "Kombinasyon", sparring: "Serbest Çalışma",
};

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};
/* gradient-border-quiet taşıyan elemanlar için: opacity'yi CSS yönetir (0.22),
   Framer Motion sadece y/scale/filter animasyonu yapar. */
const fadeUpNoOpacity = {
  initial: { y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

function CountUp({ value, decimals = 0, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const duration = 600;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}

function monthRange(offset = 0) {
  const d = subMonths(new Date(), offset);
  return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, "MMMM yyyy", { locale: tr }) };
}

function inRange(date: string, start: Date, end: Date) {
  try { return isWithinInterval(parseISO(date), { start, end }); } catch { return false; }
}

export default function RaporPage() {
  const { student } = useAuth();
  const [records,  setRecords]  = useState<LessonRecord[]>([]);
  const [apts,     setApts]     = useState<Appointment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  /* ── Data ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!student) return;
    Promise.all([
      getLessonRecords(student.id),
      getStudentAppointments(student.id),
      getStudentXPAdjustments(student.id).catch(() => []),
      getStudentGiftClaimsForSeason(student.id, getCurrentSeason()).catch(() => []),
    ]).then(([recs, a]) => {
      setRecords(recs.sort((a, b) => b.date.localeCompare(a.date)));
      setApts(a);
      setLoading(false);
    });
  }, [student]);

  const handlePrint = useCallback(() => window.print(), []);

  if (!student || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid #8B5CF6", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const { start, end, label: monthLabel } = monthRange(monthOffset);

  /* Seçili ay filtreleri */
  const monthRecs = records.filter(r => inRange(r.date, start, end));
  const monthApts = apts.filter(a => inRange(a.date, start, end));
  const completedApts   = monthApts.filter(a => a.status === "tamamlandi");
  const cancelledApts   = monthApts.filter(a => a.status === "iptal");
  const noShowApts      = monthApts.filter(a => a.status === "gelmedi");

  /* XP kısmi: tamamlanan × 100 (basit tahmini) */
  const monthXP = completedApts.length * 100;

  /* Teknik ortalamalar */
  const avg = (key: typeof SCORE_KEYS[number]) =>
    monthRecs.length ? +(monthRecs.reduce((s, r) => s + r[key], 0) / monthRecs.length).toFixed(1) : 0;

  const avgs = SCORE_KEYS.map(k => ({ key: k, label: SCORE_LABELS[k], value: avg(k) }));
  const sorted = [...avgs].sort((a, b) => b.value - a.value);
  const strengths = sorted.slice(0, 2).filter(a => a.value >= 6);
  const weaknesses = sorted.slice(-2).filter(a => a.value > 0);

  /* Genel ortalama önceki ay ile karşılaştır */
  const { start: ps, end: pe } = monthRange(monthOffset + 1);
  const prevRecs = records.filter(r => inRange(r.date, ps, pe));
  const prevAvgOverall = prevRecs.length ? +(prevRecs.reduce((s, r) => s + r.overall, 0) / prevRecs.length).toFixed(1) : null;
  const currAvgOverall = monthRecs.length ? +(monthRecs.reduce((s, r) => s + r.overall, 0) / monthRecs.length).toFixed(1) : null;
  const trend = (currAvgOverall !== null && prevAvgOverall !== null)
    ? currAvgOverall - prevAvgOverall : null;

  /* Radar */
  const radarData = avgs.map(a => ({ subject: a.label.split(" ")[0], A: a.value, fullMark: 10 }));

  /* Son 6 ay genel puan trendi */
  const trendData = Array.from({ length: 6 }, (_, i) => {
    const { start: s, end: e, label } = monthRange(5 - i);
    const recs = records.filter(r => inRange(r.date, s, e));
    return {
      name: format(s, "MMM", { locale: tr }),
      Genel: recs.length ? +(recs.reduce((s, r) => s + r.overall, 0) / recs.length).toFixed(1) : null,
      Dersler: apts.filter(a => inRange(a.date, s, e) && a.status === "tamamlandi").length,
    };
  });

  /* Bar chart — aylık teknik puanlar */
  const barData = avgs.map(a => ({ name: a.label.split(" ")[0], puan: a.value }));

  /* Kedi AI değerlendirmesi */
  const aiComment = (() => {
    const name = student.fullName.split(" ")[0];
    if (!monthRecs.length) return `${name}, ${monthLabel} ayında ders kaydın bulunmuyor. Teknik gelişimini takip etmek için düzenli antrenmana devam et!`;
    const weak = weaknesses[0];
    const strong = strengths[0];
    const trendStr = trend !== null
      ? (trend > 0 ? `önceki aya göre +${trend.toFixed(1)} puan artış` : trend < 0 ? `önceki aya göre ${Math.abs(trend).toFixed(1)} puan dalgalanma` : "önceki ay ile aynı seviye")
      : "ilk ölçüm ayı";
    let msg = `${name}, ${monthLabel} ayı raporu: ${completedApts.length} ders tamamladın, ${trendStr} var. `;
    if (strong) msg += `${strong.label} (${strong.value}/10) en güçlü alanın — bunu koru! `;
    if (weak) msg += `${weak.label} (${weak.value}/10) üzerine bu ay ekstra çalışmanı öneririm. `;
    if (cancelledApts.length > 0 || noShowApts.length > 0) msg += `${cancelledApts.length} iptal, ${noShowApts.length} gelmedi var — devam oranını artır! `;
    msg += `Harika bir ay için devam et! 🐾`;
    return msg;
  })();

  const levelInfo = getLevelForXP(
    computeFullXP(student.completedLessons, apts, records, getCurrentSeason(), []).lifetimeResult.breakdown.total
  );

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <div className="no-print">
        <PageHeader title="Gelişim Raporu" subtitle="Aylık performans analizi ve Kedi AI değerlendirmesi" accent="Rapor" />
      </div>

      {/* Print header */}
      <div className="hidden print-only text-center mb-8">
        <div style={{ fontFamily: "var(--font-bebas)", fontSize: 32, color: "#111", letterSpacing: "0.1em" }}>
          ENES ÖZTÜRK KİŞİSEL ANTRENÖR
        </div>
        <div style={{ fontSize: 20, color: "#333", marginTop: 4 }}>{student.fullName} — Gelişim Raporu</div>
        <div style={{ fontSize: 14, color: "#666", marginTop: 2 }}>{monthLabel}</div>
      </div>

      {/* ── Controls ─────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="flex items-center gap-3 flex-wrap no-print">
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          className="glass px-4 py-2 text-sm rounded-xl text-white/50 hover:text-white transition-colors"
          style={{ fontFamily: "var(--font-label)" }}
        >
          ← Önceki Ay
        </button>
        <span className="px-4 py-2 text-lg text-white" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em" }}>
          {monthLabel.toUpperCase()}
        </span>
        <button
          onClick={() => setMonthOffset(o => Math.max(0, o - 1))}
          disabled={monthOffset === 0}
          className="glass px-4 py-2 text-sm rounded-xl transition-colors disabled:opacity-40"
          style={{ color: monthOffset === 0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.5)", fontFamily: "var(--font-label)" }}
        >
          Sonraki Ay →
        </button>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handlePrint}
            className="gradient-animated gradient-slow gradient-violet-pink-orange flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-transform hover:scale-105 active:scale-95"
            style={{ fontFamily: "var(--font-label)" }}
          >
            <Printer size={14} /> PDF Kaydet
          </button>
        </div>
      </motion.div>

      {/* ── Özet kartlar ─────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          { label: "Tamamlanan Ders", value: completedApts.length, decimals: 0, prefix: "", suffix: "", color: "#22C55E" },
          { label: "Kazanılan XP",    value: monthXP,              decimals: 0, prefix: "+", suffix: "", color: "#A78BFA" },
          { label: "Genel Ortalama",  value: currAvgOverall ?? 0,   decimals: 1, prefix: "", suffix: currAvgOverall !== null ? "/10" : "", color: "#FBBF24" },
          { label: "Ders Serisi",
            value: (() => {
              const srt = [...apts].filter(a => ["tamamlandi","iptal","gelmedi"].includes(a.status))
                .sort((a, b) => b.date.localeCompare(a.date));
              let n = 0; for (const a of srt) { if (a.status === "tamamlandi") n++; else break; }
              return n;
            })(),
            decimals: 0, prefix: "", suffix: "", color: "#FB7185",
          },
        ] as const).map(s => (
          <div key={s.label} className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet">
            <div className="glass relative rounded-2xl p-4 text-center h-full">
              <div className="text-3xl" style={{ fontFamily: "var(--font-display)", color: s.color, letterSpacing: "0.05em" }}>
                {s.label === "Genel Ortalama" && currAvgOverall === null ? "—" : <CountUp value={s.value} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />}
              </div>
              <div className="text-[11px] mt-1 text-white/40" style={{ fontFamily: "var(--font-label)" }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Güçlü / Zayıf yönler ─────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} style={{ color: "var(--color-success)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-success)", fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}>
              GÜÇLÜ YÖNLER
            </span>
          </div>
          {strengths.length > 0 ? strengths.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: "rgba(34,197,94,0.12)" }}>
              <span className="text-sm text-white/70" style={{ fontFamily: "var(--font-label)" }}>{s.label}</span>
              <span className="text-sm font-bold text-green-400" style={{ fontFamily: "var(--font-bebas)" }}>{s.value}/10</span>
            </div>
          )) : <p className="text-xs text-white/25">Bu ay için yeterli ders kaydı yok</p>}
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown size={16} style={{ color: "var(--color-error)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--color-error)", fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}>
              GELİŞTİRİLECEK ALANLAR
            </span>
          </div>
          {weaknesses.length > 0 ? weaknesses.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
              <span className="text-sm text-white/70" style={{ fontFamily: "var(--font-label)" }}>{s.label}</span>
              <span className="text-sm font-bold" style={{ color: "var(--color-error)", fontFamily: "var(--font-display)" }}>{s.value}/10</span>
            </div>
          )) : <p className="text-xs text-white/25">Yeterli veri yok</p>}
        </div>
      </motion.div>

      {/* ── Grafikler ─────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Radar */}
        <div className="glass-strong rounded-2xl p-4">
          <div className="text-xs text-white/40 uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-label)" }}>Teknik Radar — {monthLabel}</div>
          <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.07)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} />
              <Radar name="Puan" dataKey="A" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart */}
        <div className="glass-strong rounded-2xl p-4">
          <div className="text-xs text-white/40 uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-label)" }}>Teknik Puanlar</div>
          <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
            <BarChart data={barData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
              <YAxis domain={[0, 10]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "rgba(20,14,35,0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(139,92,246,0.35)", borderRadius: 10 }} />
              <Bar dataKey="puan" radius={[4,4,0,0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.puan >= 8 ? "#22C55E" : entry.puan >= 6 ? "#7C3AED" : "#FB7185"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* 6 aylık trend */}
      <motion.div variants={fadeUp} className="glass-strong rounded-2xl p-4">
        <div className="text-xs text-white/40 uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-label)" }}>Son 6 Ay Genel Puan Trendi</div>
        <ResponsiveContainer width="100%" height={180} minWidth={0} minHeight={0}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
            <YAxis domain={[0, 10]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
            <Tooltip contentStyle={{ background: "rgba(20,14,35,0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(139,92,246,0.35)", borderRadius: 10 }} />
            <Line type="monotone" dataKey="Genel" stroke="#A78BFA" strokeWidth={2.5} dot={{ fill: "#7C3AED", r: 4 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── Kedi AI Değerlendirmesi ──────────────────────────── */}
      <motion.div variants={fadeUpNoOpacity} className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
        <div className="glass-strong relative rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🐾</span>
            <span className="text-sm font-semibold" style={{ color: "#A78BFA", fontFamily: "var(--font-label)", letterSpacing: "0.06em" }}>
              KEDİ AI DEĞERLENDİRMESİ
            </span>
          </div>
          <p className="text-sm text-white/75 leading-relaxed" style={{ fontFamily: "var(--font-label)" }}>
            {aiComment}
          </p>
          {trend !== null && (
            <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
              {trend > 0
                ? <TrendingUp size={14} style={{ color: "var(--color-success)" }} />
                : trend < 0
                ? <TrendingDown size={14} style={{ color: "var(--color-error)" }} />
                : <Minus size={14} className="text-white/40" />}
              <span className="text-xs" style={{ color: trend > 0 ? "var(--color-success)" : trend < 0 ? "var(--color-error)" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>
                Önceki aya göre: {trend > 0 ? `+${trend.toFixed(1)} puan artış` : trend < 0 ? `${trend.toFixed(1)} puan dalgalanma` : "aynı seviye"}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Antrenör Notu (boş) ──────────────────────────────── */}
      <motion.div variants={fadeUp} className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-white/40" />
          <span className="text-sm font-semibold text-white/40" style={{ fontFamily: "var(--font-label)", letterSpacing: "0.06em" }}>
            ANTRENÖR DEĞERLENDİRMESİ
          </span>
        </div>
        {monthRecs.length > 0 && monthRecs[0].trainerNotes ? (
          <p className="text-sm text-white/70 leading-relaxed" style={{ fontFamily: "var(--font-label)" }}>
            {monthRecs[0].trainerNotes}
          </p>
        ) : (
          <p className="text-xs text-white/25 italic" style={{ fontFamily: "var(--font-label)" }}>
            Bu ay için antrenör notu henüz eklenmedi.
          </p>
        )}
      </motion.div>

      {/* ── Seviye durumu ────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="glass rounded-2xl p-4 flex items-center gap-4">
        <div className="text-3xl">{levelInfo.current.icon}</div>
        <div>
          <div className="text-base" style={{ color: levelInfo.current.colorPrimary, fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>
            {levelInfo.current.name}
          </div>
          <div className="text-xs text-white/40" style={{ fontFamily: "var(--font-label)" }}>
            {levelInfo.next ? `Bir sonraki seviye: ${levelInfo.next.name} — ${levelInfo.xpToNext} XP kaldı` : "Maksimum seviye 👑"}
          </div>
        </div>
      </motion.div>

      <div className="no-print pb-20">
        <p className="text-center text-xs text-white/20" style={{ fontFamily: "var(--font-label)" }}>
          Raporu PDF olarak kaydetmek için &quot;PDF Kaydet&quot; butonuna bas veya Ctrl+P (Cmd+P) kullan
        </p>
      </div>
    </motion.div>
  );
}
