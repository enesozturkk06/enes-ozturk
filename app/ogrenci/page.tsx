"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import {
  getStudentAppointments, getLessonRecords, getStudentNotifications,
  getPendingInvites, respondToInvite, cancelAppointment, createAdminNotification,
  checkPackageExpiryNotification, checkPackageWarningNotification,
  getStudentXPAdjustments, getStudentMissionCompletions, getKediMissions,
  getGyms, getStudentAvatar,
} from "@/lib/db";
import type { Appointment, LessonRecord, Notification, PendingInvite, XPAdjustment, KediMission, Gym, StudentAvatarConfig } from "@/lib/types";
import { Badge, ProgressBar } from "@/app/components/ui";
import { PACKAGES, CANCEL_LIMIT_HOURS } from "@/lib/constants";
import { computeFullXP, getCurrentSeason, sumManualXP, getDaysUntilSeasonEnd } from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import { computeStudentMissions, getWeekKey, type MissionComputeInput } from "@/lib/kediTasks";
import {
  getHealthProfile, getWeightLogs, getCalorieLogs, getWaterLog,
  calcBMI, bmiCategory, todayDate,
  type HealthProfile, type WeightEntry, type CalorieEntry,
} from "@/lib/health";
import { getDietPlan, type DietPlan } from "@/lib/diet";
import DashboardHeader from "@/app/components/dashboard/DashboardHeader";
import NextLessonCard from "@/app/components/dashboard/NextLessonCard";
import PackageSummaryCard from "@/app/components/dashboard/PackageSummaryCard";
import TodayMetricsCard from "@/app/components/dashboard/TodayMetricsCard";
import KediInsightCard from "@/app/components/dashboard/KediInsightCard";
import LevelProgressCard from "@/app/components/dashboard/LevelProgressCard";
import BadgeShowcase from "@/app/components/dashboard/BadgeShowcase";
import DailyMissionsCard from "@/app/components/dashboard/DailyMissionsCard";
import ActivityTimeline, { type TimelineItem } from "@/app/components/dashboard/ActivityTimeline";
import { GOLD_BRIGHT, GOLD_BORDER_SOFT, GOLD_BG_SOFT } from "@/app/components/dashboard/theme";
import {
  Calendar, TrendingUp, CheckCircle, XCircle, Users,
  Activity, Utensils, Swords, BarChart3,
} from "lucide-react";
import Link from "next/link";
import ActivityFeed from "@/app/components/shared/ActivityFeed";
import PushNotificationButton from "@/app/components/shared/PushNotificationButton";
import SportDecor from "@/app/components/shared/SportDecor";
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

/** Bu sayfaya özel premium gold kart wrapper'ı — ikincil detay bölümleri
 *  (Diyet/Son Ders Notu) için, paylaşılan app/components/ui Card'ın yerine. */
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`card-gold relative rounded-2xl overflow-hidden w-full ${className}`}>
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
  const [avatarConfig, setAvatarConfig]   = useState<StudentAvatarConfig | null>(null);
  const [loading, setLoading]             = useState(true);
  // ── Pahalı, saf hesaplamalar — Guard'dan (aşağıdaki "if (!student ||
  // loading) return") ÖNCE, hook kuralları gereği. useMemo sayesinde SADECE
  // gerçek girdileri (appointments/records/xpAdjustments/vb.) değiştiğinde
  // yeniden hesaplanır — inviteLoading/cancelTarget gibi ilgisiz state
  // değişimlerinde (modal aç/kapa, davet yanıtlama) TEKRAR ÇALIŞMAZ.
  const shadowFan = typeof window !== "undefined"
    && (localStorage.getItem("kedi_ai_used") === "1" || localStorage.getItem("kara_ai_used") === "1");

  const xpSummary = useMemo(
    () => student ? computeFullXP(student.completedLessons, appointments, records, getCurrentSeason(), xpAdjustments) : null,
    [student, appointments, records, xpAdjustments],
  );
  const manualXP = useMemo(() => sumManualXP(xpAdjustments), [xpAdjustments]);
  const badges = useMemo(
    () => student ? computeBadges(student, appointments, records, { "shadow-fan": shadowFan }, manualXP) : [],
    [student, appointments, records, shadowFan, manualXP],
  );
  const missions = useMemo(() => {
    if (!student || !xpSummary) return [];
    const missionInput: MissionComputeInput = {
      appointments, records,
      totalXP: xpSummary.lifetimeResult.breakdown.total,
      lastTrainingPlan: loadAIPlan("training"),
      lastNutritionPlan: loadAIPlan("nutrition"),
    };
    return computeStudentMissions(missionInput, missionCompletions, getWeekKey(), customMissions);
  }, [student, appointments, records, xpSummary, missionCompletions, customMissions]);
  const timelineItems: TimelineItem[] = useMemo(() => [
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
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8), [records, notifications, xpAdjustments]);

  const [inviteLoading, setInviteLoading] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget]   = useState<Appointment | null>(null);
  const [cancelBusy, setCancelBusy]       = useState(false);
  const [cancelBlocked, setCancelBlocked] = useState<Appointment | null>(null); // 18h engel modal
  const [isAndroid] = useState(isAndroidDevice); // Hızlı Erişim Android'de scroll glitch'ine sebep oluyor — Android'de tamamen kaldırılıyor. SSR'da false, client'ta lazy init ile doğru değer (isAndroidDevice zaten SSR-safe).

  const reload = async () => {
    if (!student) return;
    await checkPackageExpiryNotification(student).catch(() => {});
    await checkPackageWarningNotification(student).catch(() => {});
    const today = todayDate();
    const [apts, recs, notifs, invites, xpAdjs, completions, missions, healthProf, wLogs, cLogs, wLog, diet, gymList, avatarCfg] = await Promise.all([
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
      getStudentAvatar(student.id).catch(() => null),
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
    setAvatarConfig(avatarCfg);
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
  const packageLabel = student.subscriptionType === "monthly" ? "Aylık Üyelik" : `${pkg?.name ?? ""} Paketi`;

  // xpSummary/badges/missions/timelineItems artık yukarıda (guard'dan ÖNCE)
  // useMemo ile hesaplanıyor — burada sadece okunuyor. `student` bu satırdan
  // sonra garantili non-null olduğu için xpSummary de garantili non-null
  // (useMemo'nun kendi guard'ı `student ? ... : null` şeklindeydi).
  const lifetimeXP = xpSummary!.lifetimeResult;
  const seasonXP = xpSummary!.seasonResult.breakdown.total;
  const seasonDaysLeft = getDaysUntilSeasonEnd(xpSummary!.season);

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
    <motion.div variants={stagger} initial="initial" animate="animate" className="relative max-w-3xl mx-auto space-y-4">
      <SportDecor />

      {/* 1. Kompakt premium header — logo + karşılama + bildirim + profil */}
      <motion.div variants={fadeUp}>
        <DashboardHeader
          firstName={student.fullName.split(" ")[0]}
          fullName={student.fullName}
          photoUrl={student.avatarUrl}
          level={lifetimeXP.level.current}
          unreadCount={unreadNotifs}
        />
      </motion.div>

      {/* Bekleyen Düet Davetleri — aksiyon gerektirir, header'ın hemen altında kalır */}
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

      {/* 2. Sıradaki Dersin — ana aksiyon kartı */}
      <motion.div variants={fadeUp}>
        <NextLessonCard nextAppointment={nextAppointment} nextGym={nextGym} minutesLeft={nextAptMinutesLeft} onCancelClick={handleCancelClick} />
      </motion.div>

      {/* 3. Kompakt paket kartı */}
      <motion.div variants={fadeUp} id="paket-kartı">
        <PackageSummaryCard student={student} packageLabel={packageLabel} totalLessons={totalLessons} />
      </motion.div>

      {/* 4. Bugün — Su/Kalori/Kilo/BMI */}
      <motion.div variants={fadeUp}>
        <TodayMetricsCard
          waterGlasses={waterGlasses}
          calories={todayCalEntry ? todayCalEntry.consumed : null}
          weightKg={lastWeight ? lastWeight.weight : null}
          bmi={bmi}
          bmiLabel={bmiCat?.label}
        />
      </motion.div>

      {/* 5. Kompakt Kedi AI önerisi */}
      <motion.div variants={fadeUp}>
        <KediInsightCard tip={heroAiTip} />
      </motion.div>

      {/* 6. Kompakt Seviye / XP */}
      <motion.div variants={fadeUp}>
        <LevelProgressCard xpResult={lifetimeXP} seasonXP={seasonXP} seasonDaysLeft={seasonDaysLeft} streak={lifetimeXP.currentStreak} hasAvatarConfig={!!avatarConfig} />
      </motion.div>

      {/* 7. Son aktiviteler — son 3 + Tümü */}
      <motion.div variants={fadeUp}>
        <ActivityTimeline items={timelineItems} limit={3} allHref="/ogrenci/gelisim" />
      </motion.div>

      {/* 8. Günlük görevler özeti + Tümü */}
      <motion.div variants={fadeUp}>
        <DailyMissionsCard missions={missions} limit={3} />
      </motion.div>

      {/* 9. Rozet vitrini özeti + Tümü */}
      <motion.div variants={fadeUp}>
        <BadgeShowcase badges={badges} limit={3} />
      </motion.div>

      {/* Push bildirim izni + Canlı aktivite akışı */}
      <motion.div variants={fadeUp}>
        <PushNotificationButton role="student" studentId={student.id} />
      </motion.div>
      <motion.div variants={fadeUp}>
        <ActivityFeed />
      </motion.div>

      {/* ══ İKİNCİL DETAYLAR — AI Diyet / Son Ders Notu.
          Kullanıcı hiyerarşisinde ayrıca adlandırılmadı ama "mevcut özellikleri
          koru" kuralı gereği burada, ana hiyerarşinin ALTINDA, ikincil
          ağırlıkta duruyor — veri/mantık aynı, sadece görsel öncelik düştü. ══ */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>AI Diyet Özeti</h3>
            <Link href="/ogrenci/saglik?tab=ai-diyet" className="text-xs tracking-wider transition-colors" style={{ color: GOLD_BRIGHT, fontFamily:"var(--font-label)" }}>Detaya git →</Link>
          </div>
          {!dietPlan ? (
            <div className="text-center py-6">
              <Utensils size={28} className="text-white/10 mx-auto mb-3" />
              <p className="text-sm mb-3" style={{ color:"rgba(255,255,255,0.50)", fontFamily:"var(--font-label)" }}>
                Henüz bir AI diyet planınız yok
              </p>
              <Link href="/ogrenci/saglik?tab=ai-diyet"
                className="inline-block text-xs tracking-wider transition-colors"
                style={{ color: GOLD_BRIGHT, fontFamily:"var(--font-label)" }}>+ Plan Oluştur</Link>
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

      {/* Son ders notu */}
      <motion.div variants={fadeUp}>
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-white tracking-wider"
              style={{ fontFamily:"var(--font-display)" }}>Son Ders Notu</h3>
            <Link href="/ogrenci/gelisim"
              className="text-xs tracking-wider transition-colors"
              style={{ color: GOLD_BRIGHT, fontFamily:"var(--font-label)" }}>Geçmiş →</Link>
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
              <div className="card-gold p-4 text-center rounded-xl transition-transform duration-150 hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95">
                <div className="w-9 h-9 mx-auto mb-2 rounded-lg flex items-center justify-center"
                  style={{ background: GOLD_BG_SOFT, border: `1px solid ${GOLD_BORDER_SOFT}`, color }}>
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
