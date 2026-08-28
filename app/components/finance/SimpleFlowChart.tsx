"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { FlowPoint } from "@/lib/financeUnified";

const GRANULARITY_OPTIONS: { value: "day" | "week" | "month"; label: string }[] = [
  { value: "day", label: "Günlük" },
  { value: "week", label: "Haftalık" },
  { value: "month", label: "Aylık" },
];

/** Sade gelir/gider çubuk grafiği — 3D/neon/gradient efekt yok. */
export default function SimpleFlowChart({
  data, granularity, onGranularityChange,
}: {
  data: FlowPoint[];
  granularity: "day" | "week" | "month";
  onGranularityChange: (g: "day" | "week" | "month") => void;
}) {
  return (
    <div className="glass rounded-2xl border border-white/8 p-4 sm:p-5 overflow-hidden">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-[11px] flex-shrink-0" style={{ fontFamily: "var(--font-label)" }}>
          <span className="flex items-center gap-1.5 text-white/50">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-success)" }} /> Gelir
          </span>
          <span className="flex items-center gap-1.5 text-white/50">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--color-error)" }} /> Gider
          </span>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-white/8 flex-shrink-0">
          {GRANULARITY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onGranularityChange(opt.value)}
              className="px-2 py-1.5 text-[10px] font-medium rounded-md transition-colors"
              style={{
                background: granularity === opt.value ? "rgba(255,255,255,0.08)" : "transparent",
                color: granularity === opt.value ? "#fff" : "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-label)",
                minHeight: 32,
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-14 text-white/25 text-sm" style={{ fontFamily: "var(--font-label)" }}>
          Bu aralıkta hareket yok
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240} minWidth={0} minHeight={0}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -22, bottom: 0 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "var(--font-label)" }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => (v === 0 ? "" : `₺${(v / 1000).toFixed(0)}k`)} />
            <Tooltip
              contentStyle={{ background: "rgba(20,20,24,0.96)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: "#fff", fontFamily: "var(--font-label)" }}
              formatter={(v: unknown, name: unknown) => [`₺${Number(v).toLocaleString("tr-TR")}`, name === "income" ? "Gelir" : "Gider"]}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar dataKey="income" fill="var(--color-success)" radius={[3, 3, 0, 0]} maxBarSize={18} />
            <Bar dataKey="expense" fill="var(--color-error)" radius={[3, 3, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
