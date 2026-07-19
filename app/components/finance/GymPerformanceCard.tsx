"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Building2 } from "lucide-react";
import type { GymPerformance } from "@/lib/financeCenter";

export default function GymPerformanceCard({ r, index = 0 }: { r: GymPerformance; index?: number }) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const pct = Math.min(100, Math.round(r.sharePctOfTotal));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
      whileHover={reduced ? undefined : { y: -3 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative overflow-hidden stat-card-glass rounded-2xl"
      style={{
        background: "rgba(15,15,22,0.95)",
        border: "1px solid var(--color-iron)",
        boxShadow: hover ? "0 0 28px rgba(139,92,246,0.15)" : "none",
        transition: "box-shadow 0.25s",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        isolation: "isolate",
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)" }} />

      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Building2 size={15} style={{ color: "#A855F7" }} className="flex-shrink-0" />
          <h4 className="text-base sm:text-lg font-display text-white tracking-wider truncate" style={{ fontFamily: "var(--font-bebas)" }}>
            {r.gym.name}
          </h4>
        </div>

        {r.gym.shareType === "fixed_per_lesson" ? (
          <div className="space-y-1.5 text-sm mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            <div className="flex justify-between"><span className="text-white/40">Toplam Ders</span><span className="text-white">{r.totalLessons}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Ders Başı</span><span className="text-white">₺{(r.gym.fixedLessonFee ?? 0).toLocaleString("tr-TR")}</span></div>
            <div className="flex justify-between pt-1.5 border-t border-white/5"><span className="text-violet font-semibold">Ödenecek</span><span className="text-violet font-semibold">₺{r.gymShareTotal.toLocaleString("tr-TR")}</span></div>
          </div>
        ) : r.gym.shareType === "percentage" ? (
          <div className="space-y-1.5 text-sm mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            <div className="flex justify-between"><span className="text-white/40">Toplam Ciro</span><span className="text-white">₺{r.totalRevenue.toLocaleString("tr-TR")}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Salon Payı (%{r.gym.gymPercentage})</span><span className="text-white">₺{r.gymShareTotal.toLocaleString("tr-TR")}</span></div>
            <div className="flex justify-between pt-1.5 border-t border-white/5"><span className="text-green-400 font-semibold">Net Kazancım</span><span className="text-green-400 font-semibold">₺{r.netEarnings.toLocaleString("tr-TR")}</span></div>
          </div>
        ) : (
          <p className="text-xs text-white/30 mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Salon payı yok — toplam ciro ₺{r.totalRevenue.toLocaleString("tr-TR")}
          </p>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/30 uppercase tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Ciro Payı
            </span>
            <span className="text-[10px] font-bold" style={{ color: "#A855F7", fontFamily: "var(--font-barlow-condensed)" }}>
              %{pct}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 + 0.15 }}
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#8B5CF6,#A855F7)" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
