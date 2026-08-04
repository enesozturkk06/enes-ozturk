"use client";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { Appointment } from "@/lib/types";
import type { Slot } from "@/lib/slots";
import { DEFAULT_WORKING_HOURS } from "@/lib/constants";

interface Props {
  date: string;
  slots: Slot[];
  appointments: Appointment[];
  isToday: boolean;
  now: Date;
  compact?: boolean;
  onToggle?: (start: string) => void;
  onRemove?: (start: string) => void;
  onApptClick?: (apt: Appointment) => void;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function DayTimeline({ date, slots, appointments, isToday, now, compact, onToggle, onRemove, onApptClick }: Props) {
  const heightPx = compact ? 360 : 640;

  // Saat ekseni: gerçek slot verisinden türetilir; slot yoksa sadece görsel iskelet
  // olarak DEFAULT_WORKING_HOURS kullanılır (hiçbir slot üretmez/yazmaz).
  let axisStart: number;
  let axisEnd: number;
  if (slots.length > 0) {
    const starts = slots.map(s => toMinutes(s.start));
    const ends = slots.map(s => toMinutes(s.end));
    axisStart = Math.floor(Math.min(...starts) / 60) * 60;
    axisEnd = Math.ceil(Math.max(...ends) / 60) * 60;
  } else {
    axisStart = toMinutes(DEFAULT_WORKING_HOURS.start);
    axisEnd = toMinutes(DEFAULT_WORKING_HOURS.end);
  }
  const span = Math.max(1, axisEnd - axisStart);
  const pct = (min: number) => ((min - axisStart) / span) * 100;

  const hourMarks: number[] = [];
  for (let h = Math.floor(axisStart / 60); h <= Math.ceil(axisEnd / 60); h++) hourMarks.push(h * 60);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNowLine = isToday && nowMin >= axisStart && nowMin <= axisEnd;

  const bookedAt = (start: string) => appointments.find(a => a.startTime === start && a.status !== "iptal");

  return (
    <div className="glass-strong rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-sm text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
          {format(parseISO(date), compact ? "EEE d MMM" : "EEEE, dd MMMM", { locale: tr }).toUpperCase()}
        </span>
        {isToday && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
            BUGÜN
          </span>
        )}
      </div>

      {slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 opacity-40">
          <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-label)" }}>Bu güne ait tanımlı saat yok</p>
        </div>
      ) : (
        <div className="flex p-3" style={{ height: heightPx }}>
          {/* Saat ekseni */}
          <div className="relative flex-shrink-0" style={{ width: compact ? 32 : 48 }}>
            {hourMarks.map(m => (
              <span key={m} className="absolute text-[10px] text-white/25 -translate-y-1/2"
                style={{ top: `${pct(m)}%`, fontFamily: "var(--font-label)" }}>
                {String(Math.floor(m / 60)).padStart(2, "0")}:00
              </span>
            ))}
          </div>

          {/* Slot izi */}
          <div className="relative flex-1 ml-2 rounded-lg" style={{ background: "rgba(255,255,255,0.015)" }}>
            {hourMarks.map(m => (
              <div key={m} className="absolute left-0 right-0" style={{ top: `${pct(m)}%`, borderTop: "1px solid rgba(255,255,255,0.04)" }} />
            ))}

            {slots.map((slot, i) => {
              const apt = bookedAt(slot.start);
              const isBooked = !!apt;
              const startMin = toMinutes(slot.start);
              const endMin = toMinutes(slot.end);
              const ongoing = isToday && isBooked && nowMin >= startMin && nowMin < endMin;
              return (
                <motion.div key={slot.id ?? `${slot.start}-${i}`}
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  whileHover={isBooked ? { scale: 1.015 } : undefined}
                  transition={{ delay: i * 0.015, duration: 0.25 }}
                  onClick={isBooked && onApptClick ? () => onApptClick(apt) : undefined}
                  className="absolute left-1 right-1 rounded-lg overflow-hidden group"
                  style={{
                    top: `${pct(startMin)}%`,
                    height: `${Math.max(pct(endMin) - pct(startMin), 3)}%`,
                    background: isBooked ? "rgba(139,92,246,0.08)"
                      : slot.open ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.02)",
                    border: ongoing ? "1.5px solid var(--color-achievement-bright)"
                      : isBooked ? "1px solid rgba(139,92,246,0.25)"
                      : slot.open ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.05)",
                    boxShadow: ongoing ? "0 0 12px rgba(245,158,11,0.25)" : "none",
                    cursor: isBooked && onApptClick ? "pointer" : "default",
                    transition: "box-shadow 0.25s",
                  }}>
                  {ongoing && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-neon-pulse" style={{ background: "var(--color-achievement)" }} />}
                  {!compact && (
                    <div className="p-1.5 h-full flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] text-white/70 leading-tight" style={{ fontFamily: "var(--font-label)" }}>
                          {slot.start}–{slot.end}
                        </div>
                        {isBooked ? (
                          <div className="text-[10px] text-white/90 font-semibold truncate" style={{ fontFamily: "var(--font-label)" }}>{apt.studentName}</div>
                        ) : slot.open ? (
                          <div className="text-[10px]" style={{ color: "var(--color-success)", fontFamily: "var(--font-label)" }}>Boş</div>
                        ) : (
                          <div className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-label)" }}>Kapalı</div>
                        )}
                      </div>
                      {!isBooked && (onToggle || onRemove) && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onToggle && (
                            <button onClick={() => onToggle(slot.start)} className="text-[9px] px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                              {slot.open ? "Kapat" : "Aç"}
                            </button>
                          )}
                          {onRemove && (
                            <button onClick={() => onRemove(slot.start)} className="text-[9px] px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(239,68,68,0.1)", color: "var(--color-error)" }}>
                              Sil
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Canlı zaman çizgisi */}
            {showNowLine && (
              <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${pct(nowMin)}%` }}>
                <div style={{ height: 2, background: "var(--color-error)", boxShadow: "0 0 8px var(--color-error)" }} />
                <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full animate-neon-pulse" style={{ background: "var(--color-error)" }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
