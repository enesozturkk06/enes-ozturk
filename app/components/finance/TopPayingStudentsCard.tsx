"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import type { TopStudent } from "@/lib/financeCenter";
import CountUpNumber from "./CountUpNumber";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MEDAL_COLORS = ["#FBBF24", "#D1D5DB", "#F59E0B", "#8B5CF6", "#8B5CF6"];

export default function TopPayingStudentsCard({
  students,
}: {
  students: (TopStudent & { avatarUrl?: string })[];
}) {
  const maxPaid = students[0]?.totalPaid ?? 0;

  return (
    <div className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet h-full">
    <div className="glass rounded-2xl h-full">
      <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Trophy size={15} style={{ color: "#FBBF24" }} />
        <h3 className="text-sm uppercase tracking-widest text-white/40" style={{ fontFamily: "var(--font-label)" }}>
          En Çok Kazandıran Öğrenciler
        </h3>
      </div>

      <div className="p-4 sm:p-5">
        {students.length === 0 ? (
          <p className="text-xs text-white/25 text-center py-6" style={{ fontFamily: "var(--font-label)" }}>
            Henüz ödeme kaydı yok
          </p>
        ) : (
          <div className="space-y-3">
            {students.map((s, i) => {
              const pct = maxPaid > 0 ? Math.round((s.totalPaid / maxPaid) * 100) : 0;
              return (
                <motion.div key={s.studentId}
                  initial={{ opacity: 0, x: -8, filter: "blur(4px)" }} animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  whileHover={{ x: 2 }}
                  className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    {s.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatarUrl} alt={s.studentName} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: `${MEDAL_COLORS[i] ?? "#8B5CF6"}22`, color: MEDAL_COLORS[i] ?? "#8B5CF6" }}>
                        {initials(s.studentName)}
                      </div>
                    )}
                    {i < 3 && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: MEDAL_COLORS[i], color: "#0f0f16" }}>
                        {i + 1}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-white truncate" style={{ fontFamily: "var(--font-label)" }}>
                        {s.studentName}
                      </span>
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "#FBBF24", fontFamily: "var(--font-display)" }}>
                        <CountUpNumber value={s.totalPaid} prefix="₺" />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, delay: i * 0.06 + 0.1 }}
                          className="h-full rounded-full" style={{ background: MEDAL_COLORS[i] ?? "#8B5CF6" }} />
                      </div>
                      <span className="text-[10px] text-white/25 flex-shrink-0" style={{ fontFamily: "var(--font-label)" }}>
                        {s.lessonCount} ders
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
