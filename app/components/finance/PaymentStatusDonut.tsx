"use client";

import { useReducedMotion } from "framer-motion";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CircleDollarSign } from "lucide-react";
import type { PaymentStatusSlice } from "@/lib/financeCenter";

export default function PaymentStatusDonut({ slices }: { slices: PaymentStatusSlice[] }) {
  const reduced = useReducedMotion();
  const total = slices.reduce((s, x) => s + x.count, 0);
  const data = slices.filter(s => s.count > 0);

  return (
    <div className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet h-full">
    <div className="glass rounded-2xl p-4 sm:p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        <CircleDollarSign size={15} style={{ color: "#60A5FA" }} />
        <h3 className="text-sm uppercase tracking-widest text-white/40" style={{ fontFamily: "var(--font-label)" }}>
          Ödeme Durumu
        </h3>
      </div>

      {total === 0 ? (
        <p className="text-xs text-white/25 text-center py-10" style={{ fontFamily: "var(--font-label)" }}>
          Aktif öğrenci yok
        </p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-28 h-28 flex-shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="label" innerRadius={34} outerRadius={52}
                  paddingAngle={3} isAnimationActive={!reduced} animationDuration={600}>
                  {data.map(s => <Cell key={s.key} fill={s.color} stroke="none" />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "rgba(24,24,32,0.95)", backdropFilter: "blur(12px)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 12, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={((v: any, n: any) => [`${v} öğrenci`, n]) as any}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-display text-white" style={{ fontFamily: "var(--font-display)" }}>{total}</span>
              <span className="text-[9px] text-white/30 uppercase" style={{ fontFamily: "var(--font-label)" }}>öğrenci</span>
            </div>
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            {slices.map(s => (
              <div key={s.key} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-white/60 truncate" style={{ fontFamily: "var(--font-label)" }}>{s.label}</span>
                </div>
                <span className="text-xs font-bold flex-shrink-0" style={{ color: s.color, fontFamily: "var(--font-label)" }}>
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
