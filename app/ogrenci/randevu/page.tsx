"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getTimeSlots, getAppointments, createAppointment,
  cancelAppointment, getDuetPartner,
} from "@/lib/db";
import type { TimeSlot, Appointment, Student, LessonType } from "@/lib/types";
import { PageHeader } from "@/app/components/ui";
import { TRAINER_NAME, TRAINER_WHATSAPP, CANCEL_LIMIT_HOURS } from "@/lib/constants";
import {
  Calendar, Clock, CheckCircle, XCircle, AlertTriangle,
  Users, User,
} from "lucide-react";
import { format, addDays, parseISO, differenceInHours, isFuture } from "date-fns";
import { tr } from "date-fns/locale";

/* ── Stil sabitleri ───────────────────────────────────────────────── */
const CARD = {
  background: "rgba(15,15,22,0.95)",
  border: "1px solid rgba(139,92,246,0.12)",
  backdropFilter: "blur(20px)",
};
const VIOLET = "#8B5CF6";

const STATUS_TR: Record<string, string> = {
  onaylandi: "Onaylandı", iptal: "İptal", tamamlandi: "Tamamlandı", gelmedi: "Gelmedi",
};
const STATUS_COLOR: Record<string, string> = {
  onaylandi: "#22c55e", iptal: "#ef4444", tamamlandi: "#d97706", gelmedi: "#6b7280",
};

const LESSON_TYPES: { value: LessonType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "bireysel", label: "Bireysel", icon: <User size={16}/>, desc: "Sadece sen" },
  { value: "duet",     label: "Düet",     icon: <Users size={16}/>, desc: "İki öğrenci" },
];

/* ── Küçük bileşenler ────────────────────────────────────────────── */
function InfoRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex justify-between py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>{label}</span>
      <span className="text-xs font-semibold text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{val}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ANA BILEŞEN
   ════════════════════════════════════════════════════════════════════ */
export default function RandevuPage() {
  const { student } = useAuth();

  /* Tarih + slotlar */
  const [selectedDate, setSelectedDate]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots]                 = useState<TimeSlot[]>([]);
  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [selectedSlot, setSelectedSlot]   = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots]   = useState(false);

  /* Ders tipi */
  const [lessonType, setLessonType]       = useState<LessonType>("bireysel");

  /* Düet: admin tarafından atanmış partner (otomatik) */
  const [partner, setPartner]             = useState<Student | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);

  /* Modal durumları */
  const [confirmOpen, setConfirmOpen]     = useState(false);
  const [successOpen, setSuccessOpen]     = useState(false);
  const [cancelId, setCancelId]           = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [bookError, setBookError]         = useState("");

  const dates = Array.from({ length: 14 }, (_, i) =>
    format(addDays(new Date(), i), "yyyy-MM-dd")
  );

  /* ── Yükle ───────────────────────────────────────────────────────── */
  const reload = useCallback(async () => {
    if (!student) return;
    setLoadingSlots(true);
    const [s, a] = await Promise.all([
      getTimeSlots(selectedDate),
      getAppointments({ studentId: student.id }),
    ]);
    setSlots(s);
    setAppointments(a);
    setLoadingSlots(false);
  }, [selectedDate, student]);

  useEffect(() => { reload(); }, [reload]);

  /* Düet partneri yükle */
  useEffect(() => {
    if (!student) return;
    setPartnerLoading(true);
    getDuetPartner(student.id)
      .then(p => setPartner(p))
      .catch(() => setPartner(null))
      .finally(() => setPartnerLoading(false));
  }, [student]);

  /* Partner arama kaldırıldı — admin atar, öğrenci görür */

  /* ── Saat seçince onay ekranını aç ──────────────────────────────── */
  const handleSlotClick = (slot: TimeSlot) => {
    setBookError("");
    setSelectedSlot(slot);
    setConfirmOpen(true);
  };

  /* ── Randevu oluştur ─────────────────────────────────────────────── */
  const confirmBook = async () => {
    if (!selectedSlot || !student) return;
    setBookError("");

    // ── Validasyonlar ────────────────────────────────────────────────
    // 1. Kendi dersi var mı?
    if (student.remainingLessons <= 0) {
      setBookError("Paketinizde ders kalmadı. Yeni paket alın.");
      return;
    }

    // 2. Düet için partner kontrolü
    if (lessonType === "duet") {
      if (!partner) {
        setBookError("Düet partneriniz henüz tanımlanmamış. Antrenörünüzle iletişime geçin.");
        return;
      }
      if (partner.remainingLessons <= 0) {
        setBookError(`${partner.fullName} adlı partnerinizin kalan dersi yok. Randevu oluşturulamaz.`);
        return;
      }
    }

    setSaving(true);
    try {
      const secondIds = lessonType === "duet" && partner ? [partner.id] : [];
      await createAppointment({
        studentId:        student.id,
        studentName:      student.fullName,
        studentCode:      student.code,
        studentPhone:     student.phone,
        date:             selectedDate,
        startTime:        selectedSlot.startTime,
        endTime:          selectedSlot.endTime,
        lessonType,
        secondStudentIds: secondIds,
        status:           "onaylandi",
      });
      setConfirmOpen(false);
      setSuccessOpen(true);
      await reload();
    } catch (err: unknown) {
      setBookError(err instanceof Error ? err.message : "Randevu oluşturulamadı.");
    } finally {
      setSaving(false);
    }
  };

  /* ── İptal ───────────────────────────────────────────────────────── */
  const handleCancelClick = (apt: Appointment) => {
    const hoursLeft = differenceInHours(parseISO(`${apt.date}T${apt.startTime}`), new Date());
    if (hoursLeft < CANCEL_LIMIT_HOURS) {
      alert(`${CANCEL_LIMIT_HOURS} saatten az kalan randevular iptal edilemez.`);
      return;
    }
    setCancelId(apt.id);
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    await cancelAppointment(cancelId);
    setCancelId(null);
    await reload();
  };

  /* ── Yardımcı hesaplamalar ───────────────────────────────────────── */
  const myAptOnDate = appointments.find(
    a => a.date === selectedDate && a.status === "onaylandi"
  );
  const upcoming = appointments
    .filter(a => a.status === "onaylandi" && isFuture(parseISO(`${a.date}T${a.startTime}`)))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const past = appointments.filter(a => a.status !== "onaylandi").slice(0, 6);

  const waMsg = student
    ? `Merhaba! ${TRAINER_NAME} ile randevum oluşturuldu.\nTarih: ${format(parseISO(selectedDate), "dd MMMM yyyy (EEEE)", { locale: tr })}\nSaat: ${selectedSlot?.startTime} – ${selectedSlot?.endTime}\n${lessonType === "duet" ? `Düet: ${student.fullName} + ${partner?.fullName}\n` : ""}Görüşmek üzere 🥊`
    : "";

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader title="Randevu Al" subtitle="Saat seç, ders tipini belirle" accent="Özel Ders" />

      {/* Kalan ders uyarısı */}
      {student && student.remainingLessons === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={18} className="text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Paketinizde ders kalmadı. Yeni paket almadan randevu oluşturamazsınız.
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">

        {/* ── Sol/Ana alan ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* 1. Ders Tipi */}
          <div className="rounded-2xl p-5" style={CARD}>
            <p className="text-xs tracking-widest uppercase mb-3"
              style={{ color: VIOLET, fontFamily: "var(--font-barlow-condensed)" }}>
              Ders Tipi Seç
            </p>
            <div className="flex gap-3">
              {LESSON_TYPES.map(t => (
                <button key={t.value} onClick={() => { setLessonType(t.value); if (t.value !== "duet") setPartner(null); }}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3.5 px-3 rounded-xl transition-all"
                  style={{
                    background: lessonType === t.value ? `${VIOLET}18` : "rgba(255,255,255,0.03)",
                    border: lessonType === t.value ? `1px solid ${VIOLET}55` : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: lessonType === t.value ? `0 0 20px ${VIOLET}20` : "none",
                  }}>
                  <span style={{ color: lessonType === t.value ? VIOLET : "rgba(255,255,255,0.35)" }}>{t.icon}</span>
                  <span className="text-sm font-semibold"
                    style={{ color: lessonType === t.value ? "#fff" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
                    {t.label}
                  </span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Düet: Atanmış partner göster */}
          <AnimatePresence>
            {lessonType === "duet" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="rounded-2xl p-5" style={{
                  ...CARD, border: partner
                    ? (partner.remainingLessons > 0 ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)")
                    : "1px solid rgba(139,92,246,0.25)",
                }}>
                  <p className="text-xs tracking-widest uppercase mb-3"
                    style={{ color: VIOLET, fontFamily: "var(--font-barlow-condensed)" }}>
                    Düet Partneri
                  </p>

                  {partnerLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <div className="w-4 h-4 border-2 border-violet/40 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yükleniyor...</span>
                    </div>
                  ) : partner ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                        {partner.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                          {partner.fullName}
                        </div>
                        <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
                          {partner.code} · {partner.remainingLessons} ders kaldı
                        </div>
                      </div>
                      {partner.remainingLessons > 0
                        ? <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                        : <XCircle size={18} className="text-red-400 flex-shrink-0" />}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl text-center"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <p className="text-sm text-red-400 mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        Düet partneriniz tanımlanmamış
                      </p>
                      <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        Antrenörünüzden düet partneri atamasını isteyin.
                      </p>
                    </div>
                  )}

                  {partner && partner.remainingLessons === 0 && (
                    <p className="text-xs text-red-400 mt-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      ⚠️ Partnerinizin kalan dersi yok. Düet randevu oluşturulamaz.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Tarih seçimi */}
          <div className="rounded-2xl p-5" style={CARD}>
            <p className="text-xs tracking-widest uppercase mb-3 flex items-center gap-2"
              style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
              <Calendar size={13} />Tarih Seçin
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dates.map(d => {
                const active = d === selectedDate;
                const hasApt = appointments.some(a => a.date === d && a.status === "onaylandi");
                return (
                  <motion.button key={d} whileTap={{ scale: 0.93 }}
                    onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                    className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl min-w-[52px] transition-all"
                    style={{
                      background: active ? `${VIOLET}20` : "rgba(255,255,255,0.03)",
                      border: active ? `1px solid ${VIOLET}55` : "1px solid rgba(255,255,255,0.07)",
                      boxShadow: active ? `0 0 14px ${VIOLET}25` : "none",
                    }}>
                    <span className="text-[10px]" style={{ color: active ? "#C084FC" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                      {format(parseISO(d), "EEE", { locale: tr }).toUpperCase()}
                    </span>
                    <span className="text-lg font-display"
                      style={{ fontFamily: "var(--font-bebas)", color: active ? "#fff" : "rgba(255,255,255,0.45)" }}>
                      {format(parseISO(d), "dd")}
                    </span>
                    {hasApt && <div className="w-1.5 h-1.5 rounded-full mt-0.5" style={{ background: "#22c55e" }} />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 4. Müsait saatler */}
          <div className="rounded-2xl p-5" style={CARD}>
            <p className="text-xs tracking-widest uppercase mb-3 flex items-center gap-2"
              style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
              <Clock size={13} />
              {format(parseISO(selectedDate), "dd MMMM yyyy (EEEE)", { locale: tr })} — Müsait Saatler
            </p>

            {myAptOnDate && (
              <div className="mb-4 p-3 rounded-xl flex items-center gap-2"
                style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle size={15} className="text-green-400 flex-shrink-0" />
                <span className="text-sm text-green-400" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Bu güne ait randevunuz var: {myAptOnDate.startTime} – {myAptOnDate.endTime}
                </span>
              </div>
            )}

            {loadingSlots ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${VIOLET}40`, borderTopColor: "transparent" }} />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-10">
                <Clock size={28} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                  Bu gün için müsait saat tanımlanmamış
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-barlow-condensed)" }}>
                  Antrenörünüzle iletişime geçin
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {slots.map(slot => {
                  const taken = !slot.isAvailable || !!myAptOnDate;
                  return (
                    <motion.button key={slot.id} whileTap={{ scale: 0.96 }} disabled={taken}
                      onClick={() => handleSlotClick(slot)}
                      className="p-3 rounded-xl text-center transition-all"
                      style={{
                        background: taken ? "rgba(255,255,255,0.02)" : "rgba(139,92,246,0.06)",
                        border: taken ? "1px solid rgba(255,255,255,0.04)" : `1px solid ${VIOLET}25`,
                        cursor: taken ? "not-allowed" : "pointer",
                        opacity: taken ? 0.4 : 1,
                      }}
                      onMouseEnter={e => { if (!taken) (e.currentTarget as HTMLElement).style.borderColor = `${VIOLET}60`; }}
                      onMouseLeave={e => { if (!taken) (e.currentTarget as HTMLElement).style.borderColor = `${VIOLET}25`; }}>
                      <div className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {slot.startTime}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
                        {slot.endTime}
                      </div>
                      {taken && (
                        <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>Dolu</div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Sağ sidebar ───────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Yaklaşan randevular */}
          <div className="rounded-2xl p-5" style={CARD}>
            <p className="text-xs tracking-widest uppercase mb-3"
              style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>Yaklaşan</p>
            {upcoming.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>Randevu yok</p>
            ) : upcoming.map(apt => (
              <div key={apt.id} className="mb-3 last:mb-0 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div className="text-xs font-semibold text-white mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {format(parseISO(apt.date), "dd MMM, EEEE", { locale: tr })}
                </div>
                <div className="flex items-center gap-1 text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
                  <Clock size={11} />
                  {apt.startTime} – {apt.endTime}
                  {apt.lessonType && apt.lessonType !== "bireysel" && (
                    <span className="ml-1 px-1.5 py-0.5 text-[9px] rounded" style={{ background: `${VIOLET}20`, color: VIOLET, fontFamily: "var(--font-barlow-condensed)" }}>
                      {apt.lessonType === "duet" ? "Düet" : "Grup"}
                    </span>
                  )}
                </div>
                <button onClick={() => handleCancelClick(apt)}
                  className="text-xs transition-colors" style={{ color: "rgba(239,68,68,0.5)", fontFamily: "var(--font-barlow-condensed)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(239,68,68,0.5)"; }}>
                  İptal et
                </button>
              </div>
            ))}
          </div>

          {/* Geçmiş */}
          <div className="rounded-2xl p-5" style={CARD}>
            <p className="text-xs tracking-widest uppercase mb-3"
              style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>Geçmiş</p>
            {past.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>Kayıt yok</p>
            ) : past.map(apt => (
              <div key={apt.id} className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div>
                  <div className="text-xs text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    {format(parseISO(apt.date), "dd MMM", { locale: tr })} · {apt.startTime}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: `${STATUS_COLOR[apt.status]}18`, color: STATUS_COLOR[apt.status], fontFamily: "var(--font-barlow-condensed)" }}>
                  {STATUS_TR[apt.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Onay Modali ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmOpen && selectedSlot && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setConfirmOpen(false)}>
            <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setConfirmOpen(false)} />
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="relative z-10 w-full max-w-md rounded-2xl p-6 overflow-hidden"
              style={{ background: "rgba(15,15,22,0.98)", border: "1px solid rgba(139,92,246,0.3)", backdropFilter: "blur(20px)" }}
              onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,#8B5CF6,#D946EF,transparent)" }} />

              <h3 className="text-xl font-display text-white tracking-wider mb-5"
                style={{ fontFamily: "var(--font-bebas)" }}>
                RANDEVU ONAYLA
              </h3>

              <div className="space-y-1 mb-5">
                <InfoRow label="Tarih" val={format(parseISO(selectedDate), "dd MMMM yyyy (EEEE)", { locale: tr })} />
                <InfoRow label="Saat" val={`${selectedSlot.startTime} – ${selectedSlot.endTime}`} />
                <InfoRow label="Ders Tipi" val={lessonType === "bireysel" ? "Bireysel" : lessonType === "duet" ? "Düet" : "Grup"} />
                {student && <InfoRow label="Öğrenci A" val={`${student.fullName} (${student.remainingLessons} ders)`} />}
                {lessonType === "duet" && partner && (
                  <InfoRow label="Öğrenci B" val={`${partner.fullName} (${partner.remainingLessons} ders)`} />
                )}
                <InfoRow label="Antrenör" val={TRAINER_NAME} />
              </div>

              <div className="p-3 rounded-xl mb-4 text-xs"
                style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-inter)" }}>
                ℹ️ Ders, antrenör tarafından tamamlandı işaretlendiğinde paketinizden düşülür.
                Randevuyu {CANCEL_LIMIT_HOURS} saatten az kala iptal edemezsiniz.
              </div>

              {bookError && (
                <div className="p-3 rounded-xl mb-4 text-xs text-red-400"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
                  ⚠️ {bookError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setConfirmOpen(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
                  Vazgeç
                </button>
                <button onClick={confirmBook} disabled={saving}
                  className="flex-1 py-3 rounded-xl text-white text-xs font-semibold tracking-wider uppercase transition-all disabled:opacity-50"
                  style={{
                    background: "linear-gradient(135deg,#8B5CF6,#A855F7)",
                    fontFamily: "var(--font-barlow-condensed)",
                    boxShadow: "0 0 20px rgba(139,92,246,0.35)",
                  }}>
                  {saving ? "Oluşturuluyor..." : "Onayla"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Başarı Modali ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {successOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.7)" }} />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl p-6 text-center overflow-hidden"
              style={{ background: "rgba(15,15,22,0.98)", border: "1px solid rgba(34,197,94,0.3)", backdropFilter: "blur(20px)" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,#22c55e,transparent)" }} />
              <CheckCircle size={44} className="text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-display text-white mb-2" style={{ fontFamily: "var(--font-bebas)" }}>
                RANDEVU OLUŞTURULDU!
              </h3>
              <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-inter)" }}>
                {format(parseISO(selectedDate), "dd MMMM yyyy", { locale: tr })} · {selectedSlot?.startTime}
              </p>
              {lessonType === "duet" && partner && (
                <p className="text-xs mb-4" style={{ color: "#22c55e", fontFamily: "var(--font-barlow-condensed)" }}>
                  Düet: {student?.fullName} + {partner.fullName}
                </p>
              )}
              <a href={`https://wa.me/${TRAINER_WHATSAPP}?text=${encodeURIComponent(waMsg)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-xs font-semibold tracking-wider uppercase mb-3 transition-all"
                style={{ background: "rgba(34,197,94,0.8)", fontFamily: "var(--font-barlow-condensed)" }}>
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                WhatsApp ile Bildir
              </a>
              <button onClick={() => setSuccessOpen(false)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
                Kapat
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── İptal Onayı ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {cancelId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setCancelId(null)} />
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
              className="relative z-10 w-full max-w-sm rounded-2xl p-6 overflow-hidden"
              style={{ background: "rgba(15,15,22,0.98)", border: "1px solid rgba(239,68,68,0.3)", backdropFilter: "blur(20px)" }}
              onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,#ef4444,transparent)" }} />
              <h3 className="text-xl font-display text-white mb-2" style={{ fontFamily: "var(--font-bebas)" }}>RANDEVU İPTAL</h3>
              <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-inter)" }}>
                Bu randevuyu iptal etmek istediğinize emin misiniz?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setCancelId(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-semibold tracking-wider uppercase"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
                  Vazgeç
                </button>
                <button onClick={confirmCancel}
                  className="flex-1 py-3 rounded-xl text-white text-xs font-semibold tracking-wider uppercase"
                  style={{ background: "rgba(239,68,68,0.7)", fontFamily: "var(--font-barlow-condensed)" }}>
                  İptal Et
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
