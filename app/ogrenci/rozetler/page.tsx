"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getStudentAppointments, getLessonRecords, getStudentXPAdjustments } from "@/lib/db";
import type { Appointment, LessonRecord, XPAdjustment } from "@/lib/types";
import { sumManualXP } from "@/lib/xp";
import {
  computeBadges, RARITY_LABELS,
  type Badge, type Rarity,
} from "@/lib/badges";
import { PageHeader } from "@/app/components/ui";
import { Lock, Award } from "lucide-react";
import { triggerConfetti } from "@/app/components/shared/ConfettiEffect";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const fadeUp = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

/** Görsel nadirlik kademesi — madalya esintili (Bronz/Gümüş/Altın/Platin) renk ataması.
 *  Gerçek rarity etiketleri (Yaygın/Nadir/Destansı/Efsanevi, lib/badges.ts) değişmiyor,
 *  bu sadece ek bir görsel katman. legendary tek "akan gradient" alan kademe. */
const RARITY_TIER_COLOR: Record<Rarity, string> = {
  common:    "#C08552",
  rare:      "#94A3B8",
  epic:      "var(--color-achievement)",
  legendary: "#C4B5FD",
};

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const duration = 600;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

/* ── Yardımcı ─────────────────────────────────────────────────────── */

function BadgeCard({ badge, index }: { badge: Badge; index: number }) {
  const [hover, setHover] = useState(false);
  const tierColor = RARITY_TIER_COLOR[badge.rarity];
  const isLegendary = badge.rarity === "legendary";
  const pct = badge.progressMax > 0 ? Math.round((badge.progressCurrent / badge.progressMax) * 100) : 0;

  return (
    <motion.div
      variants={fadeUp}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      whileHover={{ y: -3 }}
      className={`relative rounded-2xl overflow-hidden ${
        badge.earned && isLegendary ? "p-[1px] gradient-animated gradient-slow gradient-violet-pink-orange" : "p-px"
      }`}
      style={{ background: badge.earned && !isLegendary ? `${tierColor}40` : "rgba(255,255,255,0.06)" }}
    >
      <div
        className={`relative flex flex-col items-center text-center p-5 h-full select-none ${badge.earned ? "glass-strong" : "glass"}`}
        style={{
          boxShadow: badge.earned && hover ? `0 0 28px ${badge.color}35` : "none",
          transition: "box-shadow 0.25s",
        }}
      >
        {/* Rarity şerit */}
        {badge.earned && (
          <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, transparent, ${badge.color}, transparent)` }} />
        )}

        {/* Rozet ikonu */}
        <div
          className="relative w-14 h-14 flex items-center justify-center text-3xl mb-3 rounded-full transition-transform duration-300"
          style={{
            background:  badge.earned ? badge.bgColor : "rgba(255,255,255,0.04)",
            border:      `1px solid ${badge.earned ? badge.color + "40" : "rgba(255,255,255,0.08)"}`,
            transform:   hover && badge.earned ? "scale(1.12)" : "scale(1)",
            filter:      badge.earned ? "none" : "grayscale(1) brightness(0.4)",
            boxShadow:   badge.earned ? `0 0 16px ${badge.color}30` : "none",
          }}
        >
          {badge.icon}
          {!badge.earned && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
              <Lock size={14} className="text-white/25" />
            </div>
          )}
        </div>

        {/* Rarity çipi — madalya esintili tier rengi, gerçek etiket metni aynı */}
        <span
          className="text-[9px] tracking-[0.3em] uppercase font-semibold mb-1.5 px-2 py-0.5 rounded-full"
          style={{
            color:      badge.earned ? tierColor : "rgba(255,255,255,0.15)",
            background: badge.earned ? `${isLegendary ? "#8B5CF6" : tierColor}1f` : "rgba(255,255,255,0.04)",
            fontFamily: "var(--font-label)",
          }}
        >
          {RARITY_LABELS[badge.rarity]}
        </span>

        {/* İsim */}
        <h3 className="text-sm font-semibold mb-1 transition-colors duration-200"
          style={{ color: badge.earned ? "#fff" : "rgba(255,255,255,0.25)", fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}>
          {badge.name}
        </h3>

        {/* Açıklama */}
        <p className="text-[10px] leading-relaxed"
          style={{ color: badge.earned ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)", fontFamily: "var(--font-label)" }}>
          {badge.description}
        </p>

        {/* Progress bar (kazanılmamış, ilerleme varsa) */}
        {!badge.earned && badge.progressMax > 1 && (
          <div className="w-full mt-3">
            <div className="flex justify-between text-[9px] mb-1" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-label)" }}>
              <span>{badge.progressCurrent}/{badge.progressMax}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: index * 0.03 }}
                style={{ background: `linear-gradient(90deg, ${badge.color}60, ${badge.color}) ` }}
              />
            </div>
          </div>
        )}

        {/* Kazanıldı damgası */}
        {badge.earned && (
          <div className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full"
            style={{ background: `${badge.color}25`, border: `1px solid ${badge.color}45` }}>
            <Award size={10} style={{ color: badge.color }} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Ana sayfa ────────────────────────────────────────────────────── */

export default function RozetlerPage() {
  const { student } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords]           = useState<LessonRecord[]>([]);
  const [adjustments, setAdjustments]   = useState<XPAdjustment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<"all" | "earned" | "locked">("all");

  useEffect(() => {
    if (!student) return;
    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudentXPAdjustments(student.id).catch(() => []),
    ]).then(([apts, recs, adjs]) => {
      setAppointments(apts);
      setRecords(recs);
      setAdjustments(adjs);
      setLoading(false);

      // Son 48 saatte kazanılan rozet varsa konfeti
      const manualXP = sumManualXP(adjs);
      const allBadges = computeBadges(student, apts, recs, {}, manualXP);
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const newlyEarned = allBadges.filter(b => b.earned && b.earnedAt && b.earnedAt >= cutoff);
      if (newlyEarned.length > 0) {
        setTimeout(() => triggerConfetti("badge"), 800);
      }
    });
  }, [student]);

  if (!student || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#8B5CF6", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // localStorage'dan KARA flag'ini oku
  const extraFlags: Record<string, boolean> = {};
  if (typeof window !== "undefined") {
    extraFlags["shadow-fan"] = localStorage.getItem("kedi_ai_used") === "1" || localStorage.getItem("kara_ai_used") === "1";
  }

  const manualXP = sumManualXP(adjustments);
  const badges  = computeBadges(student, appointments, records, extraFlags, manualXP);
  const earned  = badges.filter(b => b.earned);
  const locked  = badges.filter(b => !b.earned);

  const shown = filter === "earned"
    ? earned
    : filter === "locked"
    ? locked
    : badges;

  /* Rarity bazlı sıralama: legendary > epic > rare > common */
  const order: Record<Rarity, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const sorted = [...shown].sort((a, b) => {
    if (a.earned !== b.earned) return a.earned ? -1 : 1;
    return order[a.rarity] - order[b.rarity];
  });

  const collectionPct = badges.length > 0 ? Math.round((earned.length / badges.length) * 100) : 0;
  const FILTERS: ["all" | "earned" | "locked", string][] = [
    ["all", "Tümü"], ["earned", `Kazanılan (${earned.length})`], ["locked", `Kilitli (${locked.length})`],
  ];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Rozetlerim" subtitle="Başarılarınla kazandığın ödüller" accent="Koleksiyon" />

      {/* Özet stat kartları */}
      <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3">
        {[
          { label: "Kazanılan", value: earned.length, color: "#8B5CF6" },
          { label: "Toplam",    value: badges.length, color: "#60A5FA" },
          { label: "Kilitli",   value: locked.length, color: "rgba(255,255,255,0.4)" },
        ].map(s => (
          <div key={s.label} className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet">
            <div className="glass relative rounded-2xl p-4 text-center">
              <div className="text-3xl leading-none" style={{ color: s.color, fontFamily: "var(--font-display)" }}>
                <CountUp value={s.value} />
              </div>
              <div className="text-[10px] mt-1 tracking-widest uppercase text-white/30" style={{ fontFamily: "var(--font-label)" }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* İlerleme çubuğu */}
      <motion.div variants={fadeUp} className="glass-strong rounded-2xl p-4">
        <div className="flex justify-between text-xs mb-2" style={{ fontFamily: "var(--font-label)" }}>
          <span style={{ color: "#A78BFA" }}>Koleksiyon İlerlemesi</span>
          <span className="text-white/35">{earned.length} / {badges.length} rozet</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <motion.div
            className="h-full rounded-full gradient-animated gradient-violet-pink-orange"
            initial={{ width: 0 }}
            animate={{ width: `${collectionPct}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Filtre butonları */}
      <motion.div variants={fadeUp} className="flex items-center gap-1.5 glass rounded-xl p-1 w-fit">
        {FILTERS.map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="relative px-4 py-1.5 text-xs tracking-widest uppercase rounded-lg transition-colors"
            style={{ fontFamily: "var(--font-label)", color: filter === f ? "#fff" : "rgba(255,255,255,0.4)" }}
          >
            {filter === f && (
              <motion.div layoutId="rozetler-filter-pill" className="absolute inset-0 rounded-lg gradient-animated gradient-slow gradient-violet-pink-orange -z-10" />
            )}
            {label}
          </button>
        ))}
      </motion.div>

      {/* Rozet ızgarası */}
      <AnimatePresence mode="popLayout">
        {sorted.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass text-center py-16 rounded-2xl">
            <div className="text-5xl mb-4">🔒</div>
            <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-label)" }}>
              Bu kategoride rozet yok
            </p>
          </motion.div>
        ) : (
          <motion.div variants={stagger} initial="initial" animate="animate"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sorted.map((badge, i) => (
              <BadgeCard key={badge.id} badge={badge} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dipnot */}
      <p className="text-center text-[10px] pb-2 text-white/20" style={{ fontFamily: "var(--font-label)" }}>
        Rozetler ders geçmişin ve aktivitene göre otomatik güncellenir
      </p>
    </motion.div>
  );
}
