"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStudents, getPayments, addPayment, deletePayment, updatePayment,
  getGyms, getGymReports, getIncomeMovements, updateIncomeMovement, getAppointments,
  getGroupLessons, createGroupLesson, updateGroupLesson, deactivateGroupLesson,
  getGroupLessonMembers, addGroupLessonMember, removeGroupLessonMember,
  getGroupLessonPayments, getGroupLessonSessions, ensureCurrentMonthPeriods,
  markGroupPaymentPaid, setGroupSessionCount, sendGroupPaymentReminder,
  getOtherIncome, addOtherIncome, deleteOtherIncome,
  type GymReport,
} from "@/lib/db";
import type {
  Student, Payment, PaymentRecordStatus, Gym, IncomeMovement, Appointment,
  GroupLesson, GroupLessonMember, GroupLessonPayment, GroupLessonSession, OtherIncome, OtherIncomeType,
} from "@/lib/types";
import { LESSON_PRICES } from "@/lib/constants";
import {
  Plus, Trash2, ChevronDown, ChevronUp, X, Check, Edit2, Clock, CreditCard, AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  type TimeRange, getRangeBounds, computeKpis, buildRevenueSeries, buildSparkline,
  buildPendingAccrualSparkline, buildActiveStudentGrowthSparkline, computeFinanceSnapshots,
  rankTopPayingStudents, computePaymentStatusBreakdown, computeGymPerformance,
  computeBottomStats, generateAiInsights,
} from "@/lib/financeCenter";
import { computeAllGroupPerformance, computeCategoryTotals } from "@/lib/groupLessonFinance";
import { STATUS_CFG, StatusBadge } from "@/app/components/finance/StatusBadge";
import FinanceKpiCard from "@/app/components/finance/FinanceKpiCard";
import FinanceTimeFilter from "@/app/components/finance/FinanceTimeFilter";
import RevenueAreaChart from "@/app/components/finance/RevenueAreaChart";
import FinanceAiCard from "@/app/components/finance/FinanceAiCard";
import GymPerformanceCard from "@/app/components/finance/GymPerformanceCard";
import FinanceSnapshotRow from "@/app/components/finance/FinanceSnapshotRow";
import TopPayingStudentsCard from "@/app/components/finance/TopPayingStudentsCard";
import PaymentStatusDonut from "@/app/components/finance/PaymentStatusDonut";
import TransactionFeed, {
  EMPTY_TRANSACTION_FILTERS, applyTransactionFilters, type TransactionFilters,
} from "@/app/components/finance/TransactionFeed";
import MonthlyGoalCard from "@/app/components/finance/MonthlyGoalCard";
import FinanceQuickActions from "@/app/components/finance/FinanceQuickActions";
import BottomStatsGrid from "@/app/components/finance/BottomStatsGrid";
import FinanceSkeleton from "@/app/components/finance/FinanceSkeleton";
import CategoryBreakdownCards from "@/app/components/finance/CategoryBreakdownCards";
import GroupLessonsSection from "@/app/components/finance/GroupLessonsSection";
import OtherIncomeModule from "@/app/components/finance/OtherIncomeModule";
import type { GroupLessonFormData } from "@/app/components/finance/GroupLessonForm";
import CountUpNumber from "@/app/components/finance/CountUpNumber";

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ── Paket fiyatı hesapla ─────────────────────────────────────────── */
function getPackagePrice(s: Student): number | null {
  if (s.subscriptionType === "monthly") return s.monthlyFee ?? null;
  if (s.customPrice && s.customPrice > 0) return s.customPrice;
  return LESSON_PRICES[s.totalLessons] ?? null;
}

/* ── Ay etiketi ───────────────────────────────────────────────────── */
const monthLabel = (ym: string) =>
  format(parseISO(`${ym}-01`), "MMMM yyyy", { locale: tr });

/* ── Aylık grupla (sadece odendi) ─────────────────────────────────── */
function groupByMonth(payments: Payment[]): Record<string, Payment[]> {
  return payments
    .filter(p => p.status === "odendi")
    .reduce<Record<string, Payment[]>>((acc, p) => {
      const m = p.paidAt.substring(0, 7);
      if (!acc[m]) acc[m] = [];
      acc[m].push(p);
      return acc;
    }, {});
}

/* ── Input bileşeni ───────────────────────────────────────────────── */
function F({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
        style={{ fontFamily: "var(--font-label)" }}>
        {label}{required && " *"}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="glass w-full text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none transition-colors rounded-lg"
        style={{ fontFamily: "var(--font-label)" }} />
    </div>
  );
}

/* ── Ödeme kartı (mobil + desktop) ───────────────────────────────── */
function PaymentCard({
  p, onEdit, onDelete,
}: {
  p: Payment; onEdit: (p: Payment) => void; onDelete: (id: string) => void;
}) {
  const c = STATUS_CFG[p.status];
  return (
    <div className="glass relative overflow-hidden rounded-lg transition-transform hover:scale-[1.005]"
      style={{ borderColor: `${c.bar}30` }}>
      {/* Durum şeridi */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ background: c.bar }} />

      <div className="pl-4 pr-3 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {/* Tarih — gizli küçük ekranda, inline büyük */}
        <div className="hidden sm:block w-14 flex-shrink-0">
          <div className="text-[11px] text-white/35 leading-tight" style={{ fontFamily: "var(--font-label)" }}>
            {format(parseISO(p.paidAt), "dd MMM", { locale: tr })}
          </div>
        </div>

        {/* Öğrenci + detay */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white leading-tight" style={{ fontFamily: "var(--font-label)" }}>
              {p.studentName}
            </span>
            {/* Tarih — mobil */}
            <span className="sm:hidden text-[10px] text-white/30" style={{ fontFamily: "var(--font-label)" }}>
              {format(parseISO(p.paidAt), "dd MMM yyyy", { locale: tr })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px]"
              style={{ color: p.method === "aylik" ? "#A78BFA" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
              {p.method === "aylik" ? "Aylık Üyelik" :
               p.method === "nakit" ? "Nakit" :
               p.method === "havale" ? "Havale/EFT" :
               p.method === "kredi" ? "Kredi Kartı" :
               p.method === "papara" ? "Papara" : p.method}
            </span>
            {p.notes && (
              <>
                <span className="text-white/15 text-[10px]">·</span>
                <span className="text-[11px] text-white/25 truncate max-w-[140px]" style={{ fontFamily: "var(--font-label)" }}>
                  {p.notes}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tutar + durum */}
        <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end flex-shrink-0">
          <StatusBadge status={p.status} />
          <span className="text-base font-black tabular-nums"
            style={{ fontFamily: "var(--font-display)", color: c.color, minWidth: 80, textAlign: "right", letterSpacing: "0.04em" }}>
            {p.amount > 0 ? `₺${p.amount.toLocaleString("tr-TR")}` : "—"}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(p)} title="Düzenle"
              className="p-1.5 text-white/20 hover:text-white/70 transition-colors">
              <Edit2 size={12} />
            </button>
            <button onClick={() => onDelete(p.id)} title="Sil" className="p-1.5 text-white/20 transition-colors"
              onMouseEnter={e => (e.currentTarget.style.color = "var(--color-error)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.2)")}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ANA SAYFA
══════════════════════════════════════════════════════════════════ */
export default function OdemelerPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gyms, setGyms]                       = useState<Gym[]>([]);
  const [gymReports, setGymReports]           = useState<GymReport[]>([]);
  const [incomeMovements, setIncomeMovements] = useState<IncomeMovement[]>([]);
  const [appointments, setAppointments]       = useState<Appointment[]>([]);
  const [initialLoading, setInitialLoading]   = useState(true);

  /* Grup Dersi Finans Modülü */
  const [groupLessons, setGroupLessons]   = useState<GroupLesson[]>([]);
  const [groupMembers, setGroupMembers]   = useState<GroupLessonMember[]>([]);
  const [groupPayments, setGroupPayments] = useState<GroupLessonPayment[]>([]);
  const [groupSessions, setGroupSessions] = useState<GroupLessonSession[]>([]);
  const [otherIncome, setOtherIncome]     = useState<OtherIncome[]>([]);

  /* Zaman filtresi + gelir grafiği granularity */
  const [timeRange, setTimeRange] = useState<TimeRange>("month");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");

  /* Gelir Hareketleri (Son Finans Hareketleri) filtreleri */
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>(EMPTY_TRANSACTION_FILTERS);
  const [editingShareId, setEditingShareId] = useState<string | null>(null);
  const [editingShareValue, setEditingShareValue] = useState("");

  /* Form */
  const [addOpen, setAddOpen]     = useState(false);
  const [selStudent, setSelStudent] = useState("");
  const [amount, setAmount]       = useState("");
  const [method, setMethod]       = useState("nakit");
  const [paidDate, setPaidDate]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [payStatus, setPayStatus] = useState<PaymentRecordStatus>("odendi");
  const [note, setNote]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  /* Düzenleme */
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount]   = useState("");
  const [editStatus, setEditStatus]   = useState<PaymentRecordStatus>("odendi");
  const [editMethod, setEditMethod]   = useState("nakit");
  const [editNote, setEditNote]       = useState("");
  const [editSaving, setEditSaving]   = useState(false);

  /* Silme */
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* Açık aylar */
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const [s, p, g, gr, im, ap, gl, glm, glp, gls, oi] = await Promise.all([
      getStudents(), getPayments(),
      getGyms().catch(() => []),
      getGymReports().catch(() => []),
      getIncomeMovements().catch(() => []),
      getAppointments().catch(() => []),
      getGroupLessons().catch(() => []),
      getGroupLessonMembers().catch(() => []),
      getGroupLessonPayments().catch(() => []),
      getGroupLessonSessions().catch(() => []),
      getOtherIncome().catch(() => []),
    ]);
    setStudents(s);
    setPayments(p);
    setGyms(g);
    setGymReports(gr);
    setIncomeMovements(im);
    setAppointments(ap);
    setGroupLessons(gl);
    setGroupMembers(glm);
    setGroupPayments(glp);
    setGroupSessions(gls);
    setOtherIncome(oi);
  }, []);

  useEffect(() => {
    ensureCurrentMonthPeriods().catch(() => {}).finally(() => {
      reload().then(() => {
        const thisMonth = format(new Date(), "yyyy-MM");
        setOpenMonths(new Set([thisMonth]));
        setInitialLoading(false);
      });
    });
  }, [reload]);

  /* ── Öğrenci seçilince fiyatı otomatik doldur ─────────────────────── */
  const handleStudentChange = (id: string) => {
    setSelStudent(id);
    const s = students.find(x => x.id === id);
    if (!s) return;
    const price = getPackagePrice(s);
    if (price) setAmount(String(price));
  };

  /* ══════════════════════════════════════════════════════════════════
     TÜRETİLMİŞ FİNANS VERİLERİ — lib/financeCenter.ts (client-side, salt okunur)
     ══════════════════════════════════════════════════════════════════ */
  const kpis = useMemo(
    () => computeKpis(incomeMovements, payments, students, timeRange, customRange),
    [incomeMovements, payments, students, timeRange, customRange],
  );

  /* Toplam Gelir (tüm zamanlar) — yeni hesaplama değil, zaten yüklü incomeMovements'tan
     salt görüntüleme amaçlı toplama (computeBottomStats'ın iç mantığıyla birebir aynı). */
  const totalRevenueAllTime = useMemo(
    () => incomeMovements.filter(m => m.status === "odendi").reduce((sum, m) => sum + m.paymentAmount, 0),
    [incomeMovements],
  );

  const revenueSeries = useMemo(() => {
    const b = getRangeBounds(timeRange, customRange);
    return buildRevenueSeries(incomeMovements, b.from, b.to, granularity);
  }, [incomeMovements, timeRange, customRange, granularity]);

  const revenueSparkline = useMemo(() => buildSparkline(incomeMovements, 14, "paymentAmount"), [incomeMovements]);
  const netSparkline     = useMemo(() => buildSparkline(incomeMovements, 14, "trainerNetAmount"), [incomeMovements]);
  const gymShareSparkline = useMemo(() => buildSparkline(incomeMovements, 14, "gymShareAmount"), [incomeMovements]);
  const pendingSparkline  = useMemo(() => buildPendingAccrualSparkline(payments, 14), [payments]);
  const studentGrowthSparkline = useMemo(() => buildActiveStudentGrowthSparkline(students, 14), [students]);

  const aiInsights = useMemo(
    () => generateAiInsights(incomeMovements, appointments, gymReports),
    [incomeMovements, appointments, gymReports],
  );

  const gymPerformance = useMemo(() => computeGymPerformance(gymReports), [gymReports]);
  const snapshots = useMemo(() => computeFinanceSnapshots(incomeMovements, appointments), [incomeMovements, appointments]);

  const topStudents = useMemo(() => {
    const ranked = rankTopPayingStudents(incomeMovements, appointments, 5);
    const byId = new Map(students.map(s => [s.id, s]));
    return ranked.map(r => ({ ...r, avatarUrl: byId.get(r.studentId)?.avatarUrl }));
  }, [incomeMovements, appointments, students]);

  const paymentStatusSlices = useMemo(() => computePaymentStatusBreakdown(students), [students]);
  const bottomStats = useMemo(() => computeBottomStats(appointments, incomeMovements, gymReports), [appointments, incomeMovements, gymReports]);
  const filteredMovements = useMemo(() => applyTransactionFilters(incomeMovements, transactionFilters), [incomeMovements, transactionFilters]);

  /* ── Grup Dersi Finans Modülü — türetilmiş veriler ─────────────────── */
  const groupPerformances = useMemo(
    () => computeAllGroupPerformance(groupLessons, groupMembers, groupPayments, groupSessions),
    [groupLessons, groupMembers, groupPayments, groupSessions],
  );
  const categoryTotals = useMemo(
    () => computeCategoryTotals(incomeMovements, groupPerformances, otherIncome),
    [incomeMovements, groupPerformances, otherIncome],
  );
  const activeGroupMemberCount = useMemo(
    () => groupMembers.filter(m => m.isActive && groupLessons.some(g => g.id === m.groupId && g.isActive)).length,
    [groupMembers, groupLessons],
  );

  /* ── Aylık gruplar (odendi) — Payment kayıtları için Ekle/Düzenle/Sil ── */
  const thisMonthKey = format(new Date(), "yyyy-MM");
  const pendingOnly  = payments.filter(p => p.status === "beklemede" || p.status === "gecikti");
  const overduePayments = useMemo(() => payments.filter(p => p.status === "gecikti"), [payments]);
  const byMonth      = groupByMonth(payments);
  const sortedMonths = Object.keys(byMonth).sort().reverse();

  const toggleMonth = (m: string) => {
    setOpenMonths(prev => {
      const n = new Set(prev);
      n.has(m) ? n.delete(m) : n.add(m);
      return n;
    });
  };

  const handleSaveShare = async (m: IncomeMovement) => {
    const value = Number(editingShareValue);
    if (isNaN(value)) return;
    await updateIncomeMovement(m.id, { gymShareAmount: value, trainerNetAmount: m.paymentAmount - value });
    await reload();
    setEditingShareId(null);
  };

  /* ── Ödeme ekle ──────────────────────────────────────────────────── */
  const openAdd = () => {
    setSelStudent(""); setAmount(""); setMethod("nakit");
    setPaidDate(format(new Date(), "yyyy-MM-dd")); setPayStatus("odendi"); setNote("");
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!selStudent || !amount) return;
    setSaving(true);
    const student = students.find(s => s.id === selStudent)!;
    await addPayment({
      studentId: selStudent, studentName: student.fullName,
      amount: Number(amount), paidAt: paidDate, method, notes: note.trim() || undefined,
      status: payStatus,
    });
    await reload();
    const addedMonth = paidDate.substring(0, 7);
    setOpenMonths(prev => new Set([...prev, addedMonth]));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    setAddOpen(false);
  };

  /* ── Ödeme düzenle ───────────────────────────────────────────────── */
  const openEdit = (p: Payment) => {
    setEditPayment(p);
    setEditAmount(String(p.amount));
    setEditStatus(p.status);
    setEditMethod(p.method);
    setEditNote(p.notes ?? "");
  };

  const handleEdit = async () => {
    if (!editPayment) return;
    setEditSaving(true);
    await updatePayment(editPayment.id, {
      amount: Number(editAmount),
      status: editStatus,
      method: editMethod,
      notes:  editNote.trim() || undefined,
    });
    await reload();
    setEditSaving(false);
    setEditPayment(null);
  };

  /* ── Ödeme sil ───────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePayment(deleteId);
    await reload();
    setDeleteId(null);
  };

  /* ── Grup Dersi Finans Modülü — CRUD ───────────────────────────────── */
  const handleCreateGroup = async (data: GroupLessonFormData) => {
    await createGroupLesson({
      name: data.name, gymId: data.gymId || undefined, trainerName: data.trainerName || undefined,
      feePerStudent: data.feePerStudent, shareType: data.shareType,
      gymPercentage: data.gymPercentage, fixedFeePerLesson: data.fixedFeePerLesson,
      fixedMonthlyRent: data.fixedMonthlyRent, maxCapacity: data.maxCapacity,
      startDate: data.startDate, endDate: data.endDate || undefined,
      description: data.description || undefined, isActive: data.isActive,
    });
    await ensureCurrentMonthPeriods();
    await reload();
  };

  const handleUpdateGroup = async (id: string, data: GroupLessonFormData) => {
    await updateGroupLesson(id, {
      name: data.name, gymId: data.gymId || undefined, trainerName: data.trainerName || undefined,
      feePerStudent: data.feePerStudent, shareType: data.shareType,
      gymPercentage: data.gymPercentage, fixedFeePerLesson: data.fixedFeePerLesson,
      fixedMonthlyRent: data.fixedMonthlyRent, maxCapacity: data.maxCapacity,
      startDate: data.startDate, endDate: data.endDate || undefined,
      description: data.description || undefined, isActive: data.isActive,
    });
    await reload();
  };

  const handleDeactivateGroup = async (id: string) => {
    await deactivateGroupLesson(id);
    await reload();
  };

  const handleAddGroupMember = async (groupId: string, data: { fullName: string; studentId?: string; phone?: string }) => {
    await addGroupLessonMember({
      groupId, studentId: data.studentId, fullName: data.fullName, phone: data.phone,
      joinedAt: format(new Date(), "yyyy-MM-dd"), isActive: true,
    });
    await ensureCurrentMonthPeriods();
    await reload();
  };

  const handleRemoveGroupMember = async (id: string) => {
    await removeGroupLessonMember(id);
    await reload();
  };

  const handleMarkGroupPaymentPaid = async (id: string) => {
    await markGroupPaymentPaid(id);
    await reload();
  };

  const handleSendGroupReminder = async (studentId: string, groupName: string, amount: number) => {
    await sendGroupPaymentReminder(studentId, groupName, amount);
  };

  const handleSetGroupSessionCount = async (groupId: string, periodMonth: string, count: number) => {
    await setGroupSessionCount(groupId, periodMonth, count);
    await reload();
  };

  const handleAddOtherIncome = async (data: { incomeType: OtherIncomeType; description?: string; amount: number; incomeDate: string }) => {
    await addOtherIncome(data);
    await reload();
  };

  const handleDeleteOtherIncome = async (id: string) => {
    await deleteOtherIncome(id);
    await reload();
  };

  const selectedStudent = students.find(s => s.id === selStudent);
  const packagePrice    = selectedStudent ? getPackagePrice(selectedStudent) : null;

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="relative overflow-hidden">
      {/* Dashboard arka planı — hafif hareketli ışık efekti, dekoratif */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="animate-float-slow absolute rounded-full"
          style={{ width: 420, height: 420, top: -140, right: -120, background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)", filter: "blur(60px)" }} />
        <div className="animate-float-medium absolute rounded-full"
          style={{ width: 360, height: 360, bottom: -100, left: -140, background: "radial-gradient(circle, rgba(236,72,153,0.06), transparent 70%)", filter: "blur(60px)" }} />
      </div>

    <motion.div variants={stagger} initial="initial" animate="animate" className="relative max-w-6xl mx-auto space-y-6 pb-20">

      {/* Hero */}
      <motion.div variants={fadeUp} className="glass-strong relative overflow-hidden rounded-3xl">
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                FİNANS MERKEZİ
              </h1>
              <p className="text-xs sm:text-sm text-white/40 mt-1" style={{ fontFamily: "var(--font-label)" }}>
                {payments.length} ödeme kaydı · {gyms.filter(g => g.isActive).length} aktif salon
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {saved && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
                    <Check size={13} /> Kaydedildi
                  </motion.div>
                )}
              </AnimatePresence>
              <FinanceQuickActions onAddPayment={openAdd} movements={filteredMovements} kpis={kpis} />
            </div>
          </div>

          {/* Toplam Gelir — büyük tek kart */}
          <div className="mt-6 glass rounded-2xl p-5 sm:p-6 inline-flex flex-col">
            <span className="text-[10px] sm:text-xs text-white/35 tracking-widest uppercase" style={{ fontFamily: "var(--font-label)" }}>
              Toplam Gelir (Tüm Zamanlar)
            </span>
            <span className="text-3xl sm:text-4xl mt-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-achievement)" }}>
              <CountUpNumber value={totalRevenueAllTime} prefix="₺" />
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── YENİ ÖDEME FORMU ──────────────────────────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ opacity: 0, y: -14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10 }}
            className="glass-strong relative rounded-2xl overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px gradient-animated gradient-slow gradient-violet-pink-orange" />
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                  YENİ ÖDEME EKLE
                </h2>
                <button onClick={() => setAddOpen(false)} className="text-white/25 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                {/* Öğrenci seç */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-label)" }}>Öğrenci *</label>
                  <select value={selStudent} onChange={e => handleStudentChange(e.target.value)}
                    className="glass w-full text-white px-3 py-2.5 text-sm outline-none transition-colors appearance-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }}>
                    <option value="" className="bg-carbon">Öğrenci seçin...</option>
                    {students.filter(s => s.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName)).map(s => (
                      <option key={s.id} value={s.id} className="bg-carbon">
                        {s.fullName} ({s.code})
                      </option>
                    ))}
                  </select>
                  {/* Paket fiyatı bilgisi */}
                  {selectedStudent && (
                    <p className="text-[10px] mt-1 flex items-center gap-1.5" style={{ fontFamily: "var(--font-label)" }}>
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>
                        {selectedStudent.subscriptionType === "monthly" ? "Aylık üyelik" :
                         `${selectedStudent.totalLessons} ders paketi`}
                      </span>
                      {packagePrice && (
                        <span style={{ color: "#FBBF24" }}>— Fiyat: ₺{packagePrice.toLocaleString("tr-TR")}</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Miktar */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-label)" }}>Miktar (₺) *</label>
                  <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="glass w-full px-3 py-2.5 text-lg outline-none transition-colors rounded-lg"
                    style={{ fontFamily: "var(--font-display)", letterSpacing: "0.05em", color: "var(--color-success)" }} />
                </div>

                {/* Durum */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-label)" }}>Ödeme Durumu</label>
                  <select value={payStatus} onChange={e => setPayStatus(e.target.value as PaymentRecordStatus)}
                    className="glass w-full text-white px-3 py-2.5 text-sm outline-none transition-colors appearance-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }}>
                    <option value="odendi" className="bg-carbon">✅ Ödendi</option>
                    <option value="beklemede" className="bg-carbon">🟡 Beklemede</option>
                    <option value="gecikti" className="bg-carbon">🔴 Gecikti</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                {/* Tarih */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-label)" }}>Tarih *</label>
                  <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
                    className="glass w-full text-white px-3 py-2.5 text-sm outline-none transition-colors rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }} />
                </div>

                {/* Yöntem */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-label)" }}>Yöntem</label>
                  <select value={method} onChange={e => setMethod(e.target.value)}
                    className="glass w-full text-white px-3 py-2.5 text-sm outline-none transition-colors appearance-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }}>
                    <option value="nakit" className="bg-carbon">Nakit</option>
                    <option value="havale" className="bg-carbon">Havale / EFT</option>
                    <option value="kredi" className="bg-carbon">Kredi Kartı</option>
                    <option value="papara" className="bg-carbon">Papara</option>
                    <option value="aylik" className="bg-carbon">Aylık Üyelik</option>
                  </select>
                </div>

                <F label="Not" value={note} onChange={setNote} placeholder="Paket adı, detay..." />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setAddOpen(false)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ fontFamily: "var(--font-label)" }}>Vazgeç</button>
                <button onClick={handleAdd} disabled={!selStudent || !amount || saving}
                  className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-3 rounded-lg transition-transform hover:scale-[1.01] active:scale-95"
                  style={{ fontFamily: "var(--font-label)" }}>
                  {saving ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {initialLoading ? (
        <FinanceSkeleton />
      ) : (
        <motion.div variants={fadeUp} className="space-y-6">
          {/* ── KATEGORİ KIRILIMI — Özel Ders / Grup Dersi / Diğer / Toplam ── */}
          <CategoryBreakdownCards
            totals={categoryTotals}
            activeGroupCount={groupPerformances.length}
            activeGroupMemberCount={activeGroupMemberCount}
            otherIncomeCount={otherIncome.filter(o => o.incomeDate.startsWith(format(new Date(), "yyyy-MM"))).length}
          />

          {/* ── ZAMAN FİLTRESİ ────────────────────────────────────── */}
          <FinanceTimeFilter range={timeRange} onRangeChange={setTimeRange} custom={customRange} onCustomChange={setCustomRange} />

          {/* ── KPI KARTLARI ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <FinanceKpiCard index={0} label="Toplam Ciro" value={kpis.totalRevenue.value} prefix="₺"
              sub="Seçilen dönem" deltaLabel={kpis.totalRevenue.deltaLabel} deltaPositive={kpis.totalRevenue.deltaPositive}
              icon={<CreditCard size={16} />} color="#FBBF24" sparkline={revenueSparkline} />
            <FinanceKpiCard index={1} label="Net Kazanç" value={kpis.netEarnings.value} prefix="₺"
              sub="Salon payı düşülmüş" deltaLabel={kpis.netEarnings.deltaLabel} deltaPositive={kpis.netEarnings.deltaPositive}
              icon={<Check size={16} />} color="#4ADE80" sparkline={netSparkline} />
            <FinanceKpiCard index={2} label="Salonlara Ödenecek" value={kpis.owedToGyms.value} prefix="₺"
              sub="Tüm zamanlar" deltaLabel={kpis.owedToGyms.deltaLabel} deltaPositive={kpis.owedToGyms.deltaPositive}
              icon={<Clock size={16} />} color="#A855F7" sparkline={gymShareSparkline} />
            <FinanceKpiCard index={3} label="Bekleyen Tahsilatlar" value={kpis.pendingCollections.value} prefix="₺"
              sub="Tüm zamanlar" deltaLabel={kpis.pendingCollections.deltaLabel} deltaPositive={kpis.pendingCollections.deltaPositive}
              icon={<Clock size={16} />} color="#F87171" sparkline={pendingSparkline} />
            <FinanceKpiCard index={4} label="Aktif Öğrenci" value={kpis.activeStudents.value}
              sub="Şu an aktif" deltaLabel={kpis.activeStudents.deltaLabel} deltaPositive={kpis.activeStudents.deltaPositive}
              icon={<Plus size={16} />} color="#60A5FA" sparkline={studentGrowthSparkline} />
            <FinanceKpiCard index={5} label="Geciken Ödeme" value={overduePayments.length}
              sub="Ödeme kaydı" deltaLabel={overduePayments.length > 0 ? "Takip gerekiyor" : "Gecikme yok"} deltaPositive={overduePayments.length > 0 ? false : null}
              icon={<AlertTriangle size={16} />} color="#F87171" />
          </div>

          {/* ── GELİR GRAFİĞİ + KEDİ AI ANALİZ ───────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <RevenueAreaChart data={revenueSeries} granularity={granularity} onGranularityChange={setGranularity} />
            </div>
            <FinanceAiCard insights={aiInsights} />
          </div>

          {/* ── KÂR ANALİZİ — mevcut net kazanç verilerinin birleşik sunumu ── */}
          <div className="relative rounded-2xl p-[1px] overflow-hidden gradient-animated gradient-slow gradient-green-teal gradient-border-quiet">
            <div className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="text-sm uppercase tracking-widest text-white/40 mb-4" style={{ fontFamily: "var(--font-label)" }}>
                Kâr Analizi
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-label)" }}>
                    Net Kazanç (Seçilen Dönem)
                  </div>
                  <div className="text-2xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-success)" }}>
                    <CountUpNumber value={kpis.netEarnings.value} prefix="₺" />
                  </div>
                  <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: "var(--font-label)" }}>{kpis.netEarnings.deltaLabel}</p>
                </div>
                <div>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-label)" }}>
                    Bu Ay Net Kazanç
                  </div>
                  <div className="text-2xl" style={{ fontFamily: "var(--font-display)", color: "#60A5FA" }}>
                    <CountUpNumber value={categoryTotals.netKazanc} prefix="₺" />
                  </div>
                  <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: "var(--font-label)" }}>Özel ders + grup dersi + diğer gelirler</p>
                </div>
                <div>
                  <div className="text-[10px] text-white/25 uppercase tracking-widest mb-1" style={{ fontFamily: "var(--font-label)" }}>
                    Salonlara Ödenecek
                  </div>
                  <div className="text-2xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-error)" }}>
                    <CountUpNumber value={kpis.owedToGyms.value} prefix="₺" />
                  </div>
                  <p className="text-[11px] text-white/30 mt-0.5" style={{ fontFamily: "var(--font-label)" }}>Tüm zamanlar</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── SALON PERFORMANSLARI ─────────────────────────────── */}
          {gymPerformance.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-1 pb-2">
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-display)" }}>
                  Salon Performansları
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {gymPerformance.map((r, i) => <GymPerformanceCard key={r.gym.id} r={r} index={i} />)}
              </div>
            </div>
          )}

          {/* ── GRUP DERSLERİ ─────────────────────────────────────── */}
          <GroupLessonsSection
            groups={groupLessons} members={groupMembers} payments={groupPayments} sessions={groupSessions}
            gyms={gyms} students={students}
            onCreateGroup={handleCreateGroup} onUpdateGroup={handleUpdateGroup} onDeactivateGroup={handleDeactivateGroup}
            onAddMember={handleAddGroupMember} onRemoveMember={handleRemoveGroupMember}
            onMarkPaid={handleMarkGroupPaymentPaid} onSendReminder={handleSendGroupReminder}
            onSetSessionCount={handleSetGroupSessionCount}
          />

          {/* ── FİNANS ÖZETİ — Bugün / Hafta / Ay ────────────────── */}
          <FinanceSnapshotRow snapshots={snapshots} />

          {/* ── TOP ÖĞRENCİLER + ÖDEME DURUMU ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopPayingStudentsCard students={topStudents} />
            <PaymentStatusDonut slices={paymentStatusSlices} />
          </div>

          {/* ── SON FİNANS HAREKETLERİ ────────────────────────────── */}
          <TransactionFeed
            movements={filteredMovements}
            students={students}
            gyms={gyms}
            filters={transactionFilters}
            onFiltersChange={patch => setTransactionFilters(prev => ({ ...prev, ...patch }))}
            editingShareId={editingShareId}
            editingShareValue={editingShareValue}
            onShareEditStart={m => { setEditingShareId(m.id); setEditingShareValue(String(m.gymShareAmount)); }}
            onShareValueChange={setEditingShareValue}
            onShareSave={handleSaveShare}
            onShareCancel={() => setEditingShareId(null)}
          />

          {/* ── DİĞER GELİRLER ────────────────────────────────────── */}
          <OtherIncomeModule entries={otherIncome} onAdd={handleAddOtherIncome} onDelete={handleDeleteOtherIncome} />

          {/* ── AYLIK HEDEF ───────────────────────────────────────── */}
          <MonthlyGoalCard currentRevenue={snapshots.month.revenue} />

          {/* ── BEKLEYENLER / GECİKMİŞLER (Payment kayıtları) ────── */}
          {pendingOnly.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-1 pb-2">
                <Clock size={13} style={{ color: "#FBBF24" }} />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-display)" }}>
                  Bekleyen / Gecikmiş Ödemeler
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", fontFamily: "var(--font-label)" }}>
                  {pendingOnly.length}
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <div className="space-y-2">
                {pendingOnly.sort((a, b) => b.paidAt.localeCompare(a.paidAt)).map(p => (
                  <PaymentCard key={p.id} p={p} onEdit={openEdit} onDelete={setDeleteId} />
                ))}
              </div>
            </div>
          )}

          {/* ── ÖDEME KAYITLARI — AYLIK GEÇMİŞ (Ekle/Düzenle/Sil) ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Check size={13} style={{ color: "#4ADE80" }} />
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-display)" }}>
                Ödeme Kayıtları — Aylık Geçmiş (Ekle / Düzenle / Sil)
              </span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {sortedMonths.length === 0 && (
              <div className="glass text-center py-12 rounded-xl">
                <CreditCard size={32} className="text-white/10 mx-auto mb-3" />
                <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-label)" }}>Henüz ödeme kaydı yok</p>
              </div>
            )}

            {sortedMonths.map(month => {
              const monthPayments = byMonth[month].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
              const monthTotal    = monthPayments.reduce((s, p) => s + p.amount, 0);
              const isOpen        = openMonths.has(month);
              const isThisMonth   = month === thisMonthKey;

              return (
                <div key={month} className="glass overflow-hidden transition-colors rounded-xl"
                  style={{ borderColor: isThisMonth ? "rgba(34,197,94,0.3)" : undefined }}>
                  <button onClick={() => toggleMonth(month)}
                    className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-base tracking-wider"
                        style={{ fontFamily: "var(--font-display)", color: isThisMonth ? "var(--color-success)" : "#fff" }}>
                        {monthLabel(month).toUpperCase()}
                      </div>
                      {isThisMonth && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", color: "var(--color-success)", fontFamily: "var(--font-label)" }}>Bu Ay</span>
                      )}
                      <span className="text-[11px] text-white/30" style={{ fontFamily: "var(--font-label)" }}>
                        {monthPayments.length} ödeme
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg" style={{ fontFamily: "var(--font-display)", color: "var(--color-success)" }}>
                        ₺{monthTotal.toLocaleString("tr-TR")}
                      </span>
                      {isOpen ? <ChevronUp size={15} className="text-white/30" /> : <ChevronDown size={15} className="text-white/30" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                        className="overflow-hidden">
                        <div className="border-t border-white/5 p-2 sm:p-3 space-y-1.5">
                          {monthPayments.map(p => (
                            <PaymentCard key={p.id} p={p} onEdit={openEdit} onDelete={setDeleteId} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* ── İSTATİSTİKLER ─────────────────────────────────────── */}
          <BottomStatsGrid stats={bottomStats} />
        </motion.div>
      )}

      {/* ── DÜZENLEME MODALI ──────────────────────────────────────── */}
      <AnimatePresence>
        {editPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => !editSaving && setEditPayment(null)}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
            <motion.div initial={{ scale: 0.94, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-sm rounded-2xl overflow-hidden p-5"
              onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-px gradient-animated gradient-slow gradient-violet-pink-orange" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>ÖDEMEYİ DÜZENLE</h3>
                <button onClick={() => setEditPayment(null)} className="text-white/25 hover:text-white"><X size={16} /></button>
              </div>
              <p className="text-xs text-white/40 mb-4 pb-3 border-b border-white/8" style={{ fontFamily: "var(--font-label)" }}>
                {editPayment.studentName}
              </p>
              <div className="space-y-3">
                {/* Durum */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-label)" }}>Ödeme Durumu</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["odendi", "beklemede", "gecikti"] as const).map(st => {
                      const c = STATUS_CFG[st];
                      return (
                        <button key={st} onClick={() => setEditStatus(st)}
                          className="py-2 text-[11px] font-semibold transition-all rounded"
                          style={{
                            background: editStatus === st ? `${c.bar}22` : "rgba(255,255,255,0.03)",
                            border: `1px solid ${editStatus === st ? c.bar + "66" : "rgba(255,255,255,0.08)"}`,
                            color: editStatus === st ? c.color : "rgba(255,255,255,0.35)",
                            fontFamily: "var(--font-label)",
                          }}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tutar */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-label)" }}>Tutar (₺)</label>
                  <input type="number" min="0" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    className="glass w-full px-3 py-2.5 text-lg outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-success)" }} />
                </div>

                {/* Yöntem */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-label)" }}>Yöntem</label>
                  <select value={editMethod} onChange={e => setEditMethod(e.target.value)}
                    className="glass w-full text-white px-3 py-2.5 text-sm outline-none appearance-none rounded-lg"
                    style={{ fontFamily: "var(--font-label)" }}>
                    <option value="nakit" className="bg-carbon">Nakit</option>
                    <option value="havale" className="bg-carbon">Havale / EFT</option>
                    <option value="kredi" className="bg-carbon">Kredi Kartı</option>
                    <option value="papara" className="bg-carbon">Papara</option>
                    <option value="aylik" className="bg-carbon">Aylık Üyelik</option>
                  </select>
                </div>

                <F label="Not" value={editNote} onChange={setEditNote} placeholder="Açıklama..." />
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setEditPayment(null)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-label)" }}>Vazgeç</button>
                <button onClick={handleEdit} disabled={editSaving}
                  className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-lg transition-transform hover:scale-[1.01] active:scale-95"
                  style={{ fontFamily: "var(--font-label)" }}>
                  {editSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SİLME ONAYI ───────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteId(null)}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
            <motion.div initial={{ scale: 0.94, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-sm rounded-2xl overflow-hidden p-5"
              style={{ borderColor: "rgba(239,68,68,0.3)" }}
              onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,var(--color-error),transparent)" }} />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Trash2 size={16} style={{ color: "var(--color-error)" }} />
                </div>
                <div>
                  <h3 className="text-base text-white" style={{ fontFamily: "var(--font-display)" }}>ÖDEMEYİ SİL</h3>
                  {(() => {
                    const p = payments.find(x => x.id === deleteId);
                    return p ? (
                      <p className="text-[11px] text-white/30" style={{ fontFamily: "var(--font-label)" }}>
                        {p.studentName} · ₺{p.amount.toLocaleString("tr-TR")}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
              <p className="text-sm text-white/40 mb-4" style={{ fontFamily: "var(--font-label)" }}>
                Bu kayıt silinecek. &quot;Ödendi&quot; durumundaysa öğrencinin bakiyesi düzeltilir.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-label)" }}>Vazgeç</button>
                <button onClick={handleDelete}
                  className="flex-1 text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-lg transition-transform hover:scale-[1.01] active:scale-95"
                  style={{ background: "var(--color-error)", fontFamily: "var(--font-label)" }}>Evet, Sil</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
}
