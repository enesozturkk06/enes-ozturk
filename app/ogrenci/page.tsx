"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentNotifications,
  getPendingInvites, respondToInvite, cancelAppointment, createAdminNotification,
} from "@/lib/db";
import type { Appointment, LessonRecord, Notification, PendingInvite } from "@/lib/types";
import { StatCard, Card, Badge, ProgressBar, PageHeader } from "@/app/components/ui";
import { PACKAGES, STATUS_LABELS, PAYMENT_LABELS, CANCEL_LIMIT_HOURS } from "@/lib/constants";
import {
  Calendar, Clock, TrendingUp, BookOpen, Bell,
  CheckCircle, XCircle, ChevronRight, Users,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, isFuture, differenceInHours } from "date-fns";
import { tr } from "date-fns/locale";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const fadeUp  = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } } };

export default function OgrenciDashboard() {
  const { student } = useAuth();
  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [records, setRecords]             = useState<LessonRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading]             = useState(true);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget]   = useState<Appointment | null>(null);
  const [cancelBusy, setCancelBusy]       = useState(false);

  // Section refs for scroll navigation
  const randevuRef = useRef<HTMLDivElement>(null);
  const gelisimRef = useRef<HTMLDivElement>(null);

  const reload = async () => {
    if (!student) return;
    const [apts, recs, notifs, invites] = await Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudentNotifications(student.id),
      getPendingInvites(student.id),
    ]);
    setAppointments(apts);
    setRecords(recs);
    setNotifications(notifs);
    setPendingInvites(invites);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [student]); // eslint-disable-line

  const handleInviteResponse = async (invite: PendingInvite, accept: boolean) => {
    if (!student) return;
    setInviteLoading(invite.appointmentStudentId);
    const result = await respondToInvite(invite.appointmentStudentId, student.id, accept);
    if (!result.success) alert(result.error ?? "İşlem başarısız.");
    else await reload();
    setInviteLoading(null);
  };

  const handleCancelClick = (apt: Appointment) => {
    const hoursLeft = differenceInHours(parseISO(`${apt.date}T${apt.startTime}`), new Date());
    if (hoursLeft < CANCEL_LIMIT_HOURS) {
      alert(`Randevuya ${CANCEL_LIMIT_HOURS} saatten az kaldığı için iptal edemezsiniz. Lütfen antrenörünüzle iletişime geçin.`);
      // Admin'e bildir: öğrenci iptal etmek istedi ama kural engelledi
      if (student) {
        createAdminNotification(
          `İptal isteği engellendi: ${student.fullName}`,
          `${student.fullName}, ${format(parseISO(apt.date), "dd MMM", { locale: tr })} ${apt.startTime} randevusunu iptal etmek istedi fakat ${CANCEL_LIMIT_HOURS} saat kuralı nedeniyle yapamadı.`,
          "warning",
          { appointmentId: apt.id, studentId: student.id },
        );
      }
      return;
    }
    setCancelTarget(apt);
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    // öğrenci adını gönderiyoruz — db.ts bildirim oluşturacak
    await cancelAppointment(cancelTarget.id, student?.fullName);
    setCancelBusy(false);
    setCancelTarget(null);
    await reload();
  };

  if (!student || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming    = appointments.filter(a => a.status === "onaylandi" && isFuture(parseISO(`${a.date}T${a.startTime}`))).slice(0, 3);
  const pkg         = PACKAGES.find(p => p.type === student.packageType);
  const unreadNotifs = notifications.filter(n => !n.isRead).length;
  const lastRecord  = records[0];
  // totalLessons = öğrenciye atanan gerçek ders sayısı (admin'in girdiği değer)
  // pkg.lessonCount = paket şablonundaki varsayılan — sabit olduğu için KULLANILMAZ
  const totalLessons = student.totalLessons > 0 ? student.totalLessons : (pkg?.lessonCount ?? 1);
  const progressPct  = Math.round((student.completedLessons / totalLessons) * 100);

  return (
    <>
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-6xl mx-auto space-y-5">

      {/* Header */}
      <motion.div variants={fadeUp}>
        <PageHeader
          title={`Hoş Geldin, ${student.fullName.split(" ")[0]}!`}
          subtitle={`${student.code} · ${pkg?.name ?? ""} Paketi`}
          accent="Öğrenci Paneli"
        />
      </motion.div>

      {/* Bekleyen Düet Davetleri */}
      {pendingInvites.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="rounded-2xl overflow-hidden"
            style={{ background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.25)" }}>
            <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor:"rgba(139,92,246,0.15)" }}>
              <Users size={15} style={{ color:"#8B5CF6" }} />
              <span className="text-sm font-semibold" style={{ color:"#8B5CF6", fontFamily:"var(--font-barlow-condensed)" }}>
                Bekleyen Düet Davetleri ({pendingInvites.length})
              </span>
            </div>
            {pendingInvites.map(inv => (
              <div key={inv.appointmentStudentId}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border-t"
                style={{ borderColor:"rgba(139,92,246,0.1)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white mb-0.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                    <span style={{ color:"#A855F7" }}>{inv.creatorName}</span>
                    {" "}düet ders davet etti
                  </div>
                  <div className="text-xs" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-barlow-condensed)" }}>
                    {format(parseISO(inv.date), "dd MMMM yyyy (EEEE)", { locale: tr })} · {inv.startTime} – {inv.endTime}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleInviteResponse(inv, true)}
                    disabled={inviteLoading === inv.appointmentStudentId}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl disabled:opacity-50 transition-all"
                    style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", color:"#22c55e", fontFamily:"var(--font-barlow-condensed)" }}>
                    <CheckCircle size={13}/>
                    {inviteLoading === inv.appointmentStudentId ? "..." : "Onayla"}
                  </button>
                  <button onClick={() => handleInviteResponse(inv, false)}
                    disabled={inviteLoading === inv.appointmentStudentId}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl disabled:opacity-50 transition-all"
                    style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#ef4444", fontFamily:"var(--font-barlow-condensed)" }}>
                    <XCircle size={13}/>Reddet
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Bildirim bandı */}
      {unreadNotifs > 0 && (
        <motion.div variants={fadeUp}>
          <Link href="/ogrenci/bildirimler"
            className="flex items-center justify-between p-4 rounded-xl transition-all"
            style={{ background:"rgba(217,119,6,0.06)", border:"1px solid rgba(217,119,6,0.2)" }}>
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-gold" />
              <span className="text-sm text-white/70" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                {unreadNotifs} okunmamış bildiriminiz var
              </span>
            </div>
            <ChevronRight size={16} className="text-gold/50" />
          </Link>
        </motion.div>
      )}

      {/* ── Tıklanabilir stat kartları ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Kalan Ders"
          value={student.remainingLessons}
          sub={`${student.completedLessons} ders tamamlandı`}
          color="red"
          icon={<BookOpen size={17}/>}
          onClick={() => document.getElementById("paket-kartı")?.scrollIntoView({ behavior:"smooth" })}
        />
        <StatCard
          label="Yaklaşan Randevu"
          value={upcoming.length}
          sub={upcoming[0] ? format(parseISO(upcoming[0].date), "dd MMM", { locale: tr }) : "Randevu yok"}
          color="gold"
          icon={<Calendar size={17}/>}
          onClick={() => randevuRef.current?.scrollIntoView({ behavior:"smooth" })}
        />
        <StatCard
          label="Toplam Ders"
          value={student.completedLessons}
          sub="Tamamlanan"
          color="white"
          icon={<TrendingUp size={17}/>}
          href="/ogrenci/gelisim"
        />
        <StatCard
          label="Son Gelişim"
          value={lastRecord ? `${lastRecord.overall}/10` : "—"}
          sub={lastRecord ? format(parseISO(lastRecord.date), "dd MMM", { locale: tr }) : "Kayıt yok"}
          color="green"
          icon={<TrendingUp size={17}/>}
          href="/ogrenci/gelisim"
        />
      </motion.div>

      {/* Paket kartı */}
      <motion.div variants={fadeUp} id="paket-kartı">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-display text-white tracking-wider"
                style={{ fontFamily:"var(--font-bebas)" }}>{pkg?.name} Paketi</h3>
              <p className="text-xs text-white/30 mt-0.5"
                style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                Bitiş: {format(parseISO(student.packageEndDate || new Date().toISOString().split("T")[0]), "dd MMMM yyyy", { locale: tr })}
              </p>
            </div>
            <Badge color={student.paymentStatus === "odendi" ? "green" : student.paymentStatus === "kismi" ? "gold" : "red"}>
              {PAYMENT_LABELS[student.paymentStatus]}
            </Badge>
          </div>
          <ProgressBar value={student.completedLessons} max={totalLessons} color="red"
            label={`${student.completedLessons} / ${totalLessons} ders`} />
          <div className="mt-2 text-right text-xs text-white/30"
            style={{ fontFamily:"var(--font-barlow-condensed)" }}>{progressPct}% tamamlandı</div>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Yaklaşan randevular */}
        <motion.div variants={fadeUp} ref={randevuRef}>
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-white tracking-wider"
                style={{ fontFamily:"var(--font-bebas)" }}>Yaklaşan Randevular</h3>
              <Link href="/ogrenci/randevu"
                className="text-xs text-gold/60 hover:text-gold tracking-wider transition-colors"
                style={{ fontFamily:"var(--font-barlow-condensed)" }}>Tümü →</Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={28} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                  Yaklaşan randevunuz yok
                </p>
                <Link href="/ogrenci/randevu"
                  className="mt-3 inline-block text-crimson text-xs tracking-wider hover:text-crimson-bright transition-colors"
                  style={{ fontFamily:"var(--font-barlow-condensed)" }}>+ Randevu Al</Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map(apt => {
                  const hoursLeft = differenceInHours(parseISO(`${apt.date}T${apt.startTime}`), new Date());
                  const canCancel = hoursLeft >= CANCEL_LIMIT_HOURS;
                  return (
                    <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                      {/* Tarih bloğu */}
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.2)" }}>
                        <span className="text-crimson text-xs font-display" style={{ fontFamily:"var(--font-bebas)" }}>
                          {format(parseISO(apt.date), "dd")}
                        </span>
                        <span className="text-crimson/60 text-[9px]" style={{ fontFamily:"var(--font-bebas)" }}>
                          {format(parseISO(apt.date), "MMM", { locale: tr }).toUpperCase()}
                        </span>
                      </div>
                      {/* Bilgi */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white"
                            style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                            {format(parseISO(apt.date), "EEEE", { locale: tr })}
                          </span>
                          {apt.lessonType !== "bireysel" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded"
                              style={{ background:"rgba(139,92,246,0.15)", color:"#A855F7", fontFamily:"var(--font-barlow-condensed)" }}>
                              {apt.lessonType === "duet" ? "Düet" : "Grup"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>
                          <Clock size={11}/>
                          <span style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                            {apt.startTime} – {apt.endTime}
                          </span>
                        </div>
                      </div>
                      {/* Sağ: Badge + iptal */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <Badge color="green">{STATUS_LABELS[apt.status]}</Badge>
                        <button
                          onClick={() => handleCancelClick(apt)}
                          className="text-[10px] transition-colors"
                          style={{ color: canCancel ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)", fontFamily:"var(--font-barlow-condensed)", cursor: canCancel ? "pointer" : "default" }}
                          title={canCancel ? "Randevuyu iptal et" : `${CANCEL_LIMIT_HOURS} saatten az kaldı`}
                        >
                          {canCancel ? "İptal et" : "⏱ İptal edilemez"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Son ders notu */}
        <motion.div variants={fadeUp} ref={gelisimRef}>
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-white tracking-wider"
                style={{ fontFamily:"var(--font-bebas)" }}>Son Ders Notu</h3>
              <Link href="/ogrenci/gelisim"
                className="text-xs text-gold/60 hover:text-gold tracking-wider transition-colors"
                style={{ fontFamily:"var(--font-barlow-condensed)" }}>Geçmiş →</Link>
            </div>
            {!lastRecord ? (
              <div className="text-center py-8">
                <TrendingUp size={28} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                  Henüz ders kaydınız yok
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
                  <span className="text-sm text-white/50" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                    {format(parseISO(lastRecord.date), "dd MMMM yyyy", { locale: tr })}
                  </span>
                  <Badge color={lastRecord.overall >= 8 ? "green" : lastRecord.overall >= 6 ? "gold" : "red"}>
                    Genel: {lastRecord.overall}/10
                  </Badge>
                </div>
                {[
                  ["Kondisyon", lastRecord.conditioning],
                  ["Yumruk",    lastRecord.punch],
                  ["Tekme",     lastRecord.kick],
                  ["Savunma",   lastRecord.defense],
                ].map(([lbl, val]) => (
                  <ProgressBar
                    key={String(lbl)}
                    label={String(lbl)}
                    value={Number(val)}
                    max={10}
                    color={Number(val) >= 8 ? "green" : Number(val) >= 6 ? "gold" : "red"}
                  />
                ))}
                {lastRecord.trainerNotes && (
                  <div className="mt-3 p-3 rounded-xl border-l-2 border-gold/40"
                    style={{ background:"rgba(217,119,6,0.04)" }}>
                    <p className="text-xs text-white/50 leading-relaxed"
                      style={{ fontFamily:"var(--font-inter)" }}>
                      {lastRecord.trainerNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Hızlı erişim */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href:"/ogrenci/randevu",   label:"Randevu Al",    icon:<Calendar size={20}/>,  color:"crimson" },
            { href:"/ogrenci/gelisim",   label:"Gelişimim",     icon:<TrendingUp size={20}/>, color:"gold"    },
            { href:"/ogrenci/antrenman", label:"AI Antrenman",  icon:<BookOpen size={20}/>,   color:"crimson" },
            { href:"/ogrenci/bildirimler",label:"Bildirimler",  icon:<Bell size={20}/>,       color:"gold"    },
          ].map(({ href, label, icon, color }) => (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="p-4 text-center transition-all rounded-xl"
                style={{
                  background: "rgba(15,15,22,0.9)",
                  border: color === "crimson" ? "1px solid rgba(220,38,38,0.15)" : "1px solid rgba(217,119,6,0.15)",
                }}
              >
                <div className={color === "crimson" ? "text-crimson mx-auto mb-2" : "text-gold mx-auto mb-2"} style={{ display:"flex", justifyContent:"center" }}>
                  {icon}
                </div>
                <div className="text-xs text-white/55 tracking-wider"
                  style={{ fontFamily:"var(--font-barlow-condensed)" }}>{label}</div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>

    {/* ══ Randevu İptal Onay Modalı ══ */}

    {cancelTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
        <div className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ background:"rgba(15,15,22,0.99)", border:"1px solid rgba(239,68,68,0.3)" }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background:"linear-gradient(90deg,transparent,#ef4444,transparent)" }} />
          <div className="p-5">
            <h3 className="text-xl text-white mb-1" style={{ fontFamily:"var(--font-bebas)", letterSpacing:"0.08em" }}>
              RANDEVU İPTAL
            </h3>
            {/* Randevu özeti */}
            <div className="my-3 p-3 rounded-xl space-y-1"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs text-white font-semibold" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                {format(parseISO(cancelTarget.date), "dd MMMM yyyy (EEEE)", { locale: tr })}
              </p>
              <p className="text-xs" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-barlow-condensed)" }}>
                {cancelTarget.startTime} – {cancelTarget.endTime}
                {cancelTarget.lessonType !== "bireysel" && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[9px]"
                    style={{ background:"rgba(139,92,246,0.15)", color:"#A855F7" }}>
                    {cancelTarget.lessonType === "duet" ? "Düet" : "Grup"}
                  </span>
                )}
              </p>
            </div>
            <p className="text-sm mb-1" style={{ color:"rgba(255,255,255,0.5)", fontFamily:"var(--font-inter)" }}>
              Bu randevuyu iptal etmek istediğine emin misin?
            </p>
            {cancelTarget.lessonType === "duet" && (
              <p className="text-xs mb-3" style={{ color:"rgba(217,70,239,0.7)", fontFamily:"var(--font-barlow-condensed)" }}>
                ℹ️ Düet randevu — partnerin de panelinde iptal olarak görünecek.
              </p>
            )}
            <p className="text-xs mb-4" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
              İptal edilen randevudan ders düşülmez. Slot tekrar müsait hale gelir.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setCancelTarget(null)}
                className="py-3 rounded-xl text-xs font-semibold uppercase"
                style={{ border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-barlow-condensed)" }}>
                Vazgeç
              </button>
              <button onClick={handleCancelConfirm} disabled={cancelBusy}
                className="py-3 rounded-xl text-white text-xs font-semibold uppercase disabled:opacity-50"
                style={{ background:"rgba(239,68,68,0.7)", fontFamily:"var(--font-barlow-condensed)" }}>
                {cancelBusy ? "İptal ediliyor..." : "İptal Et"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
