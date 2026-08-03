"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { Student } from "@/lib/types";
import type { XPResult } from "@/lib/xp";

interface Props {
  student: Student;
  xpResult: XPResult;
  packageLabel: string;
  dateLabel?: string;
  aiTip?: string;
}

export default function ProfileHeroCard({ student, xpResult, packageLabel, dateLabel, aiTip }: Props) {
  const reduced = useReducedMotion();
  const { current, next, progressPct, xpInLevel, xpToNext } = xpResult.level;
  const initials = student.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass-strong relative overflow-hidden rounded-3xl"
    >
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden"
            style={{
              background: `radial-gradient(circle, ${current.gradFrom}55, ${current.gradTo}22)`,
              border: `2px solid ${current.borderColor}`,
              boxShadow: `0 0 24px ${current.glowColor}`,
            }}>
            {student.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.avatarUrl} alt={student.fullName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl sm:text-2xl text-white" style={{ fontFamily: "var(--font-display)" }}>{initials}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide truncate" style={{ fontFamily: "var(--font-display)" }}>
              Hoş Geldin, {student.fullName.split(" ")[0]}!
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-label)" }}>
              {student.code} · {packageLabel}{dateLabel ? ` · ${dateLabel}` : ""}
            </p>
          </div>

          {/* Seviye rozeti */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0 self-start sm:self-center"
            style={{ background: `linear-gradient(135deg, ${current.gradFrom}33, ${current.gradTo}1a)`, border: `1px solid ${current.borderColor}` }}>
            <span className="text-lg">{current.icon}</span>
            <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase" style={{ color: current.colorPrimary, fontFamily: "var(--font-label)" }}>
              {current.shortName}
            </span>
          </div>
        </div>

        {/* XP Bar */}
        <div>
          <div className="flex items-center justify-between mb-2 text-xs sm:text-sm" style={{ fontFamily: "var(--font-label)" }}>
            <span className="text-white/50">{xpInLevel.toLocaleString("tr-TR")} XP</span>
            <span className="text-white/30">
              {next ? `${xpToNext.toLocaleString("tr-TR")} XP kaldı → ${next.shortName}` : "Zirvedesin 👑"}
            </span>
          </div>
          <div className="relative h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative h-full rounded-full overflow-hidden"
              style={{
                background: `linear-gradient(90deg, ${current.gradFrom}, ${current.colorPrimary}, ${current.gradTo})`,
                boxShadow: `0 0 16px ${current.glowColor}`,
              }}
            >
              {!reduced && <div className="xp-bar-shimmer" />}
            </motion.div>
          </div>
        </div>

        {/* Kedi AI mini tavsiye — tam kart aşağıdaki Kedi AI bölümünde, burada sadece tek satır önizleme */}
        {aiTip && (
          <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/8">
            <span className="text-base flex-shrink-0">🐾</span>
            <p className="text-xs sm:text-sm truncate" style={{ color: "rgba(255,255,255,0.72)", fontFamily: "var(--font-label)" }}>
              {aiTip}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
