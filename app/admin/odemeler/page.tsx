"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStudents, getPayments, addPayment, deletePayment, updatePayment,
  getGyms, getGymReports, getIncomeMovements, getAppointments,
  getGroupLessons, createGroupLesson, updateGroupLesson, deactivateGroupLesson,
  getGroupLessonMembers, addGroupLessonMember, removeGroupLessonMember,
  getGroupLessonPayments, getGroupLessonSessions, ensureCurrentMonthPeriods,
  markGroupPaymentPaid, setGroupSessionCount, sendGroupPaymentReminder,
  getOtherIncome, addOtherIncome, updateOtherIncome, deleteOtherIncome,
  getExpenses, addExpense, updateExpense, deleteExpense,
  getRefunds, addRefund, deleteRefund, deleteIncomeMovement,
  type GymReport,
} from "@/lib/db";
import type {
  Student, Payment, PaymentRecordStatus, Gym, IncomeMovement, Appointment,
  GroupLesson, GroupLessonMember, GroupLessonPayment, GroupLessonSession,
  OtherIncome, OtherIncomeType, Expense, ExpenseCategory, Refund,
} from "@/lib/types";
import { ChevronRight, X } from "lucide-react";
import { format } from "date-fns";
import {
  type TimeRange, getRangeBounds,
} from "@/lib/financeCenter";
import {
  buildUnifiedTransactions, computeNetSummary, buildFlowSeries,
  applyTxFilters, EMPTY_TX_FILTERS, type UnifiedTransaction, type TxFilters,
} from "@/lib/financeUnified";
import { STATUS_CFG } from "@/app/components/finance/StatusBadge";
import FinanceHero from "@/app/components/finance/FinanceHero";
import SimpleFlowChart from "@/app/components/finance/SimpleFlowChart";
import FinanceAiInsight from "@/app/components/finance/FinanceAiInsight";
import TransactionList from "@/app/components/finance/TransactionList";
import TransactionDetailSheet from "@/app/components/finance/TransactionDetailSheet";
import PendingCollections from "@/app/components/finance/PendingCollections";
import CollectPaymentModal, { type CollectPaymentData } from "@/app/components/finance/CollectPaymentModal";
import AddMovementModal, { type MovementFormData } from "@/app/components/finance/AddMovementModal";
import RefundModal from "@/app/components/finance/RefundModal";
import FinanceReports from "@/app/components/finance/FinanceReports";
import FinanceSkeleton from "@/app/components/finance/FinanceSkeleton";
import GroupLessonsSection from "@/app/components/finance/GroupLessonsSection";
import type { GroupLessonFormData } from "@/app/components/finance/GroupLessonForm";

const RANGE_LABELS: Record<TimeRange, string> = {
  today: "Bugün", week: "Bu hafta", month: "Bu ay", lastMonth: "Geçen ay", year: "Bu yıl", custom: "Seçilen dönemde",
};

const fadeUp = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ── Payment → resolve helper (unified işlem satırından orijinal ödemeye) ── */
function resolvePaymentForTx(
  tx: UnifiedTransaction, movements: IncomeMovement[], payments: Payment[],
): { movement: IncomeMovement; payment: Payment } | null {
  if (tx.kind !== "ozel_ders") return null;
  const movementId = tx.id.replace(/^im-/, "");
  const movement = movements.find(m => m.id === movementId);
  if (!movement || !movement.paymentId) return null;
  const payment = payments.find(p => p.id === movement.paymentId);
  if (!payment) return null;
  return { movement, payment };
}

/* ── Küçük ortak metin girişi (Ödeme düzenleme modalı için) ─────────── */
function F({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="bg-white/[0.03] border border-white/10 w-full text-white placeholder-white/20 px-3 py-2.5 text-base sm:text-sm outline-none rounded-lg"
        style={{ fontFamily: "var(--font-label)" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ANA SAYFA — FİNANS MERKEZİ
   Hiyerarşi: Net Kazanç → Gelir|Gider|Bekleyen → grafik → Son Hareketler
   → Bekleyen Tahsilatlar → +Gelir/−Gider → ayrı Raporlar sekmesi.
══════════════════════════════════════════════════════════════════ */
export default function OdemelerPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymReports, setGymReports] = useState<GymReport[]>([]);
  const [incomeMovements, setIncomeMovements] = useState<IncomeMovement[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const [groupLessons, setGroupLessons] = useState<GroupLesson[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupLessonMember[]>([]);
  const [groupPayments, setGroupPayments] = useState<GroupLessonPayment[]>([]);
  const [groupSessions, setGroupSessions] = useState<GroupLessonSession[]>([]);
  const [otherIncome, setOtherIncome] = useState<OtherIncome[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);

  const [tab, setTab] = useState<"ozet" | "raporlar" | "gruplar">("ozet");

  const [range, setRange] = useState<TimeRange>("month");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");
  const [txFilters, setTxFilters] = useState<TxFilters>(EMPTY_TX_FILTERS);

  const [selectedTx, setSelectedTx] = useState<UnifiedTransaction | null>(null);
  const [addMovementMode, setAddMovementMode] = useState<"income" | "expense" | null>(null);
  const [editMovement, setEditMovement] = useState<{ mode: "income" | "expense"; id: string; initial: MovementFormData } | null>(null);
  const [refundTarget, setRefundTarget] = useState<{ paymentId: string; studentId?: string; studentName: string; maxAmount: number } | null>(null);
  const [collectTarget, setCollectTarget] = useState<{ studentId: string; studentName: string; amountDue: number } | null>(null);

  /* Ödeme düzenleme modalı — MEVCUT mantık, aynen korunuyor */
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editStatus, setEditStatus] = useState<PaymentRecordStatus>("odendi");
  const [editMethod, setEditMethod] = useState("nakit");
  const [editNote, setEditNote] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const reload = useCallback(async () => {
    const [s, p, g, gr, im, ap, gl, glm, glp, gls, oi, ex, rf] = await Promise.all([
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
      getExpenses().catch(() => []),
      getRefunds().catch(() => []),
    ]);
    setStudents(s); setPayments(p); setGyms(g); setGymReports(gr);
    setIncomeMovements(im); setAppointments(ap);
    setGroupLessons(gl); setGroupMembers(glm); setGroupPayments(glp); setGroupSessions(gls);
    setOtherIncome(oi); setExpenses(ex); setRefunds(rf);
  }, []);

  useEffect(() => {
    ensureCurrentMonthPeriods().catch(() => {}).finally(() => {
      reload().then(() => setInitialLoading(false));
    });
  }, [reload]);

  /* ── Türetilmiş finans verileri ─────────────────────────────────── */
  const unified = useMemo(() => buildUnifiedTransactions({
    movements: incomeMovements, payments, groupPayments, groupMembers, groupLessons,
    otherIncome, expenses, refunds,
  }), [incomeMovements, payments, groupPayments, groupMembers, groupLessons, otherIncome, expenses, refunds]);

  // Kaynak KASITLI olarak students.amountDue — bkz. PendingCollections.tsx içindeki not
  // (payments tablosundaki tekil "beklemede" satırları farklı bir akıştan borç
  // kapatıldığında hayalet/eski kayıt olarak kalabiliyor, amountDue her zaman günceldir).
  const pendingTotal = useMemo(
    () => students.filter(s => s.isActive && s.amountDue > 0).reduce((s, st) => s + st.amountDue, 0),
    [students],
  );

  const netSummary = useMemo(
    () => computeNetSummary(unified, pendingTotal, range, customRange),
    [unified, pendingTotal, range, customRange],
  );

  const flowSeries = useMemo(() => {
    const b = getRangeBounds(range, customRange);
    return buildFlowSeries(unified, b.from, b.to, granularity);
  }, [unified, range, customRange, granularity]);

  const filteredUnified = useMemo(() => applyTxFilters(unified, txFilters), [unified, txFilters]);

  /* ── + Gelir / − Gider ──────────────────────────────────────────── */
  const handleAddMovement = async (mode: "income" | "expense", data: MovementFormData) => {
    if (mode === "income") {
      await addOtherIncome({
        incomeType: data.category as OtherIncomeType, description: data.description,
        amount: data.amount, incomeDate: data.date, paymentMethod: data.paymentMethod,
      });
    } else {
      await addExpense({
        category: data.category as ExpenseCategory, description: data.description,
        amount: data.amount, expenseDate: data.date, paymentMethod: data.paymentMethod, gymId: data.gymId,
      });
    }
    await reload();
  };

  const handleEditMovement = async (mode: "income" | "expense", id: string, data: MovementFormData) => {
    if (mode === "income") {
      await updateOtherIncome(id, {
        incomeType: data.category as OtherIncomeType, description: data.description,
        amount: data.amount, incomeDate: data.date, paymentMethod: data.paymentMethod,
      });
    } else {
      await updateExpense(id, {
        category: data.category as ExpenseCategory, description: data.description,
        amount: data.amount, expenseDate: data.date, paymentMethod: data.paymentMethod, gymId: data.gymId,
      });
    }
    await reload();
  };

  const handleAddRefund = async (data: { paymentId: string; studentId?: string; studentName: string; amount: number; reason?: string; refundDate: string }) => {
    await addRefund(data);
    await reload();
  };

  /* ── Bekleyen Tahsilatlar → "Tahsil Et" ─────────────────────────────
     MEVCUT addPayment() akışını kullanır — öğrenci detayındaki "Ödeme Al"
     ile AYNI fonksiyon: students.amount_paid/amount_due otomatik güncellenir,
     income_movements'a tek bir "odendi" kaydı düşer, duplicate oluşmaz. */
  const handleCollectPayment = async (studentId: string, studentName: string, data: CollectPaymentData) => {
    await addPayment({
      studentId, studentName, amount: data.amount,
      paidAt: format(new Date(), "yyyy-MM-dd"), method: data.method, status: "odendi",
      notes: "Finans Merkezi'nden tahsil edildi",
    });
    await reload();
  };

  /* ── Ödeme düzenle (mevcut mantık, aynen) ──────────────────────────── */
  const openEdit = (p: Payment) => {
    setEditPayment(p);
    setEditAmount(String(p.amount));
    setEditStatus(p.status);
    setEditMethod(p.method);
    setEditNote(p.notes ?? "");
  };

  const handleEditPayment = async () => {
    if (!editPayment) return;
    setEditSaving(true);
    await updatePayment(editPayment.id, {
      amount: Number(editAmount), status: editStatus, method: editMethod, notes: editNote.trim() || undefined,
    });
    await reload();
    setEditSaving(false);
    setEditPayment(null);
  };

  /* ── Grup Dersi Finans Modülü — CRUD (mevcut mantık, aynen) ────────── */
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
  const handleDeactivateGroup = async (id: string) => { await deactivateGroupLesson(id); await reload(); };
  const handleAddGroupMember = async (groupId: string, data: { fullName: string; studentId?: string; phone?: string }) => {
    await addGroupLessonMember({ groupId, studentId: data.studentId, fullName: data.fullName, phone: data.phone, joinedAt: format(new Date(), "yyyy-MM-dd"), isActive: true });
    await ensureCurrentMonthPeriods();
    await reload();
  };
  const handleRemoveGroupMember = async (id: string) => { await removeGroupLessonMember(id); await reload(); };
  const handleMarkGroupPaymentPaid = async (id: string) => { await markGroupPaymentPaid(id); await reload(); };
  const handleSendGroupReminder = async (studentId: string, groupName: string, amount: number) => { await sendGroupPaymentReminder(studentId, groupName, amount); };
  const handleSetGroupSessionCount = async (groupId: string, periodMonth: string, count: number) => { await setGroupSessionCount(groupId, periodMonth, count); await reload(); };

  /* ── Seçili işlem satırı → düzenle/sil/iade aksiyonlarını çözümle ──── */
  const txActions = useMemo(() => {
    if (!selectedTx) return null;
    const kind = selectedTx.kind;

    if (kind === "ozel_ders") {
      const resolved = resolvePaymentForTx(selectedTx, incomeMovements, payments);
      if (!resolved) {
        // Bağlı payment kaydı bulunamadı (örn. öğrenci silindiğinde payments
        // satırı cascade silinmiş ama income_movements yetim kalmış) — en
        // azından bu hayalet hareketi kaldırılabilir kılalım.
        const movementId = selectedTx.id.replace(/^im-/, "");
        return { onDelete: async () => { await deleteIncomeMovement(movementId); await reload(); } };
      }
      const alreadyRefunded = refunds.filter(r => r.paymentId === resolved.payment.id).reduce((s, r) => s + r.amount, 0);
      const maxRefund = resolved.movement.paymentAmount - alreadyRefunded;
      return {
        onEdit: () => { openEdit(resolved.payment); setSelectedTx(null); },
        onDelete: async () => { await deletePayment(resolved.payment.id); await reload(); },
        onRefund: maxRefund > 0 ? () => {
          setRefundTarget({ paymentId: resolved.payment.id, studentId: resolved.movement.studentId, studentName: resolved.movement.studentName, maxAmount: maxRefund });
          setSelectedTx(null);
        } : undefined,
      };
    }
    if (kind === "diger_gelir") {
      const id = selectedTx.id.replace(/^oi-/, "");
      const entry = otherIncome.find(o => o.id === id);
      if (!entry) return {};
      return {
        onEdit: () => {
          setEditMovement({ mode: "income", id, initial: { amount: entry.amount, category: entry.incomeType, description: entry.description, date: entry.incomeDate, paymentMethod: entry.paymentMethod ?? "nakit" } });
          setSelectedTx(null);
        },
        onDelete: async () => { await deleteOtherIncome(id); await reload(); },
      };
    }
    if (kind === "gider") {
      const id = selectedTx.id.replace(/^ex-/, "");
      const entry = expenses.find(e => e.id === id);
      if (!entry) return {};
      return {
        onEdit: () => {
          setEditMovement({ mode: "expense", id, initial: { amount: entry.amount, category: entry.category, description: entry.description, date: entry.expenseDate, paymentMethod: entry.paymentMethod ?? "nakit", gymId: entry.gymId } });
          setSelectedTx(null);
        },
        onDelete: async () => { await deleteExpense(id); await reload(); },
      };
    }
    if (kind === "iade") {
      const id = selectedTx.id.replace(/^rf-/, "");
      return { onDelete: async () => { await deleteRefund(id); await reload(); } };
    }
    return {}; // grup_ders — salt görüntüleme, "Grup Dersleri" sekmesinden yönetilir
  }, [selectedTx, incomeMovements, payments, refunds, otherIncome, expenses, reload]);

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="relative max-w-4xl mx-auto space-y-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}>
      {/* Sekmeler */}
      <div className="no-scrollbar flex items-center gap-1 p-0.5 rounded-lg border border-white/8 w-fit max-w-full overflow-x-auto">
        {([["ozet", "Özet"], ["raporlar", "Raporlar"], ["gruplar", "Grup Dersleri"]] as const).map(([value, label]) => (
          <button key={value} onClick={() => setTab(value)}
            className="px-3.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex-shrink-0"
            style={{
              background: tab === value ? "rgba(255,255,255,0.08)" : "transparent",
              color: tab === value ? "#fff" : "rgba(255,255,255,0.4)",
              fontFamily: "var(--font-label)",
              minHeight: 40,
            }}>
            {label}
          </button>
        ))}
      </div>

      {initialLoading ? (
        <FinanceSkeleton />
      ) : tab === "ozet" ? (
        <motion.div initial="initial" animate="animate" className="space-y-5">
          <motion.div variants={fadeUp}>
            <FinanceHero summary={netSummary} range={range} onRangeChange={setRange} custom={customRange} onCustomChange={setCustomRange} />
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
            <div className="lg:col-span-2 min-w-0">
              <SimpleFlowChart data={flowSeries} granularity={granularity} onGranularityChange={setGranularity} />
            </div>
            <div className="min-w-0">
              <FinanceAiInsight summary={netSummary} rangeLabel={RANGE_LABELS[range] ?? "Bu dönem"} />
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] uppercase tracking-widest text-white/40" style={{ fontFamily: "var(--font-label)" }}>Son Hareketler</span>
            </div>
            <TransactionList transactions={filteredUnified} filters={txFilters} onFiltersChange={patch => setTxFilters(prev => ({ ...prev, ...patch }))} onRowClick={setSelectedTx} limit={30} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <PendingCollections students={students} payments={payments}
              onCollect={(studentId, studentName, amountDue) => setCollectTarget({ studentId, studentName, amountDue })} />
          </motion.div>

          <motion.div variants={fadeUp} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAddMovementMode("income")}
                className="flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-semibold uppercase transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "var(--color-success)", fontFamily: "var(--font-label)", minHeight: 48 }}>
                + Gelir Ekle
              </button>
              <button onClick={() => setAddMovementMode("expense")}
                className="flex items-center justify-center gap-2 px-3 rounded-lg text-xs font-semibold uppercase transition-transform hover:scale-[1.02] active:scale-95"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--color-error)", fontFamily: "var(--font-label)", minHeight: 48 }}>
                − Gider Ekle
              </button>
            </div>
            <Link href="/admin/ogrenciler"
              className="flex items-center justify-center sm:justify-end gap-1 text-xs text-white/40 hover:text-white transition-colors py-2"
              style={{ fontFamily: "var(--font-label)" }}>
              Öğrenciye Ödeme Al <ChevronRight size={13} />
            </Link>
          </motion.div>
        </motion.div>
      ) : tab === "raporlar" ? (
        <FinanceReports unified={unified} movements={incomeMovements} appointments={appointments} gymReports={gymReports} students={students} />
      ) : (
        <GroupLessonsSection
          groups={groupLessons} members={groupMembers} payments={groupPayments} sessions={groupSessions}
          gyms={gyms} students={students}
          onCreateGroup={handleCreateGroup} onUpdateGroup={handleUpdateGroup} onDeactivateGroup={handleDeactivateGroup}
          onAddMember={handleAddGroupMember} onRemoveMember={handleRemoveGroupMember}
          onMarkPaid={handleMarkGroupPaymentPaid} onSendReminder={handleSendGroupReminder}
          onSetSessionCount={handleSetGroupSessionCount}
        />
      )}

      {/* ── İşlem detay sayfası ─────────────────────────────────────── */}
      {selectedTx && (
        <TransactionDetailSheet
          tx={selectedTx} onClose={() => setSelectedTx(null)}
          onEdit={txActions?.onEdit} onDelete={txActions?.onDelete} onRefund={txActions?.onRefund}
        />
      )}

      {/* ── Bekleyen tahsilatı tahsil et ──────────────────────────────── */}
      {collectTarget && (
        <CollectPaymentModal studentName={collectTarget.studentName} maxAmount={collectTarget.amountDue}
          onClose={() => setCollectTarget(null)}
          onSave={data => handleCollectPayment(collectTarget.studentId, collectTarget.studentName, data)} />
      )}

      {/* ── + Gelir / − Gider ekle ──────────────────────────────────── */}
      {addMovementMode && (
        <AddMovementModal mode={addMovementMode} gyms={gyms} onClose={() => setAddMovementMode(null)}
          onSave={data => handleAddMovement(addMovementMode, data)} />
      )}

      {/* ── Gelir/Gider düzenle ─────────────────────────────────────── */}
      {editMovement && (
        <AddMovementModal mode={editMovement.mode} gyms={gyms} initial={editMovement.initial}
          onClose={() => setEditMovement(null)}
          onSave={data => handleEditMovement(editMovement.mode, editMovement.id, data)} />
      )}

      {/* ── İade oluştur ────────────────────────────────────────────── */}
      {refundTarget && (
        <RefundModal studentName={refundTarget.studentName} maxAmount={refundTarget.maxAmount}
          paymentId={refundTarget.paymentId} studentId={refundTarget.studentId}
          onClose={() => setRefundTarget(null)} onSave={handleAddRefund} />
      )}

      {/* ── Ödeme düzenle — mevcut modal, aynen korunuyor ─────────────── */}
      <AnimatePresence>
        {editPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => !editSaving && setEditPayment(null)}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
            <motion.div initial={{ scale: 0.96, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-strong relative z-10 w-[92vw] sm:w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-5"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4 gap-2">
                <h3 className="text-lg text-white" style={{ fontFamily: "var(--font-display)" }}>ÖDEMEYİ DÜZENLE</h3>
                <button onClick={() => setEditPayment(null)} aria-label="Kapat" className="text-white/30 hover:text-white p-2 -m-2 flex-shrink-0"><X size={16} /></button>
              </div>
              <p className="text-xs text-white/40 mb-4 pb-3 border-b border-white/8 truncate" style={{ fontFamily: "var(--font-label)" }}>
                {editPayment.studentName}
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Ödeme Durumu</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["odendi", "beklemede", "gecikti"] as const).map(st => {
                      const c = STATUS_CFG[st];
                      return (
                        <button key={st} onClick={() => setEditStatus(st)}
                          className="text-[11px] font-semibold transition-all rounded"
                          style={{
                            background: editStatus === st ? `${c.bar}22` : "rgba(255,255,255,0.03)",
                            border: `1px solid ${editStatus === st ? c.bar + "66" : "rgba(255,255,255,0.08)"}`,
                            color: editStatus === st ? c.color : "rgba(255,255,255,0.35)",
                            fontFamily: "var(--font-label)",
                            minHeight: 40,
                          }}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Tutar (₺)</label>
                  <input type="number" min="0" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    className="bg-white/[0.03] border border-white/10 w-full px-3 py-2.5 text-lg outline-none rounded-lg"
                    style={{ fontFamily: "var(--font-display)", color: "var(--color-success)" }} />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Yöntem</label>
                  <select value={editMethod} onChange={e => setEditMethod(e.target.value)}
                    className="bg-white/[0.03] border border-white/10 text-white w-full px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
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
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase rounded-lg transition-colors"
                  style={{ fontFamily: "var(--font-label)", minHeight: 44 }}>Vazgeç</button>
                <button onClick={handleEditPayment} disabled={editSaving}
                  className="flex-1 disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase rounded-lg transition-colors"
                  style={{ background: "var(--color-achievement)", color: "#1a1005", fontFamily: "var(--font-label)", minHeight: 44 }}>
                  {editSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
