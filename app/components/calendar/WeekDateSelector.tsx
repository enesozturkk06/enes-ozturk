"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarDay {
  iso: string;       // "2026-08-26"
  dayLabel: string;   // "ÇAR"
  dayNum: string;     // "26"
  hasBadge?: boolean; // örn. o gün öğrencinin randevusu var
}

/**
 * Mobil-first yatay tarih şeridi. Admin (7 gün, hafta gezinme okları
 * opsiyonel) ve öğrenci (14 gün, sabit pencere) TARAFINDAN AYNI bileşen
 * kullanılır — gün hesaplama mantığı çağıran sayfada kalır, bu sadece
 * render eder. Seçili gün ince gradient border + hafif glow ile belirgin;
 * abartılı neon yok. Yalnızca bu şerit içinde yatay kaydırma olur, sayfa
 * asla yatay taşmaz (no-scrollbar + min-w-0).
 */
export default function WeekDateSelector({
  days, selected, todayIso, onSelect, onPrevWeek, onNextWeek,
}: {
  days: CalendarDay[];
  selected: string;
  todayIso: string;
  onSelect: (iso: string) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {onPrevWeek && (
        <button onClick={onPrevWeek} aria-label="Önceki hafta"
          className="flex-shrink-0 flex items-center justify-center rounded-lg text-white/30 hover:text-white transition-colors"
          style={{ width: 32, height: 44 }}>
          <ChevronLeft size={15} />
        </button>
      )}

      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto min-w-0 flex-1 py-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {days.map(d => {
          const isSelected = d.iso === selected;
          const isToday = d.iso === todayIso;
          return (
            <button key={d.iso} onClick={() => onSelect(d.iso)}
              className="relative flex-shrink-0 flex flex-col items-center justify-center rounded-xl transition-transform active:scale-95"
              style={{ width: 52, height: 60 }}>
              {isSelected ? (
                <motion.div layoutId="cal-selected-day"
                  className="absolute inset-0 rounded-xl overflow-hidden gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange"
                  style={{ padding: 1.5, boxShadow: "0 0 14px -3px rgba(139,92,246,0.4)" }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="w-full h-full rounded-[10px]" style={{ background: "rgba(18,18,22,0.96)" }} />
                </motion.div>
              ) : (
                <div className="absolute inset-0 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: isToday ? "1.5px solid rgba(245,158,11,0.5)" : "1px solid rgba(255,255,255,0.07)",
                  }} />
              )}
              <span className="relative text-[10px] tracking-wider" style={{ color: isSelected ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
                {d.dayLabel}
              </span>
              <span className="relative text-lg leading-tight" style={{
                fontFamily: "var(--font-display)",
                color: isSelected ? "#fff" : isToday ? "var(--color-achievement-bright)" : "#fff",
              }}>
                {d.dayNum}
              </span>
              {d.hasBadge && (
                <span className="relative w-1 h-1 rounded-full mt-0.5" style={{ background: "var(--color-success)" }} />
              )}
            </button>
          );
        })}
      </div>

      {onNextWeek && (
        <button onClick={onNextWeek} aria-label="Sonraki hafta"
          className="flex-shrink-0 flex items-center justify-center rounded-lg text-white/30 hover:text-white transition-colors"
          style={{ width: 32, height: 44 }}>
          <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
