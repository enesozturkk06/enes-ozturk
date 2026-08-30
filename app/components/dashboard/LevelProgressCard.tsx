"use client";
import { memo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";
import type { XPResult } from "@/lib/xp";
import { GOLD_BRIGHT, GOLD_BORDER_SOFT, TEXT_SECONDARY } from "./theme";

interface Props {
  xpResult: XPResult;
  seasonXP: number;
  seasonDaysLeft: number;
  streak: number;
  /** Kedi Avatar Sistemi (2D Dijital Salon) — null ise "Oluştur" CTA'sı,
   * doluysa "Düzenle" bağlantısı. ProfileHeroCard'dan taşındı, aynı davranış. */
  hasAvatarConfig?: boolean;
}

/** Kompakt Seviye / XP kartı — eskiden ProfileHeroCard'ın içine gömülü XP
 * bar'ı + ayrı StatsRail'in sezon/seri bilgisi burada TEK kompakt kartta
 * birleşti (StatsRail dosyası silinmedi, sadece ana sayfada kullanılmıyor). */
function LevelProgressCard({ xpResult, seasonXP, seasonDaysLeft, streak, hasAvatarConfig }: Props) {
  const reduced = useReducedMotion();
  const { current, next, progressPct, xpInLevel, xpToNext } = xpResult.level;
  const totalXP = xpResult.breakdown.total;

  return (
    <div className="card-gold rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${current.gradFrom}33, ${current.gradTo}1a)`, border: `1px solid ${current.borderColor}` }}>
            <span className="text-sm">{current.icon}</span>
            <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: current.colorPrimary, fontFamily: "var(--font-label)" }}>
              {current.shortName}
            </span>
          </div>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg flex-shrink-0"
              style={{ background: "rgba(251,146,60,0.1)", color: "var(--color-warning-bright)", fontFamily: "var(--font-label)" }}>
              <Flame size={10} />{streak}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/ogrenci/avatar" className="text-[10px] text-gold-bright/80 hover:text-gold-bright transition-colors whitespace-nowrap" style={{ fontFamily: "var(--font-label)" }}>
            {hasAvatarConfig ? "🐈 Avatar" : "🐈 Avatar Oluştur"}
          </Link>
          <span className="text-xs text-white/30" style={{ fontFamily: "var(--font-label)" }}>
            {totalXP.toLocaleString("tr-TR")} XP
          </span>
        </div>
      </div>

      <div className="relative h-2 rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="relative h-full rounded-full overflow-hidden"
          style={{ background: `linear-gradient(90deg, ${current.gradFrom}, ${current.colorPrimary}, ${current.gradTo})`, boxShadow: `0 0 12px ${current.glowColor}` }}>
          {!reduced && <div className="xp-bar-shimmer" />}
        </motion.div>
      </div>
      <div className="flex items-center justify-between text-[11px] mb-3" style={{ fontFamily: "var(--font-label)" }}>
        <span className="text-white/40">{xpInLevel.toLocaleString("tr-TR")} XP</span>
        <span className="text-white/25">{next ? `${xpToNext.toLocaleString("tr-TR")} XP → ${next.shortName}` : "Zirvedesin 👑"}</span>
      </div>

      <div className="flex items-center gap-1.5 pt-2.5" style={{ borderTop: `1px solid ${GOLD_BORDER_SOFT}` }}>
        <span className="text-[11px]" style={{ color: TEXT_SECONDARY, fontFamily: "var(--font-label)" }}>Bu sezon</span>
        <span className="text-[11px] font-semibold" style={{ color: GOLD_BRIGHT, fontFamily: "var(--font-label)" }}>{seasonXP.toLocaleString("tr-TR")} XP</span>
        <span className="text-[11px] text-white/20">·</span>
        <span className="text-[11px]" style={{ color: TEXT_SECONDARY, fontFamily: "var(--font-label)" }}>{seasonDaysLeft} gün kaldı</span>
      </div>
    </div>
  );
}

export default memo(LevelProgressCard);
