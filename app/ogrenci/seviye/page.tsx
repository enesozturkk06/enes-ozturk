"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getStudentAppointments, getLessonRecords, getStudents } from "@/lib/db";
import type { Appointment, LessonRecord, Student } from "@/lib/types";
import { computeXPFromData, getLevelForXP, XP_LEVELS, type XPLevel, type XPResult } from "@/lib/xp";
import { PageHeader } from "@/app/components/ui";
import { Zap, Crown, Trophy, ChevronRight, Gift } from "lucide-react";

/* ── Seviye kart bileşeni ─────────────────────────────────────────── */

function LevelCard({
  level,
  isCurrent,
  isEarned,
  index,
}: {
  level: XPLevel;
  isCurrent: boolean;
  isEarned: boolean;
  index: number;
}) {
  const [hover, setHover] = useState(false);
  const isStarter = level.id === "starter";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35, ease: "easeOut" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex flex-col p-5 border transition-all duration-300 select-none"
      style={{
        background: isEarned
          ? `linear-gradient(135deg, ${level.gradFrom}18, ${level.gradTo}0a)`
          : "rgba(255,255,255,0.02)",
        borderColor: isCurrent
          ? level.colorPrimary + "99"
          : isEarned
          ? level.colorPrimary + "44"
          : "rgba(255,255,255,0.06)",
        boxShadow: isCurrent
          ? `0 0 32px ${level.glowColor}, 0 0 12px ${level.glowColor}`
          : isEarned && hover
          ? `0 0 20px ${level.glowColor}`
          : "none",
        borderRadius: 2,
      }}
    >
      {/* Üst neon şerit */}
      {(isCurrent || isEarned) && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, transparent, ${level.colorPrimary}, transparent)`,
          }}
        />
      )}

      {/* Şu anki seviye etiketi */}
      {isCurrent && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase"
          style={{
            background: `linear-gradient(90deg, ${level.gradFrom}, ${level.gradTo})`,
            color: "#fff",
            borderRadius: 12,
            fontFamily: "var(--font-bebas)",
            letterSpacing: "0.18em",
            boxShadow: `0 0 12px ${level.glowColor}`,
          }}
        >
          ŞU AN BURADASIN
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        {/* İkon */}
        <div
          className="w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0 rounded-full transition-transform duration-300"
          style={{
            background: isEarned
              ? `radial-gradient(circle, ${level.gradFrom}44, ${level.gradTo}22)`
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${isEarned ? level.borderColor : "rgba(255,255,255,0.08)"}`,
            transform: hover && isEarned ? "scale(1.12)" : "scale(1)",
            filter: isEarned
              ? `drop-shadow(0 0 8px ${level.colorPrimary}88)`
              : "grayscale(1) opacity(0.35)",
          }}
        >
          {level.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-sm font-bold tracking-wide truncate"
            style={{
              fontFamily: "var(--font-bebas)",
              letterSpacing: "0.1em",
              color: isEarned ? level.colorPrimary : "rgba(255,255,255,0.25)",
            }}
          >
            {level.name}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
            {isStarter ? "Başlangıç" : `${level.threshold.toLocaleString()} XP`}
          </div>
        </div>

        {isEarned && !isStarter && (
          <div
            className="text-[10px] px-2 py-0.5 rounded"
            style={{
              background: `${level.colorPrimary}22`,
              border: `1px solid ${level.colorPrimary}44`,
              color: level.colorPrimary,
              fontFamily: "var(--font-barlow-condensed)",
            }}
          >
            ✓ Kazanıldı
          </div>
        )}
      </div>

      <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-barlow-condensed)" }}>
        {level.description}
      </p>

      {!isStarter && (
        <div
          className="flex items-start gap-1.5 text-[11px] pt-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: isEarned ? level.colorPrimary + "cc" : "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}
        >
          <Gift size={12} className="mt-0.5 flex-shrink-0" />
          <span>{level.reward}</span>
        </div>
      )}
    </motion.div>
  );
}

/* ── XP ilerleme barı ────────────────────────────────────────────── */

function XPBar({ xpResult }: { xpResult: XPResult }) {
  const { current, next, progressPct, xpInLevel, xpToNext } = xpResult.level;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const isMax = !next;

  return (
    <div className="relative">
      {/* Seviye başlık */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 flex items-center justify-center text-3xl rounded-full"
            style={{
              background: `radial-gradient(circle, ${current.gradFrom}55, ${current.gradTo}22)`,
              border: `2px solid ${current.borderColor}`,
              boxShadow: `0 0 24px ${current.glowColor}, 0 0 8px ${current.glowColor}`,
            }}
          >
            {current.icon}
          </div>
          <div>
            <div
              className="text-xl font-black tracking-widest"
              style={{
                fontFamily: "var(--font-bebas)",
                letterSpacing: "0.15em",
                background: `linear-gradient(90deg, ${current.colorPrimary}, ${current.gradTo})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {current.name}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
              Toplam XP: <span style={{ color: current.colorPrimary, fontWeight: 700 }}>{xpResult.breakdown.total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {next && (
          <div className="flex items-center gap-2 text-right">
            <div>
              <div className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>Sonraki Seviye</div>
              <div className="text-sm font-bold" style={{ color: next.colorPrimary, fontFamily: "var(--font-bebas)", letterSpacing: "0.08em" }}>
                {next.icon} {next.name}
              </div>
              <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                {xpToNext.toLocaleString()} XP kaldı
              </div>
            </div>
            <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.2)" }} />
          </div>
        )}
        {isMax && (
          <div className="flex items-center gap-2">
            <Crown size={20} style={{ color: current.colorPrimary }} />
            <span className="text-sm font-bold" style={{ color: current.colorPrimary, fontFamily: "var(--font-bebas)", letterSpacing: "0.1em" }}>
              MAKSİMUM SEVİYE
            </span>
          </div>
        )}
      </div>

      {/* İlerleme çubuğu */}
      <div
        className="relative h-4 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Dolum */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: animated ? `${progressPct}%` : "0%" }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            background: `linear-gradient(90deg, ${current.gradFrom}, ${current.colorPrimary}, ${current.gradTo})`,
            boxShadow: `0 0 16px ${current.glowColor}`,
          }}
        />

        {/* Işıltı efekti */}
        <motion.div
          className="absolute inset-y-0 rounded-full"
          initial={{ left: "-20%", opacity: 0 }}
          animate={{ left: animated ? "110%" : "-20%", opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.8, delay: 0.5, ease: "easeInOut" }}
          style={{
            width: "20%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
          }}
        />

        {/* Yüzde etiketi */}
        {progressPct > 10 && (
          <div
            className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold"
            style={{ color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-bebas)", letterSpacing: "0.1em" }}
          >
            {progressPct}%
          </div>
        )}
      </div>

      {/* Alt bilgi */}
      <div className="flex justify-between mt-2 text-[11px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
        <span>{xpInLevel.toLocaleString()} XP bu seviyede</span>
        {next && <span>{next.threshold.toLocaleString()} XP hedef</span>}
      </div>
    </div>
  );
}

/* ── XP kazanç dökümü ────────────────────────────────────────────── */

function XPBreakdownCard({ xpResult }: { xpResult: XPResult }) {
  const { breakdown, currentStreak, maxStreak } = xpResult;

  const items = [
    { label: "Ders Tamamlama", value: breakdown.lessonsXP, color: "#34D399", icon: "📚" },
    { label: `Seri Bonusu (max ${maxStreak} ders)`, value: breakdown.streakXP, color: "#60A5FA", icon: "🔥" },
    { label: "Teknik İyileşme", value: breakdown.improvementXP, color: "#A78BFA", icon: "📈" },
    { label: "Devamsızlık", value: breakdown.absenceDeduction, color: "#F87171", icon: "⚠️" },
  ].filter(i => i.value !== 0);

  return (
    <div
      className="p-5 border"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.07)",
        borderRadius: 2,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} style={{ color: "#FBBF24" }} />
        <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-bebas)", letterSpacing: "0.15em" }}>
          XP Kazanım Dökümü
        </span>
      </div>

      <div className="space-y-2.5 mb-4">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12px]" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-barlow-condensed)" }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: item.color, fontFamily: "var(--font-bebas)" }}
            >
              {item.value > 0 ? "+" : ""}{item.value.toLocaleString()} XP
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-barlow-condensed)" }}>
          Toplam XP
        </span>
        <span className="text-lg font-black" style={{ color: "#FBBF24", fontFamily: "var(--font-bebas)", letterSpacing: "0.08em" }}>
          {breakdown.total.toLocaleString()} XP
        </span>
      </div>

      {currentStreak > 0 && (
        <div
          className="mt-3 px-3 py-2 flex items-center gap-2 text-[12px]"
          style={{
            background: "rgba(251,191,36,0.07)",
            border: "1px solid rgba(251,191,36,0.2)",
            borderRadius: 6,
            color: "#FCD34D",
            fontFamily: "var(--font-barlow-condensed)",
          }}
        >
          🔥 <span>Şu anki serin: <strong>{currentStreak} ders</strong> üst üste devam ediyor!</span>
        </div>
      )}
    </div>
  );
}

/* ── Hall of Fame ─────────────────────────────────────────────────── */

interface HallEntry {
  name: string;
  xp: number;
  level: XPLevel;
  isMe: boolean;
}

function HallOfFame({ entries, myId }: { entries: HallEntry[]; myId: string }) {
  const top = entries.slice(0, 5);

  const rankStyle: Record<number, { bg: string; border: string; color: string; badge: string }> = {
    0: { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.4)", color: "#FBBF24", badge: "🥇" },
    1: { bg: "rgba(209,213,219,0.07)", border: "rgba(209,213,219,0.3)", color: "#D1D5DB", badge: "🥈" },
    2: { bg: "rgba(205,127,50,0.07)", border: "rgba(205,127,50,0.3)", color: "#CD7F32", badge: "🥉" },
  };

  return (
    <div
      className="p-5 border"
      style={{
        background: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.07)",
        borderRadius: 2,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} style={{ color: "#FBBF24" }} />
        <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-bebas)", letterSpacing: "0.15em" }}>
          Onur Listesi
        </span>
      </div>

      {top.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
          Henüz sıralama yok
        </p>
      )}

      <div className="space-y-2">
        {top.map((entry, i) => {
          const rs = rankStyle[i];
          return (
            <motion.div
              key={entry.name + i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded transition-all duration-200"
              style={{
                background: entry.isMe ? "rgba(139,92,246,0.1)" : (rs?.bg ?? "rgba(255,255,255,0.03)"),
                border: `1px solid ${entry.isMe ? "rgba(139,92,246,0.3)" : (rs?.border ?? "rgba(255,255,255,0.06)")}`,
              }}
            >
              <span className="text-lg w-8 flex-shrink-0 text-center">
                {rs?.badge ?? `${i + 1}.`}
              </span>
              <span className="text-xl flex-shrink-0">{entry.level.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: entry.isMe ? "#C4B5FD" : "rgba(255,255,255,0.75)", fontFamily: "var(--font-barlow-condensed)" }}>
                  {entry.name} {entry.isMe && <span style={{ color: "#8B5CF6" }}>(Sen)</span>}
                </div>
                <div className="text-[10px]" style={{ color: entry.level.colorPrimary, fontFamily: "var(--font-barlow-condensed)" }}>
                  {entry.level.name}
                </div>
              </div>
              <span className="text-sm font-black tabular-nums" style={{ color: rs?.color ?? "rgba(255,255,255,0.4)", fontFamily: "var(--font-bebas)" }}>
                {entry.xp.toLocaleString()}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Hediye ders durumu ───────────────────────────────────────────── */

function GiftLessonStatus({ xpResult }: { xpResult: XPResult }) {
  const { gold5kReached, diamond10kReached } = xpResult;

  if (!gold5kReached) return null;

  return (
    <div
      className="p-5 border"
      style={{
        background: gold5kReached ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.02)",
        borderColor: gold5kReached ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.07)",
        borderRadius: 2,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Gift size={16} style={{ color: "#FBBF24" }} />
        <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "#FBBF24", fontFamily: "var(--font-bebas)", letterSpacing: "0.15em" }}>
          Hediye Ders Durumu
        </span>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)" }}>
            🥇
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold" style={{ color: "#FCD34D", fontFamily: "var(--font-barlow-condensed)" }}>
              Altın Sporcu — 5000 XP
            </div>
            <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
              1 Hediye Ders → Admin onayı bekleniyor
            </div>
          </div>
          <span style={{ color: "#34D399", fontSize: 18 }}>✓</span>
        </div>

        {diamond10kReached && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background: "rgba(103,232,249,0.15)", border: "1px solid rgba(103,232,249,0.3)" }}>
              💎
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold" style={{ color: "#67E8F9", fontFamily: "var(--font-barlow-condensed)" }}>
                Elmas Sporcu — 10000 XP
              </div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
                1 Hediye Ders daha → Admin onayı bekleniyor
              </div>
            </div>
            <span style={{ color: "#34D399", fontSize: 18 }}>✓</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Ana sayfa bileşeni ───────────────────────────────────────────── */

export default function SeviyeMerkeziPage() {
  const { student } = useAuth();
  const [xpResult, setXpResult] = useState<XPResult | null>(null);
  const [hallEntries, setHallEntries] = useState<HallEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;

    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      // Hall of Fame için tüm öğrenciler (sadece öğrenci listesi)
      getStudents().catch(() => [] as Student[]),
    ]).then(async ([apts, recs, allStudents]) => {
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      const result = computeXPFromData(student.completedLessons, apts, sorted);
      setXpResult(result);

      // Hall of Fame: her öğrenci için kendi completed lessons + basit tahmin
      // Gerçek XP için tüm appointment/record verisi gerekir, ancak bu çok pahalı.
      // Basit heuristic: completedLessons * 100 yaklaşımını kullan.
      const entries: HallEntry[] = allStudents
        .filter(s => s.completedLessons > 0)
        .map(s => {
          const approxXP = s.completedLessons * 100;
          const levelInfo = getLevelForXP(approxXP);
          return {
            name: s.fullName,
            xp: approxXP,
            level: levelInfo.current,
            isMe: s.id === student.id,
          };
        })
        .sort((a, b) => b.xp - a.xp);

      // Kendi gerçek XP'sini güncelle
      const myIdx = entries.findIndex(e => e.isMe);
      if (myIdx !== -1) {
        entries[myIdx].xp = result.breakdown.total;
        entries[myIdx].level = result.level.current;
        entries.sort((a, b) => b.xp - a.xp);
      }

      setHallEntries(entries);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [student]);

  if (loading || !xpResult) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: "rgba(139,92,246,0.4)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const { current, next } = xpResult.level;
  const earnedLevelIds = XP_LEVELS.filter(l => xpResult.breakdown.total >= l.threshold).map(l => l.id);

  return (
    <div className="p-5 lg:p-7 max-w-3xl mx-auto space-y-7">
      <PageHeader
        title="Seviye Merkezi"
        subtitle="XP puanın ve seviye ilerleme durumun"
      />

      {/* ── Ana XP kartı ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 border relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${current.gradFrom}22, rgba(0,0,0,0) 60%), rgba(255,255,255,0.025)`,
          borderColor: current.borderColor,
          boxShadow: `0 0 40px ${current.glowColor}, inset 0 0 40px ${current.glowColor}22`,
          borderRadius: 2,
        }}
      >
        {/* Arka plan glow blur */}
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: current.glowColor, filter: "blur(60px)", opacity: 0.4 }}
        />

        {/* Üst neon çizgi */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, transparent, ${current.colorPrimary}, ${next?.colorPrimary ?? current.colorPrimary}, transparent)` }}
        />

        <div className="relative">
          <XPBar xpResult={xpResult} />
        </div>
      </motion.div>

      {/* ── XP dökümü + Hediye ders ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <XPBreakdownCard xpResult={xpResult} />
        {xpResult.gold5kReached ? (
          <GiftLessonStatus xpResult={xpResult} />
        ) : (
          <div
            className="p-5 border flex flex-col justify-center"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)", borderRadius: 2 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Gift size={16} style={{ color: "rgba(251,191,36,0.5)" }} />
              <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-bebas)", letterSpacing: "0.15em" }}>
                Hediye Ders
              </span>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)", lineHeight: 1.6 }}>
              <strong style={{ color: "#FBBF24" }}>5000 XP</strong> ile Altın Sporcu ol ve 1 hediye ders kazan!<br />
              <strong style={{ color: "#67E8F9" }}>10000 XP</strong> ile Elmas Sporcu ol ve 1 ders daha kazan.
            </p>
            <div
              className="mt-3 h-1.5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.round(xpResult.breakdown.total / 50))}%`,
                  background: "linear-gradient(90deg, #D97706, #FBBF24)",
                }}
              />
            </div>
            <div className="text-[11px] mt-1 text-right" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
              {(5000 - xpResult.breakdown.total).toLocaleString()} XP kaldı
            </div>
          </div>
        )}
      </div>

      {/* ── Seviye kartları ─────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs uppercase tracking-widest px-3" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-bebas)", letterSpacing: "0.22em" }}>
            Tüm Seviyeler
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {XP_LEVELS.filter(l => l.id !== "starter").map((level, i) => (
            <LevelCard
              key={level.id}
              level={level}
              isCurrent={current.id === level.id}
              isEarned={earnedLevelIds.includes(level.id)}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* ── Hall of Fame ────────────────────────────────────────── */}
      {hallEntries.length > 0 && (
        <HallOfFame entries={hallEntries} myId={student?.id ?? ""} />
      )}
    </div>
  );
}
