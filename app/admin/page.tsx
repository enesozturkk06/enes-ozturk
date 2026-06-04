"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAppointments, getStudents, getAdminNotifications,
  completeAppointmentWithAttendance, getAppointmentStudents,
  bulkGetAppointmentStudents, createLessonRecord,
  markNotificationRead, markAllAdminNotificationsRead,
} from "@/lib/db";
import type { Appointment, Student, Notification, AppointmentStudent } from "@/lib/types";
import { StatCard, Card, Badge, Button, PageHeader, Modal, Textarea } from "@/app/components/ui";
import { STATUS_LABELS } from "@/lib/constants";
import { Users, Calendar, TrendingUp, Bell, CheckCircle, XCircle, UserCheck, UserX, X, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

const SCORE_KEYS = ["conditioning","punch","kick","defense","combination","sparring","overall"] as const;
const SCORE_TR: Record<string,string> = {
  conditioning:"Kondisyon", punch:"Yumruk", kick:"Tekme",
  defense:"Savunma", combination:"Kombinasyon", sparring:"Sparring", overall:"Genel",
};
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = { initial: { opacity:0, y:16 }, animate: { opacity:1, y:0 } };

export default function AdminDashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [todayApts, setTodayApts]   = useState<Appointment[]>([]);
  const [students, setStudents]     = useState<Student[]>([]);
  const [notifs, setNotifs]         = useState<Notification[]>([]);
  const [loading, setLoading]       = useState(true);
  const [aptStudents, setAptStudents] = useState<Record<string, AppointmentStudent[]>>({});

  /* Katılım modalı */
  const [attendModal, setAttendModal]     = useState<Appointment | null>(null);
  const [attendances, setAttendances]     = useState<Record<string, boolean>>({});
  const [attendSaving, setAttendSaving]   = useState(false);
  const [attendWarnings, setAttendWarnings] = useState<string[]>([]);

  /* Bildirim paneli */
  const [notifOpen, setNotifOpen]     = useState(false);
  const [loginToast, setLoginToast]   = useState<Notification | null>(null);

  /* Ders notu modalı (tamamlama sonrası) */
  const [noteModal, setNoteModal] = useState<Appointment | null>(null);
  const [scores, setScores] = useState<Record<string,number>>({
    conditioning:7, punch:7, kick:7, defense:7, combination:7, sparring:7, overall:7,
  });
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving]     = useState(false);

  /* ── Yükle ──────────────────────────────────────────────────── */
  const reloadApts = useCallback(async () => {
    const apts = await getAppointments({ date: today });
    setTodayApts(apts);
    // Tek bulk sorguda tüm appointment_students (N+1 yerine 2 sorgu)
    const map = await bulkGetAppointmentStudents(apts.map(a => a.id));
    setAptStudents(map);
  }, [today]);

  useEffect(() => {
    Promise.all([reloadApts(), getStudents(), getAdminNotifications()]).then(([, s, n]) => {
      setStudents(s);
      setNotifs(n);
      setLoading(false);
      // Giriş toast'u: okunmamış önemli bildirimler varsa göster
      const unread = n.filter(x => !x.isRead);
      if (unread.length > 0) setLoginToast(unread[0]);
    });
  }, [reloadApts]);

  /* ── Tamamla butonuna basıldı ─────────────────────────────── */
  const handleCompleteClick = async (apt: Appointment) => {
    // Önce DB'den taze yükle
    let apStudents = await getAppointmentStudents(apt.id);

    // appointment_students boşsa bireysel fallback: sadece oluşturan öğrenci
    if (apStudents.length === 0 && apt.studentId) {
      apStudents = [{
        id: "", appointmentId: apt.id, studentId: apt.studentId,
        studentName: apt.studentName,
        role: "creator", inviteStatus: "accepted",
        attendanceStatus: "pending", lessonDeducted: false, createdAt: "",
      }];
    }

    // Katılım başlangıcı: accepted olanlar Geldi, pending/declined Gelmedi
    const init: Record<string, boolean> = {};
    apStudents.forEach(s => {
      init[s.studentId] = s.inviteStatus === "accepted";
    });

    setAttendances(init);
    setAptStudents(prev => ({ ...prev, [apt.id]: apStudents }));
    setAttendModal(apt);
    setAttendWarnings([]);
  };

  /* ── Katılım modalı onayla ────────────────────────────────── */
  const handleAttendanceSubmit = async () => {
    if (!attendModal) return;
    setAttendSaving(true);
    try {
      const entries = Object.entries(attendances).map(([studentId, attended]) => ({ studentId, attended }));
      const result = await completeAppointmentWithAttendance(attendModal.id, entries);
      await reloadApts();
      if (result.warnings.length > 0) {
        setAttendWarnings(result.warnings);
        // Uyarıları göster ama 2s sonra devam et
        setTimeout(() => {
          setAttendModal(null);
          setNoteModal(attendModal);
        }, 2000);
      } else {
        setAttendModal(null);
        setNoteModal(attendModal);
      }
    } catch (err) {
      alert("Hata: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAttendSaving(false);
    }
  };

  /* ── Ders notu kaydet ─────────────────────────────────────── */
  const handleSaveNote = async () => {
    if (!noteModal) return;
    setSaving(true);
    await createLessonRecord({
      appointmentId: noteModal.id,
      studentId:     noteModal.studentId,
      date:          noteModal.date,
      conditioning:  scores.conditioning,
      punch:         scores.punch,
      kick:          scores.kick,
      defense:       scores.defense,
      combination:   scores.combination,
      sparring:      scores.sparring,
      overall:       scores.overall,
      trainerNotes:  noteText,
      durationMinutes: 60,
    });
    setSaving(false);
    setNoteModal(null);
    setNoteText("");
    setScores({ conditioning:7,punch:7,kick:7,defense:7,combination:7,sparring:7,overall:7 });
  };

  /* ── Yardımcı: randevu öğrenci ismi ──────────────────────── */
  const aptDisplayName = (apt: Appointment): string => {
    const apSt = aptStudents[apt.id];
    if (!apSt || apSt.length === 0) return apt.studentName;
    // filter(Boolean) kaldırıldı — "?" isimli partner silinmesin
    const names = apSt.map(s => s.studentName || s.studentId.slice(0, 6));
    if (names.length === 1) return names[0];
    return names.join(" + ");
  };

  const aptTypeLabel = (apt: Appointment): string | null =>
    !apt.lessonType || apt.lessonType === "bireysel" ? null
    : apt.lessonType === "duet" ? "Düet" : "Grup";

  /* ── İstatistikler ────────────────────────────────────────── */
  const active         = students.filter(s => s.isActive);
  const pendingPayment = students.filter(s => s.paymentStatus !== "odendi" && s.amountDue > 0);
  const lowLessons     = students.filter(s => s.remainingLessons <= 2 && s.remainingLessons > 0);
  const unreadNotifs   = notifs.filter(n => !n.isRead).length;

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <>
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-6xl mx-auto space-y-6">
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Bugünün Dersleri"
          subtitle={format(new Date(), "dd MMMM yyyy, EEEE", { locale: tr })}
          accent="Admin Paneli"
        />
      </motion.div>

      {/* Stat kartları — tıklanabilir, animasyonlu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Aktif Öğrenci" value={active.length}
          sub="Tümünü görüntüle" color="gold" icon={<Users size={18}/>}
          href="/admin/ogrenciler"
        />
        <StatCard
          label="Bugünkü Ders" value={todayApts.length}
          sub={`${todayApts.filter(a=>a.status==="tamamlandi").length} tamamlandı`}
          color="red" icon={<Calendar size={18}/>}
          onClick={() => document.getElementById("bugunun-dersleri")?.scrollIntoView({ behavior:"smooth" })}
        />
        <StatCard
          label="Ödeme Bekleyen" value={pendingPayment.length}
          sub="Borçlu öğrenciler" color="white" icon={<TrendingUp size={18}/>}
          href="/admin/odemeler"
        />
        <StatCard
          label="Bildirim" value={unreadNotifs}
          sub={unreadNotifs > 0 ? "Okunmamış — tıkla" : "Bildirim yok"} color="gold"
          icon={<Bell size={18}/>}
          onClick={() => setNotifOpen(true)}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bugünkü dersler */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="p-6" id="bugunun-dersleri">
            <h3 className="text-xl font-display text-white tracking-wider mb-4" style={{ fontFamily:"var(--font-bebas)" }}>
              Bugünkü Dersler
            </h3>
            {todayApts.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={40} className="text-white/10 mx-auto mb-3"/>
                <p className="text-white/30 text-sm" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Bugün ders yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayApts.sort((a,b)=>a.startTime.localeCompare(b.startTime)).map(apt => (
                  <div key={apt.id} className="flex items-center gap-4 p-4 bg-steel/30 border border-white/5 hover:border-white/10 transition-colors">
                    <div className="w-12 h-12 bg-crimson/10 border border-crimson/20 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-crimson text-sm font-display" style={{ fontFamily:"var(--font-bebas)" }}>{apt.startTime}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                          {aptDisplayName(apt)}
                        </span>
                        {aptTypeLabel(apt) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background:"rgba(139,92,246,0.15)", color:"#A855F7", fontFamily:"var(--font-barlow-condensed)", border:"1px solid rgba(139,92,246,0.25)" }}>
                            {aptTypeLabel(apt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-white/30" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                        <span>{apt.studentCode} · {apt.startTime}–{apt.endTime}</span>
                        {/* Düet öğrenci davet durumları */}
                        {apt.lessonType === "duet" && (aptStudents[apt.id] ?? []).map(s => {
                          const color = s.inviteStatus === "accepted" ? "#22c55e" : s.inviteStatus === "declined" ? "#ef4444" : "#d97706";
                          const label = s.inviteStatus === "accepted" ? "Onayladı" : s.inviteStatus === "declined" ? "Reddetti" : "Bekliyor";
                          return (
                            <span key={s.studentId} style={{ color, fontFamily:"var(--font-barlow-condensed)" }}>
                              · {s.studentName || "?"}: {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={apt.status==="tamamlandi"?"green":apt.status==="iptal"?"red":"gold"}>
                        {STATUS_LABELS[apt.status]}
                      </Badge>
                      {apt.status === "onaylandi" && (
                        <Button size="sm" onClick={() => handleCompleteClick(apt)}>
                          <CheckCircle size={14}/>Tamamla
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-4">
          <motion.div variants={fadeUp}>
            <div className="cursor-pointer" onClick={() => setNotifOpen(true)}>
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell size={14} className="text-gold"/>
                  <h3 className="text-base font-display text-white tracking-wider" style={{ fontFamily:"var(--font-bebas)" }}>Bildirimler</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {unreadNotifs > 0 && <span className="text-xs bg-crimson text-white px-2 py-0.5">{unreadNotifs} yeni</span>}
                  <ChevronRight size={13} className="text-white/20"/>
                </div>
              </div>
              <div className="space-y-2">
                {notifs.filter(n => !n.isRead).slice(0, 3).map(n => (
                  <div key={n.id} className={`p-2 border-l-2 ${n.type==="warning"?"border-gold":"border-crimson"}`}>
                    <div className="text-xs text-white/70 font-semibold truncate" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{n.title}</div>
                    <div className="text-xs text-white/30 truncate" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{n.message}</div>
                  </div>
                ))}
                {unreadNotifs === 0 && (
                  <p className="text-xs text-center py-2 text-white/20" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Okunmamış bildirim yok</p>
                )}
              </div>
              {notifs.length > 0 && (
                <p className="text-xs text-white/20 mt-2 text-right" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Tümünü gör →</p>
              )}
            </Card>
            </div>
          </motion.div>

          {lowLessons.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="p-4 border border-gold/20">
                <div className="flex items-center gap-2 mb-3">
                  <Bell size={16} className="text-gold"/>
                  <h3 className="text-sm font-display text-gold tracking-wider" style={{ fontFamily:"var(--font-bebas)" }}>Paket Bitiyor</h3>
                </div>
                {lowLessons.map(s => (
                  <div key={s.id} className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-xs text-white/60" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{s.fullName}</span>
                    <span className="text-xs text-gold font-semibold" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{s.remainingLessons} ders</span>
                  </div>
                ))}
              </Card>
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <Card className="p-4">
              <h3 className="text-sm font-display text-white tracking-wider mb-3" style={{ fontFamily:"var(--font-bebas)" }}>Hızlı Erişim</h3>
              <div className="space-y-1">
                {[
                  { href:"/admin/ogrenciler", label:"Öğrenci Yönetimi" },
                  { href:"/admin/takvim",     label:"Takvim & Müsaitlik" },
                  { href:"/admin/odemeler",   label:"Ödeme Takibi" },
                  { href:"/admin/dersler",    label:"Ders Notları" },
                ].map(l => (
                  <Link key={l.href} href={l.href} className="flex items-center justify-between py-2 px-2 hover:bg-steel/30 transition-colors group">
                    <span className="text-xs text-white/40 group-hover:text-white/70 tracking-wider" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{l.label}</span>
                    <span className="text-white/20 group-hover:text-gold transition-colors">›</span>
                  </Link>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ══ Katılım Modalı (Geldi / Gelmedi) ══ */}
      <Modal open={!!attendModal} onClose={() => setAttendModal(null)} title="Ders Tamamla — Katılım" maxWidth="max-w-md">
        {attendModal && (
          <div className="space-y-4">
            <div className="p-3 bg-steel/30 border border-white/5 space-y-1">
              <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                {format(new Date(attendModal.date), "dd MMMM yyyy", { locale: tr })} · {attendModal.startTime}–{attendModal.endTime}
              </div>
              {attendModal.lessonType !== "bireysel" && (
                <div className="text-xs" style={{ color:"#A855F7", fontFamily:"var(--font-barlow-condensed)" }}>
                  {attendModal.lessonType === "duet" ? "Düet Ders" : "Grup Ders"}
                </div>
              )}
            </div>

            <p className="text-xs text-white/40" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
              Sadece "Geldi" seçilen öğrencilerden ders düşülür.
            </p>

            {/* Öğrenci listesi — invite_status gösterimli */}
            <div className="space-y-2">
              {Object.entries(attendances).map(([studentId, attended]) => {
                const std   = students.find(s => s.id === studentId);
                const apSt  = (aptStudents[attendModal.id] ?? []).find(s => s.studentId === studentId);
                const name  = std?.fullName ?? apSt?.studentName ?? studentId;
                const role  = apSt?.role ?? "creator";
                const invite= apSt?.inviteStatus ?? "accepted";

                const inviteLabel: Record<string, { label: string; color: string }> = {
                  accepted: { label: "Onayladı",  color: "#22c55e" },
                  pending:  { label: "Bekliyor",  color: "#d97706" },
                  declined: { label: "Reddetti",  color: "#ef4444" },
                };
                const invInfo = inviteLabel[invite] ?? inviteLabel.accepted;

                // Reddeden veya bekleyen öğrenciden ders düşmez — disabled
                const canDeduct = invite === "accepted";

                return (
                  <div key={studentId} className="p-3 bg-steel/30 border border-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                          {name}
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                            style={{ background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-barlow-condensed)" }}>
                            {role === "creator" ? "Oluşturan" : "Partner"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color:invInfo.color, fontFamily:"var(--font-barlow-condensed)" }}>
                            {invInfo.label}
                          </span>
                          <span className="text-[10px] text-white/25" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                            · {std?.remainingLessons ?? "?"} ders kaldı
                          </span>
                        </div>
                      </div>
                    </div>

                    {canDeduct ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAttendances(p => ({ ...p, [studentId]: true }))}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition-all ${attended ? "bg-green-600 text-white" : "border border-white/15 text-white/40 hover:border-green-600/40"}`}
                          style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                          <UserCheck size={13}/>Geldi
                        </button>
                        <button
                          onClick={() => setAttendances(p => ({ ...p, [studentId]: false }))}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition-all ${!attended ? "bg-red-700 text-white" : "border border-white/15 text-white/40 hover:border-red-600/40"}`}
                          style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                          <UserX size={13}/>Gelmedi
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs italic" style={{ color:"rgba(255,255,255,0.25)", fontFamily:"var(--font-barlow-condensed)" }}>
                        {invite === "declined" ? "Reddetti — ders düşülmeyecek" : "Henüz onaylamadı — ders düşülmeyecek"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Uyarılar */}
            {attendWarnings.length > 0 && (
              <div className="p-3 bg-gold/5 border border-gold/20 space-y-1">
                {attendWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-gold" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{w}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => setAttendModal(null)} variant="secondary" className="flex-1">Vazgeç</Button>
              <Button onClick={handleAttendanceSubmit} loading={attendSaving} className="flex-1">
                Tamamla
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ══ Ders Notu Modalı ══ */}
      <Modal open={!!noteModal} onClose={() => setNoteModal(null)} title="Ders Notu Ekle" maxWidth="max-w-2xl">
        {noteModal && (
          <div className="space-y-4">
            <div className="p-3 bg-steel/30 border border-white/5">
              <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{noteModal.studentName}</div>
              <div className="text-xs text-white/30" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{noteModal.date} · {noteModal.startTime}–{noteModal.endTime}</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SCORE_KEYS.map(k => (
                <div key={k} className="space-y-1">
                  <label className="text-xs text-white/40 tracking-wider" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{SCORE_TR[k]}</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="1" max="10" value={scores[k]}
                      onChange={e => setScores(p => ({ ...p, [k]: Number(e.target.value) }))}
                      className="flex-1 accent-crimson"/>
                    <span className="text-sm text-crimson font-display w-6 text-center" style={{ fontFamily:"var(--font-bebas)" }}>{scores[k]}</span>
                  </div>
                </div>
              ))}
            </div>
            <Textarea label="Antrenör Notu" value={noteText} onChange={setNoteText} rows={3} placeholder="Derste neler yapıldı..." />
            <div className="flex gap-3">
              <Button onClick={() => setNoteModal(null)} variant="secondary" className="flex-1">Atla</Button>
              <Button onClick={handleSaveNote} loading={saving} className="flex-1">Notu Kaydet</Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>

    {/* ══ BİLDİRİM PANELİ ve GİRİŞ TOAST ═════════════════════════ */}
    <AnimatePresence>
      {notifOpen && (
        <>
          {/* Overlay */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setNotifOpen(false)} />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type:"spring", damping:28, stiffness:280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] flex flex-col"
            style={{ background:"#18181B", borderLeft:"1px solid rgba(255,255,255,0.08)", boxShadow:"-20px 0 60px rgba(0,0,0,0.5)" }}>
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor:"rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2.5">
                <Bell size={16} className="text-gold"/>
                <span className="text-white font-display tracking-wider text-lg" style={{ fontFamily:"var(--font-bebas)" }}>
                  BİLDİRİMLER
                </span>
                {unreadNotifs > 0 && (
                  <span className="text-xs bg-crimson text-white px-2 py-0.5">{unreadNotifs} yeni</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadNotifs > 0 && (
                  <button
                    onClick={async () => {
                      await markAllAdminNotificationsRead();
                      const fresh = await getAdminNotifications();
                      setNotifs(fresh);
                    }}
                    className="text-xs px-2.5 py-1 transition-colors"
                    style={{ color:"rgba(255,255,255,0.35)", border:"1px solid rgba(255,255,255,0.1)", fontFamily:"var(--font-barlow-condensed)" }}>
                    Tümünü okundu yap
                  </button>
                )}
                <button onClick={() => setNotifOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full"
                  style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)" }}>
                  <X size={15}/>
                </button>
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling:"touch" }}>
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                  <Bell size={32} style={{ color:"rgba(255,255,255,0.08)" }}/>
                  <p className="text-sm" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"var(--font-barlow-condensed)" }}>Henüz bildirim yok</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor:"rgba(255,255,255,0.05)" }}>
                  {notifs.map(n => {
                    const borderColor = n.type === "success" ? "#22c55e"
                      : n.type === "warning" ? "#d97706"
                      : n.type === "reminder" ? "#8B5CF6" : "#ef4444";
                    return (
                      <div
                        key={n.id}
                        className="flex gap-3 px-4 py-3.5 cursor-pointer transition-colors"
                        style={{ background: n.isRead ? "transparent" : "rgba(255,255,255,0.02)" }}
                        onClick={async () => {
                          if (!n.isRead) {
                            await markNotificationRead(n.id);
                            setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
                          }
                        }}>
                        {/* Renk aksanı */}
                        <div className="w-0.5 flex-shrink-0 rounded-full self-stretch" style={{ background: n.isRead ? "rgba(255,255,255,0.08)" : borderColor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold leading-tight" style={{ color: n.isRead ? "rgba(255,255,255,0.4)" : "#fff", fontFamily:"var(--font-barlow-condensed)" }}>
                              {n.title}
                            </p>
                            {!n.isRead && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: borderColor }} />}
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                            {n.message}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color:"rgba(255,255,255,0.18)", fontFamily:"var(--font-barlow-condensed)" }}>
                            {n.createdAt ? format(parseISO(n.createdAt), "dd MMM yyyy HH:mm", { locale: tr }) : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-5 py-4 border-t" style={{ borderColor:"rgba(255,255,255,0.08)" }}>
              <Link href="/admin/bildirimler"
                className="flex items-center justify-center gap-2 w-full py-2.5 text-xs tracking-widest uppercase transition-colors"
                style={{ border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}
                onClick={() => setNotifOpen(false)}>
                Tüm Bildirimleri Görüntüle
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* ══ GİRİŞ TOAST ══════════════════════════════════════════════ */}
    <AnimatePresence>
      {loginToast && (
        <motion.div
          initial={{ opacity:0, y: 20, scale:0.96 }}
          animate={{ opacity:1, y: 0, scale:1 }}
          exit={{ opacity:0, y: 20, scale:0.96 }}
          transition={{ duration:0.3 }}
          className="fixed bottom-6 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 px-4"
          style={{ filter:"drop-shadow(0 8px 32px rgba(0,0,0,0.5))" }}>
          <div className="rounded-2xl overflow-hidden"
            style={{ background:"rgba(24,24,27,0.98)", border:"1px solid rgba(139,92,246,0.3)" }}>
            <div className="h-0.5" style={{ background:"linear-gradient(90deg,transparent,#8B5CF6,#D946EF,transparent)" }} />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.3)" }}>
                  <Bell size={14} style={{ color:"#8B5CF6" }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                    {loginToast.title}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color:"rgba(255,255,255,0.45)", fontFamily:"var(--font-barlow-condensed)" }}>
                    {loginToast.message}
                  </p>
                </div>
                <button onClick={() => setLoginToast(null)}
                  className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full"
                  style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.4)" }}>
                  <X size={12}/>
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    await markNotificationRead(loginToast.id);
                    setNotifs(prev => prev.map(x => x.id === loginToast.id ? { ...x, isRead: true } : x));
                    setLoginToast(null);
                  }}
                  className="flex-1 py-2 text-xs tracking-widest uppercase"
                  style={{ border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                  Okundu Yap
                </button>
                <button
                  onClick={() => { setNotifOpen(true); setLoginToast(null); }}
                  className="flex-1 py-2 text-xs tracking-widest uppercase text-white"
                  style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", fontFamily:"var(--font-barlow-condensed)" }}>
                  Detayı Gör
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
