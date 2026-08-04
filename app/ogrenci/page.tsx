"use client";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentNotifications,
  getPendingInvites, respondToInvite, cancelAppointment, createAdminNotification,
  checkPackageExpiryNotification, checkPackageWarningNotification,
  getStudentXPAdjustments, getStudentMissionCompletions, getKediMissions,
  getGyms,
} from "@/lib/db";
import type { Appointment, LessonRecord, Notification, PendingInvite, XPAdjustment, KediMission, StudentMission, Gym } from "@/lib/types";
import { Badge, ProgressBar } from "@/app/components/ui";
import { PACKAGES, STATUS_LABELS, PAYMENT_LABELS, CANCEL_LIMIT_HOURS, PACKAGE_EXPIRED_TEXT } from "@/lib/constants";
import { getDaysRemaining, getPackageUrgency } from "@/lib/packageDuration";
import { computeFullXP, getCurrentSeason, sumManualXP } from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import { computeStudentMissions, getWeekKey, type MissionComputeInput } from "@/lib/kediTasks";
import {
  getHealthProfile, getWeightLogs, getCalorieLogs, getWaterLog,
  calcBMI, bmiCategory, todayDate,
  type HealthProfile, type WeightEntry, type CalorieEntry,
} from "@/lib/health";
import { getDietPlan, type DietPlan } from "@/lib/diet";
import ProfileHeroCard from "@/app/components/dashboard/ProfileHeroCard";
import BadgeShowcase from "@/app/components/dashboard/BadgeShowcase";
import DailyMissionsCard from "@/app/components/dashboard/DailyMissionsCard";
import ActivityTimeline, { type TimelineItem } from "@/app/components/dashboard/ActivityTimeline";
import {
  Calendar, Clock, TrendingUp, Bell,
  CheckCircle, XCircle, ChevronRight, Users,
  Droplets, Flame, Scale, Activity, Utensils, Sparkles, Swords, BarChart3,
} from "lucide-react";
import Link from "next/link";
import ActivityFeed from "@/app/components/shared/ActivityFeed";
import PushNotificationButton from "@/app/components/shared/PushNotificationButton";
import { isAndroidDevice } from "@/lib/device";
import { format, parseISO, isFuture, isToday, differenceInHours, differenceInMinutes } from "date-fns";
import { tr } from "date-fns/locale";

/** Kedi AI'ın son önerdiği plan tarihi — BlackCatAI.tsx'teki loadAIPlan ile aynı
 *  localStorage anahtarlarını salt-okunur okur (görev motoru girdisi için). */
function loadAIPlan(kind: "training" | "nutrition"): { date: string; summary: string } | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(`kedi_ai_last_${kind}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.date === "string" && typeof parsed.summary === "string") return parsed;
  } catch { /* sessizce geç */ }
  return undefined;
}

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const fadeUp  = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" as const } } };

/** Bu sayfaya özel glass kart wrapper'ı — paylaşılan app/components/ui Card'ın
 *  yerine geçer (o component 16+ sayfada kullanılıyor, burada değiştirilmiyor). */
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`glass-strong relative rounded-2xl overflow-hidden w-full ${className}`}>
      {children}
    </div>
  );
}

export default function OgrenciDashboard() {
  const { student } = useAuth();
  const [appointments, setAppointments]   = useState<Appointment[]>([]);
  const [records, setRecords]             = useState<LessonRecord[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [xpAdjustments, setXpAdjustments] = useState<XPAdjustment[]>([]);
  const [missionCompletions, setMissionCompletions] = useState<Set<string>>(new Set());
  const [customMissions, setCustomMissions] = useState<KediMission[]>([]);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [weightLogs, setWeightLogs]       = useState<WeightEntry[]>([]);
  const [calorieLogs, setCalorieLogs]     = useState<CalorieEntry[]>([]);
  const [waterGlasses, setWaterGlasses]   = useState(0);
  const [dietPlan, setDietPlan]           = useState<DietPlan | null>(null);
  const [gyms, setGyms]                   = useState<Gym[]>([]);
  const [loading, setLoading]             = useState(true);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget]   = useState<Appointment | null>(null);
  const [cancelBusy, setCancelBusy]       = useState(false);
  const [cancelBlocked, setCancelBlocked] = useState<Appointment | null>(null); // 18h engel modal
  const [isAndroid, setIsAndroid] = useState(false); // Hızlı Erişim Android'de scroll glitch'ine sebep oluyor — Android'de tamamen kaldırılıyor

  const reload = async () => {
    if (!student) return;
    await checkPackageExpiryNotification(student).catch(() => {});
    await checkPackageWarningNotification(student).catch(() => {});
    const today = todayDate();
    const [apts, recs, notifs, invites, xpAdjs, completions, missions, healthProf, wLogs, cLogs, wLog, diet, gymList] = await Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getStudentNotifications(student.id),
      getPendingInvites(student.id),
      getStudentXPAdjustments(student.id).catch(() => []),
      getStudentMissionCompletions(student.id).catch(() => new Set<string>()),
      getKediMissions(student.id).catch(() => []),
      getHealthProfile(student.id).catch(() => null),
      getWeightLogs(student.id, 30).catch(() => []),
      getCalorieLogs(student.id, 7).catch(() => []),
      getWaterLog(student.id, today).catch(() => null),
      getDietPlan(student.id).catch(() => null),
      getGyms().catch(() => []),
    ]);
    setAppointments(apts);
    setRecords(recs);
    setNotifications(notifs);
    setPendingInvites(invites);
    setXpAdjustments(xpAdjs);
    setMissionCompletions(completions);
    setCustomMissions(missions);
    setHealthProfile(healthProf);
    setWeightLogs(wLogs);
    setCalorieLogs(cLogs);
    setWaterGlasses(wLog?.glasses ?? 0);
    setDietPlan(diet);
    setGyms(gymList);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [student]); // eslint-disable-line
  useEffect(() => { setIsAndroid(isAndroidDevice()); }, []);

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
      // Premium engel modalı göster — veritabanında HİÇBİR şey değişmez
      setCancelBlocked(apt);
      // Admin'e sessizce bildir
      if (student) {
        createAdminNotification(
          `İptal isteği engellendi: ${student.fullName}`,
          `${student.fullName}, ${format(parseISO(apt.date), "dd MMM", { locale: tr })} ${apt.startTime} randevusunu iptal etmek istedi fakat ${CANCEL_LIMIT_HOURS} saat kuralı nedeniyle yapamadı.`,
          "warning",
          { appointmentId: apt.id },
        );
      }
      return; // cancelTarget ayarlanmaz → DB'ye hiç dokunulmaz
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
        <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "2px solid #8B5CF6", borderTopColor: "transparent" }} />
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
  const packageLabel = student.subscriptionType === "monthly" ? "Aylık Üyelik" : `${pkg?.name ?? ""} Paketi`;

  // ── XP / Rozet / Görev — salt-okunur türetilmiş değerler ──────────
  // Aynı formül BlackCatAI.tsx'te ve app/ogrenci/seviye|rozetler sayfalarında
  // kullanılıyor; burada SADECE görüntüleniyor, hiçbir XP/DB yazma işlemi yok.
  const season      = getCurrentSeason();
  const xpSummary   = computeFullXP(student.completedLessons, appointments, records, season, xpAdjustments);
  const lifetimeXP  = xpSummary.lifetimeResult;
  const manualXP    = sumManualXP(xpAdjustments);
  const extraFlags: Record<string, boolean> = {};
  if (typeof window !== "undefined") {
    extraFlags["shadow-fan"] = localStorage.getItem("kedi_ai_used") === "1" || localStorage.getItem("kara_ai_used") === "1";
  }
  const badges      = computeBadges(student, appointments, records, extraFlags, manualXP);
  const missionInput: MissionComputeInput = {
    appointments, records,
    totalXP:          lifetimeXP.breakdown.total,
    lastTrainingPlan: loadAIPlan("training"),
    lastNutritionPlan:loadAIPlan("nutrition"),
  };
  const missions: StudentMission[] = computeStudentMissions(missionInput, missionCompletions, getWeekKey(), customMissions);

  // ── Son Aktiviteler — ders notu + bildirim + pozitif XP kaydı birleşimi ──
  const timelineItems: TimelineItem[] = [
    ...records.map(r => ({
      id: `record-${r.id}`, type: "record" as const, date: r.createdAt,
      title: `Ders notu eklendi — Genel ${r.overall}/10`,
      subtitle: (() => { try { return format(parseISO(r.date), "dd MMMM yyyy", { locale: tr }); } catch { return undefined; } })(),
    })),
    ...notifications.map(n => ({
      id: `notif-${n.id}`, type: "notification" as const, date: n.createdAt,
      title: n.title, subtitle: n.message,
    })),
    ...xpAdjustments.filter(x => x.amount > 0).map(x => ({
      id: `xp-${x.id}`, type: "xp" as const, date: x.createdAt,
      title: `+${x.amount} XP — ${x.reason}`, subtitle: x.note || undefined,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

  // ── Yaklaşan Randevu (tekil) — salt-okunur türetilmiş değerler ──────
  const nextAppointment = upcoming[0] ?? null;
  const nextGym = nextAppointment && student.gymId ? gyms.find(g => g.id === student.gymId) ?? null : null;
  const nextAptMinutesLeft = nextAppointment
    ? differenceInMinutes(parseISO(`${nextAppointment.date}T${nextAppointment.startTime}`), new Date())
    : null;

  // ── Günün Özeti — Sağlık sayfasındaki gerçek verilerle birebir aynı hesap ──
  const bmi        = healthProfile ? calcBMI(healthProfile.weight, healthProfile.height) : null;
  const bmiCat      = bmi ? bmiCategory(bmi) : null;
  const lastWeight  = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
  const todayCalEntry = calorieLogs.find(c => c.date === todayDate());

  // ── Kedi AI — bugünkü öneriler, tamamı zaten yüklenmiş gerçek verilerden
  //     türetilir (yeni bir hesaplama/DB yazma işlemi yok, sadece görüntüleme
  //     amaçlı basit koşullu metinler — Admin Dashboard'daki AiInsight kalıbıyla
  //     aynı ruhta, salt-okunur). ────────────────────────────────────────
  const todayApt = upcoming.find(a => isToday(parseISO(a.date))) ?? null;
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklyCompletedCount = records.filter(r => { try { return parseISO(r.date) >= weekAgo; } catch { return false; } }).length;
  const waterGoal = 8;
  const waterRemaining = Math.max(0, waterGoal - waterGlasses);
  const kediSuggestions: string[] = [];
  if (waterRemaining > 0) kediSuggestions.push(`${waterRemaining} bardak daha su iç.`);
  if (todayApt) {
    const hour = parseInt(todayApt.startTime.split(":")[0], 10);
    kediSuggestions.push(hour >= 17 ? `Bu akşam ${todayApt.startTime}'te dersin var.` : `Bugün ${todayApt.startTime}'te dersin var.`);
  }
  if (weeklyCompletedCount > 0) kediSuggestions.push(`Bu hafta ${weeklyCompletedCount} ders tamamladın.`);
  if (kediSuggestions.length === 0) kediSuggestions.push("Bugün harika gidiyorsun, devam et! 💪");
  const heroAiTip = kediSuggestions[0];

  return (
    <>
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-6xl mx-auto space-y-5 pb-28">

      {/* Hero + Profil Kartı + XP Bar + bugünkü tarih + Kedi AI mini tavsiye */}
      <motion.div variants={fadeUp}>
        <ProfileHeroCard
          student={student} xpResult={lifetimeXP} packageLabel={packageLabel}
          dateLabel={format(new Date(), "dd MMMM yyyy, EEEE", { locale: tr })}
          aiTip={heroAiTip}
        />
      </motion.div>

      {/* Bekleyen Düet Davetleri */}
      {pendingInvites.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/8">
              <Users size={15} style={{ color:"#8B5CF6" }} />
              <span className="text-sm font-semibold" style={{ color:"#8B5CF6", fontFamily:"var(--font-label)" }}>
                Bekleyen Düet Davetleri ({pendingInvites.length})
              </span>
            </div>
            {pendingInvites.map(inv => (
              <div key={inv.appointmentStudentId}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-white/6">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white mb-0.5" style={{ fontFamily:"var(--font-label)" }}>
                    <span style={{ color:"#A855F7" }}>{inv.creatorName}</span>
                    {" "}düet ders davet etti
                  </div>
                  <div className="text-xs" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>
                    {format(parseISO(inv.date), "dd MMMM yyyy (EEEE)", { locale: tr })} · {inv.startTime} – {inv.endTime}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleInviteResponse(inv, true)}
                    disabled={inviteLoading === inv.appointmentStudentId}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl disabled:opacity-50 transition-all"
                    style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", color:"#22c55e", fontFamily:"var(--font-label)" }}>
                    <CheckCircle size={13}/>
                    {inviteLoading === inv.appointmentStudentId ? "..." : "Onayla"}
                  </button>
                  <button onClick={() => handleInviteResponse(inv, false)}
                    disabled={inviteLoading === inv.appointmentStudentId}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl disabled:opacity-50 transition-all"
                    style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", color:"#ef4444", fontFamily:"var(--font-label)" }}>
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
            className="glass flex items-center justify-between p-4 rounded-xl transition-all"
            style={{ borderColor:"rgba(251,146,60,0.25)" }}>
            <div className="flex items-center gap-3">
              <Bell size={16} style={{ color: "var(--color-warning)" }} />
              <span className="text-sm text-white/70" style={{ fontFamily:"var(--font-label)" }}>
                {unreadNotifs} okunmamış bildiriminiz var
              </span>
            </div>
            <ChevronRight size={16} style={{ color: "var(--color-warning)", opacity: 0.5 }} />
          </Link>
        </motion.div>
      )}

      {/* ══ DERS PAKETİ — en önemli kart, Hero'nun hemen altında ══ */}
      <motion.div variants={fadeUp} id="paket-kartı">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
            <div className="min-w-0">
              <h3 className="text-lg text-white tracking-wider"
                style={{ fontFamily:"var(--font-display)" }}>
                {student.subscriptionType === "monthly" ? "Aylık Üyelik" : `${pkg?.name} Paketi`}
              </h3>
              <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                {student.subscriptionType === "monthly"
                  ? `${student.monthlyFee ? `₺${student.monthlyFee.toLocaleString("tr-TR")} / ay` : "Aylık ödeme"}`
                  : `${totalLessons} ders paketi`}
              </p>
            </div>
            <Badge color={student.paymentStatus === "odendi" ? "green" : student.paymentStatus === "kismi" ? "gold" : "red"}>
              {PAYMENT_LABELS[student.paymentStatus]}
            </Badge>
          </div>
          {student.subscriptionType === "monthly" ? (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm" style={{ color:"rgba(255,255,255,0.72)", fontFamily:"var(--font-label)" }}>
                Bu ay tamamlanan ders
              </span>
              <span className="text-2xl font-bold" style={{ color:"#8B5CF6", fontFamily:"var(--font-display)" }}>
                {student.completedLessons}
              </span>
            </div>
          ) : (
            <>
              <ProgressBar value={student.completedLessons} max={totalLessons} color="red"
                label={`${student.completedLessons} / ${totalLessons} ders`} />
              {/* Kullanılan / Kalan ders özeti */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-xl font-bold" style={{ color:"#fff", fontFamily:"var(--font-display)" }}>{student.completedLessons}</div>
                  <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>Kullanılan Ders</div>
                </div>
                <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                  <div className="text-xl font-bold" style={{ color:"var(--color-error)", fontFamily:"var(--font-display)" }}>{student.remainingLessons}</div>
                  <div className="text-[10px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>Kalan Ders</div>
                </div>
              </div>
              <div className="mt-2 text-right text-xs" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>{progressPct}% tamamlandı</div>
            </>
          )}

          {/* Paket süresi + son kullanım tarihi */}
          {(() => {
            const daysRemaining = getDaysRemaining(student.packageEndDate);
            if (daysRemaining === null) return null;
            const urgency = getPackageUrgency(daysRemaining);
            return (
              <div className="mt-4 pt-4 border-t border-white/8">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs tracking-widest uppercase" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                    Paket Süresi
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${urgency.color}`}
                    style={{ background: urgency.bg, border: `1px solid ${urgency.border}`, fontFamily:"var(--font-label)" }}>
                    {daysRemaining < 0 ? "Süresi Doldu" : `${daysRemaining} gün kaldı`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                  <span>Başlangıç: {student.packageStartDate ? format(parseISO(student.packageStartDate), "dd MMM yyyy", { locale: tr }) : "—"}</span>
                  <span>Bitiş: {student.packageEndDate ? format(parseISO(student.packageEndDate), "dd MMM yyyy", { locale: tr }) : "—"}</span>
                </div>
                {lastRecord && (
                  <div className="text-xs mt-1" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                    Son kullanım: {format(parseISO(lastRecord.date), "dd MMMM yyyy", { locale: tr })}
                  </div>
                )}
                {daysRemaining < 0 && (
                  <p className="text-xs mt-2" style={{ color:"var(--color-error)", fontFamily:"var(--font-label)" }}>
                    {PACKAGE_EXPIRED_TEXT}
                  </p>
                )}
              </div>
            );
          })()}
        </Card>
      </motion.div>

      {/* ══ YAKLAŞAN RANDEVU — bir sonraki ders (tekil) ══ */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>Yaklaşan Randevu</h3>
            <Link href="/ogrenci/randevu"
              className="text-xs text-gold/60 hover:text-gold tracking-wider transition-colors"
              style={{ fontFamily:"var(--font-label)" }}>Tümü →</Link>
          </div>
          {!nextAppointment ? (
            <div className="text-center py-8">
              <Calendar size={28} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                Yaklaşan randevunuz yok
              </p>
              <Link href="/ogrenci/randevu"
                className="mt-3 inline-block text-xs tracking-wider transition-colors"
                style={{ color: "var(--color-error)", fontFamily:"var(--font-label)" }}>+ Randevu Al</Link>
            </div>
          ) : (() => {
            const hoursLeft  = differenceInHours(parseISO(`${nextAppointment.date}T${nextAppointment.startTime}`), new Date());
            const canCancel  = hoursLeft >= CANCEL_LIMIT_HOURS;
            const remainingLabel = nextAptMinutesLeft !== null
              ? nextAptMinutesLeft < 60
                ? `${Math.max(0, nextAptMinutesLeft)} dakika kaldı`
                : nextAptMinutesLeft < 1440
                  ? `${Math.floor(nextAptMinutesLeft / 60)} saat kaldı`
                  : `${Math.floor(nextAptMinutesLeft / 1440)} gün kaldı`
              : null;
            return (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.2)" }}>
                  <span className="text-sm" style={{ color: "var(--color-error)", fontFamily:"var(--font-display)" }}>
                    {format(parseISO(nextAppointment.date), "dd")}
                  </span>
                  <span className="text-[9px]" style={{ color: "var(--color-error)", opacity: 0.7, fontFamily:"var(--font-display)" }}>
                    {format(parseISO(nextAppointment.date), "MMM", { locale: tr }).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-white" style={{ fontFamily:"var(--font-label)" }}>
                      {format(parseISO(nextAppointment.date), "EEEE", { locale: tr })}
                    </span>
                    {nextAppointment.lessonType !== "bireysel" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{ background:"rgba(139,92,246,0.15)", color:"#A855F7", fontFamily:"var(--font-label)" }}>
                        {nextAppointment.lessonType === "duet" ? "Düet" : "Grup"}
                      </span>
                    )}
                    {remainingLabel && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background:"rgba(245,158,11,0.12)", color:"var(--color-achievement)", fontFamily:"var(--font-label)" }}>
                        {remainingLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color:"rgba(255,255,255,0.50)" }}>
                    <Clock size={11}/>
                    <span style={{ fontFamily:"var(--font-label)" }}>{nextAppointment.startTime} – {nextAppointment.endTime}</span>
                    {nextGym && <span style={{ fontFamily:"var(--font-label)" }}>· {nextGym.name}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <Badge color="green">{STATUS_LABELS[nextAppointment.status]}</Badge>
                  <Link href="/ogrenci/randevu" className="text-[10px] transition-colors" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>
                    Randevu Detayı →
                  </Link>
                  <button
                    onClick={() => handleCancelClick(nextAppointment)}
                    className="text-[10px] transition-colors"
                    style={{ color: canCancel ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.15)", fontFamily:"var(--font-label)", cursor: canCancel ? "pointer" : "default" }}
                    title={canCancel ? "Randevuyu iptal et" : `${CANCEL_LIMIT_HOURS} saatten az kaldı`}
                  >
                    {canCancel ? "İptal et" : "⏱ İptal edilemez"}
                  </button>
                </div>
              </div>
            );
          })()}
        </Card>
      </motion.div>

      {/* ══ GÜNÜN ÖZETİ — Sağlık sayfasındaki gerçek verilerle 4 mini kart ══ */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>Günün Özeti</h3>
            <Link href="/ogrenci/saglik" className="text-xs text-gold/60 hover:text-gold tracking-wider transition-colors" style={{ fontFamily:"var(--font-label)" }}>Sağlık →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <Droplets size={16} className="mx-auto mb-1" style={{ color:"#60A5FA" }} />
              <div className="text-lg font-bold" style={{ color:"#fff", fontFamily:"var(--font-display)" }}>{waterGlasses}/8</div>
              <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>Bugünkü Su</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <Flame size={16} className="mx-auto mb-1" style={{ color:"var(--color-achievement)" }} />
              <div className="text-lg font-bold" style={{ color:"#fff", fontFamily:"var(--font-display)" }}>{todayCalEntry ? todayCalEntry.consumed : "—"}</div>
              <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>Bugünkü Kalori</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <Scale size={16} className="mx-auto mb-1" style={{ color:"var(--color-success)" }} />
              <div className="text-lg font-bold" style={{ color:"#fff", fontFamily:"var(--font-display)" }}>{lastWeight ? `${lastWeight.weight}kg` : "—"}</div>
              <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>Son Kilo</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <Activity size={16} className="mx-auto mb-1" style={{ color:"#A78BFA" }} />
              <div className="text-lg font-bold" style={{ color:"#fff", fontFamily:"var(--font-display)" }}>{bmi ? bmi.toFixed(1) : "—"}</div>
              <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                BMI{bmiCat ? ` · ${bmiCat.label}` : ""}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ══ AI DİYET ÖZETİ ══ */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>AI Diyet Özeti</h3>
            <Link href="/ogrenci/saglik?tab=ai-diyet" className="text-xs text-gold/60 hover:text-gold tracking-wider transition-colors" style={{ fontFamily:"var(--font-label)" }}>Detaya git →</Link>
          </div>
          {!dietPlan ? (
            <div className="text-center py-6">
              <Utensils size={28} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm mb-3" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                Henüz bir AI diyet planınız yok
              </p>
              <Link href="/ogrenci/saglik?tab=ai-diyet"
                className="inline-block text-xs tracking-wider transition-colors"
                style={{ color: "#8B5CF6", fontFamily:"var(--font-label)" }}>+ Plan Oluştur</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-lg font-bold" style={{ color:"var(--color-achievement)", fontFamily:"var(--font-display)" }}>{dietPlan.dailyCalories}</div>
                <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>Kalori Hedefi</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-lg font-bold" style={{ color:"#F87171", fontFamily:"var(--font-display)" }}>{dietPlan.proteinG}g</div>
                <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>Protein</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-lg font-bold" style={{ color:"#FBBF24", fontFamily:"var(--font-display)" }}>{dietPlan.carbsG}g / {dietPlan.fatG}g</div>
                <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>Karb / Yağ</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-lg font-bold" style={{ color:"#60A5FA", fontFamily:"var(--font-display)" }}>{waterGlasses}/8</div>
                <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>Su Hedefi</div>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* ══ KEDİ AI — bugünkü öneriler ══ */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🐾</span>
            <h3 className="text-lg text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>Kedi AI</h3>
          </div>
          <div className="space-y-2">
            {kediSuggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                <Sparkles size={14} className="flex-shrink-0" style={{ color:"#8B5CF6" }} />
                <span className="text-sm" style={{ color:"rgba(255,255,255,0.72)", fontFamily:"var(--font-label)" }}>{s}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ══ GÖREVLER — Rozet Vitrini + Günlük/Haftalık Görevler ══ */}
      <div className="grid lg:grid-cols-2 gap-5">
        <motion.div variants={fadeUp}>
          <BadgeShowcase badges={badges} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <DailyMissionsCard missions={missions} />
        </motion.div>
      </div>

      {/* Son ders notu */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-white tracking-wider"
              style={{ fontFamily:"var(--font-display)" }}>Son Ders Notu</h3>
            <Link href="/ogrenci/gelisim"
              className="text-xs text-gold/60 hover:text-gold tracking-wider transition-colors"
              style={{ fontFamily:"var(--font-label)" }}>Geçmiş →</Link>
          </div>
          {!lastRecord ? (
            <div className="text-center py-8">
              <TrendingUp size={28} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                Henüz ders kaydınız yok
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/8">
                <span className="text-sm" style={{ color:"rgba(255,255,255,0.72)", fontFamily:"var(--font-label)" }}>
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
                  <p className="text-xs leading-relaxed" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                    {lastRecord.trainerNotes}
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* ══ SON AKTİVİTE ══ */}
      <motion.div variants={fadeUp}>
        <ActivityTimeline items={timelineItems} />
      </motion.div>

      {/* Push bildirim izni + Canlı aktivite akışı — ikincil, sayfanın altında */}
      <motion.div variants={fadeUp}>
        <PushNotificationButton role="student" studentId={student.id} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <ActivityFeed />
      </motion.div>

      {/* Hızlı erişim — Android'de scroll glitch'ine sebep oluyor, CSS düzeltmesi
          yetersiz kaldığı için Android'de tamamen kaldırıldı. iOS ve masaüstünde
          aynen görünüyor. */}
      {!isAndroid && (
      <motion.div variants={fadeUp}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { href:"/ogrenci/randevu",        label:"Randevu Al",   icon:<Calendar size={20}/>,   color:"var(--color-error)" },
            { href:"/ogrenci/saglik",         label:"Sağlık",       icon:<Activity size={20}/>,   color:"#60A5FA" },
            { href:"/ogrenci/saglik?tab=ai-diyet", label:"AI Diyet", icon:<Utensils size={20}/>,  color:"var(--color-achievement)" },
            { href:"/ogrenci/fight-card",      label:"Fight Card",  icon:<Swords size={20}/>,     color:"#A78BFA" },
            { href:"/ogrenci/rapor",           label:"Rapor",       icon:<BarChart3 size={20}/>,  color:"var(--color-success)" },
          ].map(({ href, label, icon, color }) => (
            <Link key={href} href={href}>
              {/*
                Android Chrome'da bu kartlarin whileHover/whileTap (Framer
                Motion gesture transform) kullanimi, dokunma ile kaydirma
                ayni anda basladiginda transform'un "sikisip" kalmasina ve
                kartlarin ust uste binmis gibi gorunmesine sebep oluyordu
                (iOS'ta gorulmuyordu). Saf CSS hover/active gecisine
                cevrildi - ayni gorsel his, dokunma/scroll catismasi yok.
              */}
              <div className="glass p-4 text-center rounded-xl transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95">
                <div className="mx-auto mb-2" style={{ display:"flex", justifyContent:"center", color }}>
                  {icon}
                </div>
                <div className="text-xs tracking-wider" style={{ color:"rgba(255,255,255,0.72)", fontFamily:"var(--font-label)" }}>{label}</div>
              </div>
            </Link>
          ))}
        </div>
      </motion.div>
      )}
    </motion.div>

    {/* ══ Randevu İptal Onay Modalı ══ */}

    {cancelTarget && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
        <div className="glass-strong relative w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ borderColor:"rgba(239,68,68,0.3)" }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background:"linear-gradient(90deg,transparent,var(--color-error),transparent)" }} />
          <div className="p-5">
            <h3 className="text-xl text-white mb-1" style={{ fontFamily:"var(--font-display)", letterSpacing:"0.08em" }}>
              RANDEVU İPTAL
            </h3>
            {/* Randevu özeti */}
            <div className="my-3 p-3 rounded-xl space-y-1"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>
                {format(parseISO(cancelTarget.date), "dd MMMM yyyy (EEEE)", { locale: tr })}
              </p>
              <p className="text-xs" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>
                {cancelTarget.startTime} – {cancelTarget.endTime}
                {cancelTarget.lessonType !== "bireysel" && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[9px]"
                    style={{ background:"rgba(139,92,246,0.15)", color:"#A855F7" }}>
                    {cancelTarget.lessonType === "duet" ? "Düet" : "Grup"}
                  </span>
                )}
              </p>
            </div>
            <p className="text-sm mb-1" style={{ color:"rgba(255,255,255,0.5)", fontFamily:"var(--font-label)" }}>
              Bu randevuyu iptal etmek istediğine emin misin?
            </p>
            {cancelTarget.lessonType === "duet" && (
              <p className="text-xs mb-3" style={{ color:"rgba(217,70,239,0.7)", fontFamily:"var(--font-label)" }}>
                ℹ️ Düet randevu — partnerin de panelinde iptal olarak görünecek.
              </p>
            )}
            <p className="text-xs mb-4" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
              İptal edilen randevudan ders düşülmez. Slot tekrar müsait hale gelir.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setCancelTarget(null)}
                className="py-3 rounded-xl text-xs font-semibold uppercase"
                style={{ border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>
                Vazgeç
              </button>
              <button onClick={handleCancelConfirm} disabled={cancelBusy}
                className="py-3 rounded-xl text-white text-xs font-semibold uppercase disabled:opacity-50"
                style={{ background:"var(--color-error)", fontFamily:"var(--font-label)" }}>
                {cancelBusy ? "İptal ediliyor..." : "İptal Et"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* ══ 18 SAAT ENGEL MODALI — premium, DB'ye dokunmaz ══════════ */}
    {cancelBlocked && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
        <div className="glass-strong w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ borderColor:"rgba(251,146,60,0.35)" }}>
          {/* Üst şerit */}
          <div className="h-0.5" style={{ background:"linear-gradient(90deg,transparent,var(--color-warning),transparent)" }} />
          <div className="p-5">
            {/* İkon + başlık */}
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

            {/* Randevu özeti */}
            <div className="mb-4 p-3 rounded-xl" style={{ background:"rgba(251,146,60,0.06)", border:"1px solid rgba(251,146,60,0.15)" }}>
              <p className="text-xs font-semibold text-white" style={{ fontFamily:"var(--font-label)" }}>
                {format(parseISO(cancelBlocked.date), "dd MMMM yyyy (EEEE)", { locale: tr })}
              </p>
              <p className="text-xs mt-0.5" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>
                {cancelBlocked.startTime} – {cancelBlocked.endTime}
              </p>
            </div>

            {/* Uyarı mesajı */}
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

            {/* Kapatma butonu */}
            <button onClick={() => setCancelBlocked(null)}
              className="w-full py-3 text-sm font-semibold tracking-widest uppercase transition-all"
              style={{ background:"rgba(251,146,60,0.15)", border:"1px solid rgba(251,146,60,0.3)", color:"var(--color-warning)", fontFamily:"var(--font-label)" }}>
              Anladım
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
