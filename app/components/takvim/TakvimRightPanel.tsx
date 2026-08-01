"use client";
import type { ReactNode } from "react";
import { CalendarClock, CheckCircle2, Gift, Clock3, CalendarCheck, type LucideIcon } from "lucide-react";
import type { Appointment, GiftLessonRequest } from "@/lib/types";
import type { Slot } from "@/lib/slots";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface Props {
  upcomingAppointments: Appointment[];
  todayAppointments: Appointment[];
  lastCompletedAppointment: Appointment | null;
  pendingGifts: GiftLessonRequest[];
  emptyTodaySlots: Slot[];
}

function Section({ icon: Icon, title, color, children }: { icon: LucideIcon; title: string; color: string; children: ReactNode }) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color }} />
        <h3 className="text-xs tracking-widest uppercase" style={{ color, fontFamily: "var(--font-label)" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function TakvimRightPanel({ upcomingAppointments, todayAppointments, lastCompletedAppointment, pendingGifts, emptyTodaySlots }: Props) {
  return (
    <div className="space-y-3">
      <Section icon={CalendarClock} title="Yaklaşan Dersler" color="#A78BFA">
        {upcomingAppointments.length === 0 ? (
          <p className="text-xs text-white/25" style={{ fontFamily: "var(--font-label)" }}>Yaklaşan ders yok</p>
        ) : (
          <div className="space-y-2">
            {upcomingAppointments.map(a => (
              <div key={a.id} className="flex items-center justify-between text-xs" style={{ fontFamily: "var(--font-label)" }}>
                <span className="text-white/70 truncate">{a.studentName}</span>
                <span className="text-white/30 flex-shrink-0 ml-2">{format(parseISO(a.date), "dd MMM", { locale: tr })} · {a.startTime}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={CalendarCheck} title="Bugünkü Program" color="#4ADE80">
        {todayAppointments.length === 0 ? (
          <p className="text-xs text-white/25" style={{ fontFamily: "var(--font-label)" }}>Bugün için ders yok</p>
        ) : (
          <div className="space-y-2">
            {todayAppointments.map(a => (
              <div key={a.id} className="flex items-center justify-between text-xs" style={{ fontFamily: "var(--font-label)" }}>
                <span className="text-white/70 truncate">{a.studentName}</span>
                <span style={{ color: a.status === "tamamlandi" ? "var(--color-success)" : "rgba(255,255,255,0.3)" }} className="flex-shrink-0 ml-2">
                  {a.startTime}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={CheckCircle2} title="Son Tamamlanan Ders" color="var(--color-success)">
        {!lastCompletedAppointment ? (
          <p className="text-xs text-white/25" style={{ fontFamily: "var(--font-label)" }}>Henüz tamamlanan ders yok</p>
        ) : (
          <div className="text-xs" style={{ fontFamily: "var(--font-label)" }}>
            <div className="text-white/70">{lastCompletedAppointment.studentName}</div>
            <div className="text-white/30 mt-0.5">
              {format(parseISO(lastCompletedAppointment.date), "dd MMM yyyy", { locale: tr })} · {lastCompletedAppointment.startTime}
            </div>
          </div>
        )}
      </Section>

      <Section icon={Gift} title="Bekleyen Hediye Ders Onayları" color="var(--color-achievement)">
        {pendingGifts.length === 0 ? (
          <p className="text-xs text-white/25" style={{ fontFamily: "var(--font-label)" }}>Bekleyen onay yok</p>
        ) : (
          <div className="space-y-2">
            {pendingGifts.slice(0, 5).map(g => (
              <div key={g.id} className="flex items-center justify-between text-xs" style={{ fontFamily: "var(--font-label)" }}>
                <span className="text-white/70 truncate">{g.studentName}</span>
                <span className="text-white/30 flex-shrink-0 ml-2">{g.threshold.toLocaleString("tr-TR")} XP</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Clock3} title="Boş Saatler (Bugün)" color="#60A5FA">
        {emptyTodaySlots.length === 0 ? (
          <p className="text-xs text-white/25" style={{ fontFamily: "var(--font-label)" }}>Bugün boş saat yok</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {emptyTodaySlots.map(s => (
              <span key={s.start} className="text-[10px] px-2 py-1 rounded-lg"
                style={{ background: "rgba(96,165,250,0.1)", color: "#60A5FA", fontFamily: "var(--font-label)" }}>
                {s.start}
              </span>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
