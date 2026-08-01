"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getSalonOwnerStudents,
  getAppointmentsForStudentIds,
  bulkGetAppointmentStudents,
} from "@/lib/db";
import type { Student, Appointment, AppointmentStudent } from "@/lib/types";
import { logout as doLogout } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Logo from "@/app/components/shared/Logo";
import {
  Users, LogOut, RefreshCw, ChevronRight, Phone, Calendar, BookOpen,
  Clock, Shield, CheckCircle2, AlertCircle, Search, X,
  CalendarDays, TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";
import { format, parseISO, isToday, isFuture, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { tr } from "date-fns/locale";

/* ── Sabitler ─────────────────────────────────────────────── */
const LEVEL_MAP: Record<string, string> = { baslangic: "Başlangıç", orta: "Orta", ileri: "İleri" };
const PKG_MAP:   Record<string, string> = { savasci: "Savaşçı", sampiyon: "Şampiyon", efsane: "Efsane" };
const STATUS_MAP:Record<string, string> = { onaylandi: "Onaylandı", tamamlandi: "Tamamlandı", iptal: "İptal", gelmedi: "Gelmedi" };
const STATUS_COLOR: Record<string, string> = { onaylandi: "#22c55e", tamamlandi: "#8B5CF6", iptal: "#ef4444", gelmedi: "#6b7280" };
const LESSON_MAP: Record<string, string> = { bireysel: "Bireysel", duet: "Düet", grup: "Grup" };

type Tab = "ogrenciler" | "randevular";
type Filter = "hepsi" | "bugun" | "hafta" | "gecmis";

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const fadeUp = {
  initial: { opacity: 0, y: 14, scale: 0.97, filter: "blur(5px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const duration = 600;
    const start = performance.now();
    const animate = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

/* ── Küçük yardımcılar ────────────────────────────────────── */
function ProgressBar({ value, max, color = "#8B5CF6" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Pill({ children, color = "#8B5CF6" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}1f`, color, fontFamily: "var(--font-label)", letterSpacing: "0.05em" }}>
      {children}
    </span>
  );
}

/* ── Randevu kartı ────────────────────────────────────────── */
function AptCard({ apt, students, apSt }: {
  apt: Appointment;
  students: Student[];
  apSt: AppointmentStudent[];
}) {
  const owner  = students.find(s => s.id === apt.studentId);
  const isPast = !isFuture(parseISO(`${apt.date}T${apt.startTime}`)) && apt.status !== "tamamlandi";
  const today  = isToday(parseISO(apt.date));

  // Partner bilgisi
  const partner = apSt.find(s => s.studentId !== apt.studentId);
  const partnerStudent = partner ? students.find(s => s.id === partner.studentId) : undefined;

  const statusColor = STATUS_COLOR[apt.status] ?? "#6b7280";
  const statusLabel = STATUS_MAP[apt.status] ?? apt.status;

  return (
    <motion.div
      variants={fadeUp}
      className="relative glass-strong rounded-2xl overflow-hidden"
      style={{ borderColor: today ? "rgba(139,92,246,0.4)" : undefined }}
    >
      {today && <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl gradient-animated gradient-slow gradient-violet-pink-orange" />}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Saat bloğu */}
          <div className="flex-shrink-0 w-14 text-center">
            <div className="text-sm font-bold" style={{ color: "#A78BFA", fontFamily: "var(--font-display)", letterSpacing: "0.05em" }}>{apt.startTime}</div>
            <div className="text-xs text-white/25" style={{ fontFamily: "var(--font-label)" }}>{apt.endTime}</div>
          </div>

          {/* İçerik */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-label)" }}>
                {owner?.fullName ?? apt.studentName}
              </span>
              {apt.lessonType && apt.lessonType !== "bireysel" && (
                <Pill color="#A855F7">{LESSON_MAP[apt.lessonType]}</Pill>
              )}
              {today && <Pill color="#22c55e">Bugün</Pill>}
              {isPast && apt.status === "onaylandi" && <Pill color="#d97706">Geçti?</Pill>}
            </div>

            {/* Partner */}
            {partner && (
              <div className="text-xs mt-0.5 text-white/40" style={{ fontFamily: "var(--font-label)" }}>
                Partner: {partnerStudent?.fullName ?? partner.studentName ?? "?"} ·{" "}
                <span style={{ color: partner.inviteStatus === "accepted" ? "var(--color-success)" : partner.inviteStatus === "declined" ? "var(--color-error)" : "var(--color-achievement)" }}>
                  {partner.inviteStatus === "accepted" ? "Onayladı" : partner.inviteStatus === "declined" ? "Reddetti" : "Bekliyor"}
                </span>
              </div>
            )}

            {/* Katılım durumu */}
            {apt.status === "tamamlandi" && apSt.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {apSt.map(s => {
                  const sName = students.find(st => st.id === s.studentId)?.fullName ?? s.studentName ?? "?";
                  const attColor = s.attendanceStatus === "attended" ? "var(--color-success)" : s.attendanceStatus === "absent" ? "var(--color-error)" : "#6b7280";
                  const attLabel = s.attendanceStatus === "attended" ? "Geldi" : s.attendanceStatus === "absent" ? "Gelmedi" : "?";
                  return (
                    <span key={s.studentId} className="text-xs" style={{ color: attColor, fontFamily: "var(--font-label)" }}>
                      {sName}: {attLabel}{s.lessonDeducted ? " · ders düştü" : ""}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Durum */}
          <div className="flex-shrink-0">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${statusColor}1f`, color: statusColor, fontFamily: "var(--font-label)" }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Öğrenci accordion kartı ──────────────────────────────── */
function StudentCard({ student, appointments, apStMap }: {
  student: Student;
  appointments: Appointment[];
  apStMap: Record<string, AppointmentStudent[]>;
}) {
  const [open, setOpen] = useState(false);

  const myApts  = appointments.filter(a => a.studentId === student.id);
  const upcoming = myApts.filter(a => a.status === "onaylandi" && isFuture(parseISO(`${a.date}T${a.startTime}`))).slice(0, 3);
  const completed= myApts.filter(a => a.status === "tamamlandi").slice(0, 3);
  const lastApt  = myApts.filter(a => a.status === "tamamlandi").sort((a, b) => b.date.localeCompare(a.date))[0];

  const remaining = student.remainingLessons;
  const total     = student.totalLessons;
  const barColor  = remaining <= 2 ? "var(--color-error)" : remaining <= 5 ? "var(--color-achievement)" : "#8B5CF6";

  return (
    <motion.div
      variants={fadeUp}
      className="glass-strong rounded-2xl overflow-hidden"
      style={{ borderColor: open ? "rgba(139,92,246,0.4)" : undefined }}
    >
      {/* Özet satır */}
      <button className="w-full text-left p-4 flex items-center gap-3" onClick={() => setOpen(o => !o)}>
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
          style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.4),rgba(217,70,239,0.3))", border: "1px solid rgba(139,92,246,0.3)", fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
          {student.fullName.split(" ").map(w => w[0]).slice(0, 2).join("")}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-label)" }}>{student.fullName}</span>
            <Pill color={student.level === "ileri" ? "#E879F9" : student.level === "orta" ? "#A78BFA" : "#60A5FA"}>
              {LEVEL_MAP[student.level] ?? student.level}
            </Pill>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-white/25" style={{ fontFamily: "var(--font-label)" }}>{student.code}</span>
            <span className="text-xs" style={{ color: barColor, fontFamily: "var(--font-label)" }}>{remaining} ders kalan</span>
            {upcoming.length > 0 && (
              <span className="text-xs" style={{ color: "var(--color-success)", fontFamily: "var(--font-label)" }}>· {upcoming.length} yaklaşan randevu</span>
            )}
          </div>
        </div>

        {/* Kalan ders sayısı */}
        <div className="text-right flex-shrink-0 mr-2">
          <div className="text-xl" style={{ color: barColor, fontFamily: "var(--font-display)", lineHeight: 1 }}>{remaining}</div>
          <div className="text-xs text-white/20" style={{ fontFamily: "var(--font-label)" }}>/ {total}</div>
        </div>

        {open ? <ChevronUp size={14} className="text-white/20 flex-shrink-0" /> : <ChevronDown size={14} className="text-white/20 flex-shrink-0" />}
      </button>

      {/* İlerleme çubuğu */}
      <div className="px-4 pb-3">
        <ProgressBar value={student.completedLessons} max={total} color={barColor} />
      </div>

      {/* Detay */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: "hidden" }}>
            <div className="px-4 pt-4 pb-5 space-y-5" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>

              {/* Temel bilgiler */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <BookOpen size={11} />, label: "Paket", value: PKG_MAP[student.packageType] ?? student.packageType },
                  { icon: <CheckCircle2 size={11} />, label: "Tamamlanan", value: `${student.completedLessons} ders` },
                  { icon: <Calendar size={11} />, label: "Paket Başlangıç", value: student.packageStartDate || "—" },
                  { icon: <Clock size={11} />, label: "Paket Bitiş", value: student.packageEndDate || "—" },
                  ...(student.phone ? [{ icon: <Phone size={11} />, label: "Telefon", value: student.phone }] : []),
                  ...(lastApt ? [{ icon: <CalendarDays size={11} />, label: "Son Ders", value: format(parseISO(lastApt.date), "dd MMM yyyy", { locale: tr }) }] : []),
                ].map(row => (
                  <div key={row.label} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-white/25">
                      {row.icon}
                      <span className="text-xs uppercase tracking-wide" style={{ fontFamily: "var(--font-label)", fontSize: "0.62rem" }}>{row.label}</span>
                    </div>
                    <span className="text-sm text-white" style={{ fontFamily: "var(--font-label)" }}>{row.value}</span>
                  </div>
                ))}
              </div>

              {/* Yaklaşan randevular */}
              {upcoming.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2 text-white/20" style={{ fontFamily: "var(--font-label)" }}>Yaklaşan Randevular</div>
                  <div className="space-y-1.5">
                    {upcoming.map(a => {
                      const partner = (apStMap[a.id] ?? []).find(s => s.studentId !== student.id);
                      return (
                        <div key={a.id} className="glass flex items-center gap-3 px-3 py-2 rounded-xl">
                          <CalendarDays size={12} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold" style={{ color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
                              {format(parseISO(a.date), "dd MMM (EEEE)", { locale: tr })} · {a.startTime}
                            </span>
                            {a.lessonType !== "bireysel" && (
                              <span className="ml-2 text-xs" style={{ color: "#A855F7", fontFamily: "var(--font-label)" }}>
                                {LESSON_MAP[a.lessonType]}
                                {partner && ` · ${partner.studentName ?? "?"}`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Son dersler */}
              {completed.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-widest mb-2 text-white/20" style={{ fontFamily: "var(--font-label)" }}>Son Tamamlanan Dersler</div>
                  <div className="space-y-1.5">
                    {completed.map(a => {
                      const mySt = (apStMap[a.id] ?? []).find(s => s.studentId === student.id);
                      return (
                        <div key={a.id} className="glass flex items-center gap-3 px-3 py-2 rounded-xl">
                          <CheckCircle2 size={12} style={{ color: "#8B5CF6", flexShrink: 0 }} />
                          <span className="text-xs flex-1 text-white/50" style={{ fontFamily: "var(--font-label)" }}>
                            {format(parseISO(a.date), "dd MMM yyyy", { locale: tr })} · {a.startTime}
                          </span>
                          {mySt && (
                            <span className="text-xs" style={{
                              color: mySt.attendanceStatus === "attended" ? "var(--color-success)" : mySt.attendanceStatus === "absent" ? "var(--color-error)" : "#6b7280",
                              fontFamily: "var(--font-label)",
                            }}>
                              {mySt.attendanceStatus === "attended" ? "Geldi" : mySt.attendanceStatus === "absent" ? "Gelmedi" : "—"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {upcoming.length === 0 && completed.length === 0 && (
                <p className="text-xs text-center py-3 text-white/20" style={{ fontFamily: "var(--font-label)" }}>Henüz randevu kaydı yok</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Ana sayfa ────────────────────────────────────────────── */
export default function SalonPanelPage() {
  const { salonOwner, logout } = useAuth();
  const [students, setStudents]         = useState<Student[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [apStMap, setApStMap]           = useState<Record<string, AppointmentStudent[]>>({});
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState<Tab>("ogrenciler");
  const [query, setQuery]               = useState("");
  const [aptFilter, setAptFilter]       = useState<Filter>("hepsi");
  const router = useRouter();

  const load = async () => {
    if (!salonOwner) return;
    setLoading(true);
    const studs = await getSalonOwnerStudents(salonOwner.id);
    setStudents(studs);

    if (studs.length > 0) {
      const studentIds = studs.map(s => s.id);
      const apts       = await getAppointmentsForStudentIds(studentIds);
      setAppointments(apts);

      // Düet bilgisi için appointment_students bulk çek
      const map = await bulkGetAppointmentStudents(apts.map(a => a.id));
      setApStMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [salonOwner]); // eslint-disable-line

  const handleLogout = () => { logout(); router.replace("/salon-login"); };

  /* ── Filtrelenmiş öğrenciler ──────────────────────────────── */
  const filteredStudents = useMemo(() =>
    students.filter(s => !query || s.fullName.toLowerCase().includes(query.toLowerCase()) || s.code.toLowerCase().includes(query.toLowerCase())),
    [students, query]
  );

  /* ── Filtrelenmiş randevular ──────────────────────────────── */
  const filteredApts = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd   = endOfWeek(now,   { weekStartsOn: 1 });
    return appointments
      .filter(a => {
        const dt = parseISO(`${a.date}T${a.startTime}`);
        if (aptFilter === "bugun")  return isToday(parseISO(a.date));
        if (aptFilter === "hafta")  return isWithinInterval(parseISO(a.date), { start: weekStart, end: weekEnd });
        if (aptFilter === "gecmis") return !isFuture(dt) || a.status === "tamamlandi";
        return true;
      })
      .filter(a => !query || (() => {
        const owner = students.find(s => s.id === a.studentId);
        return owner?.fullName.toLowerCase().includes(query.toLowerCase()) || a.studentName.toLowerCase().includes(query.toLowerCase());
      })())
      .sort((a, b) => {
        if (aptFilter === "gecmis") return b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime);
        return a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
      });
  }, [appointments, aptFilter, query, students]);

  /* ── İstatistikler ──────────────────────────────────────── */
  const todayCount   = appointments.filter(a => isToday(parseISO(a.date))).length;
  const upcomingCount= appointments.filter(a => a.status === "onaylandi" && isFuture(parseISO(`${a.date}T${a.startTime}`))).length;
  const avgRemain    = students.length ? Math.round(students.reduce((acc, s) => acc + s.remainingLessons, 0) / students.length) : 0;

  return (
    <div className="min-h-screen bg-obsidian" style={{ paddingBottom: "env(safe-area-inset-bottom,16px)" }}>
      {/* BG */}
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="fixed top-[-10%] left-[-5%] w-72 h-72 rounded-full blur-3xl pointer-events-none animate-float-slow" style={{ background: "rgba(139,92,246,0.08)" }} />
      <div className="fixed bottom-[-10%] right-[-5%] w-80 h-80 rounded-full blur-3xl pointer-events-none animate-float-medium" style={{ background: "rgba(236,72,153,0.06)" }} />

      {/* Header */}
      <header className="glass-strong sticky top-0 z-50" style={{ borderRadius: 0, paddingTop: "env(safe-area-inset-top,0px)" }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Logo size={34} />
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold tracking-wide" style={{ fontFamily: "var(--font-label)" }}>{salonOwner?.name}</div>
            <div className="flex items-center gap-1">
              <Shield size={9} style={{ color: "rgba(139,92,246,0.7)" }} />
              <span className="text-xs tracking-widest uppercase" style={{ color: "#A78BFA", fontFamily: "var(--font-label)", fontSize: "0.6rem" }}>Salon Gözlemci</span>
            </div>
          </div>
          <button onClick={() => load()} title="Yenile" className="p-2 rounded-lg text-white/25 hover:text-white transition-colors">
            <RefreshCw size={15} />
          </button>
          <button onClick={handleLogout}
            className="glass flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-widest uppercase rounded-lg transition-colors text-white/40 hover:text-white"
            style={{ fontFamily: "var(--font-label)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--color-error)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = ""; }}>
            <LogOut size={11} /> Çıkış
          </button>
        </div>
      </header>

      <motion.main variants={stagger} initial="initial" animate="animate" className="max-w-2xl mx-auto px-4 pt-5 pb-10 relative">
        {/* İstatistikler */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Öğrenci", value: students.length, color: "#A78BFA" },
            { label: "Bugün",   value: todayCount,       color: "var(--color-success)" },
            { label: "Yaklaşan",value: upcomingCount,    color: "#A855F7" },
            { label: "Ort.Kalan",value: avgRemain,       color: "#E879F9" },
          ].map((s) => (
            <div key={s.label} className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet">
              <div className="glass relative rounded-2xl p-3 text-center">
                <div className="text-xl sm:text-2xl" style={{ color: s.color, fontFamily: "var(--font-display)", lineHeight: 1 }}><CountUp value={s.value} /></div>
                <div className="text-xs mt-0.5 text-white/25" style={{ fontFamily: "var(--font-label)", fontSize: "0.62rem", letterSpacing: "0.04em" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Sekmeler */}
        <motion.div variants={fadeUp} className="flex items-center gap-1.5 glass rounded-xl p-1 w-fit mb-4">
          {([
            { key: "ogrenciler" as Tab, label: "Öğrenciler", icon: <Users size={13} /> },
            { key: "randevular" as Tab, label: "Randevular",  icon: <CalendarDays size={13} /> },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="relative flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors"
              style={{ fontFamily: "var(--font-label)", color: tab === t.key ? "#fff" : "rgba(255,255,255,0.4)" }}>
              {tab === t.key && (
                <motion.div layoutId="salon-panel-tab-pill" className="absolute inset-0 rounded-lg gradient-animated gradient-slow gradient-violet-pink-orange -z-10" />
              )}
              {t.icon} {t.label}
            </button>
          ))}
        </motion.div>

        {/* Arama */}
        <motion.div variants={fadeUp} className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tab === "ogrenciler" ? "Öğrenci ara..." : "İsme göre filtrele..."}
            className="glass w-full pl-9 pr-9 py-2.5 text-sm outline-none rounded-xl text-white"
            style={{ fontFamily: "var(--font-label)" }} />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white">
              <X size={13} />
            </button>
          )}
        </motion.div>

        {/* Randevu filtre chipleri */}
        {tab === "randevular" && (
          <motion.div variants={fadeUp} className="flex items-center gap-1.5 glass rounded-xl p-1 w-fit mb-4 flex-wrap">
            {(["hepsi", "bugun", "hafta", "gecmis"] as Filter[]).map(f => {
              const labels: Record<Filter, string> = { hepsi: "Hepsi", bugun: "Bugün", hafta: "Bu Hafta", gecmis: "Geçmiş" };
              return (
                <button key={f} onClick={() => setAptFilter(f)}
                  className="relative px-3 py-1.5 text-xs rounded-lg transition-colors"
                  style={{ fontFamily: "var(--font-label)", color: aptFilter === f ? "#fff" : "rgba(255,255,255,0.4)" }}>
                  {aptFilter === f && (
                    <motion.div layoutId="salon-panel-filter-pill" className="absolute inset-0 rounded-lg gradient-animated gradient-slow gradient-violet-pink-orange -z-10" />
                  )}
                  {labels[f]}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* İçerik */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(139,92,246,0.5)", borderTopColor: "transparent" }} />
            <span className="text-xs tracking-widest uppercase text-white/20" style={{ fontFamily: "var(--font-label)" }}>Yükleniyor...</span>
          </div>
        ) : tab === "ogrenciler" ? (
          /* ── Öğrenciler sekmesi ── */
          students.length === 0 ? (
            <motion.div variants={fadeUp} className="glass rounded-2xl flex flex-col items-center py-16 gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
                <Users size={24} style={{ color: "rgba(167,139,250,0.5)" }} />
              </div>
              <p className="text-sm text-center text-white/30" style={{ fontFamily: "var(--font-label)" }}>Henüz öğrenci atanmadı</p>
            </motion.div>
          ) : (
            <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
              {filteredStudents.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-white/25">
                  <AlertCircle size={14} />
                  <span className="text-sm" style={{ fontFamily: "var(--font-label)" }}>Eşleşen öğrenci yok</span>
                </div>
              ) : (
                filteredStudents.map((s) => (
                  <StudentCard key={s.id} student={s} appointments={appointments} apStMap={apStMap} />
                ))
              )}
            </motion.div>
          )
        ) : (
          /* ── Randevular sekmesi ── */
          appointments.length === 0 ? (
            <motion.div variants={fadeUp} className="glass rounded-2xl flex flex-col items-center py-16 gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(139,92,246,0.1)" }}>
                <CalendarDays size={24} style={{ color: "rgba(167,139,250,0.5)" }} />
              </div>
              <p className="text-sm text-center text-white/30" style={{ fontFamily: "var(--font-label)" }}>Henüz randevu kaydı yok</p>
            </motion.div>
          ) : filteredApts.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-white/25">
              <AlertCircle size={14} />
              <span className="text-sm" style={{ fontFamily: "var(--font-label)" }}>Bu filtre için randevu yok</span>
            </div>
          ) : (
            <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2.5">
              {/* Tarih grupları */}
              {(() => {
                const groups: Record<string, Appointment[]> = {};
                filteredApts.forEach(a => {
                  if (!groups[a.date]) groups[a.date] = [];
                  groups[a.date].push(a);
                });
                return Object.entries(groups).map(([date, apts]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs uppercase tracking-widest text-white/25" style={{ fontFamily: "var(--font-label)" }}>
                        {format(parseISO(date), "dd MMMM yyyy (EEEE)", { locale: tr })}
                      </span>
                      {isToday(parseISO(date)) && <Pill color="#22c55e">Bugün</Pill>}
                      <div className="flex-1 h-px bg-white/8" />
                    </div>
                    <div className="space-y-2 relative">
                      {apts.map((a) => (
                        <AptCard key={a.id} apt={a} students={students} apSt={apStMap[a.id] ?? []} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </motion.div>
          )
        )}

        {/* Badge */}
        <motion.div variants={fadeUp} className="flex justify-center mt-8">
          <div className="glass flex items-center gap-2 px-3 py-1.5 rounded-full">
            <Shield size={10} className="text-white/30" />
            <span className="text-xs text-white/20" style={{ fontFamily: "var(--font-label)", letterSpacing: "0.1em" }}>
              {salonOwner?.accessCode} · Salt Okunur
            </span>
          </div>
        </motion.div>
      </motion.main>
    </div>
  );
}
