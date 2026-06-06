"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getStudentAppointments, getLessonRecords } from "@/lib/db";
import type { Appointment, LessonRecord } from "@/lib/types";
import {
  computeBadges, RARITY_LABELS, RARITY_COLORS,
  type Badge, type Rarity,
} from "@/lib/badges";
import { PageHeader } from "@/app/components/ui";
import { Lock, Award } from "lucide-react";

/* ── Yardımcı ─────────────────────────────────────────────────────── */

const rarityBorderStyle: Record<Rarity, string> = {
  common:    "rgba(167,139,250,0.2)",
  rare:      "rgba(139,92,246,0.3)",
  epic:      "rgba(124,58,237,0.4)",
  legendary: "rgba(91,33,182,0.5)",
};

function BadgeCard({ badge, index }: { badge: Badge; index: number }) {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.3, ease: "easeOut" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex flex-col items-center text-center p-5 border transition-all duration-300 select-none"
      style={{
        background:   badge.earned
          ? badge.bgColor
          : "rgba(255,255,255,0.02)",
        borderColor:  badge.earned
          ? rarityBorderStyle[badge.rarity]
          : "rgba(255,255,255,0.06)",
        boxShadow:    badge.earned && hover
          ? `0 0 24px ${badge.color}30, 0 0 8px ${badge.color}15`
          : badge.earned
          ? `0 0 12px ${badge.color}20`
          : "none",
      }}
    >
      {/* Rarity şerit */}
      {badge.earned && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: `linear-gradient(90deg, transparent, ${badge.color}, transparent)` }}
        />
      )}

      {/* Rozet ikonu */}
      <div
        className="relative w-14 h-14 flex items-center justify-center text-3xl mb-3 rounded-full transition-transform duration-300"
        style={{
          background:  badge.earned ? badge.bgColor : "rgba(255,255,255,0.04)",
          border:      `1px solid ${badge.earned ? badge.color + "30" : "rgba(255,255,255,0.06)"}`,
          transform:   hover && badge.earned ? "scale(1.1)" : "scale(1)",
          filter:      badge.earned ? "none" : "grayscale(1) brightness(0.4)",
        }}
      >
        {badge.icon}
        {!badge.earned && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
            <Lock size={14} className="text-white/25" />
          </div>
        )}
      </div>

      {/* Rarity badge */}
      <span
        className="text-[9px] tracking-[0.3em] uppercase font-semibold mb-1.5 px-2 py-0.5 rounded-sm"
        style={{
          color:       badge.earned ? RARITY_COLORS[badge.rarity] : "rgba(255,255,255,0.15)",
          background:  badge.earned ? `${RARITY_COLORS[badge.rarity]}12` : "rgba(255,255,255,0.04)",
          fontFamily:  "var(--font-barlow-condensed)",
        }}
      >
        {RARITY_LABELS[badge.rarity]}
      </span>

      {/* İsim */}
      <h3
        className="text-sm font-semibold mb-1 transition-colors duration-200"
        style={{
          color:      badge.earned ? "#fff" : "rgba(255,255,255,0.2)",
          fontFamily: "var(--font-barlow-condensed)",
          letterSpacing: "0.05em",
        }}
      >
        {badge.name}
      </h3>

      {/* Açıklama */}
      <p
        className="text-[10px] leading-relaxed"
        style={{
          color:      badge.earned ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)",
          fontFamily: "var(--font-inter)",
        }}
      >
        {badge.description}
      </p>

      {/* Progress bar (kazanılmamış, ilerleme varsa) */}
      {!badge.earned && badge.progressMax > 1 && (
        <div className="w-full mt-3">
          <div className="flex justify-between text-[9px] mb-1" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
            <span>{badge.progressCurrent}/{badge.progressMax}</span>
            <span>{Math.round((badge.progressCurrent / badge.progressMax) * 100)}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width:      `${Math.round((badge.progressCurrent / badge.progressMax) * 100)}%`,
                background: `linear-gradient(90deg, ${badge.color}60, ${badge.color}90)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Kazanıldı damgası */}
      {badge.earned && (
        <div
          className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full text-[9px]"
          style={{ background: `${badge.color}20`, border: `1px solid ${badge.color}40` }}
        >
          <Award size={10} style={{ color: badge.color }} />
        </div>
      )}
    </motion.div>
  );
}

/* ── Ana sayfa ────────────────────────────────────────────────────── */

export default function RozetlerPage() {
  const { student } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords]           = useState<LessonRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<"all" | "earned" | "locked">("all");

  useEffect(() => {
    if (!student) return;
    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
    ]).then(([apts, recs]) => {
      setAppointments(apts);
      setRecords(recs);
      setLoading(false);
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

  const badges  = computeBadges(student, appointments, records, extraFlags);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="Rozetlerim" subtitle="Başarılarınla kazandığın ödüller" accent="Koleksiyon" />

      {/* Özet stat bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Kazanılan",  value: earned.length, color: "#8B5CF6" },
          { label: "Toplam",     value: badges.length, color: "rgba(255,255,255,0.4)" },
          { label: "Kilitli",    value: locked.length, color: "rgba(255,255,255,0.2)" },
        ].map(s => (
          <div
            key={s.label}
            className="p-4 border text-center"
            style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(139,92,246,0.12)" }}
          >
            <div
              className="text-3xl font-bold leading-none"
              style={{ color: s.color, fontFamily: "var(--font-bebas)" }}
            >
              {s.value}
            </div>
            <div
              className="text-[10px] mt-1 tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* İlerleme çubuğu */}
      <div
        className="p-4 border"
        style={{ background: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.15)" }}
      >
        <div className="flex justify-between text-xs mb-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          <span style={{ color: "#8B5CF6" }}>Koleksiyon İlerlemesi</span>
          <span style={{ color: "rgba(255,255,255,0.35)" }}>
            {earned.length} / {badges.length} rozet
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.round((earned.length / badges.length) * 100)}%` }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
            style={{ background: "linear-gradient(90deg, #7C3AED, #A78BFA, #8B5CF6)" }}
          />
        </div>
      </div>

      {/* Filtre butonları */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "earned", "locked"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 text-xs tracking-widest uppercase transition-all duration-200"
            style={{
              fontFamily:  "var(--font-barlow-condensed)",
              background:  filter === f ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
              border:      `1px solid ${filter === f ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)"}`,
              color:       filter === f ? "#A78BFA" : "rgba(255,255,255,0.3)",
            }}
          >
            {f === "all" ? "Tümü" : f === "earned" ? `Kazanılan (${earned.length})` : `Kilitli (${locked.length})`}
          </button>
        ))}
      </div>

      {/* Rozet ızgarası */}
      <AnimatePresence mode="popLayout">
        {sorted.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="text-5xl mb-4">🔒</div>
            <p className="text-white/20 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Bu kategoride rozet yok
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {sorted.map((badge, i) => (
              <BadgeCard key={badge.id} badge={badge} index={i} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Dipnot */}
      <p
        className="text-center text-[10px] pb-2"
        style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-barlow-condensed)" }}
      >
        Rozetler ders geçmişin ve aktivitene göre otomatik güncellenir
      </p>
    </div>
  );
}
