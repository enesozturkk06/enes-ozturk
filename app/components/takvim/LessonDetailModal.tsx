"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, MapPin, User, Package as PackageIcon } from "lucide-react";
import type { Appointment, Student, Gym } from "@/lib/types";
import { PACKAGES, STATUS_LABELS, TRAINER_NAME, TRAINER_LOCATION, LESSON_DURATION_MINUTES } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface Props {
  appointment: Appointment | null;
  student?: Student;
  gym?: Gym;
  onClose: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  onaylandi: "var(--color-success)",
  tamamlandi: "#60A5FA",
  iptal: "var(--color-error)",
  gelmedi: "var(--color-warning)",
};

export default function LessonDetailModal({ appointment, student, gym, onClose }: Props) {
  return (
    <AnimatePresence>
      {appointment && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={onClose}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 w-full max-w-sm rounded-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onClose}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-white/40 hover:text-white transition-colors">
              <X size={16} />
            </button>

            <div className="relative p-6">
              {/* Öğrenci avatarı + isim */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4), rgba(236,72,153,0.15))", border: "2px solid rgba(139,92,246,0.4)" }}>
                  {student?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={student.avatarUrl} alt={appointment.studentName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg text-white" style={{ fontFamily: "var(--font-display)" }}>
                      {appointment.studentName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-base text-white font-semibold truncate" style={{ fontFamily: "var(--font-label)" }}>
                    {appointment.studentName}
                  </div>
                  <div className="text-xs" style={{ color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
                    {appointment.studentCode}
                  </div>
                </div>
                <span className="ml-auto flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full"
                  style={{ background: `${STATUS_COLOR[appointment.status]}18`, color: STATUS_COLOR[appointment.status], fontFamily: "var(--font-label)" }}>
                  {STATUS_LABELS[appointment.status]}
                </span>
              </div>

              {/* Tarih / saat */}
              <div className="flex items-center gap-2 mb-4 text-sm text-white/70" style={{ fontFamily: "var(--font-label)" }}>
                <Clock size={14} style={{ color: "#A78BFA" }} />
                {format(parseISO(appointment.date), "dd MMMM yyyy, EEEE", { locale: tr })} · {appointment.startTime}–{appointment.endTime}
              </div>

              <div className="space-y-3 text-sm" style={{ fontFamily: "var(--font-label)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-white/35 flex items-center gap-1.5"><PackageIcon size={13} />Paket</span>
                  <span className="text-white/80">
                    {student
                      ? (student.subscriptionType === "monthly" ? "Aylık Üyelik" : PACKAGES.find(p => p.type === student.packageType)?.name ?? "—")
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Kalan Ders</span>
                  <span className="text-white/80">
                    {student ? (student.subscriptionType === "monthly" ? "Sınırsız" : `${student.remainingLessons} / ${student.totalLessons}`) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Ders Süresi</span>
                  <span className="text-white/80">{LESSON_DURATION_MINUTES} dk</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35 flex items-center gap-1.5"><MapPin size={13} />Salon</span>
                  <span className="text-white/80">{gym?.name ?? TRAINER_LOCATION}</span>
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-white/35 flex items-center gap-1.5"><User size={13} />Eğitmen</span>
                  <span className="text-white/80">{TRAINER_NAME}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
