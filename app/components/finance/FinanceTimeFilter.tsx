"use client";

import { motion } from "framer-motion";
import type { TimeRange } from "@/lib/financeCenter";

const OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "today", label: "Bugün" },
  { value: "week",  label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
  { value: "year",  label: "Bu Yıl" },
  { value: "custom", label: "Özel Tarih" },
];

export default function FinanceTimeFilter({
  range, onRangeChange, custom, onCustomChange,
}: {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  custom: { from: string; to: string };
  onCustomChange: (c: { from: string; to: string }) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="glass inline-flex items-center gap-1 p-1 rounded-xl overflow-x-auto">
        {OPTIONS.map(opt => {
          const active = range === opt.value;
          return (
            <button key={opt.value} onClick={() => onRangeChange(opt.value)}
              className="relative px-3 py-1.5 text-xs font-semibold whitespace-nowrap rounded-lg transition-colors"
              style={{
                color: active ? "#fff" : "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-label)",
              }}>
              {active && (
                <motion.span layoutId="finance-time-filter-pill"
                  className="gradient-animated gradient-slow gradient-violet-pink-orange absolute inset-0 rounded-lg"
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} />
              )}
              <span className="relative z-10">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-2">
          <input type="date" value={custom.from} onChange={e => onCustomChange({ ...custom, from: e.target.value })}
            className="glass text-white px-2 py-1.5 text-xs outline-none rounded-lg"
            style={{ fontFamily: "var(--font-label)" }} />
          <span className="text-white/20 text-xs">—</span>
          <input type="date" value={custom.to} onChange={e => onCustomChange({ ...custom, to: e.target.value })}
            className="glass text-white px-2 py-1.5 text-xs outline-none rounded-lg"
            style={{ fontFamily: "var(--font-label)" }} />
        </div>
      )}
    </div>
  );
}
