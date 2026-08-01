"use client";

import { useReducedMotion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { RevenuePoint } from "@/lib/financeCenter";

const GRANULARITY_OPTIONS: { value: "day" | "week" | "month"; label: string }[] = [
  { value: "day", label: "Günlük" },
  { value: "week", label: "Haftalık" },
  { value: "month", label: "Aylık" },
];

export default function RevenueAreaChart({
  data, granularity, onGranularityChange,
}: {
  data: RevenuePoint[];
  granularity: "day" | "week" | "month";
  onGranularityChange: (g: "day" | "week" | "month") => void;
}) {
  const reduced = useReducedMotion();

  return (
    <div className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet h-full">
    <div className="glass rounded-2xl p-4 sm:p-5 h-full">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-base sm:text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
          Gelir Grafiği
        </h3>
        <div className="glass inline-flex items-center gap-1 p-1 rounded-lg">
          {GRANULARITY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onGranularityChange(opt.value)}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors"
              style={{
                background: granularity === opt.value ? "rgba(139,92,246,0.25)" : "transparent",
                color: granularity === opt.value ? "#C4B5FD" : "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-label)",
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-16 text-white/25 text-sm" style={{ fontFamily: "var(--font-label)" }}>
          Bu aralıkta gelir kaydı yok
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="financeRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.55} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="financeRevenueStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="35%" stopColor="#3B82F6" />
                <stop offset="70%" stopColor="#EC4899" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "var(--font-label)" }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => (v === 0 ? "" : `₺${(v / 1000).toFixed(0)}k`)} />
            <Tooltip
              contentStyle={{ background: "rgba(24,24,32,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 12, fontSize: 12 }}
              labelStyle={{ color: "#fff", fontFamily: "var(--font-label)" }}
              formatter={(v: unknown) => [`₺${Number(v).toLocaleString("tr-TR")}`, "Gelir"]}
              cursor={{ stroke: "rgba(139,92,246,0.3)", strokeWidth: 1 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="url(#financeRevenueStroke)" strokeWidth={2.5}
              fill="url(#financeRevenueGradient)" isAnimationActive={!reduced} animationDuration={700} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
    </div>
  );
}
