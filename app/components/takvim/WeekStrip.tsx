"use client";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface Props {
  weekDays: string[];
  weekLabel: string;
  selectedDate: string;
  todayStr: string;
  summary: Record<string, { total: number; open: number }>;
  onSelectDate: (d: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export default function WeekStrip({
  weekDays, weekLabel, selectedDate, todayStr, summary,
  onSelectDate, onPrevWeek, onNextWeek, onToday,
}: Props) {
  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onPrevWeek} className="p-1.5 text-white/30 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
        <span className="flex-1 text-center text-sm text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
          {weekLabel}
        </span>
        <button onClick={onNextWeek} className="p-1.5 text-white/30 hover:text-white transition-colors"><ChevronRight size={18} /></button>
        <button onClick={onToday}
          className="text-xs px-2.5 py-1.5 rounded-lg tracking-wider transition-transform hover:scale-105 active:scale-95"
          style={{ background: "rgba(139,92,246,0.12)", color: "#A78BFA", fontFamily: "var(--font-label)" }}>
          Bugün
        </button>
      </div>

      <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="grid grid-cols-7" style={{ minWidth: 400 }}>
          {weekDays.map(date => {
            const s = summary[date] || { total: 0, open: 0 };
            const isSelected = date === selectedDate;
            const isToday = date === todayStr;
            return (
              <button key={date} onClick={() => onSelectDate(date)}
                className="relative flex flex-col items-center py-3 px-1 transition-transform hover:scale-[1.03]"
                style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                {isSelected && (
                  <motion.div layoutId="takvim-selected-day"
                    className="absolute inset-1 rounded-xl overflow-hidden gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange"
                    style={{ padding: 1.5 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                    <div className="w-full h-full rounded-[10px]" style={{ background: "rgba(22,22,22,0.95)" }} />
                  </motion.div>
                )}
                <span className="relative text-xs text-white/35 mb-1" style={{ fontFamily: "var(--font-label)" }}>
                  {format(parseISO(date), "EEE", { locale: tr }).toUpperCase()}
                </span>
                <span className="relative w-8 h-8 flex items-center justify-center rounded-full text-lg"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: isSelected ? "#fff" : isToday ? "var(--color-achievement)" : "#fff",
                    border: isToday && !isSelected ? "1.5px solid var(--color-achievement-bright)" : "1.5px solid transparent",
                  }}>
                  {format(parseISO(date), "d")}
                </span>
                <span className="relative text-[10px] mt-1" style={{ fontFamily: "var(--font-label)" }}>
                  {s.total > 0 ? (
                    <span style={{ color: "var(--color-success)" }}>{s.open} açık</span>
                  ) : <span className="text-white/15">—</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
