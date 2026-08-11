"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import { Dumbbell, Zap, CalendarRange, Flame } from "lucide-react";
import { GOLD_BRIGHT, TEXT_SECONDARY, GOLD_BORDER_SOFT } from "./theme";

interface Props {
  completedLessons: number;
  totalXP: number;
  seasonXP: number;
  seasonDaysLeft: number;
  streak: number;
}

/** Dashboard Faz 1 — "büyük rakam" premium stat şeridi. Tüm değerler
 * page.tsx'te ZATEN hesaplanmış (xpSummary/student) veriden geliyor —
 * burada hiçbir yeni hesaplama/DB çağrısı yok, sadece görüntüleme. */
function StatsRail({ completedLessons, totalXP, seasonXP, seasonDaysLeft, streak }: Props) {
  const tiles = [
    { icon: Dumbbell,      label: "Tamamlanan Ders", value: completedLessons.toLocaleString("tr-TR"), sub: undefined },
    { icon: Zap,           label: "Toplam XP",       value: totalXP.toLocaleString("tr-TR"),           sub: undefined },
    { icon: CalendarRange, label: "Bu Sezon XP",      value: seasonXP.toLocaleString("tr-TR"),          sub: `${seasonDaysLeft} gün kaldı` },
    { icon: Flame,         label: "Mevcut Seri",      value: streak.toLocaleString("tr-TR"),            sub: streak > 0 ? "ders üst üste" : undefined },
  ];

  return (
    <motion.div
      initial="initial" animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      {tiles.map(t => (
        <motion.div key={t.label}
          variants={{ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="card-gold rounded-2xl p-4 sm:p-5"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: TEXT_SECONDARY, fontFamily: "var(--font-label)" }}>
              {t.label}
            </span>
            <t.icon size={14} style={{ color: GOLD_BRIGHT, opacity: 0.8 }} />
          </div>
          <div className="text-2xl sm:text-3xl font-bold leading-none"
            style={{ fontFamily: "var(--font-display)", color: GOLD_BRIGHT, textShadow: "0 0 20px rgba(201,169,110,0.25)" }}>
            {t.value}
          </div>
          {t.sub && (
            <div className="text-[10px] mt-1.5 pt-1.5" style={{ color: TEXT_SECONDARY, borderTop: `1px solid ${GOLD_BORDER_SOFT}`, fontFamily: "var(--font-label)" }}>
              {t.sub}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}

export default memo(StatsRail);
