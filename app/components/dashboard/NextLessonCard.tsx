"use client";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { tr } from "date-fns/locale";
import type { Appointment, Gym } from "@/lib/types";
import { Badge } from "@/app/components/ui";
import { STATUS_LABELS, CANCEL_LIMIT_HOURS } from "@/lib/constants";
import { GOLD_BRIGHT, GOLD_BORDER_SOFT, GOLD_BG_SOFT } from "./theme";

/** "Sıradaki Dersin" — ana aksiyon kartı. Mantık (canCancel/remainingLabel/
 * handleCancelClick) page.tsx'te AYNEN korunuyor, burası sadece görüntüler. */
export default function NextLessonCard({
  nextAppointment, nextGym, minutesLeft, onCancelClick,
}: {
  nextAppointment: Appointment | null;
  nextGym: Gym | null;
  minutesLeft: number | null;
  onCancelClick: (apt: Appointment) => void;
}) {
  return (
    <div className="card-gold-hero relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-widest" style={{ color: GOLD_BRIGHT, fontFamily: "var(--font-label)" }}>Sıradaki Dersin</h3>
        <Link href="/ogrenci/randevu" className="text-xs tracking-wider transition-colors" style={{ color: GOLD_BRIGHT, fontFamily: "var(--font-label)" }}>Tümü →</Link>
      </div>

      {!nextAppointment ? (
        <div className="text-center py-6">
          <Calendar size={26} className="text-white/10 mx-auto mb-2" />
          <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-label)" }}>Yaklaşan dersin yok</p>
          <Link href="/ogrenci/randevu" className="inline-block text-xs tracking-wider transition-colors" style={{ color: "var(--color-error)", fontFamily: "var(--font-label)" }}>+ Randevu Al</Link>
        </div>
      ) : (() => {
        const hoursLeft = differenceInHours(parseISO(`${nextAppointment.date}T${nextAppointment.startTime}`), new Date());
        const canCancel = hoursLeft >= CANCEL_LIMIT_HOURS;
        const remainingLabel = minutesLeft !== null
          ? minutesLeft < 60 ? `${Math.max(0, minutesLeft)} dakika kaldı`
          : minutesLeft < 1440 ? `${Math.floor(minutesLeft / 60)} saat kaldı`
          : `${Math.floor(minutesLeft / 1440)} gün kaldı`
          : null;
        return (
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
              style={{ background: GOLD_BG_SOFT, border: `1px solid ${GOLD_BORDER_SOFT}` }}>
              <span className="text-sm" style={{ color: GOLD_BRIGHT, fontFamily: "var(--font-display)" }}>{format(parseISO(nextAppointment.date), "dd")}</span>
              <span className="text-[9px]" style={{ color: GOLD_BRIGHT, opacity: 0.7, fontFamily: "var(--font-display)" }}>{format(parseISO(nextAppointment.date), "MMM", { locale: tr }).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-label)" }}>{format(parseISO(nextAppointment.date), "EEEE", { locale: tr })}</span>
                {nextAppointment.lessonType !== "bireysel" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#A855F7", fontFamily: "var(--font-label)" }}>
                    {nextAppointment.lessonType === "duet" ? "Düet" : "Grup"}
                  </span>
                )}
                {remainingLabel && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
                    {remainingLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                <Clock size={11} />
                <span style={{ fontFamily: "var(--font-label)" }}>{nextAppointment.startTime} – {nextAppointment.endTime}</span>
                {nextGym && <span style={{ fontFamily: "var(--font-label)" }}>· {nextGym.name}</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <Badge color="green">{STATUS_LABELS[nextAppointment.status]}</Badge>
              <button onClick={() => onCancelClick(nextAppointment)}
                className="text-[10px] transition-colors"
                style={{ color: canCancel ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)", fontFamily: "var(--font-label)", cursor: canCancel ? "pointer" : "default" }}
                title={canCancel ? "Randevuyu iptal et" : `${CANCEL_LIMIT_HOURS} saatten az kaldı`}>
                {canCancel ? "İptal et" : "⏱ İptal edilemez"}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
