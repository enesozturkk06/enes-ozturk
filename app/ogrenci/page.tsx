"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getAppointments, getLessonRecords, getStudentNotifications } from "@/lib/db";
import type { Appointment, LessonRecord, Notification } from "@/lib/types";
import { StatCard, Card, Badge, ProgressBar, PageHeader } from "@/app/components/ui";
import { PACKAGES, STATUS_LABELS, PAYMENT_LABELS } from "@/lib/constants";
import { Calendar, Clock, TrendingUp, BookOpen, Bell, ChevronRight } from "lucide-react";
import Link from "next/link";
import { format, parseISO, isPast, isFuture } from "date-fns";
import { tr } from "date-fns/locale";

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

export default function OgrenciDashboard() {
  const { student } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<LessonRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    Promise.all([
      getAppointments({ studentId: student.id }),
      getLessonRecords(student.id),
      getStudentNotifications(student.id),
    ]).then(([apts, recs, notifs]) => {
      setAppointments(apts);
      setRecords(recs);
      setNotifications(notifs);
      setLoading(false);
    });
  }, [student]);

  if (!student) return null;

  const upcoming = appointments.filter(a => a.status === "onaylandi" && isFuture(parseISO(`${a.date}T${a.startTime}`)));
  const pkg = PACKAGES.find(p => p.type === student.packageType);
  const unreadNotifs = notifications.filter(n => !n.isRead).length;
  const lastRecord = records[0];
  const progressPct = pkg ? Math.round((student.completedLessons / pkg.lessonCount) * 100) : 0;

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp}>
        <PageHeader
          title={`Hoş Geldin, ${student.fullName.split(" ")[0]}!`}
          subtitle={`${student.code} · ${pkg?.name ?? ""} Paketi`}
          accent="Öğrenci Paneli"
        />
      </motion.div>

      {/* Unread notification banner */}
      {unreadNotifs > 0 && (
        <motion.div variants={fadeUp}>
          <Link href="/ogrenci/bildirimler" className="flex items-center justify-between p-4 bg-gold/5 border border-gold/20 hover:border-gold/40 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-gold" />
              <span className="text-sm text-white/70" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {unreadNotifs} okunmamış bildiriminiz var
              </span>
            </div>
            <ChevronRight size={16} className="text-gold/60" />
          </Link>
        </motion.div>
      )}

      {/* Stats row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Kalan Ders" value={student.remainingLessons} sub={`${student.completedLessons} ders tamamlandı`} color="red" icon={<BookOpen size={18} />} />
        <StatCard label="Yaklaşan Randevu" value={upcoming.length} sub={upcoming[0] ? format(parseISO(upcoming[0].date), "dd MMM", { locale: tr }) : "Randevu yok"} color="gold" icon={<Calendar size={18} />} />
        <StatCard label="Toplam Ders" value={student.completedLessons} sub="Tamamlanan" color="white" icon={<TrendingUp size={18} />} />
        <StatCard label="Son Gelişim" value={lastRecord ? `${lastRecord.overall}/10` : "—"} sub={lastRecord ? format(parseISO(lastRecord.date), "dd MMM", { locale: tr }) : "Kayıt yok"} color="green" icon={<TrendingUp size={18} />} />
      </motion.div>

      {/* Package progress */}
      <motion.div variants={fadeUp}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>{pkg?.name} Paketi</h3>
              <p className="text-xs text-white/30 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Paket bitiş: {format(parseISO(student.packageEndDate), "dd MMMM yyyy", { locale: tr })}
              </p>
            </div>
            <Badge color={student.paymentStatus === "odendi" ? "green" : student.paymentStatus === "kismi" ? "gold" : "red"}>
              {PAYMENT_LABELS[student.paymentStatus]}
            </Badge>
          </div>
          <ProgressBar value={student.completedLessons} max={pkg?.lessonCount ?? 1} color="red" label={`${student.completedLessons} / ${pkg?.lessonCount} ders`} />
          <div className="mt-3 text-right text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{progressPct}% tamamlandı</div>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming appointments */}
        <motion.div variants={fadeUp}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>Yaklaşan Randevular</h3>
              <Link href="/ogrenci/randevu" className="text-xs text-gold/60 hover:text-gold tracking-wider transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Tümü →</Link>
            </div>
            {upcoming.length === 0 ? (
              <div className="text-center py-8">
                <Calendar size={32} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yaklaşan randevunuz yok</p>
                <Link href="/ogrenci/randevu" className="mt-3 inline-block text-crimson text-xs tracking-wider hover:text-crimson-bright transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>+ Randevu Al</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.slice(0, 3).map(apt => (
                  <div key={apt.id} className="flex items-center gap-3 p-3 bg-steel/40 border border-white/5">
                    <div className="w-10 h-10 bg-crimson/10 border border-crimson/20 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-crimson text-xs font-display" style={{ fontFamily: "var(--font-bebas)" }}>{format(parseISO(apt.date), "dd")}</span>
                      <span className="text-crimson/60 text-xs" style={{ fontFamily: "var(--font-bebas)" }}>{format(parseISO(apt.date), "MMM", { locale: tr }).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {format(parseISO(apt.date), "EEEE", { locale: tr })}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-white/40">
                        <Clock size={12} />
                        <span style={{ fontFamily: "var(--font-barlow-condensed)" }}>{apt.startTime} – {apt.endTime}</span>
                      </div>
                    </div>
                    <Badge color="green">{STATUS_LABELS[apt.status]}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Last lesson record */}
        <motion.div variants={fadeUp}>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>Son Ders Notu</h3>
              <Link href="/ogrenci/gelisim" className="text-xs text-gold/60 hover:text-gold tracking-wider transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Geçmiş →</Link>
            </div>
            {!lastRecord ? (
              <div className="text-center py-8">
                <TrendingUp size={32} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Henüz ders kaydınız yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-sm text-white/50" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    {format(parseISO(lastRecord.date), "dd MMMM yyyy", { locale: tr })}
                  </span>
                  <Badge color={lastRecord.overall >= 8 ? "green" : lastRecord.overall >= 6 ? "gold" : "red"}>
                    Genel: {lastRecord.overall}/10
                  </Badge>
                </div>
                {[
                  ["Kondisyon", lastRecord.conditioning],
                  ["Yumruk", lastRecord.punch],
                  ["Tekme", lastRecord.kick],
                  ["Savunma", lastRecord.defense],
                ].map(([lbl, val]) => (
                  <ProgressBar key={String(lbl)} label={String(lbl)} value={Number(val)} max={10} color={Number(val) >= 8 ? "green" : Number(val) >= 6 ? "gold" : "red"} />
                ))}
                {lastRecord.trainerNotes && (
                  <div className="mt-3 p-3 bg-steel/30 border-l-2 border-gold/40">
                    <p className="text-xs text-white/50 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
                      {lastRecord.trainerNotes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/ogrenci/randevu", label: "Randevu Al", icon: Calendar, color: "crimson" },
            { href: "/ogrenci/gelisim", label: "Gelişimim", icon: TrendingUp, color: "gold" },
            { href: "/ogrenci/antrenman", label: "AI Antrenman", icon: BookOpen, color: "crimson" },
            { href: "/ogrenci/bildirimler", label: "Bildirimler", icon: Bell, color: "gold" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <motion.div whileHover={{ y: -2 }} className={`p-4 bg-carbon border ${color === "crimson" ? "border-crimson/10 hover:border-crimson/30" : "border-gold/10 hover:border-gold/30"} text-center transition-all duration-300 cursor-pointer`}>
                <Icon size={22} className={color === "crimson" ? "text-crimson mx-auto mb-2" : "text-gold mx-auto mb-2"} />
                <div className="text-xs text-white/60 tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</div>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
