"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

export interface FinanceKpiCardProps {
  label: string;
  value: string;
  sub: string;
  deltaLabel: string;
  deltaPositive: boolean | null;
  icon: React.ReactNode;
  color: string;
  sparkline?: number[];
  index?: number;
}

export default function FinanceKpiCard({
  label, value, sub, deltaLabel, deltaPositive, icon, color, sparkline, index = 0,
}: FinanceKpiCardProps) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState(false);
  const sparkData = (sparkline ?? []).map((v, i) => ({ i, v }));
  const gradId = `finKpiGrad-${label.replace(/[^a-zA-Z0-9]/g, "")}`;

  const deltaColor = deltaPositive === true ? "#4ADE80" : deltaPositive === false ? "#F87171" : "rgba(255,255,255,0.35)";
  const DeltaIcon = deltaPositive === true ? ArrowUpRight : deltaPositive === false ? ArrowDownRight : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.05 }}
      whileHover={reduced ? undefined : { y: -3, scale: 1.015 }}
      className="relative overflow-hidden stat-card-glass"
      style={{
        background: "rgba(15,15,22,0.95)",
        border: "1px solid var(--color-iron)",
        borderRadius: 16,
        boxShadow: hover ? `0 0 28px ${color}22` : "none",
        transition: "box-shadow 0.25s",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        isolation: "isolate",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}70, transparent)` }} />

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[10px] sm:text-xs text-white/35 tracking-widest uppercase leading-tight"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {label}
          </span>
          <span style={{ color }} className="flex-shrink-0">{icon}</span>
        </div>

        <div className="text-2xl sm:text-3xl font-display leading-tight" style={{ fontFamily: "var(--font-bebas)", color }}>
          {value}
        </div>

        <div className="flex items-center justify-between mt-1.5 gap-2">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-white/28 leading-tight truncate" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              {sub}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <DeltaIcon size={11} style={{ color: deltaColor, flexShrink: 0 }} />
              <span className="text-[10px] font-semibold" style={{ color: deltaColor, fontFamily: "var(--font-barlow-condensed)" }}>
                {deltaLabel}
              </span>
            </div>
          </div>

          {sparkData.length > 1 && (
            <div className="w-16 h-8 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
                    fill={`url(#${gradId})`} isAnimationActive={!reduced} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
