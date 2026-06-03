"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  getAppointments, getStudents, getAdminNotifications,
  completeAppointmentWithAttendance, getAppointmentStudents, createLessonRecord,
} from "@/lib/db";
import type { Appointment, Student, Notification, AppointmentStudent } from "@/lib/types";
import { StatCard, Card, Badge, Button, PageHeader, Modal, Textarea } from "@/app/components/ui";
import { STATUS_LABELS } from "@/lib/constants";
import { Users, Calendar, TrendingUp, Bell, CheckCircle, XCircle, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";
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
    // Düet randevular için appointment_students yükle
    const map: Record<string, AppointmentStudent[]> = {};
    await Promise.all(
      apts.filter(a => a.lessonType !== "bireysel" || a.status === "onaylandi").map(async a => {
        map[a.id] = await getAppointmentStudents(a.id);
      })
    );
    setAptStudents(map);
  }, [today]);

  useEffect(() => {
    Promise.all([reloadApts(), getStudents(), getAdminNotifications()]).then(([, s, n]) => {
      setStudents(s);
      setNotifs(n);
      setLoading(false);
    });
  }, [reloadApts]);

  /* ── Tamamla butonuna basıldı ─────────────────────────────── */
  const handleCompleteClick = async (apt: Appointment) => {
    // appointment_students yükle
    let apStudents = aptStudents[apt.id] ?? [];
    if (apStudents.length === 0) {
      apStudents = await getAppointmentStudents(apt.id);
    }
    // Katılım başlangıç: hepsi "Geldi" (true)
    const init: Record<string, boolean> = {};
    if (apStudents.length > 0) {
      apStudents.forEach(s => { init[s.studentId] = true; });
    } else if (apt.studentId) {
      init[apt.studentId] = true;
    }
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
      if (result.warnings.length > 0) {
        setAttendWarnings(result.warnings);
        // Uyarı varsa modalı açık bırak göster
      } else {
        setAttendModal(null);
        setNoteModal(attendModal);
      }
      await reloadApts();
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
    if (!apSt || apSt.length <= 1) return apt.studentName;
    return apSt.map(s => s.studentName ?? "?").filter(Boolean).join(" + ");
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
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-6xl mx-auto space-y-6">
      <motion.div variants={fadeUp}>
        <PageHeader
          title="Bugünün Dersleri"
          subtitle={format(new Date(), "dd MMMM yyyy, EEEE", { locale: tr })}
          accent="Admin Paneli"
        />
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Aktif Öğrenci" value={active.length} sub="Toplam kayıtlı" color="gold" icon={<Users size={18}/>} />
        <StatCard label="Bugünkü Ders" value={todayApts.length} sub={`${todayApts.filter(a=>a.status==="tamamlandi").length} tamamlandı`} color="red" icon={<Calendar size={18}/>} />
        <StatCard label="Ödeme Bekleyen" value={pendingPayment.length} sub="Öğrenci" color="white" icon={<TrendingUp size={18}/>} />
        <StatCard label="Bildirim" value={unreadNotifs} sub="Okunmamış" color="gold" icon={<Bell size={18}/>} />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bugünkü dersler */}
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Card className="p-6">
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
                      <div className="text-xs text-white/30" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                        {apt.studentCode} · {apt.startTime}–{apt.endTime}
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
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-display text-white tracking-wider" style={{ fontFamily:"var(--font-bebas)" }}>Bildirimler</h3>
                {unreadNotifs > 0 && <span className="text-xs bg-crimson text-white px-2 py-0.5">{unreadNotifs}</span>}
              </div>
              <div className="space-y-2">
                {notifs.slice(0,4).map(n => (
                  <div key={n.id} className={`p-2 border-l-2 ${n.isRead?"border-white/10 opacity-50":n.type==="warning"?"border-gold":"border-crimson"}`}>
                    <div className="text-xs text-white/70 font-semibold" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{n.title}</div>
                    <div className="text-xs text-white/30" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{n.message.slice(0,60)}...</div>
                  </div>
                ))}
              </div>
            </Card>
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
  );
}
