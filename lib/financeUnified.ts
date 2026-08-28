/**
 * lib/financeUnified.ts — Finans Merkezi'nin GERÇEK TAHSİLAT birleştirme katmanı.
 *
 * Beş kaynağı (özel ders income_movements, grup dersi ödemeleri, diğer
 * gelirler, giderler, iadeler) tek bir imzalı (signed) hareket listesine
 * indirger. Sadece gerçekten tahsil edilmiş/kaydedilmiş tutarlar dahil
 * edilir — paket fiyatı veya "beklenen" hiçbir tutar buraya girmez.
 * Tamamen client-side, Supabase çağrısı yok.
 */
import type {
  IncomeMovement, OtherIncome, OtherIncomeType, Expense, ExpenseCategory,
  Refund, FinancePaymentMethod, GroupLessonPayment, GroupLessonMember, GroupLesson, Payment,
} from "./types";
import { type TimeRange, getRangeBounds } from "./financeCenter";
import { format, parseISO, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";

const D = (d: Date) => format(d, "yyyy-MM-dd");

export type FinanceMovementKind = "ozel_ders" | "grup_ders" | "diger_gelir" | "gider" | "iade";

export interface UnifiedTransaction {
  id: string;
  kind: FinanceMovementKind;
  date: string; // yyyy-MM-dd
  title: string;
  subtitle?: string;
  /** İmzalı tutar — gelir pozitif, gider/iade negatif */
  amount: number;
  paymentMethod?: FinancePaymentMethod;
  isIncome: boolean;
}

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  salon_kirasi: "Salon Kirası", salon_payi: "Salon Payı", ekipman: "Ekipman",
  reklam: "Reklam", ulasim: "Ulaşım", fatura: "Fatura", personel: "Personel",
  vergi_harc: "Vergi / Harç", diger: "Diğer",
};

export const OTHER_INCOME_LABEL: Record<OtherIncomeType, string> = {
  ozel_ders: "Özel Ders", grup_ders: "Grup Ders", urun_satisi: "Ürün Satışı",
  sponsorluk: "Sponsorluk", salon_geliri: "Salon Geliri", diger: "Diğer",
  seminer: "Seminer", workshop: "Workshop", online_ders: "Online Ders", ozel_etkinlik: "Özel Etkinlik",
};

export const PAYMENT_METHOD_LABEL: Record<FinancePaymentMethod, string> = {
  nakit: "Nakit", kart: "Kart", havale_eft: "Havale/EFT", diger: "Diğer",
};

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  yeni_paket: "Yeni Paket", paket_yenileme: "Paket Yenileme",
  ek_odeme: "Ek Ödeme", ders_tamamlama: "Ders Tamamlama",
};

/** Mevcut Payment.method (nakit/havale/kredi/papara/aylik — öğrenci ödeme akışı,
 * DEĞİŞTİRİLMEDİ) → yeni sınırlı Finans Merkezi ödeme yöntemi kümesi eşlemesi. */
function mapLegacyPaymentMethod(method: string): FinancePaymentMethod {
  if (method === "nakit") return "nakit";
  if (method === "havale") return "havale_eft";
  if (method === "kredi") return "kart";
  return "diger"; // papara, aylik, bilinmeyen
}

export function buildUnifiedTransactions(params: {
  movements: IncomeMovement[];
  payments: Payment[];
  groupPayments: GroupLessonPayment[];
  groupMembers: GroupLessonMember[];
  groupLessons: GroupLesson[];
  otherIncome: OtherIncome[];
  expenses: Expense[];
  refunds: Refund[];
}): UnifiedTransaction[] {
  const out: UnifiedTransaction[] = [];
  const paymentById = new Map(params.payments.map(p => [p.id, p]));

  for (const m of params.movements) {
    if (m.status !== "odendi") continue;
    // "ders_tamamlama" tipi 0 tutarlı satırlar gerçek gelir değil — sabit
    // ders-başı salon payı tahakkuku için iç muhasebe kaydı (recordLessonGymAccrual).
    // Bank-app listesinde "+₺0" satırlarıyla gürültü yaratmasın.
    if (m.paymentAmount <= 0) continue;
    const linkedPayment = m.paymentId ? paymentById.get(m.paymentId) : undefined;
    out.push({
      id: `im-${m.id}`, kind: "ozel_ders", date: m.paymentDate,
      title: m.studentName, subtitle: PAYMENT_TYPE_LABEL[m.paymentType],
      amount: m.paymentAmount, isIncome: true,
      paymentMethod: linkedPayment ? mapLegacyPaymentMethod(linkedPayment.method) : undefined,
    });
  }

  const memberById = new Map(params.groupMembers.map(gm => [gm.id, gm]));
  const groupById = new Map(params.groupLessons.map(g => [g.id, g]));
  for (const gp of params.groupPayments) {
    if (gp.status !== "odendi") continue;
    const member = memberById.get(gp.memberId);
    const group = groupById.get(gp.groupId);
    out.push({
      id: `gp-${gp.id}`, kind: "grup_ders", date: gp.paidAt ?? `${gp.periodMonth}-01`,
      title: member?.fullName ?? "Grup Üyesi", subtitle: group?.name,
      amount: gp.amount, isIncome: true,
    });
  }

  for (const oi of params.otherIncome) {
    out.push({
      id: `oi-${oi.id}`, kind: "diger_gelir", date: oi.incomeDate,
      title: OTHER_INCOME_LABEL[oi.incomeType] ?? oi.incomeType, subtitle: oi.description,
      amount: oi.amount, paymentMethod: oi.paymentMethod, isIncome: true,
    });
  }

  for (const e of params.expenses) {
    out.push({
      id: `ex-${e.id}`, kind: "gider", date: e.expenseDate,
      title: EXPENSE_CATEGORY_LABEL[e.category] ?? e.category, subtitle: e.description,
      amount: -e.amount, paymentMethod: e.paymentMethod, isIncome: false,
    });
  }

  for (const r of params.refunds) {
    out.push({
      id: `rf-${r.id}`, kind: "iade", date: r.refundDate,
      title: r.studentName ? `İade — ${r.studentName}` : "İade", subtitle: r.reason,
      amount: -r.amount, isIncome: false,
    });
  }

  return out.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

/* ── Net Özet — hero panel ("Bu ay net kazanç" + Gelir|Gider) ───────── */

export interface NetSummary {
  income: number;
  expense: number; // gider + iade (pozitif, mutlak değer)
  net: number;
  pending: number; // tüm zamanlar bekleyen tahsilat — range'den bağımsız
  deltaLabel: string;
  deltaPositive: boolean | null;
}

function pctDelta(current: number, previous: number): { label: string; positive: boolean | null } {
  if (previous <= 0) {
    if (current <= 0) return { label: "değişim yok", positive: null };
    return { label: "yeni", positive: true };
  }
  const pct = ((current - previous) / previous) * 100;
  return { label: `${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")}%`, positive: pct >= 0 };
}

export function computeNetSummary(
  unified: UnifiedTransaction[],
  pendingTotal: number,
  range: TimeRange,
  custom?: { from: string; to: string },
): NetSummary {
  const b = getRangeBounds(range, custom);
  const inRange = (from: string, to: string) => unified.filter(t => t.date >= from && t.date <= to);
  const sum = (items: UnifiedTransaction[], income: boolean) =>
    items.filter(t => t.isIncome === income).reduce((s, t) => s + Math.abs(t.amount), 0);

  const cur = inRange(b.from, b.to);
  const prev = inRange(b.prevFrom, b.prevTo);
  const curIncome = sum(cur, true), curExpense = sum(cur, false);
  const prevIncome = sum(prev, true), prevExpense = sum(prev, false);
  const curNet = curIncome - curExpense, prevNet = prevIncome - prevExpense;
  const delta = pctDelta(curNet, prevNet);

  return { income: curIncome, expense: curExpense, net: curNet, pending: pendingTotal, deltaLabel: delta.label, deltaPositive: delta.positive };
}

/* ── Basit gelir/gider serisi — hero altındaki sade grafik ──────────── */

export interface FlowPoint { label: string; income: number; expense: number }

export function buildFlowSeries(
  unified: UnifiedTransaction[], from: string, to: string, granularity: "day" | "week" | "month",
): FlowPoint[] {
  const inRange = unified.filter(t => t.date >= from && t.date <= to);
  const buckets = new Map<string, { label: string; income: number; expense: number; sortKey: string }>();

  for (const t of inRange) {
    const d = parseISO(t.date);
    let key: string, label: string;
    if (granularity === "day") {
      key = t.date; label = format(d, "dd MMM", { locale: tr });
    } else if (granularity === "week") {
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      key = D(weekStart); label = format(weekStart, "dd MMM", { locale: tr });
    } else {
      key = t.date.slice(0, 7); label = format(d, "MMM yy", { locale: tr });
    }
    const existing = buckets.get(key) ?? { label, income: 0, expense: 0, sortKey: key };
    if (t.isIncome) existing.income += t.amount; else existing.expense += Math.abs(t.amount);
    buckets.set(key, existing);
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ label, income, expense }) => ({ label, income, expense }));
}

/* ── Finansal Hareketler listesi filtreleri ──────────────────────────── */

export interface TxFilters {
  quick: "all" | "income" | "expense" | "student" | "manual";
  from?: string; to?: string;
  paymentMethod?: FinancePaymentMethod;
  /** Öğrenci/salon adı vb. serbest metin — title + subtitle üzerinde arar */
  search?: string;
}

export const EMPTY_TX_FILTERS: TxFilters = { quick: "all" };

export function applyTxFilters(txs: UnifiedTransaction[], f: TxFilters): UnifiedTransaction[] {
  return txs.filter(t => {
    if (f.quick === "income" && !t.isIncome) return false;
    if (f.quick === "expense" && t.isIncome) return false;
    if (f.quick === "student" && t.kind !== "ozel_ders" && t.kind !== "grup_ders") return false;
    if (f.quick === "manual" && t.kind !== "diger_gelir" && t.kind !== "gider") return false;
    if (f.from && t.date < f.from) return false;
    if (f.to && t.date > f.to) return false;
    if (f.paymentMethod && t.paymentMethod !== f.paymentMethod) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!t.title.toLowerCase().includes(q) && !(t.subtitle ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

/* ── Ödeme Yöntemi Analizi — sadece gerçek tahsilat ──────────────────── */

export interface PaymentMethodSlice { method: FinancePaymentMethod | "diger"; label: string; total: number }

export function computePaymentMethodBreakdown(unified: UnifiedTransaction[]): PaymentMethodSlice[] {
  const totals = new Map<string, number>();
  for (const t of unified) {
    if (!t.isIncome) continue;
    const key = t.paymentMethod ?? "diger";
    totals.set(key, (totals.get(key) ?? 0) + t.amount);
  }
  return Array.from(totals.entries())
    .map(([method, total]) => ({ method: method as FinancePaymentMethod, label: PAYMENT_METHOD_LABEL[method as FinancePaymentMethod] ?? "Diğer", total }))
    .sort((a, b) => b.total - a.total);
}
