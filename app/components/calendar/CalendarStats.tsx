"use client";

/**
 * Minimal istatistik satırı — "3 DERS · 1 BOŞ · %100 DOLULUK".
 * Büyük 4 kart YERİNE tek kompakt satır (redesign talebi). `secondary`
 * (ör. gelir) admin tarafında küçük ikincil bilgi olarak sağda gösterilir.
 */
export default function CalendarStats({
  items, secondary,
}: {
  items: { label: string; value: string }[];
  secondary?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-1">
      <div className="flex items-center gap-2 flex-wrap text-xs sm:text-sm" style={{ fontFamily: "var(--font-label)" }}>
        {items.map((it, i) => (
          <span key={it.label} className="flex items-center gap-2">
            {i > 0 && <span className="text-white/15">·</span>}
            <span className="text-white/85 font-semibold">{it.value}</span>
            <span className="text-white/35 uppercase tracking-wider text-[10px] sm:text-xs">{it.label}</span>
          </span>
        ))}
      </div>
      {secondary && (
        <span className="text-xs text-white/30 flex-shrink-0" style={{ fontFamily: "var(--font-label)" }}>
          {secondary}
        </span>
      )}
    </div>
  );
}
