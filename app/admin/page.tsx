"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getAppointments, getIncompleteAppointments, getStudents, getAdminNotifications,
  completeAppointmentWithAttendance, getAppointmentStudents,
  bulkGetAppointmentStudents, createLessonRecord,
  markNotificationRead, markAllAdminNotificationsRead,
  adminCancelAppointment, getLessonRecords,
  getPendingGiftLessonRequests, approveGiftLessonRequest, rejectGiftLessonRequest,
  getGiftLessonRequestsForSeason, createGiftLessonRequest, getAllGiftLessonRequests,
  getAllXPAdjustments, createXPAdjustment, getStudentXPAdjustments, updateStudent,
  getKediMissions, createKediMission, deleteKediMission,
  getAppSetting, setAppSetting,
  getAllArenaDuels, adminResolveDuel, approveArenaDuel,
  getIncomeMovements,
} from "@/lib/db";
import { getSeasonLabel, computeFullXP, getLevelForXP, getCurrentSeason } from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import {
  computeTechnicalAverages, compute30DayImprovement, countEarnedBadges,
  type HallEntry,
} from "@/lib/hallOfFame";
import { HallOfFamePremium } from "@/app/components/shared/HallOfFame";
import PushNotificationButton from "@/app/components/shared/PushNotificationButton";
import type { Appointment, Student, Notification, AppointmentStudent, GiftLessonRequest, LessonRecord, XPAdjustment, KediMission, ArenaDuel } from "@/lib/types";
import { STATUS_LABELS, TRAINER_NAME } from "@/lib/constants";
import { Users, Calendar, TrendingUp, Bell, CheckCircle, XCircle, UserCheck, UserX, X, ChevronRight, Zap, Plus, Minus, History, Crown, Award, Sparkles, Swords, Wallet, CreditCard, BookOpen } from "lucide-react";
import { useToast } from "@/app/components/shared/Toast";
import AdminHeroCard from "@/app/components/admin-dashboard/AdminHeroCard";
import AdminStatCard from "@/app/components/admin-dashboard/AdminStatCard";

const XP_REASONS = [
  "Turnuva Katılımı", "Madalya Kazandı", "Örnek Davranış", "Arkadaş Getirdi",
  "Sosyal Medya Paylaşımı", "Özel Başarı", "Disiplin Cezası", "Manuel Düzeltme",
];
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";

const SCORE_KEYS = ["conditioning","punch","kick","defense","combination","sparring","overall"] as const;
const SCORE_TR: Record<string,string> = {
  conditioning:"Kondisyon", punch:"Yumruk", kick:"Tekme",
  defense:"Savunma", combination:"Kombinasyon", sparring:"Sparring", overall:"Genel",
};
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};
/* gradient-border-quiet taşıyan elemanlar için: opacity'yi CSS yönetir (0.22),
   Framer Motion sadece y/scale/filter animasyonu yapar. */
const fadeUpNoOpacity = {
  initial: { y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const today = format(new Date(), "yyyy-MM-dd");
  const [todayApts, setTodayApts]   = useState<Appointment[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [students, setStudents]     = useState<Student[]>([]);
  const [notifs, setNotifs]         = useState<Notification[]>([]);
  const [loading, setLoading]       = useState(true);
  const [aptStudents, setAptStudents] = useState<Record<string, AppointmentStudent[]>>({});

  /* Geçmiş tamamlanmamış dersler — admin aynı gün "Tamamla"ya basmadığı için unutulanlar */
  const [incompleteApts, setIncompleteApts] = useState<Appointment[]>([]);
  const [lessonFilter, setLessonFilter] = useState<"today" | "incomplete" | "completed">("today");

  /* Katılım modalı */
  const [attendModal, setAttendModal]     = useState<Appointment | null>(null);
  const [attendances, setAttendances]     = useState<Record<string, boolean>>({});
  const [attendSaving, setAttendSaving]   = useState(false);
  const [attendWarnings, setAttendWarnings] = useState<string[]>([]);

  /* Bildirim paneli */
  const [notifOpen, setNotifOpen]     = useState(false);
  const [loginToast, setLoginToast]   = useState<Notification | null>(null);

  /* Admin iptal modalı */
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy]     = useState(false);

  /* Hediye ders talepleri */
  const [giftRequests, setGiftRequests] = useState<GiftLessonRequest[]>([]);
  const [giftBusy, setGiftBusy]         = useState<string | null>(null);

  /* 🎁 Hediye Ders Onayları (tüm talepler, tüm durumlar) */
  const [allGiftRequests, setAllGiftRequests] = useState<GiftLessonRequest[]>([]);
  const [giftActionBusy, setGiftActionBusy]   = useState<string | null>(null);
  const [giftRejectModal, setGiftRejectModal] = useState<GiftLessonRequest | null>(null);
  const [giftRejectNote, setGiftRejectNote]   = useState("");
  const [giftRejectBusy, setGiftRejectBusy]   = useState(false);

  /* XP & Seviye Takibi */
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allRecords, setAllRecords]           = useState<LessonRecord[]>([]);
  const [seasonGifts, setSeasonGifts]         = useState<GiftLessonRequest[]>([]);
  const [xpFilter, setXpFilter]                = useState<"all"|"top"|"pendingGift"|"gold"|"diamond"|"legend">("all");

  /* Manuel XP Yönetimi */
  const [allAdjustments, setAllAdjustments] = useState<XPAdjustment[]>([]);
  const [xpAdjModal, setXpAdjModal]   = useState<{ student: Student; mode: "add" | "subtract" } | null>(null);
  const [xpAmount, setXpAmount]       = useState("");
  const [xpReason, setXpReason]       = useState(XP_REASONS[0]);
  const [xpNote, setXpNote]           = useState("");
  const [xpAdjBusy, setXpAdjBusy]     = useState(false);
  const [xpHistoryModal, setXpHistoryModal]   = useState<Student | null>(null);
  const [xpHistory, setXpHistory]             = useState<XPAdjustment[]>([]);
  const [xpHistoryLoading, setXpHistoryLoading] = useState(false);

  /* Ders notu modalı (tamamlama sonrası) */
  const [noteModal, setNoteModal] = useState<Appointment | null>(null);
  const [scores, setScores] = useState<Record<string,number>>({
    conditioning:7, punch:7, kick:7, defense:7, combination:7, sparring:7, overall:7,
  });
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving]     = useState(false);
  /* Düet ders notu: her öğrenci için ayrı puan + not */
  const [perStudentScores, setPerStudentScores] = useState<Record<string, Record<string, number>>>({});
  const [perStudentNotes,  setPerStudentNotes]  = useState<Record<string, string>>({});

  /* App Settings */
  const [activityFeedEnabled, setActivityFeedEnabled] = useState(true);
  const [feedToggleBusy, setFeedToggleBusy] = useState(false);

  /* Arena Düello Yönetimi */
  const [arenaduels, setArenaduels]             = useState<ArenaDuel[]>([]);
  const [arenaResolveBusy, setArenaResolveBusy] = useState<string | null>(null);
  const [arenaResolveModal, setArenaResolveModal] = useState<ArenaDuel | null>(null);
  const [arenaWinnerId, setArenaWinnerId]       = useState("");
  const [arenaRewardXP, setArenaRewardXP]       = useState("");

  /* Kedi AI Görevleri */
  const [kediMissions, setKediMissions]       = useState<KediMission[]>([]);
  const [missionTitle, setMissionTitle]       = useState("");
  const [missionIcon,  setMissionIcon]        = useState("🎯");
  const [missionXP,    setMissionXP]          = useState("100");
  const [missionTarget,setMissionTarget]      = useState("1");
  const [missionStudentId, setMissionStudentId] = useState("all");
  const [missionBusy,  setMissionBusy]        = useState(false);

  /* Push bildirimi — test gönderimi */
  const [testPushStudentId, setTestPushStudentId] = useState("");
  const [testPushBusy, setTestPushBusy]            = useState(false);
  const [testPushResult, setTestPushResult]        = useState<string | null>(null);

  const handleSendTestPush = async () => {
    if (!testPushStudentId) return;
    setTestPushBusy(true);
    setTestPushResult(null);
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: testPushStudentId,
          title: "Test Bildirimi 🔔",
          message: "Bu bir test push bildirimidir — Kedi AI sistemleri çalışıyor!",
          url: "/ogrenci/bildirimler",
        }),
      });
      const data = await res.json();
      setTestPushResult(res.ok ? `Gönderildi (${data.sent ?? 0} cihaz)` : `Hata: ${data.error ?? "bilinmiyor"}`);
    } catch (err) {
      setTestPushResult("Hata: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setTestPushBusy(false);
    }
  };

  /* ── Yükle ──────────────────────────────────────────────────── */
  const reloadApts = useCallback(async () => {
    const apts = await getAppointments({ date: today });
    // İptal edilenler "Bugünün Dersleri"nde görünmez
    const active = apts.filter(a => a.status !== "iptal");
    setTodayApts(active);
    // Tek bulk sorguda tüm appointment_students (N+1 yerine 2 sorgu)
    const map = await bulkGetAppointmentStudents(active.map(a => a.id));
    setAptStudents(prev => ({ ...prev, ...map }));
  }, [today]);

  /* Geçmiş tamamlanmamış dersleri yükle (tarih < bugün, status = onaylandi) */
  const reloadIncompleteApts = useCallback(async () => {
    const apts = await getIncompleteAppointments(today);
    setIncompleteApts(apts);
    const map = await bulkGetAppointmentStudents(apts.map(a => a.id));
    setAptStudents(prev => ({ ...prev, ...map }));
  }, [today]);

  useEffect(() => {
    const season = getCurrentSeason();
    Promise.all([
      reloadApts(), reloadIncompleteApts(), getStudents(), getAdminNotifications(),
      getPendingGiftLessonRequests().catch(() => []),
      getAppointments().catch(() => []),
      getLessonRecords().catch(() => []),
      getGiftLessonRequestsForSeason(season).catch(() => []),
      getAllXPAdjustments().catch(() => []),
      getAllGiftLessonRequests().catch(() => []),
      getIncomeMovements({ dateFrom: today, dateTo: today, status: "odendi" }).catch(() => []),
    ]).then(([, , s, n, gifts, apts, recs, seasonGiftReqs, adjustments, allGifts, todayIncome]) => {
      setStudents(s);
      setNotifs(n);
      setGiftRequests(gifts as GiftLessonRequest[]);
      setAllAppointments(apts as Appointment[]);
      setAllRecords(recs as LessonRecord[]);
      setSeasonGifts(seasonGiftReqs as GiftLessonRequest[]);
      setAllAdjustments(adjustments as XPAdjustment[]);
      setAllGiftRequests(allGifts as GiftLessonRequest[]);
      setTodayRevenue(todayIncome.reduce((sum, m) => sum + m.paymentAmount, 0));
      setLoading(false);
      getKediMissions().then(m => setKediMissions(m)).catch(() => {});
      getAllArenaDuels().then(d => setArenaduels(d)).catch(() => {});
      getAppSetting("activity_feed_enabled").then(v => {
        if (v !== null) setActivityFeedEnabled(v !== "false");
      }).catch(() => {});
      const unread = n.filter(x => !x.isRead);
      if (unread.length > 0) setLoginToast(unread[0]);
    });
  }, [reloadApts, reloadIncompleteApts]);

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
      await Promise.all([reloadApts(), reloadIncompleteApts()]);
      getAppointments().then(setAllAppointments).catch(() => {});

      /* Düet ders ise per-student score/note state'ini hazırla */
      const initDuet = (apt: Appointment) => {
        if (apt.lessonType !== "duet") return;
        const defaultS = { conditioning:7, punch:7, kick:7, defense:7, combination:7, sparring:7, overall:7 };
        const initS: Record<string, Record<string, number>> = {};
        const initN: Record<string, string> = {};
        (aptStudents[apt.id] ?? [])
          .filter(s => s.inviteStatus === "accepted")
          .forEach(s => { initS[s.studentId] = { ...defaultS }; initN[s.studentId] = ""; });
        setPerStudentScores(initS);
        setPerStudentNotes(initN);
      };

      if (result.warnings.length > 0) {
        setAttendWarnings(result.warnings);
        setTimeout(() => {
          initDuet(attendModal);
          setAttendModal(null);
          setNoteModal(attendModal);
        }, 2000);
      } else {
        initDuet(attendModal);
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
    try {
      const isDuet = noteModal.lessonType === "duet";
      const duetParticipants = isDuet
        ? (aptStudents[noteModal.id] ?? []).filter(s => s.inviteStatus === "accepted")
        : [];

      if (isDuet && duetParticipants.length > 0) {
        await Promise.all(duetParticipants.map(apSt => {
          const s = perStudentScores[apSt.studentId] ?? {};
          return createLessonRecord({
            appointmentId:   noteModal.id,
            studentId:       apSt.studentId,
            date:            noteModal.date,
            conditioning:    (s.conditioning  ?? 7),
            punch:           (s.punch         ?? 7),
            kick:            (s.kick          ?? 7),
            defense:         (s.defense       ?? 7),
            combination:     (s.combination   ?? 7),
            sparring:        (s.sparring      ?? 7),
            overall:         (s.overall       ?? 7),
            trainerNotes:    perStudentNotes[apSt.studentId] ?? "",
            durationMinutes: 60,
          });
        }));
      } else {
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
      }
      getLessonRecords().then(setAllRecords).catch(() => {});
    } finally {
      setSaving(false);
      setNoteModal(null);
      setNoteText("");
      setScores({ conditioning:7, punch:7, kick:7, defense:7, combination:7, sparring:7, overall:7 });
      setPerStudentScores({});
      setPerStudentNotes({});
    }
  };

  /* ── Admin iptal ─────────────────────────────────────────── */
  const handleAdminCancel = async () => {
    if (!cancelTarget) return;
    setCancelBusy(true);
    try {
      await adminCancelAppointment(cancelTarget.id, cancelReason.trim() || undefined);
      await reloadApts();
      setCancelTarget(null);
      setCancelReason("");
    } catch (err) {
      alert("Hata: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCancelBusy(false);
    }
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
  const lowLessons     = students
    .filter(s => s.isActive && s.subscriptionType !== "monthly" && s.remainingLessons <= 2)
    .sort((a, b) => a.remainingLessons - b.remainingLessons);
  const unreadNotifs   = notifs.filter(n => !n.isRead).length;

  const giftCounts = useMemo(() => ({
    pending: allGiftRequests.filter(r => r.status === "pending").length,
    approved: allGiftRequests.filter(r => r.status === "approved").length,
    rejected: allGiftRequests.filter(r => r.status === "rejected").length,
  }), [allGiftRequests]);

  /* ── XP & Seviye Takibi — öğrenci başına özet ─────────────── */
  const currentSeason = getCurrentSeason();
  const xpRows = useMemo(() => {
    if (students.length === 0) return [];
    return students.map(s => {
      const apts    = allAppointments.filter(a => a.studentId === s.id);
      const recs    = allRecords.filter(r => r.studentId === s.id);
      const adjs    = allAdjustments.filter(a => a.studentId === s.id);
      const summary = computeFullXP(s.completedLessons, apts, recs, currentSeason, adjs);
      const lifetimeXP = summary.lifetimeResult.breakdown.total;
      const seasonXP   = summary.seasonResult.breakdown.total;
      const level      = getLevelForXP(lifetimeXP);
      const badges     = computeBadges(s, apts, recs, {}, summary.lifetimeResult.breakdown.manualXP).filter(b => b.earned);
      const myGifts    = seasonGifts.filter(g => g.studentId === s.id);
      const giftEarned = myGifts.filter(g => g.status === "approved").length;
      const giftPending= myGifts.some(g => g.status === "pending");
      return { student: s, lifetimeXP, seasonXP, level, badges, giftEarned, giftPending, myGifts };
    }).sort((a, b) => b.lifetimeXP - a.lifetimeXP);
  }, [students, allAppointments, allRecords, allAdjustments, seasonGifts, currentSeason]);

  const filteredXpRows = xpRows.filter(row => {
    switch (xpFilter) {
      case "pendingGift": return row.giftPending;
      case "gold":        return row.level.current.id === "gold"   || row.lifetimeXP >= 5000;
      case "diamond":     return row.level.current.id === "diamond"|| row.lifetimeXP >= 10000;
      case "legend":      return row.level.current.id === "legend" || row.lifetimeXP >= 15000;
      default:            return true;
    }
  });
  const topXpRows = xpFilter === "top" ? filteredXpRows.slice(0, 10) : filteredXpRows;

  const XP_FILTERS: { key: typeof xpFilter; label: string }[] = [
    { key: "all",         label: "Tümü" },
    { key: "top",         label: "En Yüksek XP" },
    { key: "pendingGift", label: "Hediye Ders Bekleyen" },
    { key: "gold",        label: "🥇 Altın Sporcu" },
    { key: "diamond",     label: "💎 Elmas Sporcu" },
    { key: "legend",      label: "👑 Efsane Sporcu" },
  ];

  /* ── Onur Listesi (Hall of Fame) — canlı önizleme ─────────── */
  const hallEntries: HallEntry[] = useMemo(() => {
    return xpRows
      .filter(row => row.student.showInHallOfFame !== false)
      .map(row => {
        const { student: s, lifetimeXP, level, badges } = row;
        const recs = allRecords.filter(r => r.studentId === s.id);
        const sortedRecs = [...recs].sort((a, b) => b.date.localeCompare(a.date));
        const myGifts = seasonGifts.filter(g => g.studentId === s.id);
        const entry: HallEntry = {
          studentId:        s.id,
          name:             s.fullName,
          isMe:             false,
          xp:               lifetimeXP,
          level:            level.current,
          completedLessons: s.completedLessons,
          badgeCount:       badges.length,
          technical:        computeTechnicalAverages(sortedRecs),
          improvement:      compute30DayImprovement(sortedRecs),
          giftEligible:     myGifts.length > 0,
          giftClaimed:      myGifts.some(g => g.status === "approved"),
          featured:         s.hallFeatured ?? false,
          studentOfMonth:   s.isStudentOfMonth ?? false,
          avatarUrl:        s.avatarUrl,
          packageType:      s.packageType,
        };
        return entry;
      })
      .filter(e => e.xp > 0 || e.completedLessons > 0);
  }, [xpRows, allRecords, seasonGifts]);

  const [hallBusy, setHallBusy] = useState<string | null>(null);

  const toggleHallFeature = async (s: Student, key: "hallFeatured" | "isStudentOfMonth") => {
    setHallBusy(s.id + key);
    const next = !(s[key] ?? false);
    const ok = await updateStudent(s.id, { [key]: next }).then(() => true).catch(() => false);
    if (ok) {
      setStudents(prev => prev.map(st => st.id === s.id ? { ...st, [key]: next } : st));
      toast(
        key === "hallFeatured"
          ? (next ? `${s.fullName} Onur Listesi'nde öne çıkarıldı.` : `${s.fullName} için öne çıkarma kaldırıldı.`)
          : (next ? `${s.fullName} Ayın Sporcusu seçildi! 🌟` : `${s.fullName} için Ayın Sporcusu seçimi kaldırıldı.`),
        "success",
      );
    } else {
      toast("İşlem başarısız oldu, tekrar dene.", "error");
    }
    setHallBusy(null);
  };

  /* ── Kedi AI Görev işlemleri ─────────────────────────────── */

  const handleCreateMission = async () => {
    const title = missionTitle.trim();
    if (!title) return;
    setMissionBusy(true);
    const m = await createKediMission({
      title,
      icon:        missionIcon,
      xpReward:    parseInt(missionXP) || 100,
      targetValue: parseInt(missionTarget) || 1,
      studentId:   missionStudentId === "all" ? undefined : missionStudentId,
    }).catch(() => null);
    if (m) {
      setKediMissions(prev => [...prev, m]);
      setMissionTitle(""); setMissionIcon("🎯"); setMissionXP("100"); setMissionTarget("1"); setMissionStudentId("all");
    }
    setMissionBusy(false);
  };

  const handleDeleteMission = async (id: string) => {
    await deleteKediMission(id).catch(() => {});
    setKediMissions(prev => prev.filter(m => m.id !== id));
  };

  /* ── Manuel XP işlemleri ──────────────────────────────────── */
  const openXPAdjust = (student: Student, mode: "add" | "subtract") => {
    setXpAdjModal({ student, mode });
    setXpAmount("");
    setXpReason(XP_REASONS[0]);
    setXpNote("");
  };

  const openXPHistory = async (student: Student) => {
    setXpHistoryModal(student);
    setXpHistory([]);
    setXpHistoryLoading(true);
    const hist = await getStudentXPAdjustments(student.id).catch(() => []);
    setXpHistory(hist);
    setXpHistoryLoading(false);
  };

  const handleXPAdjustSave = async () => {
    if (!xpAdjModal) return;
    const raw = parseInt(xpAmount, 10);
    if (!raw || raw <= 0) {
      toast("Geçerli bir XP miktarı gir.", "error");
      return;
    }
    const { student, mode } = xpAdjModal;
    const signedAmount = mode === "add" ? raw : -raw;

    setXpAdjBusy(true);
    let result: { ok: boolean; error?: string };
    try {
      result = await createXPAdjustment(student.id, student.fullName, signedAmount, xpReason, xpNote.trim(), TRAINER_NAME, currentSeason);
    } catch (e: any) {
      result = { ok: false, error: e?.message ?? "Bilinmeyen hata" };
    }

    if (!result.ok) {
      console.error("[handleXPAdjustSave] kayıt başarısız:", result.error);
      toast(`XP kaydedilemedi: ${result.error ?? "Veritabanı hatası"}`, "error");
      setXpAdjBusy(false);
      return;
    }

    // Taze veriyi al — liste anında güncellensin
    const fresh = await getAllXPAdjustments().catch(() => allAdjustments);
    setAllAdjustments(fresh);

    // Eşik kontrolü (otomatik seviye/rozet/hediye ders kontrolü)
    if (signedAmount > 0) {
      const apts = allAppointments.filter(a => a.studentId === student.id);
      const recs = allRecords.filter(r => r.studentId === student.id);
      const myAdj = fresh.filter(a => a.studentId === student.id);
      const summary = computeFullXP(student.completedLessons, apts, recs, currentSeason, myAdj);
      const seasonTotal    = summary.seasonResult.breakdown.total;
      const lifetimeTotal  = summary.lifetimeResult.breakdown.total;
      if (seasonTotal >= 5000)  await createGiftLessonRequest(student.id, student.fullName, lifetimeTotal, currentSeason, 5000,  seasonTotal).catch(() => {});
      if (seasonTotal >= 10000) await createGiftLessonRequest(student.id, student.fullName, lifetimeTotal, currentSeason, 10000, seasonTotal).catch(() => {});

      const [pendingGifts, seasonGiftReqs, allGifts] = await Promise.all([
        getPendingGiftLessonRequests().catch(() => []),
        getGiftLessonRequestsForSeason(currentSeason).catch(() => []),
        getAllGiftLessonRequests().catch(() => []),
      ]);
      setGiftRequests(pendingGifts as GiftLessonRequest[]);
      setSeasonGifts(seasonGiftReqs as GiftLessonRequest[]);
      setAllGiftRequests(allGifts as GiftLessonRequest[]);
    }

    toast(mode === "add" ? "XP başarıyla eklendi." : "XP başarıyla düşüldü.", "success");
    setXpAdjBusy(false);
    setXpAdjModal(null);
    setXpAmount(""); setXpNote(""); setXpReason(XP_REASONS[0]);
  };

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <>
    <div className="relative overflow-hidden">
      {/* Dashboard arka planı — hafif hareketli ışık efekti, dekoratif, tıklanamaz */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="animate-float-slow absolute rounded-full"
          style={{ width: 420, height: 420, top: -140, right: -120, background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)", filter: "blur(60px)" }} />
        <div className="animate-float-medium absolute rounded-full"
          style={{ width: 360, height: 360, bottom: -100, left: -140, background: "radial-gradient(circle, rgba(236,72,153,0.06), transparent 70%)", filter: "blur(60px)" }} />
      </div>

    <motion.div variants={stagger} initial="initial" animate="animate" className="relative max-w-6xl mx-auto space-y-6">
      <motion.div variants={fadeUp}>
        <AdminHeroCard
          dateLabel={format(new Date(), "dd MMMM yyyy, EEEE", { locale: tr })}
          unreadCount={unreadNotifs}
          onOpenNotifications={() => setNotifOpen(true)}
        />
      </motion.div>

      {/* Stat kartları — tıklanabilir, animasyonlu, gradient border + hover glow */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <AdminStatCard
          label="Bugünkü Gelir" value={`₺${todayRevenue.toLocaleString("tr-TR")}`}
          sub="Ödenen tahsilat" color="gold" icon={<Wallet size={16}/>}
          pulse
          href="/admin/odemeler"
        />
        <AdminStatCard
          label="Bugünkü Ders" value={todayApts.length}
          sub={`${todayApts.filter(a=>a.status==="tamamlandi").length} tamamlandı`}
          color="red" icon={<Calendar size={16}/>}
          onClick={() => document.getElementById("bugunun-dersleri")?.scrollIntoView({ behavior:"smooth" })}
        />
        <AdminStatCard
          label="Aktif Öğrenci" value={active.length}
          sub="Tümünü görüntüle" color="violet" icon={<Users size={16}/>}
          href="/admin/ogrenciler"
        />
        <AdminStatCard
          label="Bekleyen Ödeme" value={pendingPayment.length}
          sub="Borçlu öğrenciler" color="green" icon={<TrendingUp size={16}/>}
          pulse
          href="/admin/odemeler"
        />
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bugünkü / Geçmiş Tamamlanmamış / Tamamlanan dersler */}
        <motion.div variants={fadeUpNoOpacity} className="lg:col-span-2 relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
          <div className="glass-strong relative rounded-2xl p-5 sm:p-6 h-full" id="bugunun-dersleri">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-xl text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                {lessonFilter === "today" ? "Bugünkü Dersler" : lessonFilter === "incomplete" ? "Geçmiş Tamamlanmamış Dersler" : "Tamamlanan Dersler"}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {([
                  { key: "today" as const,      label: "Bugünkü Dersler",  active: { bg:"rgba(220,38,38,0.15)", fg:"#f87171", bd:"rgba(220,38,38,0.35)" } },
                  { key: "incomplete" as const,  label: "Geçmiş Tamamlanmamış", active: { bg:"rgba(217,119,6,0.15)", fg:"#fbbf24", bd:"rgba(217,119,6,0.35)" } },
                  { key: "completed" as const,   label: "Tamamlanan Dersler", active: { bg:"rgba(34,197,94,0.15)", fg:"#4ade80", bd:"rgba(34,197,94,0.35)" } },
                ]).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setLessonFilter(tab.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all rounded-lg"
                    style={lessonFilter === tab.key
                      ? { background: tab.active.bg, color: tab.active.fg, border: `1px solid ${tab.active.bd}`, fontFamily:"var(--font-label)" }
                      : { background:"transparent", color:"rgba(255,255,255,0.35)", border:"1px solid rgba(255,255,255,0.08)", fontFamily:"var(--font-label)" }}
                  >
                    {tab.label}
                    {tab.key === "incomplete" && incompleteApts.length > 0 && (
                      <span className="inline-flex items-center justify-center text-[10px] w-4 h-4 rounded-full" style={{ background:"#dc2626", color:"#fff" }}>
                        {incompleteApts.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const list =
                lessonFilter === "today"      ? [...todayApts].sort((a,b)=>a.startTime.localeCompare(b.startTime)) :
                lessonFilter === "incomplete" ? incompleteApts :
                [...allAppointments]
                  .filter(a => a.status === "tamamlandi")
                  .sort((a,b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))
                  .slice(0, 50);

              if (list.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Calendar size={40} className="text-white/10 mx-auto mb-3"/>
                    <p className="text-white/30 text-sm" style={{ fontFamily:"var(--font-label)" }}>
                      {lessonFilter === "today" ? "Bugün ders yok"
                        : lessonFilter === "incomplete" ? "Tamamlanmamış geçmiş ders yok 🎉"
                        : "Henüz tamamlanan ders yok"}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {list.map(apt => (
                    <div key={apt.id} className="flex flex-wrap items-center gap-3 p-4 glass rounded-xl">
                      <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0"
                        style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)" }}>
                        <span className="text-sm" style={{ color:"#A78BFA", fontFamily:"var(--font-display)" }}>{apt.startTime}</span>
                      </div>
                      <div className="flex-1 min-w-0" style={{ minWidth: 120 }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>
                            {aptDisplayName(apt)}
                          </span>
                          {aptTypeLabel(apt) && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background:"rgba(139,92,246,0.15)", color:"#A855F7", fontFamily:"var(--font-label)", border:"1px solid rgba(139,92,246,0.25)" }}>
                              {aptTypeLabel(apt)}
                            </span>
                          )}
                          {lessonFilter !== "today" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.45)", fontFamily:"var(--font-label)" }}>
                              {apt.date.split("-").reverse().join(".")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-xs text-white/30" style={{ fontFamily:"var(--font-label)" }}>
                          <span>{apt.studentCode} · {apt.startTime}–{apt.endTime}</span>
                          {apt.lessonType === "duet" && (aptStudents[apt.id] ?? []).map(s => {
                            const color = s.inviteStatus === "accepted" ? "#22c55e" : s.inviteStatus === "declined" ? "#ef4444" : "#d97706";
                            const label = s.inviteStatus === "accepted" ? "Onayladı" : s.inviteStatus === "declined" ? "Reddetti" : "Bekliyor";
                            return (
                              <span key={s.studentId} style={{ color, fontFamily:"var(--font-label)" }}>
                                · {s.studentName || "?"}: {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide uppercase"
                          style={{
                            fontFamily:"var(--font-label)",
                            background: apt.status==="tamamlandi" ? "rgba(34,197,94,0.12)" : apt.status==="iptal" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                            color: apt.status==="tamamlandi" ? "var(--color-success)" : apt.status==="iptal" ? "var(--color-error)" : "var(--color-achievement)",
                          }}>
                          {STATUS_LABELS[apt.status]}
                        </span>
                        {apt.status === "onaylandi" && (
                          <>
                            <button onClick={() => handleCompleteClick(apt)}
                              className="gradient-animated gradient-slow gradient-violet-pink-orange flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-95"
                              style={{ fontFamily:"var(--font-label)" }}>
                              <CheckCircle size={14}/>Tamamla
                            </button>
                            <button
                              onClick={() => { setCancelTarget(apt); setCancelReason(""); }}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-all rounded-lg"
                              style={{ border:"1px solid rgba(239,68,68,0.4)", color:"#ef4444", fontFamily:"var(--font-label)" }}>
                              <XCircle size={13}/>İptal
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-4">
          <motion.div variants={fadeUpNoOpacity} className="cursor-pointer relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]" onClick={() => setNotifOpen(true)}>
            <div className="glass-strong relative rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell size={14} style={{ color:"var(--color-achievement)" }}/>
                  <h3 className="text-base text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>Bildirimler</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {unreadNotifs > 0 && <span className="text-xs text-white px-2 py-0.5 rounded-full" style={{ background:"var(--color-violet)" }}>{unreadNotifs} yeni</span>}
                  <ChevronRight size={13} className="text-white/20"/>
                </div>
              </div>
              <div className="space-y-2">
                {notifs.filter(n => !n.isRead).slice(0, 3).map(n => (
                  <div key={n.id} className="p-2 rounded-lg border-l-2" style={{ borderColor: n.type==="warning" ? "var(--color-achievement)" : "var(--color-violet)" }}>
                    <div className="text-xs text-white/70 font-semibold truncate" style={{ fontFamily:"var(--font-label)" }}>{n.title}</div>
                    <div className="text-xs text-white/30 truncate" style={{ fontFamily:"var(--font-label)" }}>{n.message}</div>
                  </div>
                ))}
                {unreadNotifs === 0 && (
                  <p className="text-xs text-center py-2 text-white/20" style={{ fontFamily:"var(--font-label)" }}>Okunmamış bildirim yok</p>
                )}
              </div>
              {notifs.length > 0 && (
                <p className="text-xs text-white/20 mt-2 text-right" style={{ fontFamily:"var(--font-label)" }}>Tümünü gör →</p>
              )}
            </div>
          </motion.div>

          {/* Push bildirimleri */}
          <motion.div variants={fadeUpNoOpacity} className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
            <div className="glass-strong relative rounded-2xl p-4 space-y-3">
              <h3 className="text-base text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                Push Bildirimleri
              </h3>
              <PushNotificationButton role="admin" />

              <div className="pt-2 border-t border-white/5 space-y-2">
                <p className="text-xs text-white/30" style={{ fontFamily:"var(--font-label)" }}>Test bildirimi gönder</p>
                <select
                  value={testPushStudentId}
                  onChange={e => setTestPushStudentId(e.target.value)}
                  className="w-full glass text-white px-3 py-2.5 text-sm outline-none rounded-lg appearance-none"
                  style={{ fontFamily:"var(--font-label)" }}
                >
                  <option value="">Öğrenci seç…</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.code})</option>)}
                </select>
                <button onClick={handleSendTestPush} disabled={testPushBusy || !testPushStudentId}
                  className="gradient-animated gradient-slow gradient-violet-pink-orange w-full py-2.5 text-xs font-semibold tracking-widest uppercase text-white rounded-lg transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-40"
                  style={{ fontFamily:"var(--font-label)" }}>
                  {testPushBusy ? "Gönderiliyor…" : "Test Push Gönder"}
                </button>
                {testPushResult && (
                  <p className="text-xs text-center" style={{ color: testPushResult.startsWith("Hata") ? "var(--color-error)" : "var(--color-success)", fontFamily:"var(--font-label)" }}>
                    {testPushResult}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {lowLessons.length > 0 && (
            <motion.div variants={fadeUpNoOpacity} className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
              <div className="glass-strong relative rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Bell size={16} style={{ color:"var(--color-achievement)" }}/>
                  <h3 className="text-sm tracking-wider" style={{ color:"var(--color-achievement)", fontFamily:"var(--font-display)" }}>Paket Bitiyor / Bitenler</h3>
                </div>
                <div className="space-y-2">
                  {lowLessons.map(s => {
                    const isFinished = s.remainingLessons === 0;
                    return (
                      <div key={s.id} className="p-2 rounded-lg border-l-2" style={{ borderColor: isFinished ? "var(--color-error)" : "var(--color-achievement)", background: isFinished ? "rgba(239,68,68,0.05)" : "rgba(245,158,11,0.05)" }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-white/80 font-semibold min-w-0 truncate" style={{ fontFamily:"var(--font-label)" }}>{s.fullName}</span>
                          <span className="text-xs font-semibold flex-shrink-0" style={{ color: isFinished ? "var(--color-error)" : "var(--color-achievement)", fontFamily:"var(--font-label)" }}>
                            {isFinished ? "Paket bitti" : `${s.remainingLessons} ders`}
                          </span>
                        </div>
                        {isFinished && (
                          <div className="flex gap-1.5 mt-1.5">
                            <Link href="/admin/ogrenciler"
                              className="flex-1 text-center text-[10px] py-1 transition-colors rounded"
                              style={{ border:"1px solid rgba(139,92,246,0.35)", color:"#A855F7", fontFamily:"var(--font-label)" }}>
                              Paketi Yenile
                            </Link>
                            <Link href={`/admin/ogrenciler?id=${s.id}`}
                              className="flex-1 text-center text-[10px] py-1 transition-colors rounded"
                              style={{ border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>
                              Detaya Git
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 🎁 Hediye Ders Onayları ─────────────────────────── */}
          <motion.div variants={fadeUpNoOpacity} className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
            <div className="glass-strong relative rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-lg">🎁</span>
                <h3 className="text-base sm:text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>Hediye Ders Onayları</h3>
                <span className="text-xs text-white/35 ml-auto" style={{ fontFamily: "var(--font-label)" }}>{allGiftRequests.length} talep</span>
              </div>

              {allGiftRequests.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {([
                    ["Bekliyor", giftCounts.pending, "var(--color-warning)"],
                    ["Onaylandı", giftCounts.approved, "var(--color-success)"],
                    ["Reddedildi", giftCounts.rejected, "var(--color-error)"],
                  ] as const).map(([label, count, color]) => (
                    <div key={label} className="glass rounded-xl px-3 py-2 text-center">
                      <div className="text-lg" style={{ fontFamily: "var(--font-display)", color }}>{count}</div>
                      <div className="text-[9px] uppercase tracking-widest text-white/30" style={{ fontFamily: "var(--font-label)" }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}

              {allGiftRequests.length === 0 ? (
                <p className="text-xs text-white/30 py-4 text-center" style={{ fontFamily: "var(--font-label)" }}>
                  Henüz hediye ders talebi yok.
                </p>
              ) : (
                <div className="space-y-2">
                  {allGiftRequests.map(req => {
                    const statusInfo = {
                      pending:  { label: "Bekliyor",   color: "var(--color-warning)", bg: "rgba(251,146,60,0.12)" },
                      approved: { label: "Onaylandı",  color: "var(--color-success)", bg: "rgba(34,197,94,0.12)" },
                      rejected: { label: "Reddedildi", color: "var(--color-error)",   bg: "rgba(239,68,68,0.12)" },
                    }[req.status];
                    const reqDate = req.requestedAt || req.createdAt;
                    return (
                      <div key={req.id} className="glass rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs text-white font-semibold" style={{ fontFamily: "var(--font-label)" }}>{req.studentName}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: req.threshold === 10000 ? "rgba(34,211,238,0.12)" : "rgba(245,158,11,0.12)", color: req.threshold === 10000 ? "#67E8F9" : "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
                              {req.threshold === 10000 ? "💎 10.000 XP eşiği" : "🥇 5.000 XP eşiği"}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: statusInfo.bg, color: statusInfo.color, fontFamily: "var(--font-label)" }}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <p className="text-[10px] text-white/35" style={{ fontFamily: "var(--font-label)" }}>
                              Sezon XP: <strong style={{ color: "var(--color-achievement)" }}>{(req.seasonXP || req.xpAtRequest).toLocaleString()} XP</strong>
                            </p>
                            <p className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-label)" }}>
                              {getSeasonLabel(req.season)}
                            </p>
                            <p className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-label)" }}>
                              Talep: {reqDate ? format(new Date(reqDate), "dd MMM yyyy, HH:mm", { locale: tr }) : "—"}
                            </p>
                          </div>
                          {req.status === "rejected" && req.adminNote && (
                            <p className="text-[10px] mt-1" style={{ color: "var(--color-error)", opacity: 0.75, fontFamily: "var(--font-label)" }}>
                              Admin notu: {req.adminNote}
                            </p>
                          )}
                        </div>
                        {req.status === "pending" && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              disabled={giftActionBusy === req.id}
                              onClick={async () => {
                                setGiftActionBusy(req.id);
                                try {
                                  await approveGiftLessonRequest(req.id, req.studentId, req.threshold);
                                  const fresh = await getAllGiftLessonRequests().catch(() => allGiftRequests);
                                  setAllGiftRequests(fresh);
                                  setGiftRequests(prev => prev.filter(r => r.id !== req.id));
                                  toast("Hediye ders onaylandı, öğrenciye +1 ders eklendi.", "success");
                                } catch (e: any) {
                                  toast(`Onaylanamadı: ${e?.message ?? "Veritabanı hatası"}`, "error");
                                }
                                setGiftActionBusy(null);
                              }}
                              className="text-[10px] px-3 py-1.5 rounded-lg font-semibold transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-40"
                              style={{ background: "rgba(139,92,246,0.2)", color: "#C4B5FD", fontFamily: "var(--font-label)" }}
                            >
                              {giftActionBusy === req.id ? "..." : "Onayla +1 Ders"}
                            </button>
                            <button
                              disabled={giftActionBusy === req.id}
                              onClick={() => { setGiftRejectModal(req); setGiftRejectNote(""); }}
                              className="text-[10px] px-3 py-1.5 rounded-lg font-semibold transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-40"
                              style={{ background: "rgba(239,68,68,0.12)", color: "var(--color-error)", fontFamily: "var(--font-label)" }}
                            >
                              Reddet
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Hediye ders reddetme modalı ──────────────────────── */}
          <AnimatePresence>
            {giftRejectModal && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                onClick={() => !giftRejectBusy && setGiftRejectModal(null)}>
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>HEDİYE DERS TALEBİNİ REDDET</h3>
                    <button onClick={() => setGiftRejectModal(null)} className="text-white/25 hover:text-white transition-colors p-1"><X size={18} /></button>
                  </div>
                  <p className="text-xs text-white/50 mb-3" style={{ fontFamily: "var(--font-label)" }}>
                    <strong className="text-white/80">{giftRejectModal.studentName}</strong> adlı öğrencinin{" "}
                    {giftRejectModal.threshold.toLocaleString()} XP eşiğinden gelen hediye ders talebini reddetmek üzeresin.
                  </p>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>
                    Admin notu (opsiyonel)
                  </label>
                  <textarea
                    value={giftRejectNote}
                    onChange={e => setGiftRejectNote(e.target.value)}
                    placeholder="Reddetme sebebini buraya yazabilirsin..."
                    rows={3}
                    className="glass w-full text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none rounded-lg resize-none mb-4"
                    style={{ fontFamily: "var(--font-label)" }}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setGiftRejectModal(null)} disabled={giftRejectBusy}
                      className="px-4 py-2.5 text-xs font-semibold tracking-widest uppercase rounded-lg text-white/40 hover:text-white transition-all disabled:opacity-40"
                      style={{ fontFamily: "var(--font-label)" }}>
                      Vazgeç
                    </button>
                    <button
                      onClick={async () => {
                        if (!giftRejectModal) return;
                        setGiftRejectBusy(true);
                        try {
                          await rejectGiftLessonRequest(giftRejectModal.id, giftRejectNote);
                          const fresh = await getAllGiftLessonRequests().catch(() => allGiftRequests);
                          setAllGiftRequests(fresh);
                          setGiftRequests(prev => prev.filter(r => r.id !== giftRejectModal.id));
                          toast("Hediye ders talebi reddedildi.", "success");
                          setGiftRejectModal(null);
                        } catch (e: any) {
                          toast(`Reddedilemedi: ${e?.message ?? "Veritabanı hatası"}`, "error");
                        }
                        setGiftRejectBusy(false);
                      }}
                      disabled={giftRejectBusy}
                      className="px-4 py-2.5 text-xs font-semibold tracking-widest uppercase rounded-lg text-white transition-all disabled:opacity-40"
                      style={{ background: "var(--color-error)", fontFamily: "var(--font-label)" }}
                    >
                      {giftRejectBusy ? "..." : "Talebi Reddet"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={fadeUpNoOpacity} className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
            <div className="glass-strong relative rounded-2xl p-4">
              <h3 className="text-sm text-white tracking-wider mb-3" style={{ fontFamily:"var(--font-display)" }}>Hızlı Erişim</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href:"/admin/ogrenciler", label:"Öğrenci Yönetimi", icon: Users },
                  { href:"/admin/takvim",     label:"Takvim & Müsaitlik", icon: Calendar },
                  { href:"/admin/odemeler",   label:"Ödeme Takibi", icon: CreditCard },
                  { href:"/admin/dersler",    label:"Ders Notları", icon: BookOpen },
                ].map(l => (
                  <Link key={l.href} href={l.href}
                    className="glass flex flex-col items-center text-center gap-2 p-3 rounded-xl transition-transform hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95">
                    <l.icon size={20} style={{ color: "#A78BFA" }} />
                    <span className="text-[11px] text-white/60 tracking-wider leading-tight" style={{ fontFamily:"var(--font-label)" }}>{l.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── XP & Seviye Takibi ─────────────────────────────────── */}
      {students.length > 0 && (
        <motion.div variants={fadeUpNoOpacity} className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
          <div className="glass-strong relative rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Zap size={18} style={{ color: "#A78BFA" }} />
              <h3 className="text-lg sm:text-xl text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                XP & Seviye Takibi
              </h3>
              <span className="text-xs text-white/30" style={{ fontFamily:"var(--font-label)" }}>
                {getSeasonLabel(currentSeason)} sezonu
              </span>
              <span className="text-xs text-white/30 ml-auto" style={{ fontFamily:"var(--font-label)" }}>
                {filteredXpRows.length} öğrenci
              </span>
            </div>

            {/* Filtreler */}
            <div className="flex flex-wrap gap-2 mb-4">
              {XP_FILTERS.map(f => (
                <button key={f.key} onClick={() => setXpFilter(f.key)}
                  className={`px-3 py-1.5 text-xs tracking-wider transition-all rounded-lg border ${xpFilter === f.key ? "text-white" : "border-white/10 text-white/35 hover:border-white/20"}`}
                  style={{ fontFamily:"var(--font-label)", background: xpFilter === f.key ? "var(--color-violet)" : undefined, borderColor: xpFilter === f.key ? "var(--color-violet)" : undefined }}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Öğrenci XP listesi */}
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {topXpRows.length === 0 ? (
                <div className="text-center py-10">
                  <Zap size={28} className="text-white/10 mx-auto mb-2" />
                  <p className="text-white/20 text-sm" style={{ fontFamily:"var(--font-label)" }}>Bu filtreye uygun öğrenci yok</p>
                </div>
              ) : topXpRows.map(row => {
                const { student: s, level } = row;
                return (
                  <div key={s.id} className="p-3 glass rounded-xl">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 flex items-center justify-center text-base flex-shrink-0 border rounded-full"
                          style={{ background: level.current.glowColor, borderColor: level.current.borderColor }}>
                          {level.current.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate" style={{ fontFamily:"var(--font-label)" }}>
                            <span className="font-semibold">{s.fullName}</span>
                            <span className="text-white/30"> — </span>
                            <span style={{ color: level.current.colorPrimary }}>{row.lifetimeXP.toLocaleString("tr-TR")} XP</span>
                            <span className="text-white/30"> — </span>
                            <span className="text-white/60">{level.current.name}</span>
                          </div>
                          <div className="text-[10px] text-white/30 flex flex-wrap gap-x-2.5 mt-0.5" style={{ fontFamily:"var(--font-label)" }}>
                            <span>Sezon XP: <strong style={{ color:"var(--color-achievement)", opacity:0.8 }}>{row.seasonXP.toLocaleString("tr-TR")}</strong></span>
                            <span>Sıradaki: <strong className="text-white/50">{level.next ? level.next.name : "Maks. seviye"}</strong></span>
                            {level.next && <span>Kalan: <strong className="text-white/50">{level.xpToNext.toLocaleString("tr-TR")} XP</strong></span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end flex-shrink-0">
                        {row.giftEarned > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.3)", color:"#C4B5FD", fontFamily:"var(--font-label)" }}>
                            🎁 {row.giftEarned} hediye ders
                          </span>
                        )}
                        {row.giftPending && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full animate-pulse"
                            style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)", color:"#FCD34D", fontFamily:"var(--font-label)" }}>
                            ⏳ Onay bekliyor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Seviye ilerleme çubuğu */}
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mt-2.5">
                      <div className="h-full rounded-full transition-all" style={{ width: `${level.progressPct}%`, background: `linear-gradient(90deg, ${level.current.gradFrom}, ${level.current.gradTo})` }} />
                    </div>

                    {/* Rozetler */}
                    {row.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {row.badges.slice(0, 8).map(b => (
                          <span key={b.id} className="text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background: b.bgColor, border: `1px solid ${b.color}40`, color: b.color, fontFamily:"var(--font-label)" }}>
                            {b.icon} {b.name}
                          </span>
                        ))}
                        {row.badges.length > 8 && (
                          <span className="text-[10px] px-1.5 py-0.5 text-white/25" style={{ fontFamily:"var(--font-label)" }}>
                            +{row.badges.length - 8} rozet
                          </span>
                        )}
                      </div>
                    )}

                    {/* Manuel XP Yönetimi */}
                    <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
                      <button onClick={() => openXPAdjust(s, "add")}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold tracking-wider transition-colors rounded-lg"
                        style={{ border:"1px solid rgba(34,197,94,0.3)", color:"#4ADE80", background:"rgba(34,197,94,0.08)", fontFamily:"var(--font-label)" }}>
                        <Plus size={11}/> XP Ekle
                      </button>
                      <button onClick={() => openXPAdjust(s, "subtract")}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold tracking-wider transition-colors rounded-lg"
                        style={{ border:"1px solid rgba(239,68,68,0.3)", color:"#F87171", background:"rgba(239,68,68,0.08)", fontFamily:"var(--font-label)" }}>
                        <Minus size={11}/> XP Düş
                      </button>
                      <button onClick={() => openXPHistory(s)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold tracking-wider transition-colors rounded-lg"
                        style={{ border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.4)", background:"rgba(255,255,255,0.03)", fontFamily:"var(--font-label)" }}>
                        <History size={11}/> XP Geçmişi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Onur Listesi (Hall of Fame) Yönetimi ───────────────── */}
      {students.length > 0 && (
        <motion.div variants={fadeUpNoOpacity} className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
          <div className="glass-strong relative rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Crown size={18} style={{ color: "#FBBF24" }} />
              <h3 className="text-lg sm:text-xl text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                Onur Listesi Yönetimi
              </h3>
              <span className="text-xs text-white/30 ml-auto" style={{ fontFamily:"var(--font-label)" }}>
                {hallEntries.length} öğrenci listede
              </span>
            </div>

            {/* Öne çıkarma / Ayın Sporcusu kontrolleri */}
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {students
                .filter(s => s.showInHallOfFame !== false)
                .sort((a, b) => Number(b.hallFeatured ?? false) - Number(a.hallFeatured ?? false) || a.fullName.localeCompare(b.fullName))
                .map(s => {
                  const featuredBusy = hallBusy === s.id + "hallFeatured";
                  const monthBusy    = hallBusy === s.id + "isStudentOfMonth";
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 glass rounded-xl flex-wrap">
                      <span className="text-xs text-white/70 truncate" style={{ fontFamily:"var(--font-label)" }}>
                        {s.fullName}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => toggleHallFeature(s, "hallFeatured")}
                          disabled={featuredBusy}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold tracking-wider transition-colors rounded-lg"
                          style={{
                            border: `1px solid ${s.hallFeatured ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.1)"}`,
                            color: s.hallFeatured ? "#C4B5FD" : "rgba(255,255,255,0.35)",
                            background: s.hallFeatured ? "rgba(139,92,246,0.14)" : "rgba(255,255,255,0.03)",
                            fontFamily: "var(--font-label)",
                            opacity: featuredBusy ? 0.5 : 1,
                          }}
                        >
                          <Award size={11} /> {s.hallFeatured ? "Öne Çıkan ✓" : "Öne Çıkar"}
                        </button>
                        <button
                          onClick={() => toggleHallFeature(s, "isStudentOfMonth")}
                          disabled={monthBusy}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold tracking-wider transition-colors rounded-lg"
                          style={{
                            border: `1px solid ${s.isStudentOfMonth ? "rgba(244,114,182,0.5)" : "rgba(255,255,255,0.1)"}`,
                            color: s.isStudentOfMonth ? "#F9A8D4" : "rgba(255,255,255,0.35)",
                            background: s.isStudentOfMonth ? "rgba(244,114,182,0.14)" : "rgba(255,255,255,0.03)",
                            fontFamily: "var(--font-label)",
                            opacity: monthBusy ? 0.5 : 1,
                          }}
                        >
                          <Sparkles size={11} /> {s.isStudentOfMonth ? "Ayın Sporcusu ✓" : "Ayın Sporcusu Yap"}
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Canlı önizleme */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] uppercase tracking-widest text-white/25" style={{ fontFamily:"var(--font-display)", letterSpacing:"0.2em" }}>
                  Canlı Önizleme — Öğrenciler Bunu Görüyor
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              {hallEntries.length > 0
                ? <HallOfFamePremium entries={hallEntries} />
                : <p className="text-center text-xs text-white/20 py-6" style={{ fontFamily:"var(--font-label)" }}>Henüz sıralanacak öğrenci verisi yok</p>}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══ Uygulama Ayarları ══ */}
      {students.length > 0 && (
        <motion.div initial={{ y:16 }} animate={{ y:0 }} transition={{ delay:0.04 }}
          className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
          <div className="glass-strong relative rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">⚙️</span>
              <h3 className="text-lg text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                Uygulama Ayarları
              </h3>
            </div>
            {/* Activity Feed toggle */}
            <button
              onClick={async () => {
                if (feedToggleBusy) return;
                setFeedToggleBusy(true);
                const next = !activityFeedEnabled;
                setActivityFeedEnabled(next);
                await setAppSetting("activity_feed_enabled", next ? "true" : "false").catch(() => {});
                setFeedToggleBusy(false);
              }}
              disabled={feedToggleBusy}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 border rounded-xl transition-all duration-200 disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: activityFeedEnabled ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.08)",
              }}
            >
              <div className="text-left">
                <div className="text-sm font-semibold" style={{ color:"rgba(255,255,255,0.8)", fontFamily:"var(--font-label)" }}>
                  Canlı Aktivite Akışı
                </div>
                <div className="text-[10px]" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
                  Öğrenci panelinde XP / hediye ders / lider bandını göster
                </div>
              </div>
              <div
                className="relative flex-shrink-0 transition-all duration-200"
                style={{
                  width: 42, height: 24, borderRadius: 999,
                  background: activityFeedEnabled ? "linear-gradient(90deg,#7C3AED,#A78BFA)" : "rgba(255,255,255,0.08)",
                  border: `1px solid ${activityFeedEnabled ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.12)"}`,
                }}
              >
                <div
                  className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all duration-200"
                  style={{ left: activityFeedEnabled ? 21 : 3 }}
                />
              </div>
            </button>
          </div>
        </motion.div>
      )}

      {/* ══ Kedi AI Görevleri ══ */}
      {students.length > 0 && (
        <motion.div initial={{ y:16 }} animate={{ y:0 }} transition={{ delay:0.05 }}
          className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
          <div className="glass-strong relative rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎯</span>
              <h3 className="text-lg sm:text-xl text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                Kedi AI Görevleri
              </h3>
              <span className="text-xs text-white/30 ml-auto" style={{ fontFamily:"var(--font-label)" }}>
                {kediMissions.length} aktif görev
              </span>
            </div>

            {/* Yeni görev oluştur */}
            <div className="space-y-3 p-3 glass rounded-xl">
              <p className="text-[11px] text-white/40 uppercase tracking-widest" style={{ fontFamily:"var(--font-label)" }}>
                Yeni Özel Görev
              </p>
              <div className="flex gap-2">
                <input
                  value={missionIcon}
                  onChange={e => setMissionIcon(e.target.value)}
                  className="w-12 glass text-center text-lg text-white outline-none px-1 py-1.5 rounded-lg"
                  placeholder="🎯"
                  maxLength={2}
                />
                <input
                  value={missionTitle}
                  onChange={e => setMissionTitle(e.target.value)}
                  className="flex-1 glass text-white text-sm outline-none px-3 py-1.5 placeholder-white/20 rounded-lg"
                  placeholder="Görev başlığı (örn. 3 Ders Tamamla)"
                  style={{ fontFamily:"var(--font-label)" }}
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-white/30 mb-1" style={{ fontFamily:"var(--font-label)" }}>XP Ödülü</label>
                  <input
                    type="number" min="1"
                    value={missionXP}
                    onChange={e => setMissionXP(e.target.value)}
                    className="w-full glass text-white text-sm outline-none px-3 py-1.5 rounded-lg"
                    style={{ fontFamily:"var(--font-label)" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-white/30 mb-1" style={{ fontFamily:"var(--font-label)" }}>Hedef Değer</label>
                  <input
                    type="number" min="1"
                    value={missionTarget}
                    onChange={e => setMissionTarget(e.target.value)}
                    className="w-full glass text-white text-sm outline-none px-3 py-1.5 rounded-lg"
                    style={{ fontFamily:"var(--font-label)" }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-white/30 mb-1" style={{ fontFamily:"var(--font-label)" }}>Öğrenci</label>
                  <select
                    value={missionStudentId}
                    onChange={e => setMissionStudentId(e.target.value)}
                    className="w-full glass text-white text-sm outline-none px-3 py-1.5 rounded-lg appearance-none"
                    style={{ fontFamily:"var(--font-label)" }}
                  >
                    <option value="all">Tüm Öğrenciler</option>
                    {students.filter(s => s.isActive).map(s => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={handleCreateMission}
                disabled={missionBusy || !missionTitle.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold tracking-widest transition-colors rounded-lg"
                style={{
                  fontFamily: "var(--font-label)",
                  background: missionTitle.trim() ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${missionTitle.trim() ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.08)"}`,
                  color: missionTitle.trim() ? "#C4B5FD" : "rgba(255,255,255,0.25)",
                  opacity: missionBusy ? 0.6 : 1,
                }}
              >
                <Plus size={12} /> {missionBusy ? "Oluşturuluyor..." : "Görev Oluştur"}
              </button>
            </div>

            {/* Mevcut görevler listesi */}
            {kediMissions.length === 0 ? (
              <p className="text-center text-xs text-white/20 py-4" style={{ fontFamily:"var(--font-label)" }}>
                Henüz özel görev yok
              </p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {kediMissions.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 glass rounded-xl">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span>{m.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs text-white/80 truncate" style={{ fontFamily:"var(--font-label)" }}>{m.title}</div>
                        <div className="text-[10px] text-white/30" style={{ fontFamily:"var(--font-label)" }}>
                          +{m.xpReward} XP · hedef: {m.targetValue} · {m.studentId ? students.find(s => s.id === m.studentId)?.fullName ?? "Öğrenci" : "Tüm öğrenciler"}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMission(m.id)}
                      className="w-6 h-6 flex items-center justify-center text-white/25 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ══ Arena Düello Yönetimi ══ */}
      {arenaduels.length > 0 && (
        <motion.div initial={{ y:16 }} animate={{ y:0 }} transition={{ delay:0.05 }}
          className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
          <div className="glass-strong relative rounded-2xl p-4 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Swords size={18} style={{ color:"#F87171" }} />
              <h3 className="text-lg sm:text-xl text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>
                Arena Düello Yönetimi
              </h3>
              <span className="text-xs text-white/30 ml-auto" style={{ fontFamily:"var(--font-label)" }}>
                {arenaduels.filter(d => d.status === "accepted").length} onay bekliyor
              </span>
            </div>

            {/* Onay bekleyen düellolar (accepted → admin onaylar → active) */}
            {arenaduels.filter(d => d.status === "accepted").length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2" style={{ fontFamily:"var(--font-label)" }}>
                  Admin Onayı Bekleyen
                </p>
                <div className="space-y-2">
                  {arenaduels.filter(d => d.status === "accepted").map(d => (
                    <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border rounded-xl"
                      style={{ background:"rgba(220,38,38,0.06)", borderColor:"rgba(220,38,38,0.2)" }}>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate" style={{ fontFamily:"var(--font-label)" }}>
                          {d.challengerName} <span style={{ color:"#F87171" }}>vs</span> {d.opponentName}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
                          Bahis: {d.wagerXP} XP · {new Date(d.createdAt).toLocaleDateString("tr")}
                        </div>
                      </div>
                      <button
                        disabled={arenaResolveBusy === d.id + "approve"}
                        onClick={async () => {
                          setArenaResolveBusy(d.id + "approve");
                          await approveArenaDuel(d.id);
                          const fresh = await getAllArenaDuels().catch(() => arenaduels);
                          setArenaduels(fresh);
                          setArenaResolveBusy(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-all rounded-lg"
                        style={{ background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.35)", color:"#4ADE80", fontFamily:"var(--font-label)" }}>
                        <CheckCircle size={12} /> Onayla (Aktifleştir)
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aktif düellolar — kazanan seç */}
            {arenaduels.filter(d => d.status === "active").length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2" style={{ fontFamily:"var(--font-label)" }}>
                  Aktif — Kazanan Seçilecek
                </p>
                <div className="space-y-2">
                  {arenaduels.filter(d => d.status === "active").map(d => (
                    <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 border rounded-xl"
                      style={{ background:"rgba(124,58,237,0.06)", borderColor:"rgba(124,58,237,0.2)" }}>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate" style={{ fontFamily:"var(--font-label)" }}>
                          {d.challengerName} <span style={{ color:"#DC2626" }}>⚔️</span> {d.opponentName}
                        </div>
                        <div className="text-[10px] mt-0.5" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
                          Bahis: {d.wagerXP} XP
                        </div>
                      </div>
                      <button
                        onClick={() => { setArenaResolveModal(d); setArenaWinnerId(d.challengerId); setArenaRewardXP(String(d.wagerXP * 2)); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg"
                        style={{ background:"rgba(220,38,38,0.15)", border:"1px solid rgba(220,38,38,0.35)", color:"#F87171", fontFamily:"var(--font-label)" }}>
                        <Crown size={12} /> Kazananı Seç
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tamamlanan geçmiş */}
            {arenaduels.filter(d => d.status === "completed").length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2" style={{ fontFamily:"var(--font-label)" }}>
                  Tamamlananlar
                </p>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                  {arenaduels.filter(d => d.status === "completed").map(d => {
                    const winner = d.winnerId === d.challengerId ? d.challengerName : d.opponentName;
                    return (
                      <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2 border rounded-xl"
                        style={{ background:"rgba(52,211,153,0.04)", borderColor:"rgba(52,211,153,0.15)" }}>
                        <div className="text-xs text-white/60 truncate" style={{ fontFamily:"var(--font-label)" }}>
                          {d.challengerName} vs {d.opponentName}
                        </div>
                        <div className="text-[10px] flex-shrink-0 font-semibold" style={{ color:"#34D399", fontFamily:"var(--font-label)" }}>
                          🏆 {winner}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Arena Kazanan Seç Modalı */}
      <AnimatePresence>
        {arenaResolveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => !arenaResolveBusy && setArenaResolveModal(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>ARENA KAZANANINI BELİRLE</h3>
                <button onClick={() => !arenaResolveBusy && setArenaResolveModal(null)} className="text-white/25 hover:text-white transition-colors p-1"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-xl text-center"
                  style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.2)" }}>
                  <div className="text-sm font-semibold text-white" style={{ fontFamily:"var(--font-label)" }}>
                    {arenaResolveModal.challengerName} <span style={{ color:"#F87171" }}>vs</span> {arenaResolveModal.opponentName}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color:"rgba(255,255,255,0.35)", fontFamily:"var(--font-label)" }}>
                    Her biri {arenaResolveModal.wagerXP} XP bahis koydu
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-2" style={{ fontFamily:"var(--font-label)" }}>Kazanan</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: arenaResolveModal.challengerId, name: arenaResolveModal.challengerName },
                      { id: arenaResolveModal.opponentId,   name: arenaResolveModal.opponentName },
                    ].map(p => (
                      <button key={p.id} onClick={() => setArenaWinnerId(p.id)}
                        className="py-3 text-sm font-semibold transition-all rounded-lg"
                        style={{
                          border: `1px solid ${arenaWinnerId === p.id ? "rgba(251,191,36,0.6)" : "rgba(255,255,255,0.1)"}`,
                          background: arenaWinnerId === p.id ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.03)",
                          color: arenaWinnerId === p.id ? "#FBBF24" : "rgba(255,255,255,0.4)",
                          fontFamily: "var(--font-label)",
                        }}>
                        {arenaWinnerId === p.id ? "👑 " : ""}{p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1.5" style={{ fontFamily:"var(--font-label)" }}>
                    Kazanana verilecek XP (bahis × 2 varsayılan)
                  </p>
                  <input
                    type="number" min="0"
                    value={arenaRewardXP}
                    onChange={e => setArenaRewardXP(e.target.value)}
                    className="w-full glass px-3 py-2.5 text-sm outline-none rounded-lg text-white"
                    style={{ fontFamily:"var(--font-label)" }}
                  />
                </div>

                <button
                  disabled={!arenaWinnerId || !!arenaResolveBusy}
                  onClick={async () => {
                    if (!arenaResolveModal || !arenaWinnerId) return;
                    const d = arenaResolveModal;
                    const reward = parseInt(arenaRewardXP, 10) || d.wagerXP * 2;
                    const isChallWinner = arenaWinnerId === d.challengerId;
                    const winnerName = isChallWinner ? d.challengerName : d.opponentName;
                    const loserName  = isChallWinner ? d.opponentName  : d.challengerName;
                    const loserId    = isChallWinner ? d.opponentId    : d.challengerId;
                    const season     = getCurrentSeason();
                    setArenaResolveBusy(d.id);
                    try {
                      await adminResolveDuel(d.id, arenaWinnerId, winnerName, loserName, loserId, reward, d.wagerXP, season);
                      const fresh = await getAllArenaDuels().catch(() => arenaduels);
                      setArenaduels(fresh);
                      setArenaResolveModal(null);
                    } finally {
                      setArenaResolveBusy(null);
                    }
                  }}
                  className="w-full py-3 text-sm font-semibold tracking-wider uppercase transition-all disabled:opacity-40 rounded-lg"
                  style={{ background:"linear-gradient(90deg,rgba(220,38,38,0.8),rgba(124,58,237,0.7))", border:"1px solid rgba(220,38,38,0.4)", color:"white", fontFamily:"var(--font-label)" }}>
                  {arenaResolveBusy ? "Kaydediliyor…" : "⚔️ Sonucu Kaydet"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Manuel XP Ekle / Düş Modalı ══ */}
      <AnimatePresence>
        {xpAdjModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => !xpAdjBusy && setXpAdjModal(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                  {xpAdjModal.mode === "subtract" ? "XP DÜŞ" : "XP EKLE"}
                </h3>
                <button onClick={() => !xpAdjBusy && setXpAdjModal(null)} className="text-white/25 hover:text-white transition-colors p-1"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-xl space-y-0.5" style={{ background: xpAdjModal.mode === "subtract" ? "rgba(239,68,68,0.05)" : "rgba(34,197,94,0.05)", border: `1px solid ${xpAdjModal.mode === "subtract" ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}` }}>
                  <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>
                    {xpAdjModal.student.fullName}
                  </div>
                  <div className="text-xs text-white/40" style={{ fontFamily:"var(--font-label)" }}>
                    {xpAdjModal.mode === "subtract" ? "Öğrenciden XP düşülecek ve kendisine bildirim gönderilecek." : "Öğrenciye XP eklenecek ve kendisine bildirim gönderilecek."}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-label)" }}>
                    {xpAdjModal.mode === "subtract" ? "Düşülecek XP Miktarı" : "Verilecek XP Miktarı"}
                  </label>
                  <input
                    type="number" min="1" inputMode="numeric"
                    value={xpAmount} onChange={e => setXpAmount(e.target.value)}
                    placeholder="örn. 250"
                    className="w-full glass text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-label)" }}>Açıklama / Neden</label>
                  <select
                    value={xpReason} onChange={e => setXpReason(e.target.value)}
                    className="w-full glass text-white px-3 py-2.5 text-sm outline-none rounded-lg appearance-none"
                    style={{ fontFamily: "var(--font-label)" }}
                  >
                    {XP_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-label)" }}>Ek not (isteğe bağlı)</label>
                  <textarea
                    value={xpNote} onChange={e => setXpNote(e.target.value)} rows={2}
                    placeholder="Detay ekleyebilirsin..."
                    className="glass w-full text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none rounded-lg resize-none"
                    style={{ fontFamily: "var(--font-label)" }}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setXpAdjModal(null)} disabled={xpAdjBusy}
                    className="flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase rounded-lg text-white/40 hover:text-white transition-all disabled:opacity-40"
                    style={{ fontFamily: "var(--font-label)" }}>Vazgeç</button>
                  <button
                    onClick={handleXPAdjustSave}
                    disabled={xpAdjBusy || !xpAmount || parseInt(xpAmount, 10) <= 0}
                    className="flex-1 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all rounded-lg"
                    style={{
                      background: xpAdjModal.mode === "subtract" ? "rgba(239,68,68,0.85)" : "rgba(34,197,94,0.85)",
                      color: "#fff",
                      fontFamily: "var(--font-label)",
                      opacity: (xpAdjBusy || !xpAmount || parseInt(xpAmount, 10) <= 0) ? 0.5 : 1,
                    }}>
                    {xpAdjBusy ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ XP Geçmişi Modalı ══ */}
      <AnimatePresence>
        {xpHistoryModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setXpHistoryModal(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-lg rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>XP GEÇMİŞİ</h3>
                <button onClick={() => setXpHistoryModal(null)} className="text-white/25 hover:text-white transition-colors p-1"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>
                  {xpHistoryModal.fullName}
                </div>
                {xpHistoryLoading ? (
                  <p className="text-center py-8 text-white/30 text-sm" style={{ fontFamily:"var(--font-label)" }}>Yükleniyor...</p>
                ) : xpHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <History size={26} className="text-white/10 mx-auto mb-2" />
                    <p className="text-white/20 text-sm" style={{ fontFamily:"var(--font-label)" }}>Henüz manuel XP kaydı yok</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {xpHistory.map(h => (
                      <div key={h.id} className="p-3 glass rounded-xl flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-white/80 font-semibold" style={{ fontFamily:"var(--font-label)" }}>{h.reason}</div>
                          {h.note && <div className="text-[11px] text-white/35 mt-0.5" style={{ fontFamily:"var(--font-label)" }}>{h.note}</div>}
                          <div className="text-[10px] text-white/25 mt-1 flex items-center gap-2 flex-wrap" style={{ fontFamily:"var(--font-label)" }}>
                            <span>{h.createdAt ? format(new Date(h.createdAt), "dd MMMM yyyy, HH:mm", { locale: tr }) : "—"}</span>
                            <span>· {h.adminName}</span>
                          </div>
                        </div>
                        <span className="text-sm flex-shrink-0" style={{ color: h.amount >= 0 ? "var(--color-success)" : "var(--color-error)", fontFamily:"var(--font-display)" }}>
                          {h.amount >= 0 ? "+" : ""}{h.amount.toLocaleString("tr-TR")} XP
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Katılım Modalı (Geldi / Gelmedi) ══ */}
      <AnimatePresence>
        {attendModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setAttendModal(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>DERS TAMAMLA — KATILIM</h3>
                <button onClick={() => setAttendModal(null)} className="text-white/25 hover:text-white transition-colors p-1"><X size={18} /></button>
              </div>
          <div className="space-y-4">
            <div className="p-3 glass rounded-xl space-y-1">
              <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>
                {format(new Date(attendModal.date), "dd MMMM yyyy", { locale: tr })} · {attendModal.startTime}–{attendModal.endTime}
              </div>
              {attendModal.lessonType !== "bireysel" && (
                <div className="text-xs" style={{ color:"#A855F7", fontFamily:"var(--font-label)" }}>
                  {attendModal.lessonType === "duet" ? "Düet Ders" : "Grup Ders"}
                </div>
              )}
            </div>

            <p className="text-xs text-white/40" style={{ fontFamily:"var(--font-label)" }}>
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
                  <div key={studentId} className="p-3 glass rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>
                          {name}
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                            style={{ background:"rgba(255,255,255,0.05)", color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>
                            {role === "creator" ? "Oluşturan" : "Partner"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color:invInfo.color, fontFamily:"var(--font-label)" }}>
                            {invInfo.label}
                          </span>
                          <span className="text-[10px] text-white/25" style={{ fontFamily:"var(--font-label)" }}>
                            · {std?.remainingLessons ?? "?"} ders kaldı
                          </span>
                        </div>
                      </div>
                    </div>

                    {canDeduct ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAttendances(p => ({ ...p, [studentId]: true }))}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${attended ? "bg-green-600 text-white" : "border border-white/15 text-white/40 hover:border-green-600/40"}`}
                          style={{ fontFamily:"var(--font-label)" }}>
                          <UserCheck size={13}/>Geldi
                        </button>
                        <button
                          onClick={() => setAttendances(p => ({ ...p, [studentId]: false }))}
                          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${!attended ? "bg-red-700 text-white" : "border border-white/15 text-white/40 hover:border-red-600/40"}`}
                          style={{ fontFamily:"var(--font-label)" }}>
                          <UserX size={13}/>Gelmedi
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs italic" style={{ color:"rgba(255,255,255,0.25)", fontFamily:"var(--font-label)" }}>
                        {invite === "declined" ? "Reddetti — ders düşülmeyecek" : "Henüz onaylamadı — ders düşülmeyecek"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Uyarılar */}
            {attendWarnings.length > 0 && (
              <div className="p-3 rounded-xl space-y-1" style={{ background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.2)" }}>
                {attendWarnings.map((w, i) => (
                  <p key={i} className="text-xs" style={{ color:"var(--color-achievement)", fontFamily:"var(--font-label)" }}>{w}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setAttendModal(null)}
                className="flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase rounded-lg text-white/40 hover:text-white transition-all"
                style={{ fontFamily: "var(--font-label)" }}>Vazgeç</button>
              <button onClick={handleAttendanceSubmit} disabled={attendSaving}
                className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase text-white rounded-lg transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-40"
                style={{ fontFamily: "var(--font-label)" }}>
                {attendSaving ? "Kaydediliyor…" : "Tamamla"}
              </button>
            </div>
          </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Ders Notu Modalı ══ */}
      <AnimatePresence>
        {noteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setNoteModal(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-2xl rounded-2xl p-5 max-h-[85vh] overflow-y-auto flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                  {noteModal.lessonType === "duet" ? "DÜET DERS NOTU EKLE" : "DERS NOTU EKLE"}
                </h3>
                <button onClick={() => setNoteModal(null)} className="text-white/25 hover:text-white transition-colors p-1"><X size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto">
        {(() => {
          const isDuet = noteModal.lessonType === "duet";
          const duetParticipants = isDuet
            ? (aptStudents[noteModal.id] ?? []).filter(s => s.inviteStatus === "accepted")
            : [];

          /* ── Düet: iki öğrenci paneli ── */
          if (isDuet && duetParticipants.length > 0) {
            return (
              <div className="space-y-5">
                {/* Randevu bilgisi */}
                <div className="p-3 glass rounded-xl">
                  <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>
                    {duetParticipants.map(s => students.find(st => st.id === s.studentId)?.fullName || s.studentName || "?").join(" + ")}
                  </div>
                  <div className="text-xs text-white/30" style={{ fontFamily:"var(--font-label)" }}>
                    Düet Ders · {noteModal.date} · {noteModal.startTime}–{noteModal.endTime}
                  </div>
                </div>

                {/* Her öğrenci için ayrı not paneli */}
                {duetParticipants.map((apSt, idx) => {
                  const name = students.find(s => s.id === apSt.studentId)?.fullName || apSt.studentName || "Öğrenci";
                  const sScores = perStudentScores[apSt.studentId] ?? { conditioning:7, punch:7, kick:7, defense:7, combination:7, sparring:7, overall:7 };
                  const sNote   = perStudentNotes[apSt.studentId] ?? "";
                  return (
                    <div key={apSt.studentId} className="glass rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{ background: idx === 0 ? "rgba(220,38,38,0.8)" : "rgba(139,92,246,0.8)", color: "#fff", fontFamily:"var(--font-display)" }}>
                          {idx + 1}
                        </div>
                        <span className="text-sm font-semibold" style={{ color: idx === 0 ? "#F87171" : "#C4B5FD", fontFamily:"var(--font-label)" }}>
                          {name}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {SCORE_KEYS.map(k => (
                          <div key={k} className="space-y-1">
                            <label className="text-xs text-white/40 tracking-wider" style={{ fontFamily:"var(--font-label)" }}>{SCORE_TR[k]}</label>
                            <div className="flex items-center gap-2">
                              <input type="range" min="1" max="10" value={sScores[k]}
                                onChange={e => setPerStudentScores(p => ({
                                  ...p,
                                  [apSt.studentId]: { ...(p[apSt.studentId] ?? sScores), [k]: Number(e.target.value) },
                                }))}
                                className="flex-1" style={{ accentColor: "#A78BFA" }} />
                              <span className="text-sm w-6 text-center" style={{ color: "#A78BFA", fontFamily:"var(--font-display)" }}>{sScores[k]}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-label)" }}>Antrenör Notu</label>
                        <textarea
                          value={sNote}
                          onChange={e => setPerStudentNotes(p => ({ ...p, [apSt.studentId]: e.target.value }))}
                          rows={2}
                          placeholder={`${name} için ders notu...`}
                          className="glass w-full text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none rounded-lg resize-none"
                          style={{ fontFamily: "var(--font-label)" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          /* ── Bireysel: mevcut tek öğrenci formu ── */
          return (
            <div className="space-y-4">
              <div className="p-3 glass rounded-xl">
                <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>{noteModal.studentName}</div>
                <div className="text-xs text-white/30" style={{ fontFamily:"var(--font-label)" }}>{noteModal.date} · {noteModal.startTime}–{noteModal.endTime}</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SCORE_KEYS.map(k => (
                  <div key={k} className="space-y-1">
                    <label className="text-xs text-white/40 tracking-wider" style={{ fontFamily:"var(--font-label)" }}>{SCORE_TR[k]}</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min="1" max="10" value={scores[k]}
                        onChange={e => setScores(p => ({ ...p, [k]: Number(e.target.value) }))}
                        className="flex-1" style={{ accentColor: "#A78BFA" }} />
                      <span className="text-sm w-6 text-center" style={{ color: "#A78BFA", fontFamily:"var(--font-display)" }}>{scores[k]}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-label)" }}>Antrenör Notu</label>
                <textarea
                  value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                  placeholder="Derste neler yapıldı..."
                  className="glass w-full text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none rounded-lg resize-none"
                  style={{ fontFamily: "var(--font-label)" }}
                />
              </div>
            </div>
          );
        })()}
              </div>
              {noteModal && (
                <div className="flex gap-3 mt-4 flex-shrink-0">
                  <button onClick={() => setNoteModal(null)}
                    className="flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase rounded-lg text-white/40 hover:text-white transition-all"
                    style={{ fontFamily: "var(--font-label)" }}>Atla</button>
                  <button onClick={handleSaveNote} disabled={saving}
                    className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase text-white rounded-lg transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-40"
                    style={{ fontFamily: "var(--font-label)" }}>
                    {saving ? "Kaydediliyor…" : (noteModal.lessonType === "duet" ? "İkisini de Kaydet" : "Notu Kaydet")}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ══ Admin İptal Modalı ══ */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={() => setCancelTarget(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>RANDEVUYU İPTAL ET</h3>
                <button onClick={() => setCancelTarget(null)} className="text-white/25 hover:text-white transition-colors p-1"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div className="p-3 rounded-xl space-y-0.5" style={{ background:"rgba(239,68,68,0.05)", border:"1px solid rgba(239,68,68,0.2)" }}>
                  <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>
                    {aptDisplayName(cancelTarget)}
                  </div>
                  <div className="text-xs text-white/40" style={{ fontFamily:"var(--font-label)" }}>
                    {format(new Date(cancelTarget.date), "dd MMMM yyyy", { locale: tr })} · {cancelTarget.startTime}–{cancelTarget.endTime}
                  </div>
                </div>
                <div className="p-3 glass rounded-xl space-y-1">
                  {["Ders hakkı otomatik olarak öğrenciye geri yüklenecek", "Öğrenciye bildirim gönderilecek", "Bu işlem geri alınamaz"].map(line => (
                    <p key={line} className="text-xs text-white/40" style={{ fontFamily:"var(--font-label)" }}>• {line}</p>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase" style={{ fontFamily: "var(--font-label)" }}>İptal Sebebi (isteğe bağlı)</label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    rows={2}
                    placeholder="Öğrenciye iletilecek sebep..."
                    className="glass w-full text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none rounded-lg resize-none"
                    style={{ fontFamily: "var(--font-label)" }}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCancelTarget(null)}
                    className="flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase rounded-lg text-white/40 hover:text-white transition-all"
                    style={{ fontFamily: "var(--font-label)" }}>Vazgeç</button>
                  <button
                    onClick={handleAdminCancel}
                    disabled={cancelBusy}
                    className="flex-1 py-2.5 text-sm font-semibold tracking-wider uppercase transition-all rounded-lg"
                    style={{
                      background: cancelBusy ? "rgba(239,68,68,0.5)" : "rgba(239,68,68,0.85)",
                      color: "#fff",
                      fontFamily: "var(--font-label)",
                      opacity: cancelBusy ? 0.7 : 1,
                    }}>
                    {cancelBusy ? "İptal ediliyor..." : "Randevuyu İptal Et"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>

    {/* ══ BİLDİRİM PANELİ ve GİRİŞ TOAST ═════════════════════════ */}
    <AnimatePresence>
      {notifOpen && (
        <>
          {/* Overlay */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={() => setNotifOpen(false)} />
          {/* Panel — mobilde alt yarı, desktop'ta tam yükseklik sağ kenar */}
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type:"spring", damping:28, stiffness:280 }}
            className="fixed right-0 z-50 w-full sm:w-[420px] flex flex-col"
            style={{
              background: "#18181B",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
              // iOS safe-area: üst ve alt boşlukları dahil et
              top:    0,
              bottom: 0,
              maxHeight: "100dvh",          // dynamic viewport height
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}>

            {/* Panel header — sticky, safe-area-inset-top ile durum çubuğunun altına iner */}
            <div
              className="flex items-center justify-between border-b flex-shrink-0"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                // iPhone notch / Dynamic Island için safe area
                paddingTop:    "calc(env(safe-area-inset-top, 0px) + 14px)",
                paddingBottom: "14px",
                paddingLeft:   "20px",
                paddingRight:  "12px",
              }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell size={16} style={{ color: "var(--color-achievement)" }} className="flex-shrink-0"/>
                <span className="text-white tracking-wider text-lg truncate" style={{ fontFamily:"var(--font-display)" }}>
                  BİLDİRİMLER
                </span>
                {unreadNotifs > 0 && (
                  <span className="text-xs text-white px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "var(--color-violet)" }}>{unreadNotifs} yeni</span>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {unreadNotifs > 0 && (
                  <button
                    onClick={async () => {
                      await markAllAdminNotificationsRead();
                      const fresh = await getAdminNotifications();
                      setNotifs(fresh);
                    }}
                    className="hidden sm:block text-xs px-2.5 py-1 transition-colors"
                    style={{ color:"rgba(255,255,255,0.35)", border:"1px solid rgba(255,255,255,0.1)", fontFamily:"var(--font-label)" }}>
                    Tümünü okundu yap
                  </button>
                )}
                {/* X butonu — min 44×44px dokunma alanı */}
                <button
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center justify-center rounded-full"
                  style={{
                    minWidth: 44, minHeight: 44,
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.6)",
                  }}
                  aria-label="Kapat">
                  <X size={18}/>
                </button>
              </div>
            </div>

            {/* Mobilde "Tümünü okundu yap" ikinci satıra iner */}
            {unreadNotifs > 0 && (
              <div className="sm:hidden flex-shrink-0 px-4 py-2 border-b" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
                <button
                  onClick={async () => {
                    await markAllAdminNotificationsRead();
                    const fresh = await getAdminNotifications();
                    setNotifs(fresh);
                  }}
                  className="w-full text-xs py-2 transition-colors"
                  style={{ color:"rgba(255,255,255,0.4)", border:"1px solid rgba(255,255,255,0.08)", fontFamily:"var(--font-label)" }}>
                  Tümünü okundu yap
                </button>
              </div>
            )}

            {/* Liste — scroll içerik */}
            <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling:"touch" }}>
              {notifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                  <Bell size={32} style={{ color:"rgba(255,255,255,0.08)" }}/>
                  <p className="text-sm" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"var(--font-label)" }}>Henüz bildirim yok</p>
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
                            <p className="text-xs font-semibold leading-tight" style={{ color: n.isRead ? "rgba(255,255,255,0.4)" : "#fff", fontFamily:"var(--font-label)" }}>
                              {n.title}
                            </p>
                            {!n.isRead && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ background: borderColor }} />}
                          </div>
                          <p className="text-xs mt-0.5 leading-relaxed" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
                            {n.message}
                          </p>
                          <p className="text-[10px] mt-1" style={{ color:"rgba(255,255,255,0.18)", fontFamily:"var(--font-label)" }}>
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
            <div className="flex-shrink-0 px-5 pt-4 border-t"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
              }}>
              <Link href="/admin/bildirimler"
                className="flex items-center justify-center gap-2 w-full py-3 text-xs tracking-widest uppercase transition-colors"
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "var(--font-label)",
                  minHeight: 44,   // touch target
                }}
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
                  <p className="text-xs font-semibold text-white" style={{ fontFamily:"var(--font-label)" }}>
                    {loginToast.title}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color:"rgba(255,255,255,0.45)", fontFamily:"var(--font-label)" }}>
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
                  style={{ border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
                  Okundu Yap
                </button>
                <button
                  onClick={() => { setNotifOpen(true); setLoginToast(null); }}
                  className="flex-1 py-2 text-xs tracking-widest uppercase text-white"
                  style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", fontFamily:"var(--font-label)" }}>
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
