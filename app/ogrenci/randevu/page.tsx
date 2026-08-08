"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getTimeSlots, getStudentAppointments, createAppointment,
  cancelAppointment, getDuetPartner, getPendingInvites, respondToInvite,
  joinWaitlist, leaveWaitlist, getStudentWaitlist, updateStudent,
} from "@/lib/db";
import type { TimeSlot, Appointment, Student, LessonType, PendingInvite, WaitlistEntry, AvatarAction } from "@/lib/types";
import { PageHeader } from "@/app/components/ui";
import LazyAvatarEngine3D from "@/app/components/shared/LazyAvatarEngine3D";
import { getActiveCharacterPack } from "@/lib/avatarPack";
import {
  TRAINER_NAME, TRAINER_WHATSAPP, TRAINER_LOCATION, CANCEL_LIMIT_HOURS,
  LESSON_DURATION_MINUTES, PACKAGE_EXPIRED_BOOKING_TEXT,
} from "@/lib/constants";
import { isPackageExpired } from "@/lib/packageDuration";
import {
  Calendar, Clock, CheckCircle, XCircle, AlertTriangle,
  Users, User, Bell, Clock3,
} from "lucide-react";
import { format, addDays, parseISO, differenceInHours, isFuture } from "date-fns";
import { tr } from "date-fns/locale";
import PackageExpiryBanner from "@/app/components/shared/PackageExpiryBanner";
import LessonRulesCard from "@/app/components/shared/LessonRulesCard";

const V = "#8B5CF6";

const STATUS_TR: Record<string, string> = {
  onaylandi: "Onaylandı", iptal: "İptal", tamamlandi: "Tamamlandı", gelmedi: "Gelmedi",
};
const STATUS_COLOR: Record<string, string> = {
  onaylandi: "#22c55e", iptal: "#ef4444", tamamlandi: "#d97706", gelmedi: "#6b7280",
};
const LESSON_TYPES: { value: LessonType; label: string; icon: React.ReactNode }[] = [
  { value: "bireysel", label: "Bireysel", icon: <User size={15} /> },
  { value: "duet",     label: "Düet",     icon: <Users size={15} /> },
];

/* ── Kart sarmalayıcı — premium glass ─────────────────────── */
function Card({ children, className = "", style = {}, glass = "glass" }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties; glass?: "glass" | "glass-strong";
}) {
  return (
    <div
      className={`${glass} relative rounded-2xl overflow-hidden w-full ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/* ── Avatar — "ders aktifken Guard / ders bitince Victory" ─────────
 * KENDİ bileşeninde izole edildi çünkü 30sn'lik interval'i (bkz. aşağıda)
 * sadece BU küçük kart yeniden render etsin diye — üst RandevuPage'in tamamı
 * (randevu formu, takvim, saat listesi) 30 saniyede bir GEREKSİZ yeniden
 * render OLMASIN. appointments referansı değiştiğinde (reload()) doğal
 * olarak yeniden render olur, aradaki 30sn'lerde SADECE bu kart tikler. */
function LessonStatusAvatarCard({ appointments }: { appointments: Appointment[] }) {
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const [lessonAction, setLessonAction] = useState<AvatarAction | null>(null);
  const [prevActiveApptId, setPrevActiveApptId] = useState<string | null>(null);

  // "Ders aktifken Guard / ders bitince Victory" — appointment status
  // modelinde "şu an aktif" diye bir alan YOK (sadece onaylandi/iptal/
  // tamamlandi/gelmedi), bu yüzden date+startTime/endTime'dan TÜRETİLİYOR.
  const now = new Date(nowTick);
  const activeAppointment = appointments.find(a =>
    a.status === "onaylandi" &&
    parseISO(`${a.date}T${a.startTime}`) <= now &&
    now < parseISO(`${a.date}T${a.endTime}`)
  ) ?? null;

  // Effect yerine render-sırasında türetme (react-hooks/set-state-in-effect kuralı).
  const currActiveApptId = activeAppointment?.id ?? null;
  if (currActiveApptId !== prevActiveApptId) {
    if (prevActiveApptId && !currActiveApptId) setLessonAction("victory"); // ders az önce bitti
    setPrevActiveApptId(currActiveApptId);
  }

  return (
    <Card>
      <div className="p-4 flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#0a0a0c" }}>
          <LazyAvatarEngine3D
            pack={getActiveCharacterPack()}
            activity={activeAppointment ? "guard" : "idle"}
            action={lessonAction}
            onActionEnd={() => setLessonAction(null)}
            width={56}
            height={56}
          />
        </div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>
          {activeAppointment ? "Ders şu an aktif — gard pozunda 🥊" : "Bir sonraki dersini bekliyor"}
        </p>
      </div>
    </Card>
  );
}

/* ── Özet satırı (tarih/saat/durum vb.) ───────────────────── */
function InfoRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex gap-3 py-2 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <span className="text-xs flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-label)" }}>
        {label}
      </span>
      <span className="text-xs font-semibold text-white text-right flex-1 min-w-0 break-all" style={{ fontFamily: "var(--font-label)" }}>
        {val}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ANA BILEŞEN
   ═══════════════════════════════════════════════════════════════ */
export default function RandevuPage() {
  const { student, setStudent } = useAuth();
  const packageExpired = isPackageExpired(student?.packageEndDate);
  const rulesAccepted = !!student?.rulesAccepted;

  const [selectedDate, setSelectedDate]     = useState(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots]                   = useState<TimeSlot[]>([]);
  const [appointments, setAppointments]     = useState<Appointment[]>([]);
  const [selectedSlot, setSelectedSlot]     = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots]     = useState(false);
  const [lessonType, setLessonType]         = useState<LessonType>("bireysel");
  const [partner, setPartner]               = useState<Student | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteLoading, setInviteLoading]   = useState<string | null>(null);
  const [successOpen, setSuccessOpen]       = useState(false);
  const [cancelId, setCancelId]             = useState<string | null>(null);
  const [cancelBlocked, setCancelBlocked]   = useState<Appointment | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [bookError, setBookError]           = useState("");

  /* Bekleme listesi */
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [waitlistBusy, setWaitlistBusy] = useState<string | null>(null);

  /* Saat seçilince inline "Ders Bilgisi Kartı" görünüme kayar — Apple Calendar
     tarzı: seç → hemen altta önizle → onayla, popup'a gerek yok. */
  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selectedSlot) summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedSlot]);

  const dates = Array.from({ length: 14 }, (_, i) =>
    format(addDays(new Date(), i), "yyyy-MM-dd")
  );

  const reload = useCallback(async () => {
    if (!student) return;
    setLoadingSlots(true);
    const [s, a, invites, wl] = await Promise.all([
      getTimeSlots(selectedDate),
      getStudentAppointments(student.id),
      getPendingInvites(student.id),
      getStudentWaitlist(student.id).catch(() => []),
    ]);
    setSlots(s);
    setAppointments(a);
    setPendingInvites(invites);
    setWaitlist(wl);
    setLoadingSlots(false);
  }, [selectedDate, student]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    if (!student) return;
    setPartnerLoading(true);
    getDuetPartner(student.id)
      .then(p => setPartner(p))
      .catch(() => setPartner(null))
      .finally(() => setPartnerLoading(false));
  }, [student]);

  const handleInviteResponse = async (invite: PendingInvite, accept: boolean) => {
    if (!student) return;
    setInviteLoading(invite.appointmentStudentId);
    try {
      const result = await respondToInvite(invite.appointmentStudentId, student.id, accept);
      if (!result.success) alert(result.error ?? "İşlem başarısız.");
      else await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setInviteLoading(null);
    }
  };

  const handleAcceptRules = async () => {
    if (!student) return;
    try {
      const updated = await updateStudent(student.id, { rulesAccepted: true });
      setStudent(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Onay kaydedilemedi, lütfen tekrar deneyin.");
    }
  };

  const handleSlotClick = (slot: TimeSlot) => { setBookError(""); setSelectedSlot(slot); };

  const confirmBook = async () => {
    if (!selectedSlot || !student) return;
    setBookError("");

    // UUID formatı kontrolü — mock/eski ID'lerin yanlışlıkla kullanılmasını engelle
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(student.id);
    if (!isUUID) {
      setBookError("Öğrenci kaydı bulunamadı, lütfen çıkış yapıp tekrar giriş yapın veya antrenörle iletişime geçin.");
      return;
    }

    if (!rulesAccepted) { setBookError("Randevu oluşturmadan önce ders bilgilendirmesini onaylamanız gerekir."); return; }
    if (packageExpired) { setBookError("Paket süreniz dolduğu için randevu oluşturamazsınız."); return; }
    if (student.remainingLessons <= 0) { setBookError("Paketinizde ders kalmadı."); return; }
    if (lessonType === "duet" && !partner) {
      setBookError("Düet partneriniz henüz tanımlanmamış. Antrenörünüzle iletişime geçin."); return;
    }
    setSaving(true);
    try {
      await createAppointment({
        studentId: student.id, studentName: student.fullName,
        studentCode: student.code, studentPhone: student.phone,
        date: selectedDate, startTime: selectedSlot.startTime, endTime: selectedSlot.endTime,
        lessonType, partnerStudentIds: lessonType === "duet" && partner ? [partner.id] : [],
        status: "onaylandi",
      });
      setSelectedSlot(null); setSuccessOpen(true); await reload();
    } catch (err: unknown) {
      setBookError(err instanceof Error ? err.message : "Randevu oluşturulamadı.");
    } finally { setSaving(false); }
  };

  const handleCancelClick = (apt: Appointment) => {
    const hoursLeft = differenceInHours(parseISO(`${apt.date}T${apt.startTime}`), new Date());
    if (hoursLeft < CANCEL_LIMIT_HOURS) {
      setCancelBlocked(apt); // premium modal — DB'ye dokunmaz
      return;
    }
    setCancelId(apt.id);
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    await cancelAppointment(cancelId, student?.fullName);
    setCancelId(null); await reload();
  };

  const handleWaitlist = async (slot: TimeSlot) => {
    if (!student) return;
    const key = `${slot.date ?? selectedDate}-${slot.startTime}`;
    const isOn = waitlist.some(w => w.date === (slot.date ?? selectedDate) && w.startTime === slot.startTime);
    setWaitlistBusy(key);
    if (isOn) {
      await leaveWaitlist(student.id, slot.date ?? selectedDate, slot.startTime).catch(() => {});
    } else {
      await joinWaitlist(student.id, slot.date ?? selectedDate, slot.startTime, slot.endTime, lessonType).catch(() => {});
    }
    await reload();
    setWaitlistBusy(null);
  };

  const myAptOnDate = appointments.find(a => a.date === selectedDate && a.status === "onaylandi");
  const upcoming = appointments
    .filter(a => a.status === "onaylandi" && isFuture(parseISO(`${a.date}T${a.startTime}`)))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  const past = appointments.filter(a => a.status !== "onaylandi").slice(0, 6);

  const waMsg = student
    ? `Merhaba! ${TRAINER_NAME} ile randevum oluşturuldu.\nTarih: ${format(parseISO(selectedDate), "dd MMMM yyyy (EEEE)", { locale: tr })}\nSaat: ${selectedSlot?.startTime} – ${selectedSlot?.endTime}${lessonType === "duet" && partner ? `\nDüet: ${student.fullName} + ${partner.fullName}` : ""}\nGörüşmek üzere 🥊`
    : "";

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  return (
    // w-full + max-w-full → hiçbir zaman parent'ı aşmaz
    <div className="w-full max-w-5xl mx-auto pb-28" style={{ minWidth: 0 }}>
      <PageHeader title="Randevu Al" subtitle="Ders tipini seç, saat seç, randevu oluştur" accent="Özel Ders" />

      {/* Ders bilgilendirmesi — onaylanmadıysa tam kart, onaylandıysa kısa hatırlatma */}
      <LessonRulesCard accepted={rulesAccepted} onAccept={handleAcceptRules} />

      {/* Paket süresi uyarısı */}
      <PackageExpiryBanner endDate={student?.packageEndDate} />

      {/* Paket süresi dolmuş — randevu alma kapalı */}
      {packageExpired && (
        <div className="flex items-start gap-3 p-4 rounded-xl mb-4"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 min-w-0" style={{ fontFamily: "var(--font-label)" }}>
            {PACKAGE_EXPIRED_BOOKING_TEXT}
          </p>
        </div>
      )}

      {/* Kalan ders uyarısı */}
      {student && student.remainingLessons === 0 && !packageExpired && (
        <div className="flex items-start gap-3 p-4 rounded-xl mb-4"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 min-w-0" style={{ fontFamily: "var(--font-label)" }}>
            Paketinizde ders kalmadı. Yeni paket almadan randevu oluşturamazsınız.
          </p>
        </div>
      )}

      {/* Bekleyen düet davetleri */}
      <AnimatePresence>
        {pendingInvites.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-4 w-full">
            <Card glass="glass">
              {/* Başlık */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
                <Bell size={14} style={{ color: V, flexShrink: 0 }} />
                <span className="text-sm font-semibold" style={{ color: V, fontFamily: "var(--font-label)" }}>
                  Bekleyen Davet ({pendingInvites.length})
                </span>
              </div>
              {/* Davet listesi */}
              {pendingInvites.map(inv => (
                <div key={inv.appointmentStudentId} className="px-4 py-3 border-b border-white/6 last:border-0">
                  {/* Kim davet etti */}
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={13} style={{ color: V, flexShrink: 0 }} />
                    <span className="text-sm font-semibold text-white min-w-0" style={{ fontFamily: "var(--font-label)" }}>
                      {inv.creatorName} düet davet etti
                    </span>
                  </div>
                  {/* Tarih saat */}
                  <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>
                    {format(parseISO(inv.date), "dd MMM yyyy (EEE)", { locale: tr })} · {inv.startTime}–{inv.endTime}
                  </p>
                  {student && student.remainingLessons === 0 && (
                    <p className="text-xs text-red-400 mb-2" style={{ fontFamily: "var(--font-label)" }}>
                      ⚠️ Kalan dersiniz yok — onaylarsanız ders düşülmez.
                    </p>
                  )}
                  {/* Butonlar — tam genişlik, yan yana */}
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleInviteResponse(inv, true)}
                      disabled={inviteLoading === inv.appointmentStudentId}
                      className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl disabled:opacity-50"
                      style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#22c55e", fontFamily: "var(--font-label)" }}>
                      <CheckCircle size={12} />
                      {inviteLoading === inv.appointmentStudentId ? "..." : "Onayla"}
                    </button>
                    <button onClick={() => handleInviteResponse(inv, false)}
                      disabled={inviteLoading === inv.appointmentStudentId}
                      className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", fontFamily: "var(--font-label)" }}>
                      <XCircle size={12} />
                      Reddet
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ana içerik — mobilde tek sütun, lg'de 3 sütun */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">

        {/* ── Sol / Ana sütun ──────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-4 min-w-0">

          {/* 1. Ders tipi seçimi */}
          <Card>
            <div className="p-4">
              <p className="text-xs uppercase mb-3" style={{ color: V, fontFamily: "var(--font-label)", letterSpacing: "0.12em" }}>
                Ders Tipi
              </p>
              {/* grid-cols-2: her zaman 2 eşit sütun */}
              <div className="grid grid-cols-2 gap-3">
                {LESSON_TYPES.map(t => (
                  <motion.button key={t.value} onClick={() => setLessonType(t.value)}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "tween", duration: 0.15 }}
                    className="flex flex-col items-center gap-2 py-4 rounded-xl transition-colors"
                    style={{
                      background: lessonType === t.value ? `${V}18` : "rgba(255,255,255,0.03)",
                      border: lessonType === t.value ? `1px solid ${V}60` : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: lessonType === t.value ? "0 0 16px rgba(139,92,246,0.15)" : "none",
                    }}>
                    <span style={{ color: lessonType === t.value ? V : "rgba(255,255,255,0.3)" }}>{t.icon}</span>
                    <span className="text-sm font-semibold" style={{ color: lessonType === t.value ? "#fff" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>
                      {t.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </Card>

          {/* 2. Düet partner bilgisi */}
          <AnimatePresence>
            {lessonType === "duet" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }} className="w-full">
                <Card style={{
                  border: partner
                    ? (partner.remainingLessons > 0 ? "1px solid rgba(34,197,94,0.3)" : "1px solid rgba(239,68,68,0.3)")
                    : "1px solid rgba(139,92,246,0.25)",
                }}>
                  <div className="p-4">
                    <p className="text-xs uppercase mb-3" style={{ color: V, fontFamily: "var(--font-label)", letterSpacing: "0.12em" }}>
                      Düet Partnerin
                    </p>
                    {partnerLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${V}40`, borderTopColor: "transparent" }} />
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>Yükleniyor...</span>
                      </div>
                    ) : partner ? (
                      <>
                        <div className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
                            style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                            {partner.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          {/* İsim + kod */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: "var(--font-label)" }}>
                              {partner.fullName}
                            </p>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>
                              {partner.code} · {partner.remainingLessons} ders kaldı
                            </p>
                          </div>
                          {partner.remainingLessons > 0
                            ? <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                            : <XCircle size={16} className="text-yellow-400 flex-shrink-0" />}
                        </div>
                        <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
                          Randevu oluşturulunca partnerine davet gider. Onaylarsa aynı derse katılır.
                        </p>
                      </>
                    ) : (
                      <div className="p-4 rounded-xl text-center"
                        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <p className="text-sm text-red-400 mb-1" style={{ fontFamily: "var(--font-label)" }}>
                          Düet partnerin tanımlanmamış
                        </p>
                        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
                          Antrenörünüzden düet partneri atamasını isteyin.
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Tarih seçimi ─────────────────────────────────
              Tarih butonları: grid-cols-4 mobilde, 7 masaüstünde
              Overflow yok — grid sayesinde kırılıyor           */}
          <Card>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={13} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                <span className="text-xs uppercase" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-label)", letterSpacing: "0.12em" }}>
                  Tarih Seçin
                </span>
              </div>
              {/* 4 sütun mobilde, 7 büyük ekranda → hiç taşma olmaz */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {dates.map(d => {
                  const active = d === selectedDate;
                  const isToday = d === format(new Date(), "yyyy-MM-dd");
                  const hasApt = appointments.some(a => a.date === d && a.status === "onaylandi");
                  return (
                    <motion.button key={d}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: "tween", duration: 0.15 }}
                      onClick={() => { setSelectedDate(d); setSelectedSlot(null); }}
                      className={`flex flex-col items-center py-2.5 rounded-xl transition-colors ${active ? "gradient-violet-blue-red" : ""}`}
                      style={{
                        background: active ? undefined : "rgba(255,255,255,0.03)",
                        border: active
                          ? "1px solid rgba(139,92,246,0.65)"
                          : isToday
                            ? "1.5px solid var(--color-achievement-bright)"
                            : "1px solid rgba(255,255,255,0.07)",
                        boxShadow: isToday && !active ? "0 0 12px rgba(251,191,36,0.22)" : "none",
                      }}>
                      <span className="text-[9px] leading-tight" style={{
                        color: active ? "#fff" : isToday ? "var(--color-achievement-bright)" : "rgba(255,255,255,0.3)",
                        fontFamily: "var(--font-label)",
                      }}>
                        {format(parseISO(d), "EEE", { locale: tr }).toUpperCase()}
                      </span>
                      <span className="text-base leading-tight font-bold" style={{ fontFamily: "var(--font-display)", color: active ? "#fff" : "rgba(255,255,255,0.45)" }}>
                        {format(parseISO(d), "dd")}
                      </span>
                      {hasApt && <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: "var(--color-success)" }} />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* 4. Müsait saatler */}
          <Card>
            <div className="p-4">
              {/* Başlık */}
              <div className="flex items-start gap-2 mb-3">
                <Clock size={13} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0, marginTop: 2 }} />
                <div className="min-w-0">
                  <p className="text-xs uppercase" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-label)", letterSpacing: "0.12em" }}>
                    Müsait Saatler
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-label)" }}>
                    {format(parseISO(selectedDate), "dd MMM yyyy, EEE", { locale: tr })}
                  </p>
                </div>
              </div>

              {myAptOnDate && (
                <div className="mb-3 p-3 rounded-xl flex items-center gap-2"
                  style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                  <span className="text-xs text-green-400 min-w-0" style={{ fontFamily: "var(--font-label)" }}>
                    Randevunuz var: {myAptOnDate.startTime}–{myAptOnDate.endTime}
                  </span>
                </div>
              )}

              {loadingSlots ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${V}40`, borderTopColor: "transparent" }} />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8">
                  <Clock size={24} className="mx-auto mb-2" style={{ color: "rgba(255,255,255,0.1)" }} />
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
                    Bu gün için müsait saat yok
                  </p>
                </div>
              ) : (
                /* 2 sütun mobilde, 3 büyük ekranda — her zaman grid.
                   AnimatePresence + key={selectedDate}: tarih değişince yumuşak çapraz geçiş. */
                <AnimatePresence mode="wait">
                  <motion.div key={selectedDate}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {slots.map((slot, i) => {
                      const taken     = !slot.isAvailable || !!myAptOnDate;
                      const blocked   = slot.isBlocked;
                      const selected  = selectedSlot?.id === slot.id;
                      const canWait   = taken && !blocked && !myAptOnDate && !packageExpired && student && student.remainingLessons > 0;
                      const wlKey     = `${slot.date ?? selectedDate}-${slot.startTime}`;
                      const inWl      = waitlist.some(w => w.date === (slot.date ?? selectedDate) && w.startTime === slot.startTime);
                      const wlBusy    = waitlistBusy === wlKey;

                      const disabled = taken || packageExpired;
                      return (
                        <div key={slot.id} className="flex flex-col gap-1">
                          <motion.button disabled={disabled} onClick={() => handleSlotClick(slot)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0, scale: selected ? 1.03 : 1 }}
                            transition={{ duration: 0.28, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                            whileTap={!disabled ? { scale: 0.96 } : undefined}
                            className={`glass p-3.5 rounded-xl text-center w-full transition-colors ${disabled ? "" : "cursor-pointer"}`}
                            style={{
                              borderColor: selected
                                ? "var(--color-achievement)"
                                : taken
                                  ? "rgba(239,68,68,0.3)"
                                  : "rgba(139,92,246,0.3)",
                              borderWidth: selected ? 1.5 : 1,
                              cursor: disabled ? "not-allowed" : "pointer",
                              opacity: blocked ? 0.25 : disabled ? 0.55 : 1,
                              boxShadow: selected
                                ? "0 0 20px rgba(245,158,11,0.35), 0 0 45px rgba(245,158,11,0.12)"
                                : taken ? "none" : "0 0 14px rgba(139,92,246,0.07)",
                            }}>
                            <div className="text-sm font-semibold" style={{
                              color: selected ? "var(--color-achievement-bright)" : "#fff",
                              fontFamily: "var(--font-label)",
                            }}>
                              {slot.startTime}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
                              {slot.endTime}
                            </div>
                            {taken && (
                              <div className="text-xs mt-0.5 font-semibold" style={{ color: blocked ? "rgba(255,255,255,0.15)" : "var(--color-error)", fontFamily: "var(--font-label)" }}>
                                {blocked ? "Kapalı" : "Dolu"}
                              </div>
                            )}
                          </motion.button>

                          {/* Bekleme listesi butonu — sadece dolu ve kapalı olmayan slotlar */}
                          {canWait && (
                            <button
                              onClick={() => handleWaitlist(slot)}
                              disabled={wlBusy}
                              className="w-full py-1 text-[10px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1"
                              style={{
                                background: inWl ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.03)",
                                border: `1px solid ${inWl ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.08)"}`,
                                color: inWl ? "#FBBF24" : "rgba(255,255,255,0.3)",
                                fontFamily: "var(--font-label)",
                                opacity: wlBusy ? 0.5 : 1,
                              }}
                            >
                              <Clock3 size={9} />
                              {wlBusy ? "..." : inWl ? "Listeden Çık" : "Sıraya Gir"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </Card>

          {/* ── Ders Bilgisi Kartı — saat seçilince inline özet + onay ── */}
          <AnimatePresence>
            {selectedSlot && (
              <motion.div
                ref={summaryRef}
                key={selectedSlot.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card glass="glass-strong">
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: "linear-gradient(90deg,transparent,#8B5CF6,#D946EF,transparent)" }} />
                  <div className="p-5">
                    <h3 className="text-lg text-white tracking-wider mb-3" style={{ fontFamily: "var(--font-display)" }}>
                      DERS BİLGİSİ
                    </h3>
                    <div className="space-y-0 mb-3">
                      <InfoRow label="Tarih" val={format(parseISO(selectedDate), "dd MMM yyyy (EEE)", { locale: tr })} />
                      <InfoRow label="Saat" val={`${selectedSlot.startTime} – ${selectedSlot.endTime}`} />
                      <InfoRow label="Ders Süresi" val={`${LESSON_DURATION_MINUTES} dk`} />
                      <InfoRow label="Salon" val={TRAINER_LOCATION} />
                      <InfoRow label="Antrenör" val={TRAINER_NAME} />
                      <InfoRow label="Durum" val="Onay Bekliyor" />
                      {lessonType === "duet" && partner && (
                        <InfoRow label="Davet" val={`${partner.fullName} (${partner.remainingLessons} ders)`} />
                      )}
                    </div>
                    {bookError && (
                      <div className="p-3 rounded-xl mb-3 text-xs text-red-400"
                        style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontFamily: "var(--font-label)" }}>
                        ⚠️ {bookError}
                      </div>
                    )}
                    <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
                      Ders, antrenör tamamla butonuna basınca düşer. {CANCEL_LIMIT_HOURS} saat içinde iptal edemezsiniz.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setSelectedSlot(null)}
                        className="py-3 rounded-xl text-xs font-semibold uppercase"
                        style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>
                        Vazgeç
                      </button>
                      <button onClick={confirmBook} disabled={saving || packageExpired || !rulesAccepted}
                        className="gradient-animated gradient-slow gradient-violet-blue-red py-3 rounded-xl text-white text-xs font-semibold uppercase disabled:opacity-50 transition-transform active:scale-[0.97]"
                        style={{ fontFamily: "var(--font-label)" }}>
                        {saving ? "Oluşturuluyor..." : "Randevuyu Onayla"}
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Sağ sidebar ──────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* Avatar — ders aktifken Guard, ders bitince tek seferlik Victory */}
          <LessonStatusAvatarCard appointments={appointments} />

          {/* Bekleme Listesi */}
          {waitlist.length > 0 && (
            <Card style={{ border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.03)" }}>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock3 size={13} style={{ color: "#FBBF24" }} />
                  <p className="text-xs uppercase" style={{ color: "#FBBF24", fontFamily: "var(--font-label)", letterSpacing: "0.12em" }}>
                    Bekleme Listem ({waitlist.length})
                  </p>
                </div>
                {waitlist.map(w => (
                  <div key={w.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
                    style={{ borderColor: "rgba(251,191,36,0.08)" }}>
                    <div>
                      <div className="text-xs font-semibold text-white/70" style={{ fontFamily: "var(--font-label)" }}>
                        {w.date} · {w.startTime}
                      </div>
                      <div className="text-[10px] text-white/30" style={{ fontFamily: "var(--font-label)" }}>
                        {w.notified ? "🔔 Bildirim gönderildi — hemen randevu al!" : "Sırada bekliyorsun"}
                      </div>
                    </div>
                    <button
                      onClick={() => student && leaveWaitlist(student.id, w.date, w.startTime).then(() => reload())}
                      className="text-[10px] px-2 py-1 transition-colors"
                      style={{ border: "1px solid rgba(239,68,68,0.3)", color: "rgba(239,68,68,0.7)", borderRadius: 4, fontFamily: "var(--font-label)" }}
                    >
                      Çık
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Yaklaşan randevular */}
          <Card>
            <div className="p-4">
              <p className="text-xs uppercase mb-3" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-label)", letterSpacing: "0.12em" }}>
                Yaklaşan
              </p>
              {upcoming.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-label)" }}>
                  Randevu yok
                </p>
              ) : upcoming.map(apt => (
                <div key={apt.id} className="mb-3 last:mb-0 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <p className="text-xs font-semibold text-white mb-1" style={{ fontFamily: "var(--font-label)" }}>
                    {format(parseISO(apt.date), "dd MMM, EEE", { locale: tr })}
                  </p>
                  <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                    <Clock size={10} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-label)" }}>
                      {apt.startTime}–{apt.endTime}
                    </span>
                    {apt.lessonType !== "bireysel" && (
                      <span className="px-1.5 py-0.5 text-[9px] rounded"
                        style={{ background: `${V}20`, color: V, fontFamily: "var(--font-label)" }}>
                        {apt.lessonType === "duet" ? "Düet" : "Grup"}
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleCancelClick(apt)}
                    className="text-xs" style={{ color: "rgba(239,68,68,0.5)", fontFamily: "var(--font-label)" }}>
                    İptal et
                  </button>
                </div>
              ))}
            </div>
          </Card>

          {/* Geçmiş dersler */}
          <Card>
            <div className="p-4">
              <p className="text-xs uppercase mb-3" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-label)", letterSpacing: "0.12em" }}>
                Geçmiş
              </p>
              {past.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-label)" }}>
                  Kayıt yok
                </p>
              ) : past.map(apt => {
                const isAdminCancel = apt.status === "iptal" && apt.notes?.startsWith("ADMIN_CANCEL:");
                const statusLabel = isAdminCancel ? "Admin İptali" : STATUS_TR[apt.status];
                const statusColor = isAdminCancel ? "#f97316" : STATUS_COLOR[apt.status];
                return (
                  <div key={apt.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
                    style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <span className="text-xs text-white min-w-0" style={{ fontFamily: "var(--font-label)" }}>
                      {format(parseISO(apt.date), "dd MMM", { locale: tr })} · {apt.startTime}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: `${statusColor}18`, color: statusColor, fontFamily: "var(--font-label)" }}>
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* ══ Başarı Modalı ══════════════════════════════════════== */}
      <AnimatePresence>
        {successOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
            <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }}
              className="glass-strong relative z-10 w-full max-w-sm rounded-2xl overflow-hidden text-center"
              style={{ borderColor: "rgba(34,197,94,0.3)" }}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,var(--color-success),transparent)" }} />
              <div className="p-6">
                <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
                <h3 className="text-xl text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>RANDEVU OLUŞTURULDU!</h3>
                {lessonType === "duet" && partner && (
                  <p className="text-xs mb-1" style={{ color: "#A855F7", fontFamily: "var(--font-label)" }}>
                    Davet gönderildi → {partner.fullName}
                  </p>
                )}
                <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-inter)" }}>
                  {format(parseISO(selectedDate), "dd MMMM yyyy", { locale: tr })} · {selectedSlot?.startTime}
                </p>
                <a href={`https://wa.me/${TRAINER_WHATSAPP}?text=${encodeURIComponent(waMsg)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white text-xs font-semibold uppercase mb-3"
                  style={{ background: "rgba(34,197,94,0.8)", fontFamily: "var(--font-label)" }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Antrenörü Bildir
                </a>
                <button onClick={() => setSuccessOpen(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold uppercase"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-label)" }}>
                  Kapat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ İptal Onayı ══════════════════════════════════════════ */}
      <AnimatePresence>
        {cancelId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
              onClick={() => setCancelId(null)} />
            <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }}
              className="glass-strong relative z-10 w-full max-w-sm rounded-2xl overflow-hidden"
              style={{ borderColor: "rgba(239,68,68,0.3)" }}
              onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,var(--color-error),transparent)" }} />
              <div className="p-5">
                <h3 className="text-xl text-white mb-2" style={{ fontFamily: "var(--font-display)" }}>RANDEVU İPTAL</h3>
                <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-inter)" }}>
                  Bu randevuyu iptal etmek istediğinize emin misiniz?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setCancelId(null)}
                    className="py-3 rounded-xl text-xs font-semibold uppercase"
                    style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)" }}>
                    Vazgeç
                  </button>
                  <button onClick={confirmCancel}
                    className="py-3 rounded-xl text-white text-xs font-semibold uppercase"
                    style={{ background: "rgba(239,68,68,0.7)", fontFamily: "var(--font-label)" }}>
                    İptal Et
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ 18 SAAT ENGEL MODALI ════════════════════════════════ */}
      {cancelBlocked && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
          <div className="glass-strong relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ borderColor: "rgba(251,146,60,0.35)" }}>
            <div className="h-0.5" style={{ background:"linear-gradient(90deg,transparent,var(--color-warning),transparent)" }} />
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background:"rgba(251,146,60,0.12)", border:"1px solid rgba(251,146,60,0.25)" }}>
                  <span className="text-lg">⏱</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm" style={{ fontFamily:"var(--font-label)" }}>
                    İptal Edilemiyor
                  </p>
                  <p className="text-[10px] uppercase tracking-widest" style={{ color:"rgba(251,146,60,0.8)", fontFamily:"var(--font-label)" }}>
                    {CANCEL_LIMIT_HOURS} Saat Kuralı
                  </p>
                </div>
              </div>

              <div className="mb-4 p-3 rounded-xl" style={{ background:"rgba(251,146,60,0.06)", border:"1px solid rgba(251,146,60,0.15)" }}>
                <p className="text-xs font-semibold text-white" style={{ fontFamily:"var(--font-label)" }}>
                  {format(parseISO(cancelBlocked.date), "dd MMMM yyyy (EEEE)", { locale: tr })}
                </p>
                <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>
                  {cancelBlocked.startTime} – {cancelBlocked.endTime}
                </p>
              </div>

              <p className="text-sm leading-relaxed mb-4" style={{ color:"rgba(255,255,255,0.6)", fontFamily:"var(--font-label)" }}>
                Dersinize <strong style={{ color:"var(--color-warning)" }}>{CANCEL_LIMIT_HOURS} saatten az</strong> süre
                kaldığı için iptal edemezsiniz.
              </p>
              <div className="p-3 rounded-xl mb-4" style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)" }}>
                <p className="text-xs leading-relaxed" style={{ color:"rgba(239,68,68,0.8)", fontFamily:"var(--font-label)" }}>
                  ⚠️ Derse katılmazsanız ders hakkınız kullanılmış sayılır.
                  Zorunlu durumlarda antrenörünüzle iletişime geçin.
                </p>
              </div>

              <button onClick={() => setCancelBlocked(null)}
                className="w-full py-3 text-sm font-semibold tracking-widest uppercase transition-all"
                style={{ background:"rgba(251,146,60,0.15)", border:"1px solid rgba(251,146,60,0.3)", color:"var(--color-warning)", fontFamily:"var(--font-label)" }}>
                Anladım
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
