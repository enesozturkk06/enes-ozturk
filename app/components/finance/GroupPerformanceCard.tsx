"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Layers, ChevronDown, ChevronUp, AlertTriangle, UserRound, Building2 } from "lucide-react";
import type { GroupPerformance } from "@/lib/groupLessonFinance";
import CountUpNumber from "./CountUpNumber";

const SHARE_LABEL: Record<string, string> = {
  percentage: "Yüzdelik Paylaşım", fixed_per_lesson: "Sabit Ders Ücreti", fixed_monthly_rent: "Sabit Aylık Kira",
};

export default function GroupPerformanceCard({
  perf, index = 0, expanded, onToggle, gymName,
}: {
  perf: GroupPerformance; index?: number; expanded: boolean; onToggle: () => void; gymName?: string;
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const { group, activeMemberCount, expectedMonthlyRevenue, collectedThisMonth, gymShare, netEarnings, occupancyRate, needsSessionCount } = perf;
  const collectedPct = expectedMonthlyRevenue > 0 ? Math.min(100, Math.round((collectedThisMonth / expectedMonthlyRevenue) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      whileHover={reduced ? undefined : { y: -3 }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet"
    >
      <div className="glass relative rounded-2xl" style={{ boxShadow: hover ? "0 0 28px rgba(34,197,94,0.15)" : "none", transition: "box-shadow 0.25s" }}>

      <button onClick={onToggle} className="w-full text-left p-4 sm:p-5">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={15} style={{ color: "#4ADE80" }} className="flex-shrink-0" />
            <h4 className="text-base sm:text-lg text-white tracking-wider truncate" style={{ fontFamily: "var(--font-display)" }}>
              {group.name}
            </h4>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                background: group.isActive ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.06)",
                color: group.isActive ? "var(--color-success)" : "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-label)",
              }}>
              {group.isActive ? "Aktif" : "Pasif"}
            </span>
            {expanded ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
          </div>
        </div>

        <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2" style={{ fontFamily: "var(--font-label)" }}>
          {SHARE_LABEL[group.shareType]} · {activeMemberCount} öğrenci
        </p>

        {(group.trainerName || gymName) && (
          <div className="flex items-center gap-3 flex-wrap mb-3 text-[11px] text-white/35" style={{ fontFamily: "var(--font-label)" }}>
            {group.trainerName && (
              <span className="flex items-center gap-1"><UserRound size={11} className="flex-shrink-0" />{group.trainerName}</span>
            )}
            {gymName && (
              <span className="flex items-center gap-1"><Building2 size={11} className="flex-shrink-0" />{gymName}</span>
            )}
          </div>
        )}

        {needsSessionCount && (
          <div className="flex items-center gap-1.5 mb-3 text-[11px]" style={{ color: "var(--color-warning)", fontFamily: "var(--font-label)" }}>
            <AlertTriangle size={12} /> Bu ay için ders sayısı girilmedi — salon payı 0 gösteriliyor
          </div>
        )}

        <div className="space-y-1.5 text-sm mb-3" style={{ fontFamily: "var(--font-label)" }}>
          <div className="flex justify-between"><span className="text-white/40">Toplam Gelir</span><span className="text-white">₺{expectedMonthlyRevenue.toLocaleString("tr-TR")}</span></div>
          <div className="flex justify-between"><span className="text-white/40">Salon Payı</span><span className="text-white">₺{gymShare.toLocaleString("tr-TR")}</span></div>
          <div className="flex justify-between pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="font-semibold" style={{ color: netEarnings < 0 ? "var(--color-error)" : "var(--color-success)" }}>Net Kazanç</span>
            <span className="font-semibold" style={{ color: netEarnings < 0 ? "var(--color-error)" : "var(--color-success)" }}>
              <CountUpNumber value={netEarnings} prefix="₺" />
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-white/25 uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>
            Bu Ay Tahsil Edilen
          </span>
          <span className="text-[10px] font-bold" style={{ color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
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
              <span className="text-[10px] text-white/25 uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>
                Doluluk Oranı · {activeMemberCount}/{group.maxCapacity}
              </span>
              <span className="text-[10px] font-bold" style={{ color: "#60A5FA", fontFamily: "var(--font-label)" }}>%{occupancyRate}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${occupancyRate}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 + 0.15 }}
                className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#3B82F6,#60A5FA)" }} />
            </div>
          </>
        )}
      </button>
      </div>
    </motion.div>
  );
}
