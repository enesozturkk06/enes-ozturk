"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords,
  getStudentGiftClaimsForSeason, getGiftLessonRequestsForSeason,
  getStudentXPAdjustments, getSeviyeLeaderboardData, updateStudent,
} from "@/lib/db";
import type { Student, Appointment, LessonRecord, XPAdjustment } from "@/lib/types";
import {
  computeFullXP, getLevelForXP, getCurrentSeason,
  getSeasonDateRange, getSeasonLabel, getDaysUntilSeasonEnd,
  sumManualXP, XP_LEVELS, type XPLevel, type XPResult, type SeasonXPSummary,
} from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import {
  computeTechnicalAverages, compute30DayImprovement, countEarnedBadges,
  type HallEntry,
} from "@/lib/hallOfFame";
// Büyük (500+ satır), sadece hallEntries doluyken render edilen blok —
// sayfanın ana bundle'ına gömülmesin, sadece gerçekten gösterilecekse yüklensin.
const HallOfFamePremium = dynamic(
  () => import("@/app/components/shared/HallOfFame").then(m => m.HallOfFamePremium),
  { ssr: false, loading: () => null },
);
import CircularXP from "@/app/components/shared/CircularXP";
import { PageHeader } from "@/app/components/ui";
import { Zap, Crown, Trophy, Gift, Clock, ChevronRight, ChevronDown } from "lucide-react";
import { triggerConfetti } from "@/app/components/shared/ConfettiEffect";
import { GOLD_BORDER_SOFT } from "@/app/components/dashboard/theme";

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  initial: { opacity: 0, y: 20, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ── Seviye kart bileşeni ─────────────────────────────────────────── */

function LevelCard({ level, isCurrent, isEarned, index }: {
  level: XPLevel; isCurrent: boolean; isEarned: boolean; index: number;
}) {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ y: -3 }}
      className="relative flex flex-col p-5 rounded-2xl select-none card-gold"
      style={{
        borderColor: isCurrent ? level.colorPrimary + "99" : isEarned ? level.colorPrimary + "44" : undefined,
        boxShadow: isCurrent
          ? `0 0 20px ${level.glowColor}`
          : isEarned && hover ? `0 0 16px ${level.glowColor}` : "none",
        transition: "box-shadow 0.25s, transform 0.25s",
      }}
    >
      {(isCurrent || isEarned) && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
          style={{ background: `linear-gradient(90deg, transparent, ${level.colorPrimary}, transparent)` }} />
      )}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-full"
          style={{ background: `linear-gradient(90deg, ${level.gradFrom}, ${level.gradTo})`, color: "#fff", fontFamily: "var(--font-display)", letterSpacing: "0.18em", boxShadow: `0 0 12px ${level.glowColor}` }}>
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
            style={{ fontFamily: "var(--font-display)", letterSpacing: "0.1em", color: isEarned ? level.colorPrimary : "rgba(255,255,255,0.25)" }}>
            {level.name}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
            {level.threshold.toLocaleString()} XP
          </div>
        </div>
        {isEarned && (
          <div className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: `${level.colorPrimary}22`, color: level.colorPrimary, fontFamily: "var(--font-label)" }}>
            ✓ Kazanıldı
          </div>
        )}
      </div>
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-label)" }}>
        {level.description}
      </p>
      <div className="flex items-start gap-1.5 text-[11px] pt-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: isEarned ? level.colorPrimary + "cc" : "rgba(255,255,255,0.2)", fontFamily: "var(--font-label)" }}>
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
        <span className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>{label}</span>
        <span className="text-sm font-black tabular-nums" style={{ color, fontFamily: "var(--font-display)" }}>
          {total.toLocaleString()} XP
        </span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: (animated ? ready : true) ? `${pct}%` : "0%" }}
          transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ background: color, boxShadow: `0 0 12px ${color}88` }}
        />
        {pct > 12 && (
          <div className="absolute inset-0 flex items-center pl-2.5 text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-display)" }}>
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
    <div className="card-gold-hero relative rounded-2xl p-5">
      {/* Sezon başlık */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={15} style={{ color: "var(--color-achievement)" }} />
            <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "var(--color-achievement)", fontFamily: "var(--font-display)", letterSpacing: "0.18em" }}>
              Mevcut Sezon
            </span>
          </div>
          <div className="text-lg mt-0.5" style={{ color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-display)", letterSpacing: "0.08em" }}>
            {label}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-white/30" style={{ fontFamily: "var(--font-label)" }}>Bitiş</div>
          <div className="text-xs font-semibold text-white/60" style={{ fontFamily: "var(--font-label)" }}>{seasonEnd}</div>
          <div className="flex items-center gap-1 mt-0.5 justify-end">
            <Clock size={10} style={{ color: daysLeft <= 14 ? "var(--color-error)" : "var(--color-success)" }} />
            <span className="text-[10px]" style={{ color: daysLeft <= 14 ? "var(--color-error)" : "var(--color-success)", fontFamily: "var(--font-label)" }}>
              {daysLeft} gün kaldı
            </span>
          </div>
        </div>
      </div>

      {/* Sezon XP — dairesel + bar */}
      <div className="flex items-center gap-4 mb-4">
        <CircularXP
          xp={seasonTotal}
          maxXP={Math.max(10000, seasonTotal + 500)}
          color={currentLevel.colorPrimary}
          gradFrom={currentLevel.gradFrom}
          gradTo={currentLevel.gradTo}
          size={120}
        />
        <div className="flex-1 min-w-0 space-y-3">
          <XPBar result={seasonResult} label={`${currentLevel.icon} ${currentLevel.shortName}`} color={currentLevel.colorPrimary} maxThreshold={Math.max(10000, seasonTotal + 1000)} />
          <div className="flex gap-2 flex-wrap">
            <span className="glass text-[10px] px-2 py-1 rounded-full"
              style={{ color: seasonTotal >= 5000 ? "var(--color-achievement)" : "rgba(255,255,255,0.25)", fontFamily: "var(--font-label)" }}>
              🥇 5K {seasonTotal >= 5000 ? "✓" : `${(5000 - seasonTotal).toLocaleString()} kaldı`}
            </span>
            <span className="glass text-[10px] px-2 py-1 rounded-full"
              style={{ color: seasonTotal >= 10000 ? "#C4B5FD" : "rgba(255,255,255,0.25)", fontFamily: "var(--font-label)" }}>
              💎 10K {seasonTotal >= 10000 ? "✓" : `${(10000 - seasonTotal).toLocaleString()} kaldı`}
            </span>
          </div>
        </div>
      </div>

      {/* XP dökümü */}
      {(seasonResult.breakdown.lessonsXP > 0 || seasonResult.breakdown.absenceDeduction < 0) && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "Ders XP", value: seasonResult.breakdown.lessonsXP, color: "var(--color-success)" },
            { label: "Seri Bonusu", value: seasonResult.breakdown.streakXP, color: "#60A5FA" },
            { label: "İyileşme XP", value: seasonResult.breakdown.improvementXP, color: "#A78BFA" },
            { label: "Devamsızlık", value: seasonResult.breakdown.absenceDeduction, color: "var(--color-error)" },
          ].filter(i => i.value !== 0).map(item => (
            <div key={item.label} className="glass flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg">
              <span className="text-[10px] text-white/40" style={{ fontFamily: "var(--font-label)" }}>{item.label}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: item.color, fontFamily: "var(--font-display)" }}>
                {item.value > 0 ? "+" : ""}{item.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Hediye ders durumu — bağımsız modül, ince gold sınır (dıştaki card-gold-hero'nun içinde ikinci bir tam-ağırlıklı kart olmasın) */}
      <div className="mt-4 relative rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${GOLD_BORDER_SOFT}` }}>
          <div className="text-[10px] uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-label)", letterSpacing: "0.2em" }}>
            🎁 Bu Sezon Hediye Dersler
          </div>
          <div className="space-y-2">
            {gifts.map((g, i) => {
              const toGo = Math.max(0, g.threshold - seasonTotal);
              return (
                <motion.div key={g.threshold}
                  initial={{ opacity: 0, y: 12, scale: 0.96, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                  transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="glass flex items-center gap-3 px-3 py-2.5 rounded-xl">
                  <span className="text-base flex-shrink-0">{g.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold" style={{ color: g.reached ? "var(--color-achievement)" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>
                      {g.name} — {g.threshold.toLocaleString()} XP
                    </div>
                    {!g.reached && (
                      <div className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-label)" }}>
                        {toGo.toLocaleString()} XP daha
                      </div>
                    )}
                  </div>
                  {g.claimed ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(34,197,94,0.12)", color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
                      Talep edildi
                    </span>
                  ) : g.reached ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(245,158,11,0.12)", color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
                      Onay bekleniyor
                    </span>
                  ) : null}
                </motion.div>
              );
            })}
          </div>
          <p className="text-[10px] text-white/20 mt-2.5" style={{ fontFamily: "var(--font-label)" }}>
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
    <div className="card-gold-hero relative rounded-2xl p-5 overflow-hidden"
      style={{
        borderColor: current.borderColor,
        boxShadow: `0 0 28px ${current.glowColor}`,
      }}>
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
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
              <div className="text-xs uppercase tracking-wider mb-0.5 text-white/30" style={{ fontFamily: "var(--font-label)" }}>
                Ömür Boyu Seviye
              </div>
              <div className="text-xl tracking-widest"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "0.15em", background: `linear-gradient(90deg, ${current.colorPrimary}, ${current.gradTo})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {current.name}
              </div>
              <div className="text-xs text-white/35" style={{ fontFamily: "var(--font-label)" }}>
                {xpResult.breakdown.total.toLocaleString()} toplam XP
              </div>
            </div>
          </div>
          {next ? (
            <div className="flex items-center gap-2 text-right">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-white/25" style={{ fontFamily: "var(--font-label)" }}>Sonraki</div>
                <div className="text-sm font-bold" style={{ color: next.colorPrimary, fontFamily: "var(--font-display)" }}>{next.icon} {next.shortName}</div>
                <div className="text-[10px] text-white/30" style={{ fontFamily: "var(--font-label)" }}>{xpToNext.toLocaleString()} XP</div>
              </div>
              <ChevronRight size={16} className="text-white/20" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Crown size={20} style={{ color: current.colorPrimary }} />
              <span className="text-xs font-bold" style={{ color: current.colorPrimary, fontFamily: "var(--font-display)" }}>MAKSİMUM</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative h-4 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.08)" }}>
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ background: `linear-gradient(90deg, ${current.gradFrom}, ${current.colorPrimary}, ${current.gradTo})`, boxShadow: `0 0 16px ${current.glowColor}` }}
          />
          {progressPct > 10 && (
            <div className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold text-white/90" style={{ fontFamily: "var(--font-display)" }}>
              {progressPct}%
            </div>
          )}
        </div>
        <div className="flex justify-between text-[11px] text-white/30" style={{ fontFamily: "var(--font-label)" }}>
          <span>{xpInLevel.toLocaleString()} XP bu seviyede</span>
          {next && <span>Hedef: {next.threshold.toLocaleString()} XP</span>}
        </div>
      </div>
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
  const [showInHall, setShowInHall] = useState(true);
  const [savingPref, setSavingPref] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);

  useEffect(() => {
    if (!student) return;
    const season = getCurrentSeason();
    setShowInHall(student.showInHallOfFame !== false);

    const extraFlags: Record<string, boolean> = {};
    if (typeof window !== "undefined") {
      extraFlags["shadow-fan"] = localStorage.getItem("kedi_ai_used") === "1" || localStorage.getItem("kara_ai_used") === "1";
    }

    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudentGiftClaimsForSeason(student.id, season).catch(() => []),
      getStudentXPAdjustments(student.id).catch(() => []),
      // Faz 12 Adım A — eskiden ayrı ayrı getStudents()/getAllXPAdjustments()/
      // getAppointments()/getLessonRecords() (hepsi select("*"), TÜM kolon)
      // çekiliyordu. Şimdi TEK, dar-kolonlu bir fonksiyon — satır sayısı
      // (hangi öğrenci/randevu/ders dönüyor) AYNI, sadece kolon sayısı daraldı.
      getSeviyeLeaderboardData().catch(() => ({ students: [], appointments: [], records: [], adjustments: [] })),
      getGiftLessonRequestsForSeason(season).catch(() => []),
    ]).then(([apts, recs, giftClaims, xpAdjustments, hofData, seasonGiftRequests]) => {
      // Aşağıdaki entries-oluşturma bloğu DEĞİŞMEDİ (byte-identical) — sadece
      // girdi artık dar-kolonlu geliyor. computeFullXP/computeBadges/
      // computeTechnicalAverages/compute30DayImprovement bu tiplerin SADECE
      // altta zaten var olan alanlarını okuyor (studentId/status/date/
      // overall/punch/kick/defense/conditioning/amount/createdAt/
      // completedLessons) — cast SADECE TypeScript'in eksik-alan uyarısını
      // bilerek bastırmak için, çalışma zamanı davranışı değişmiyor.
      const allStudents    = hofData.students    as unknown as Student[];
      const allAdjustments = hofData.adjustments as unknown as XPAdjustment[];
      const allAppointments= hofData.appointments as unknown as Appointment[];
      const allRecords     = hofData.records     as unknown as LessonRecord[];
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      const result = computeFullXP(student.completedLessons, apts, sorted, season, xpAdjustments);
      setSummary(result);
      setClaimed5k(giftClaims.some(c => c.threshold === 5000));
      setClaimed10k(giftClaims.some(c => c.threshold === 10000));

      // Onur Listesi: gizliliği kapatmamış tüm öğrenciler için gerçek veriler
      const entries: HallEntry[] = allStudents
        .filter(s => s.showInHallOfFame !== false)
        .map(s => {
          const isMe        = s.id === student.id;
          const sApts       = allAppointments.filter(a => a.studentId === s.id);
          const sRecsSorted = [...allRecords.filter(r => r.studentId === s.id)].sort((a, b) => b.date.localeCompare(a.date));
          const sAdjustments= allAdjustments.filter(a => a.studentId === s.id);
          const manualXP    = sumManualXP(sAdjustments);

          const xpResult = isMe
            ? result.lifetimeResult
            : computeFullXP(s.completedLessons, sApts, sRecsSorted, season, sAdjustments).lifetimeResult;

          const badges = computeBadges(s, sApts, sRecsSorted, isMe ? extraFlags : {}, manualXP);
          const sGiftRequests = seasonGiftRequests.filter(g => g.studentId === s.id);

          const entry: HallEntry = {
            studentId:        s.id,
            name:             s.fullName,
            isMe,
            xp:               xpResult.breakdown.total,
            level:            xpResult.level.current,
            completedLessons: s.completedLessons,
            badgeCount:       countEarnedBadges(badges),
            technical:        computeTechnicalAverages(sRecsSorted),
            improvement:      compute30DayImprovement(sRecsSorted),
            giftEligible:     sGiftRequests.length > 0,
            giftClaimed:      sGiftRequests.some(g => g.status === "approved"),
            featured:         s.hallFeatured ?? false,
            studentOfMonth:   s.isStudentOfMonth ?? false,
            avatarUrl:        s.avatarUrl,
            packageType:      s.packageType,
          };
          return entry;
        })
        .filter(e => e.xp > 0 || e.completedLessons > 0);

      setHallEntries(entries);
      setLoading(false);

      // Seviye atlama konfetisi
      if (typeof window !== "undefined") {
        const newLevelId = result.lifetimeResult.level.current.id;
        const prevLevelId = localStorage.getItem("kedi_last_level");
        if (prevLevelId && prevLevelId !== newLevelId) {
          setTimeout(() => triggerConfetti("levelup"), 1000);
        }
        localStorage.setItem("kedi_last_level", newLevelId);
      }
    }).catch(() => setLoading(false));
  }, [student]);

  const togglePrivacy = () => {
    if (!student || savingPref) return;
    const next = !showInHall;
    setShowInHall(next);
    setSavingPref(true);
    updateStudent(student.id, { showInHallOfFame: next })
      .catch(() => setShowInHall(!next))
      .finally(() => setSavingPref(false));
  };

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
    <motion.div variants={stagger} initial="initial" animate="animate"
      className="p-4 sm:p-5 lg:p-7 max-w-3xl mx-auto space-y-5 sm:space-y-6 pb-28 sm:pb-8">
      <PageHeader title="Seviye Merkezi" subtitle="Sezon XP, hediye dersler ve ömür boyu prestij" />

      {/* ── 1. Ömür boyu seviye + progress ──────────────────────── */}
      <motion.div variants={fadeUp}>
        <LifetimeXPCard xpResult={lifetimeXP} />
      </motion.div>

      {/* ── 2. Onur Listesi — öğrencinin en çok merak ettiği ────── */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-white/8" />
          <span className="text-xs uppercase tracking-widest px-3 text-white/25" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.22em" }}>
            Onur Listesi
          </span>
          <div className="h-px flex-1 bg-white/8" />
        </div>

        {/* Gizlilik tercihi */}
        <button
          onClick={togglePrivacy}
          disabled={savingPref}
          className="glass w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 sm:py-3 mb-3 rounded-xl transition-opacity duration-200"
          style={{ opacity: savingPref ? 0.6 : 1, cursor: savingPref ? "wait" : "pointer" }}
        >
          <div className="text-left">
            <div className="text-xs font-semibold text-white/70" style={{ fontFamily: "var(--font-label)", letterSpacing: "0.04em" }}>
              Onur Listesi&apos;nde görünmek istiyorum
            </div>
            <div className="text-[10px] mt-0.5 text-white/30" style={{ fontFamily: "var(--font-label)" }}>
              Kapatırsan adın hiçbir sıralamada görünmez
            </div>
          </div>
          <div
            className="relative flex-shrink-0 rounded-full transition-all duration-200"
            style={{
              width: 42, height: 24,
              background: showInHall ? "linear-gradient(90deg, #8F7A52, #E3C68C)" : "rgba(255,255,255,0.08)",
              boxShadow: showInHall ? "0 0 12px rgba(201,169,110,0.45)" : "none",
            }}
          >
            <motion.div
              className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white"
              animate={{ left: showInHall ? 21 : 3 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </button>

        {hallEntries.length > 0 && <HallOfFamePremium entries={hallEntries} />}
      </motion.div>

      {/* ── 3. Sezon kartı ──────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <SeasonCard summary={summary} claimed5k={claimed5k} claimed10k={claimed10k} />
      </motion.div>

      {/* ── 4. Ömür boyu seviyeler — mobilde accordion ──────────── */}
      <motion.div variants={fadeUp}>
        {/* Başlık — mobilde tıklanabilir accordion trigger */}
        <button
          type="button"
          onClick={() => setLevelsOpen(o => !o)}
          className="flex items-center w-full gap-2 mb-4"
        >
          <div className="h-px flex-1 bg-white/8" />
          <span className="text-xs uppercase tracking-widest px-3 flex items-center gap-2 text-white/25" style={{ fontFamily: "var(--font-display)", letterSpacing: "0.22em" }}>
            Ömür Boyu Seviyeler
            <ChevronDown
              size={12}
              className="sm:hidden transition-transform duration-200"
              style={{ transform: levelsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </span>
          <div className="h-px flex-1 bg-white/8" />
        </button>

        {/* Kartlar — mobilde accordion, masaüstünde her zaman açık */}
        <div className={levelsOpen ? "block" : "hidden sm:block"}>
          <motion.div variants={stagger} initial="initial" animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {XP_LEVELS.filter(l => l.id !== "starter").map((level, i) => (
              <LevelCard
                key={level.id}
                level={level}
                isCurrent={currentLevel.id === level.id}
                isEarned={earnedLevelIds.includes(level.id)}
                index={i}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
