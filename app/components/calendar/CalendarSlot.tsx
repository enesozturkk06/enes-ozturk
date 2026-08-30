"use client";

/** Tek bir saat satırı — saat solda sabit/küçük, içerik sağda (redesign talebi). */
export default function CalendarSlot({ time, children, last }: {
  time: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5"
      style={{ borderBottom: last ? "none" : "1px solid rgba(255,255,255,0.05)" }}>
      <span className="flex-shrink-0 text-[11px] text-white/30 tabular-nums" style={{ width: 38, fontFamily: "var(--font-label)" }}>
        {time}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
