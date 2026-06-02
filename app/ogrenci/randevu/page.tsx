"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getTimeSlots, getAppointments, createAppointment, cancelAppointment } from "@/lib/db";
import type { TimeSlot, Appointment } from "@/lib/types";
import { Card, Button, Badge, PageHeader, Modal } from "@/app/components/ui";
import { TRAINER_NAME, TRAINER_WHATSAPP, CANCEL_LIMIT_HOURS } from "@/lib/constants";
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format, addDays, parseISO, differenceInHours, isFuture } from "date-fns";
import { tr } from "date-fns/locale";

const STATUS_COLOR: Record<string, "green" | "red" | "gold" | "gray"> = {
  onaylandi: "green", iptal: "red", tamamlandi: "gold", gelmedi: "gray",
};
const STATUS_TR: Record<string, string> = {
  onaylandi: "Onaylandı", iptal: "İptal", tamamlandi: "Tamamlandı", gelmedi: "Gelmedi",
};

export default function RandevuPage() {
  const { student } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [newApt, setNewApt] = useState<Appointment | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const dates = Array.from({ length: 14 }, (_, i) => format(addDays(new Date(), i), "yyyy-MM-dd"));

  useEffect(() => {
    if (!student) return;
    Promise.all([getTimeSlots(selectedDate), getAppointments({ studentId: student.id })]).then(([s, a]) => {
      setSlots(s);
      setAppointments(a);
    });
  }, [selectedDate, student]);

  const myAptOnDate = appointments.find(a => a.date === selectedDate && a.status === "onaylandi");
  const upcoming = appointments.filter(a => a.status === "onaylandi" && isFuture(parseISO(`${a.date}T${a.startTime}`))).sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const past = appointments.filter(a => a.status !== "onaylandi").slice(0, 5);

  const confirmBook = async () => {
    if (!selectedSlot || !student) return;
    setLoading(true);
    const apt = await createAppointment({
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.code,
      studentPhone: student.phone,
      date: selectedDate,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      status: "onaylandi",
    });
    setLoading(false);
    if (apt) {
      setNewApt(apt);
      setConfirmModal(false);
      setSuccessModal(true);
      const [s] = await Promise.all([getTimeSlots(selectedDate)]);
      setSlots(s);
    }
  };

  const handleCancel = async (id: string) => {
    const apt = appointments.find(a => a.id === id);
    if (!apt) return;
    const hoursLeft = differenceInHours(parseISO(`${apt.date}T${apt.startTime}`), new Date());
    if (hoursLeft < CANCEL_LIMIT_HOURS) {
      alert(`${CANCEL_LIMIT_HOURS} saatten az kalan randevular iptal edilemez.`);
      return;
    }
    setCancelId(id);
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    await cancelAppointment(cancelId);
    const [, a] = await Promise.all([getTimeSlots(selectedDate), getAppointments({ studentId: student!.id })]);
    setSlots(await getTimeSlots(selectedDate));
    setAppointments(a);
    setCancelId(null);
  };

  const waMsg = newApt
    ? `Merhaba ${newApt.studentName}! ${TRAINER_NAME} ile dersiniz oluşturuldu.\nTarih: ${format(parseISO(newApt.date), "dd MMMM yyyy (EEEE)", { locale: tr })}\nSaat: ${newApt.startTime} – ${newApt.endTime}\nGörüşmek üzere 🥊`
    : "";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="Randevu Sistemi" subtitle="Boş saatleri görerek randevu alın" accent="Özel Ders" />

      {student && student.remainingLessons === 0 && (
        <div className="flex items-center gap-3 p-4 bg-crimson/5 border border-crimson/20">
          <AlertTriangle size={18} className="text-crimson flex-shrink-0" />
          <span className="text-sm text-white/70" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Paketinizde ders kalmadı. Randevu alabilmek için yeni paket satın alın.
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar & Slots */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date selector */}
          <Card className="p-4">
            <h3 className="text-sm text-white/50 tracking-widest uppercase mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              <Calendar size={14} className="inline mr-2" />Tarih Seçin
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {dates.map(d => {
                const active = d === selectedDate;
                const hasApt = appointments.some(a => a.date === d && a.status === "onaylandi");
                return (
                  <motion.button
                    key={d} whileTap={{ scale: 0.95 }}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-2 border transition-all duration-200 min-w-[52px] ${active ? "bg-crimson border-crimson text-white" : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"}`}
                  >
                    <span className="text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      {format(parseISO(d), "EEE", { locale: tr }).toUpperCase()}
                    </span>
                    <span className="text-lg font-display" style={{ fontFamily: "var(--font-bebas)" }}>
                      {format(parseISO(d), "dd")}
                    </span>
                    {hasApt && <div className="w-1.5 h-1.5 bg-gold rounded-full mt-0.5" />}
                  </motion.button>
                );
              })}
            </div>
          </Card>

          {/* Time slots */}
          <Card className="p-4">
            <h3 className="text-sm text-white/50 tracking-widest uppercase mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              <Clock size={14} className="inline mr-2" />
              {format(parseISO(selectedDate), "dd MMMM yyyy (EEEE)", { locale: tr })} — Uygun Saatler
            </h3>

            {myAptOnDate && (
              <div className="mb-4 p-3 bg-gold/5 border border-gold/20 flex items-center gap-2">
                <CheckCircle size={16} className="text-gold" />
                <span className="text-sm text-gold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Bu güne ait randevunuz var: {myAptOnDate.startTime} – {myAptOnDate.endTime}
                </span>
              </div>
            )}

            {slots.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={28} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Bu gün için henüz müsait saat tanımlanmamış
                </p>
                <p className="text-white/15 text-xs mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Antrenörünüzle iletişime geçin
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slots.map(slot => {
                  const taken = !slot.isAvailable || myAptOnDate !== undefined;
                  const selected = selectedSlot?.id === slot.id;
                  return (
                    <motion.button
                      key={slot.id} whileTap={{ scale: 0.97 }}
                      disabled={taken}
                      onClick={() => { setSelectedSlot(slot); setConfirmModal(true); }}
                      className={`p-3 border text-center transition-all duration-200 ${
                        taken ? "border-white/5 text-white/15 cursor-not-allowed"
                        : selected ? "border-crimson bg-crimson/10 text-crimson"
                        : "border-white/10 text-white/60 hover:border-crimson/40 hover:text-crimson/80"
                      }`}
                    >
                      <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{slot.startTime}</div>
                      <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{slot.endTime}</div>
                      {taken && <div className="text-xs text-white/20 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Dolu</div>}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: upcoming + past */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm text-white/50 tracking-widest uppercase mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yaklaşan</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-white/25 text-center py-4" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Randevu yok</p>
            ) : upcoming.map(apt => (
              <div key={apt.id} className="mb-3 last:mb-0 p-3 bg-steel/30 border border-white/5 space-y-2">
                <div className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {format(parseISO(apt.date), "dd MMM, EEEE", { locale: tr })}
                </div>
                <div className="flex items-center gap-1 text-xs text-white/40">
                  <Clock size={12} />
                  <span style={{ fontFamily: "var(--font-barlow-condensed)" }}>{apt.startTime} – {apt.endTime}</span>
                </div>
                <button
                  onClick={() => handleCancel(apt.id)}
                  className="text-xs text-crimson/50 hover:text-crimson transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  İptal et
                </button>
              </div>
            ))}
          </Card>

          <Card className="p-4">
            <h3 className="text-sm text-white/50 tracking-widest uppercase mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Geçmiş</h3>
            {past.length === 0 ? (
              <p className="text-xs text-white/25 text-center py-4" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kayıt yok</p>
            ) : past.map(apt => (
              <div key={apt.id} className="mb-2 last:mb-0 flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-xs text-white/50" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{format(parseISO(apt.date), "dd MMM", { locale: tr })} · {apt.startTime}</div>
                </div>
                <Badge color={STATUS_COLOR[apt.status]}>{STATUS_TR[apt.status]}</Badge>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Confirm booking modal */}
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="Randevu Onayla">
        {selectedSlot && (
          <div className="space-y-4">
            <div className="p-4 bg-steel/30 border border-white/5 space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Tarih</span>
                <span className="text-sm text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{format(parseISO(selectedDate), "dd MMMM yyyy (EEEE)", { locale: tr })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Saat</span>
                <span className="text-sm text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{selectedSlot.startTime} – {selectedSlot.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Antrenör</span>
                <span className="text-sm text-crimson" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{TRAINER_NAME}</span>
              </div>
            </div>
            <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-inter)" }}>
              Randevuyu {CANCEL_LIMIT_HOURS} saatten az kala iptal edemezsiniz.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setConfirmModal(false)} variant="secondary" className="flex-1">Vazgeç</Button>
              <Button onClick={confirmBook} loading={loading} className="flex-1">Onayla</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Success modal with WhatsApp */}
      <Modal open={successModal} onClose={() => setSuccessModal(false)} title="Randevu Oluşturuldu!">
        <div className="space-y-4 text-center">
          <CheckCircle size={48} className="text-green-400 mx-auto" />
          <p className="text-white/60 text-sm" style={{ fontFamily: "var(--font-inter)" }}>Randevunuz başarıyla oluşturuldu. Antrenörünüzü WhatsApp ile bilgilendirebilirsiniz.</p>
          {newApt && (
            <a
              href={`https://wa.me/${TRAINER_WHATSAPP}?text=${encodeURIComponent(waMsg)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
              WhatsApp ile Bildir
            </a>
          )}
          <Button onClick={() => setSuccessModal(false)} variant="secondary" className="w-full">Kapat</Button>
        </div>
      </Modal>

      {/* Cancel confirm */}
      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Randevu İptal">
        <div className="space-y-4">
          <p className="text-white/60 text-sm" style={{ fontFamily: "var(--font-inter)" }}>Bu randevuyu iptal etmek istediğinize emin misiniz?</p>
          <div className="flex gap-3">
            <Button onClick={() => setCancelId(null)} variant="secondary" className="flex-1">Vazgeç</Button>
            <Button onClick={confirmCancel} variant="danger" className="flex-1">İptal Et</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
