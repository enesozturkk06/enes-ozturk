"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Takvim üst header — başlık + seçili tarih + gün navigasyonu.
 * Admin ve öğrenci tarafı AYNI bileşeni kullanır (rol'e göre içerik değişmez,
 * sadece hangi sayfanın çağırdığı değişir).
 */
export default function CalendarHeader({
  title, dateLabel, weekdayLabel, onPrev, onNext, onToday, isToday,
}: {
  title: string;
  dateLabel: string;   // "26 AĞUSTOS 2026"
  weekdayLabel: string; // "Çarşamba"
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isToday: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-2xl text-white tracking-wide truncate" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h1>
        <p className="text-xs sm:text-sm text-white/40 mt-0.5 truncate" style={{ fontFamily: "var(--font-label)" }}>
          {dateLabel} · {weekdayLabel}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={onPrev} aria-label="Önceki gün"
          className="flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
          style={{ width: 40, height: 40, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ChevronLeft size={16} />
        </button>
        {!isToday && (
          <button onClick={onToday}
            className="px-3 text-xs font-semibold uppercase rounded-lg transition-colors"
            style={{ height: 40, background: "rgba(139,92,246,0.12)", color: "#A78BFA", fontFamily: "var(--font-label)" }}>
            Bugün
          </button>
        )}
        <button onClick={onNext} aria-label="Sonraki gün"
          className="flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
          style={{ width: 40, height: 40, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
