"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import CountUpNumber from "./CountUpNumber";

export interface FinanceKpiCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  sub: string;
  deltaLabel: string;
  deltaPositive: boolean | null;
  icon: React.ReactNode;
  color: string;
  sparkline?: number[];
  index?: number;
}

export default function FinanceKpiCard({
  label, value, prefix = "", suffix = "", sub, deltaLabel, deltaPositive, icon, color, sparkline, index = 0,
}: FinanceKpiCardProps) {
  const reduced = useReducedMotion();
  const sparkData = (sparkline ?? []).map((v, i) => ({ i, v }));
  const gradId = `finKpiGrad-${label.replace(/[^a-zA-Z0-9]/g, "")}`;

  const deltaColor = deltaPositive === true ? "#4ADE80" : deltaPositive === false ? "#F87171" : "rgba(255,255,255,0.35)";
  const DeltaIcon = deltaPositive === true ? ArrowUpRight : deltaPositive === false ? ArrowDownRight : Minus;

  return (
    <motion.div
      initial={{ y: 16, scale: 0.96, filter: "blur(6px)" }}
      animate={{ y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: index * 0.05 }}
      className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet"
    >
      <div className="glass relative h-full">

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between mb-2">
          <span className="text-[10px] sm:text-xs text-zinc-400 tracking-widest uppercase leading-tight"
            style={{ fontFamily: "var(--font-label)" }}>
            {label}
          </span>
          <span style={{ color }} className="flex-shrink-0">{icon}</span>
        </div>

        <div className="text-2xl sm:text-3xl font-bold leading-tight" style={{ fontFamily: "var(--font-display)", color }}>
          <CountUpNumber value={value} prefix={prefix} suffix={suffix} />
        </div>

        <div className="flex items-center justify-between mt-1.5 gap-2">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs text-zinc-500 leading-tight truncate" style={{ fontFamily: "var(--font-label)" }}>
              {sub}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <DeltaIcon size={11} style={{ color: deltaColor, flexShrink: 0 }} />
              <span className="text-[10px] font-semibold" style={{ color: deltaColor, fontFamily: "var(--font-label)" }}>
                {deltaLabel}
              </span>
            </div>
          </div>

          {sparkData.length > 1 && (
            <div className="w-16 h-8 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
      </div>
    </motion.div>
  );
}
