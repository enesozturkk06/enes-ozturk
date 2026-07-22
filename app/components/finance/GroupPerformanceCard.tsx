"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Layers, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import type { GroupPerformance } from "@/lib/groupLessonFinance";

const SHARE_LABEL: Record<string, string> = {
  percentage: "Yüzdelik Paylaşım", fixed_per_lesson: "Sabit Ders Ücreti", fixed_monthly_rent: "Sabit Aylık Kira",
};

export default function GroupPerformanceCard({
  perf, index = 0, expanded, onToggle,
}: {
  perf: GroupPerformance; index?: number; expanded: boolean; onToggle: () => void;
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const { group, activeMemberCount, expectedMonthlyRevenue, collectedThisMonth, gymShare, netEarnings, occupancyRate, needsSessionCount } = perf;
  const collectedPct = expectedMonthlyRevenue > 0 ? Math.min(100, Math.round((collectedThisMonth / expectedMonthlyRevenue) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
      whileHover={reduced ? undefined : { y: -3 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="relative overflow-hidden stat-card-glass rounded-2xl"
      style={{
        background: "rgba(15,15,22,0.95)", border: "1px solid var(--color-iron)",
        boxShadow: hover ? "0 0 28px rgba(34,197,94,0.12)" : "none",
        transition: "box-shadow 0.25s",
        transform: "translateZ(0)", WebkitTransform: "translateZ(0)", isolation: "isolate",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.6), transparent)" }} />

      <button onClick={onToggle} className="w-full text-left p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={15} style={{ color: "#4ADE80" }} className="flex-shrink-0" />
            <h4 className="text-base sm:text-lg font-display text-white tracking-wider truncate" style={{ fontFamily: "var(--font-bebas)" }}>
              {group.name}
            </h4>
          </div>
          {expanded ? <ChevronUp size={16} className="text-white/30 flex-shrink-0" /> : <ChevronDown size={16} className="text-white/30 flex-shrink-0" />}
        </div>

        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          {SHARE_LABEL[group.shareType]} · {activeMemberCount} öğrenci
        </p>

        {needsSessionCount && (
          <div className="flex items-center gap-1.5 mb-3 text-[11px]" style={{ color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
            <AlertTriangle size={12} /> Bu ay için ders sayısı girilmedi — salon payı 0 gösteriliyor
          </div>
        )}

        <div className="space-y-1.5 text-sm mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          <div className="flex justify-between"><span className="text-white/40">Toplam Gelir</span><span className="text-white">₺{expectedMonthlyRevenue.toLocaleString("tr-TR")}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Salon Payı</span><span className="text-white">₺{gymShare.toLocaleString("tr-TR")}</span></div>
          <div className="flex justify-between pt-1.5 border-t border-white/5">
            <span className={`font-semibold ${netEarnings < 0 ? "text-red-400" : "text-green-400"}`}>Net Kazanç</span>
            <span className={`font-semibold ${netEarnings < 0 ? "text-red-400" : "text-green-400"}`}>₺{netEarnings.toLocaleString("tr-TR")}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/25 uppercase tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Bu Ay Tahsil Edilen
          </span>
          <span className="text-[10px] font-bold text-green-400" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            ₺{collectedThisMonth.toLocaleString("tr-TR")} / ₺{expectedMonthlyRevenue.toLocaleString("tr-TR")}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${collectedPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 + 0.1 }}
            className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#22C55E,#4ADE80)" }} />
        </div>

        {occupancyRate !== null && (
          <>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-white/25 uppercase tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Doluluk Oranı
              </span>
              <span className="text-[10px] font-bold" style={{ color: "#60A5FA", fontFamily: "var(--font-barlow-condensed)" }}>%{occupancyRate}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${occupancyRate}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 + 0.15 }}
                className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#3B82F6,#60A5FA)" }} />
            </div>
          </>
        )}
      </button>
    </motion.div>
  );
}
