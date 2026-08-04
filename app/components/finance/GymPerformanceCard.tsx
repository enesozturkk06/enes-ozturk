"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Building2 } from "lucide-react";
import type { GymPerformance } from "@/lib/financeCenter";
import CountUpNumber from "./CountUpNumber";

export default function GymPerformanceCard({ r, index = 0 }: { r: GymPerformance; index?: number }) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const pct = Math.min(100, Math.round(r.sharePctOfTotal));

  return (
    <motion.div
      initial={{ y: 16, scale: 0.96, filter: "blur(6px)" }}
      animate={{ y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      whileHover={reduced ? undefined : { y: -3 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet"
    >
      <div className="glass relative rounded-2xl"
        style={{ boxShadow: hover ? "0 0 28px rgba(139,92,246,0.2)" : "none", transition: "box-shadow 0.25s" }}>

      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={15} style={{ color: "#A855F7" }} className="flex-shrink-0" />
          <h4 className="text-base sm:text-lg text-white tracking-wider truncate" style={{ fontFamily: "var(--font-display)" }}>
            {r.gym.name}
          </h4>
        </div>

        {r.gym.shareType === "fixed_per_lesson" ? (
          <div className="space-y-1.5 text-sm mb-3" style={{ fontFamily: "var(--font-label)" }}>
            <div className="flex justify-between"><span className="text-white/40">Toplam Ders</span><span className="text-white">{r.totalLessons}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Ders Başı</span><span className="text-white">₺{(r.gym.fixedLessonFee ?? 0).toLocaleString("tr-TR")}</span></div>
            <div className="flex justify-between pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="font-semibold" style={{ color: "#A78BFA" }}>Ödenecek</span>
              <span className="font-semibold" style={{ color: "#A78BFA" }}><CountUpNumber value={r.gymShareTotal} prefix="₺" /></span>
            </div>
          </div>
        ) : r.gym.shareType === "percentage" ? (
          <div className="space-y-1.5 text-sm mb-3" style={{ fontFamily: "var(--font-label)" }}>
            <div className="flex justify-between"><span className="text-white/40">Toplam Ciro</span><span className="text-white">₺{r.totalRevenue.toLocaleString("tr-TR")}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Salon Payı (%{r.gym.gymPercentage})</span><span className="text-white">₺{r.gymShareTotal.toLocaleString("tr-TR")}</span></div>
            <div className="flex justify-between pt-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="font-semibold" style={{ color: "var(--color-success)" }}>Net Kazancım</span>
              <span className="font-semibold" style={{ color: "var(--color-success)" }}><CountUpNumber value={r.netEarnings} prefix="₺" /></span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-white/30 mb-3" style={{ fontFamily: "var(--font-label)" }}>
            Salon payı yok — toplam ciro ₺{r.totalRevenue.toLocaleString("tr-TR")}
          </p>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/30 uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>
              Ciro Payı
            </span>
            <span className="text-[10px] font-bold" style={{ color: "#A855F7", fontFamily: "var(--font-label)" }}>
              %{pct}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 + 0.15 }}
              className="gradient-animated gradient-slow gradient-violet-pink-orange h-full rounded-full"
            />
          </div>
        </div>
      </div>
      </div>
    </motion.div>
  );
}
