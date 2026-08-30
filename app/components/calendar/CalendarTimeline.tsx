"use client";

import CalendarSlot from "./CalendarSlot";

export interface TimelineRow {
  key: string;
  time: string;
  node: React.ReactNode; // EmptySlot veya AppointmentCard
}

/**
 * Dikey saat çizelgesi — düz liste (redesign talebi: eskiden orantılı
 * yükseklikte mini-timeline'dı, artık her satır sabit yükseklikte, büyük
 * boş kartlar yok). Admin (Slot[]+Appointment[]) ve öğrenci (TimeSlot[]+
 * Appointment[]) VERİYİ KENDİ SAYFASINDA bu satır listesine dönüştürür —
 * bu bileşen sadece render eder, iş mantığına dokunmaz.
 */
export default function CalendarTimeline({ rows, emptyText }: { rows: TimelineRow[]; emptyText?: string }) {
  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl border border-white/8 py-14 text-center">
        <p className="text-xs text-white/25" style={{ fontFamily: "var(--font-label)" }}>
          {emptyText ?? "Bu güne ait tanımlı saat yok"}
        </p>
      </div>
    );
  }
  return (
    <div className="glass rounded-2xl border border-white/8 overflow-hidden">
      {rows.map((r, i) => (
        <CalendarSlot key={r.key} time={r.time} last={i === rows.length - 1}>
          {r.node}
        </CalendarSlot>
      ))}
    </div>
  );
}
