"use client";

import { motion } from "framer-motion";
import { CalendarClock, CalendarRange, Calendar } from "lucide-react";
import type { FinanceSnapshot } from "@/lib/financeCenter";

const ROWS: { key: "today" | "week" | "month"; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "today", label: "Bugün", icon: <CalendarClock size={15} />, color: "#60A5FA" },
  { key: "week",  label: "Bu Hafta", icon: <CalendarRange size={15} />, color: "#A855F7" },
  { key: "month", label: "Bu Ay", icon: <Calendar size={15} />, color: "#FBBF24" },
];

export default function FinanceSnapshotRow({
  snapshots,
}: {
  snapshots: { today: FinanceSnapshot; week: FinanceSnapshot; month: FinanceSnapshot };
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {ROWS.map((row, i) => {
        const s = snapshots[row.key];
        return (
          <motion.div key={row.key}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.06 }}
            className="stat-card-glass rounded-2xl p-4"
            style={{ background: "rgba(15,15,22,0.95)", border: "1px solid var(--color-iron)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: row.color }}>{row.icon}</span>
              <span className="text-xs uppercase tracking-widest text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {row.label}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Toplam Ders
                </div>
                <div className="text-xl font-display text-white" style={{ fontFamily: "var(--font-bebas)" }}>
                  {s.lessonCount}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/25 uppercase tracking-widest mb-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Toplam Gelir
                </div>
                <div className="text-xl font-display" style={{ fontFamily: "var(--font-bebas)", color: row.color }}>
                  ₺{s.revenue.toLocaleString("tr-TR")}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
