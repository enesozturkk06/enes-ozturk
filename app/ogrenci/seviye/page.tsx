"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudents,
  getStudentGiftClaimsForSeason,
} from "@/lib/db";
import type { Student } from "@/lib/types";
import {
  computeFullXP, getLevelForXP, getCurrentSeason,
  getSeasonDateRange, getSeasonLabel, getDaysUntilSeasonEnd,
  XP_LEVELS, type XPLevel, type XPResult, type SeasonXPSummary,
} from "@/lib/xp";
import { PageHeader } from "@/app/components/ui";
import { Zap, Crown, Trophy, Gift, Clock, ChevronRight } from "lucide-react";

/* ── Seviye kart bileşeni ─────────────────────────────────────────── */

function LevelCard({ level, isCurrent, isEarned, index }: {
  level: XPLevel; isCurrent: boolean; isEarned: boolean; index: number;
}) {
  const [hover, setHover] = useState(false);
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
        borderColor: isCurrent ? level.colorPrimary + "99" : isEarned ? level.colorPrimary + "44" : "rgba(255,255,255,0.06)",
        boxShadow: isCurrent
          ? `0 0 32px ${level.glowColor}, 0 0 12px ${level.glowColor}`
          : isEarned && hover ? `0 0 20px ${level.glowColor}` : "none",
        borderRadius: 2,
      }}
    >
      {(isCurrent || isEarned) && (
        <div className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, transparent, ${level.colorPrimary}, transparent)` }} />
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase"
          style={{ background: `linear-gradient(90deg, ${level.gradFrom}, ${level.gradTo})`, color: "#fff", borderRadius: 12, fontFamily: "var(--font-bebas)", letterSpacing: "0.18em", boxShadow: `0 0 12px ${level.glowColor}` }}>
          ŞU AN BURADASIN
        </div>
      )}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0 rounded-full transition-transform duration-300"
          style={{
            background: isEarned ? `radial-gradient(circle, ${level.gradFrom}44, ${level.gradTo}22)` : "rgba(255,255,255,0.04)",
            border: `1px solid ${isEarned ? level.borderColor : "rgba(255,255,255,0.08)"}`,
            transform: hover && isEarned ? "scale(1.12)" : "scale(1)",
            filter: isEarned ? `drop-shadow(0 0 8px ${level.colorPrimary}88)` : "grayscale(1) opacity(0.35)",
          }}>
          {level.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold tracking-wide truncate"
            style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.1em", color: isEarned ? level.colorPrimary : "rgba(255,255,255,0.25)" }}>
            {level.name}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
            {level.threshold.toLocaleString()} XP
          </div>
        </div>
        {isEarned && (
          <div className="text-[10px] px-2 py-0.5 rounded"
            style={{ background: `${level.colorPrimary}22`, border: `1px solid ${level.colorPrimary}44`, color: level.colorPrimary, fontFamily: "var(--font-barlow-condensed)" }}>
            ✓ Kazanıldı
          </div>
        )}
      </div>
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-barlow-condensed)" }}>
        {level.description}
      </p>
      <div className="flex items-start gap-1.5 text-[11px] pt-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: isEarned ? level.colorPrimary + "cc" : "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
        <Gift size={12} className="mt-0.5 flex-shrink-0" />
        <span>{level.reward}</span>
      </div>
    </motion.div>
  );
}

/* ── XP progress bar ─────────────────────────────────────────────── */

function XPBar({ result, label, color, maxThreshold, animated = true }: {
  result: XPResult; label: string; color: string; maxThreshold: number; animated?: boolean;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 400); return () => clearTimeout(t); }, []);

  const total = result.breakdown.total;
  const pct   = Math.min(100, Math.round((total / maxThreshold) * 100));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>{label}</span>
        <span className="text-sm font-black tabular-nums" style={{ color, fontFamily: "var(--font-bebas)" }}>
          {total.toLocaleString()} XP
        </span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: (animated ? ready : true) ? `${pct}%` : "0%" }}
          transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ background: color, boxShadow: `0 0 12px ${color}88` }}
        />
        {pct > 12 && (
          <div className="absolute inset-0 flex items-center pl-2.5 text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-bebas)" }}>
            {pct}%
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sezon kartı ─────────────────────────────────────────────────── */

function SeasonCard({ summary, claimed5k, claimed10k }: {
  summary: SeasonXPSummary; claimed5k: boolean; claimed10k: boolean;
}) {
  const { season, seasonEnd, seasonResult } = summary;
  const seasonTotal = seasonResult.breakdown.total;
  const daysLeft    = getDaysUntilSeasonEnd(season);
  const label       = getSeasonLabel(season);
  const currentLevel = seasonResult.level.current;

  const gifts = [
    { threshold: 5000,  icon: "🥇", name: "Altın Sporcu", claimed: claimed5k,  reached: seasonTotal >= 5000  },
    { threshold: 10000, icon: "💎", name: "Elmas Sporcu", claimed: claimed10k, reached: seasonTotal >= 10000 },
  ];

  return (
    <div className="p-5 border" style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
      {/* Sezon başlık */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: "#FBBF24" }} />
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "#FBBF24", fontFamily: "var(--font-bebas)", letterSpacing: "0.18em" }}>
              Mevcut Sezon
            </span>
          </div>
          <div className="text-lg font-black mt-0.5" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-bebas)", letterSpacing: "0.1em" }}>
            {label}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>Bitiş</div>
          <div className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-barlow-condensed)" }}>{seasonEnd}</div>
          <div className="flex items-center gap-1 mt-0.5 justify-end">
            <Clock size={10} style={{ color: daysLeft <= 14 ? "#F87171" : "#34D399" }} />
            <span className="text-[10px]" style={{ color: daysLeft <= 14 ? "#F87171" : "#34D399", fontFamily: "var(--font-barlow-condensed)" }}>
              {daysLeft} gün kaldı
            </span>
          </div>
        </div>
      </div>

      {/* Sezon XP barları */}
      <div className="space-y-3 mb-4">
        <XPBar result={seasonResult} label={`Bu sezon XP — ${currentLevel.icon} ${currentLevel.shortName}`} color={currentLevel.colorPrimary} maxThreshold={Math.max(10000, seasonTotal + 1000)} />
      </div>

      {/* XP dökümü */}
      {(seasonResult.breakdown.lessonsXP > 0 || seasonResult.breakdown.absenceDeduction < 0) && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "Ders XP", value: seasonResult.breakdown.lessonsXP, color: "#34D399" },
            { label: "Seri Bonusu", value: seasonResult.breakdown.streakXP, color: "#60A5FA" },
            { label: "İyileşme XP", value: seasonResult.breakdown.improvementXP, color: "#A78BFA" },
            { label: "Devamsızlık", value: seasonResult.breakdown.absenceDeduction, color: "#F87171" },
          ].filter(i => i.value !== 0).map(item => (
            <div key={item.label} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>{item.label}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: item.color, fontFamily: "var(--font-bebas)" }}>
                {item.value > 0 ? "+" : ""}{item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hediye ders durumu */}
      <div className="pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-bebas)", letterSpacing: "0.2em" }}>
          Bu Sezon Hediye Dersler
        </div>
        <div className="space-y-2">
          {gifts.map(g => {
            const toGo = Math.max(0, g.threshold - seasonTotal);
            return (
              <div key={g.threshold} className="flex items-center gap-3 px-3 py-2 rounded"
                style={{
                  background: g.reached ? "rgba(251,191,36,0.05)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${g.reached ? "rgba(251,191,36,0.2)" : "rgba(255,255,255,0.06)"}`,
                }}>
                <span className="text-base">{g.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold" style={{ color: g.reached ? "#FCD34D" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                    {g.name} — {g.threshold.toLocaleString()} XP
                  </div>
                  {!g.reached && (
                    <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
                      {toGo.toLocaleString()} XP daha
                    </div>
                  )}
                </div>
                {g.claimed ? (
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", color: "#34D399", fontFamily: "var(--font-barlow-condensed)" }}>
                    Talep edildi
                  </span>
                ) : g.reached ? (
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#FCD34D", fontFamily: "var(--font-barlow-condensed)" }}>
                    Onay bekleniyor
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
          Yeni sezon başladığında hediye ders hakkın tekrar açılır (maks 2/sezon).
        </p>
      </div>
    </div>
  );
}

/* ── Ömür boyu XP kartı ──────────────────────────────────────────── */

function LifetimeXPCard({ xpResult }: { xpResult: XPResult }) {
  const { current, next, progressPct, xpInLevel, xpToNext } = xpResult.level;

  return (
    <div className="p-5 border relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${current.gradFrom}22, rgba(0,0,0,0) 60%), rgba(255,255,255,0.025)`,
        borderColor: current.borderColor,
        boxShadow: `0 0 40px ${current.glowColor}, inset 0 0 40px ${current.glowColor}22`,
        borderRadius: 2,
      }}>
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: current.glowColor, filter: "blur(60px)", opacity: 0.4 }} />
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${current.colorPrimary}, ${next?.colorPrimary ?? current.colorPrimary}, transparent)` }} />

      <div className="relative">
        {/* Başlık */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 flex items-center justify-center text-3xl rounded-full"
              style={{ background: `radial-gradient(circle, ${current.gradFrom}55, ${current.gradTo}22)`, border: `2px solid ${current.borderColor}`, boxShadow: `0 0 24px ${current.glowColor}, 0 0 8px ${current.glowColor}` }}>
              {current.icon}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                Ömür Boyu Seviye
              </div>
              <div className="text-xl font-black tracking-widest"
                style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.15em", background: `linear-gradient(90deg, ${current.colorPrimary}, ${current.gradTo})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {current.name}
              </div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
                {xpResult.breakdown.total.toLocaleString()} toplam XP
              </div>
            </div>
          </div>
          {next ? (
            <div className="flex items-center gap-2 text-right">
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>Sonraki</div>
                <div className="text-sm font-bold" style={{ color: next.colorPrimary, fontFamily: "var(--font-bebas)" }}>{next.icon} {next.shortName}</div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>{xpToNext.toLocaleString()} XP</div>
              </div>
              <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.2)" }} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Crown size={20} style={{ color: current.colorPrimary }} />
              <span className="text-xs font-bold" style={{ color: current.colorPrimary, fontFamily: "var(--font-bebas)" }}>MAKSİMUM</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative h-4 rounded-full overflow-hidden mb-2"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ background: `linear-gradient(90deg, ${current.gradFrom}, ${current.colorPrimary}, ${current.gradTo})`, boxShadow: `0 0 16px ${current.glowColor}` }}
          />
          {progressPct > 10 && (
            <div className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold"
              style={{ color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-bebas)" }}>
              {progressPct}%
            </div>
          )}
        </div>
        <div className="flex justify-between text-[11px]" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
          <span>{xpInLevel.toLocaleString()} XP bu seviyede</span>
          {next && <span>Hedef: {next.threshold.toLocaleString()} XP</span>}
        </div>
      </div>
    </div>
  );
}

/* ── Hall of Fame ─────────────────────────────────────────────────── */

interface HallEntry { name: string; xp: number; level: XPLevel; isMe: boolean; }

function HallOfFame({ entries }: { entries: HallEntry[] }) {
  const top = entries.slice(0, 5);
  const rankStyle: Record<number, { bg: string; border: string; color: string; badge: string }> = {
    0: { bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.4)", color: "#FBBF24", badge: "🥇" },
    1: { bg: "rgba(209,213,219,0.07)", border: "rgba(209,213,219,0.3)", color: "#D1D5DB", badge: "🥈" },
    2: { bg: "rgba(205,127,50,0.07)", border: "rgba(205,127,50,0.3)", color: "#CD7F32", badge: "🥉" },
  };

  return (
    <div className="p-5 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.07)", borderRadius: 2 }}>
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} style={{ color: "#FBBF24" }} />
        <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-bebas)", letterSpacing: "0.15em" }}>
          Onur Listesi — Ömür Boyu XP
        </span>
      </div>
      {top.length === 0 ? (
        <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>Henüz sıralama yok</p>
      ) : (
        <div className="space-y-2">
          {top.map((entry, i) => {
            const rs = rankStyle[i];
            return (
              <motion.div key={entry.name + i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded"
                style={{ background: entry.isMe ? "rgba(139,92,246,0.1)" : (rs?.bg ?? "rgba(255,255,255,0.03)"), border: `1px solid ${entry.isMe ? "rgba(139,92,246,0.3)" : (rs?.border ?? "rgba(255,255,255,0.06)")}` }}>
                <span className="text-lg w-8 flex-shrink-0 text-center">{rs?.badge ?? `${i + 1}.`}</span>
                <span className="text-xl flex-shrink-0">{entry.level.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: entry.isMe ? "#C4B5FD" : "rgba(255,255,255,0.75)", fontFamily: "var(--font-barlow-condensed)" }}>
                    {entry.name} {entry.isMe && <span style={{ color: "#8B5CF6" }}>(Sen)</span>}
                  </div>
                  <div className="text-[10px]" style={{ color: entry.level.colorPrimary, fontFamily: "var(--font-barlow-condensed)" }}>{entry.level.name}</div>
                </div>
                <span className="text-sm font-black tabular-nums" style={{ color: rs?.color ?? "rgba(255,255,255,0.4)", fontFamily: "var(--font-bebas)" }}>
                  {entry.xp.toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Ana sayfa ───────────────────────────────────────────────────── */

export default function SeviyeMerkeziPage() {
  const { student } = useAuth();
  const [summary, setSummary]       = useState<SeasonXPSummary | null>(null);
  const [claimed5k, setClaimed5k]   = useState(false);
  const [claimed10k, setClaimed10k] = useState(false);
  const [hallEntries, setHallEntries] = useState<HallEntry[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!student) return;
    const season = getCurrentSeason();

    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudents().catch(() => [] as Student[]),
      getStudentGiftClaimsForSeason(student.id, season).catch(() => []),
    ]).then(([apts, recs, allStudents, giftClaims]) => {
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      const result = computeFullXP(student.completedLessons, apts, sorted, season);
      setSummary(result);
      setClaimed5k(giftClaims.some(c => c.threshold === 5000));
      setClaimed10k(giftClaims.some(c => c.threshold === 10000));

      // Hall of Fame: ömür boyu XP için tüm öğrenciler (heuristic: completedLessons × 100)
      const entries: HallEntry[] = allStudents
        .filter(s => s.completedLessons > 0)
        .map(s => {
          const approxXP   = s.completedLessons * 100;
          const levelInfo  = getLevelForXP(approxXP);
          return { name: s.fullName, xp: approxXP, level: levelInfo.current, isMe: s.id === student.id };
        })
        .sort((a, b) => b.xp - a.xp);

      // Kendi gerçek ömür boyu XP'sini güncelle
      const myIdx = entries.findIndex(e => e.isMe);
      if (myIdx !== -1) {
        entries[myIdx].xp    = result.lifetimeResult.breakdown.total;
        entries[myIdx].level = result.lifetimeResult.level.current;
        entries.sort((a, b) => b.xp - a.xp);
      }
      setHallEntries(entries);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [student]);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2"
          style={{ borderColor: "rgba(139,92,246,0.4)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const lifetimeXP    = summary.lifetimeResult;
  const earnedLevelIds = XP_LEVELS.filter(l => lifetimeXP.breakdown.total >= l.threshold).map(l => l.id);
  const currentLevel   = lifetimeXP.level.current;

  return (
    <div className="p-5 lg:p-7 max-w-3xl mx-auto space-y-6">
      <PageHeader title="Seviye Merkezi" subtitle="Sezon XP, hediye dersler ve ömür boyu prestij" />

      {/* ── Ömür boyu seviye + progress ─────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <LifetimeXPCard xpResult={lifetimeXP} />
      </motion.div>

      {/* ── Sezon kartı ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <SeasonCard summary={summary} claimed5k={claimed5k} claimed10k={claimed10k} />
      </motion.div>

      {/* ── Tüm seviye kartları (ömür boyu) ─────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs uppercase tracking-widest px-3" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-bebas)", letterSpacing: "0.22em" }}>
            Ömür Boyu Seviyeler
          </span>
          <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {XP_LEVELS.filter(l => l.id !== "starter").map((level, i) => (
            <LevelCard
              key={level.id}
              level={level}
              isCurrent={currentLevel.id === level.id}
              isEarned={earnedLevelIds.includes(level.id)}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* ── Hall of Fame ────────────────────────────────────────── */}
      {hallEntries.length > 0 && <HallOfFame entries={hallEntries} />}
    </div>
  );
}
