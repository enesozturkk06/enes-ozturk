/**
 * lib/financeCenter.ts — Finans Merkezi Premium
 * Zaman aralığı filtreleme, KPI/delta, gelir serisi, sıralamalar ve
 * otomatik "Kedi AI" içgörüleri — tamamen client-side, mevcut
 * getIncomeMovements()/getAppointments()/getPayments()/getStudents()
 * sonuçları üzerinden türetilir. Hiçbir Supabase sorgusu içermez.
 */
import type { IncomeMovement, Appointment, Payment, Student } from "./types";
import type { GymReport } from "./db";
import {
  format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, subDays, differenceInCalendarDays,
} from "date-fns";
import { tr } from "date-fns/locale";

const D = (d: Date) => format(d, "yyyy-MM-dd");

/* ── Zaman Aralığı ─────────────────────────────────────────────────── */

export type TimeRange = "today" | "week" | "month" | "year" | "custom";

export interface RangeBounds {
  from: string; to: string;
  prevFrom: string; prevTo: string;
}

/** Seçilen aralığın sınırları + delta% için eşit uzunlukta önceki dönem */
export function getRangeBounds(range: TimeRange, custom?: { from: string; to: string }): RangeBounds {
  const now = new Date();
  let from: Date, to: Date;

  switch (range) {
    case "today": from = now; to = now; break;
    case "week":  from = startOfWeek(now, { weekStartsOn: 1 }); to = endOfWeek(now, { weekStartsOn: 1 }); break;
    case "month": from = startOfMonth(now); to = endOfMonth(now); break;
    case "year":  from = startOfYear(now); to = endOfYear(now); break;
    case "custom":
      if (custom?.from && custom?.to) {
        const fromStr = custom.from, toStr = custom.to;
        const days = Math.max(0, differenceInCalendarDays(parseISO(toStr), parseISO(fromStr)));
        const prevTo   = D(subDays(parseISO(fromStr), 1));
        const prevFrom = D(subDays(parseISO(fromStr), days + 1));
        return { from: fromStr, to: toStr, prevFrom, prevTo };
      }
      from = now; to = now; break;
  }

  const fromStr = D(from), toStr = D(to);
  const spanDays = Math.max(0, differenceInCalendarDays(to, from));
  const prevTo   = D(subDays(from, 1));
  const prevFrom = D(subDays(from, spanDays + 1));
  return { from: fromStr, to: toStr, prevFrom, prevTo };
}

export function filterMovementsByRange(movements: IncomeMovement[], from: string, to: string): IncomeMovement[] {
  return movements.filter(m => m.paymentDate >= from && m.paymentDate <= to);
}

/* ── KPI'lar ───────────────────────────────────────────────────────── */

export interface KpiValue {
  value: number;
  deltaLabel: string;
  deltaPositive: boolean | null; // null = nötr/karşılaştırma yok
}

export interface FinanceKpis {
  totalRevenue: KpiValue;
  netEarnings: KpiValue;
  owedToGyms: KpiValue;
  pendingCollections: KpiValue;
  activeStudents: KpiValue;
}

function pctDelta(current: number, previous: number): { label: string; positive: boolean | null } {
  if (previous <= 0) {
    if (current <= 0) return { label: "değişim yok", positive: null };
    return { label: "yeni", positive: true };
  }
  const pct = ((current - previous) / previous) * 100;
  const label = `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}%`;
  return { label, positive: pct >= 0 };
}

function fmtTL(n: number): string {
  return `₺${Math.round(n).toLocaleString("tr-TR")}`;
}

/**
 * 5 üst KPI kartı. Toplam Ciro / Net Kazanç dönem bazlı (seçilen aralık vs.
 * eşit uzunlukta önceki dönem). Salonlara Ödenecek / Bekleyen Tahsilatlar /
 * Aktif Öğrenci — bunlar bakiye niteliğinde (tüm zamanlar), delta olarak
 * seçilen dönemde eklenen tutar/kişi sayısı gösterilir (uydurma yüzde değil).
 */
export function computeKpis(
  movements: IncomeMovement[],
  payments: Payment[],
  students: Student[],
  range: TimeRange,
  custom?: { from: string; to: string },
): FinanceKpis {
  const b = getRangeBounds(range, custom);
  const paidIn = (from: string, to: string) =>
    filterMovementsByRange(movements, from, to).filter(m => m.status === "odendi");

  const cur  = paidIn(b.from, b.to);
  const prev = paidIn(b.prevFrom, b.prevTo);

  const curRevenue  = cur.reduce((s, m) => s + m.paymentAmount, 0);
  const prevRevenue = prev.reduce((s, m) => s + m.paymentAmount, 0);
  const curNet      = cur.reduce((s, m) => s + m.trainerNetAmount, 0);
  const prevNet     = prev.reduce((s, m) => s + m.trainerNetAmount, 0);

  const revDelta = pctDelta(curRevenue, prevRevenue);
  const netDelta = pctDelta(curNet, prevNet);

  // Bakiye niteliğindeki kartlar — tüm zamanlar toplamı
  const owedToGymsTotal = movements.filter(m => m.status === "odendi").reduce((s, m) => s + m.gymShareAmount, 0);
  const owedInPeriod    = cur.reduce((s, m) => s + m.gymShareAmount, 0);

  const pendingOnly = payments.filter(p => p.status === "beklemede" || p.status === "gecikti");
  const pendingTotal = pendingOnly.reduce((s, p) => s + p.amount, 0);
  const pendingInPeriod = pendingOnly
    .filter(p => p.paidAt >= b.from && p.paidAt <= b.to)
    .reduce((s, p) => s + p.amount, 0);

  const activeStudents = students.filter(s => s.isActive);
  const newActiveInPeriod = activeStudents.filter(s => {
    const created = (s.createdAt ?? "").slice(0, 10);
    return created >= b.from && created <= b.to;
  }).length;

  return {
    totalRevenue: { value: curRevenue, deltaLabel: revDelta.label, deltaPositive: revDelta.positive },
    netEarnings:  { value: curNet, deltaLabel: netDelta.label, deltaPositive: netDelta.positive },
    owedToGyms: {
      value: owedToGymsTotal,
      deltaLabel: owedInPeriod > 0 ? `+${fmtTL(owedInPeriod)} bu dönem` : "bu dönem yeni yok",
      deltaPositive: owedInPeriod > 0 ? false : null, // salona daha çok borçlanmak "olumsuz" renk
    },
    pendingCollections: {
      value: pendingTotal,
      deltaLabel: pendingInPeriod > 0 ? `+${fmtTL(pendingInPeriod)} bu dönem` : "bu dönem yeni yok",
      deltaPositive: pendingInPeriod > 0 ? false : null,
    },
    activeStudents: {
      value: activeStudents.length,
      deltaLabel: newActiveInPeriod > 0 ? `+${newActiveInPeriod} yeni` : "yeni yok",
      deltaPositive: newActiveInPeriod > 0 ? true : null,
    },
  };
}

/* ── Gelir Serisi (Area Chart + sparkline) ────────────────────────── */

export interface RevenuePoint { date: string; label: string; revenue: number }

/** Seçilen aralık için günlük/haftalık/aylık bucket'lanmış gelir serisi (sadece odendi) */
export function buildRevenueSeries(
  movements: IncomeMovement[], from: string, to: string, granularity: "day" | "week" | "month",
): RevenuePoint[] {
  const paid = filterMovementsByRange(movements, from, to).filter(m => m.status === "odendi");
  const buckets = new Map<string, { label: string; revenue: number; sortKey: string }>();

  for (const m of paid) {
    const d = parseISO(m.paymentDate);
    let key: string, label: string;
    if (granularity === "day") {
      key = m.paymentDate; label = format(d, "dd MMM", { locale: tr });
    } else if (granularity === "week") {
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      key = D(weekStart); label = format(weekStart, "dd MMM", { locale: tr });
    } else {
      key = m.paymentDate.slice(0, 7); label = format(d, "MMM yy", { locale: tr });
    }
    const existing = buckets.get(key);
    if (existing) existing.revenue += m.paymentAmount;
    else buckets.set(key, { label, revenue: m.paymentAmount, sortKey: key });
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ label, revenue }, i) => ({ date: String(i), label, revenue }));
}

/** Son N günün günlük değerleri — KPI kartlarındaki mini sparkline için */
export function buildSparkline(
  movements: IncomeMovement[], days: number, field: "paymentAmount" | "trainerNetAmount" | "gymShareAmount",
): number[] {
  const today = new Date();
  const daily = new Map<string, number>();
  for (const m of movements) {
    if (m.status !== "odendi") continue;
    daily.set(m.paymentDate, (daily.get(m.paymentDate) ?? 0) + m[field]);
  }
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(daily.get(D(subDays(today, i))) ?? 0);
  }
  return out;
}

/** Son N gün — o gün eklenen bekleyen/gecikmiş ödeme tutarı (birikimli bakiye değil, günlük yeni borç) */
export function buildPendingAccrualSparkline(payments: Payment[], days: number): number[] {
  const today = new Date();
  const daily = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "beklemede" && p.status !== "gecikti") continue;
    daily.set(p.paidAt, (daily.get(p.paidAt) ?? 0) + p.amount);
  }
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(daily.get(D(subDays(today, i))) ?? 0);
  return out;
}

/** Son N gün — o güne kadar kayıt olmuş aktif öğrenci sayısı (kümülatif büyüme) */
export function buildActiveStudentGrowthSparkline(students: Student[], days: number): number[] {
  const today = new Date();
  const active = students.filter(s => s.isActive);
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const cutoff = D(subDays(today, i));
    out.push(active.filter(s => (s.createdAt ?? "").slice(0, 10) <= cutoff).length);
  }
  return out;
}

/* ── Finans Özeti — Bugün / Hafta / Ay (global filtreden bağımsız) ─── */

export interface FinanceSnapshot { lessonCount: number; revenue: number }

export function computeFinanceSnapshots(
  movements: IncomeMovement[], appointments: Appointment[],
): { today: FinanceSnapshot; week: FinanceSnapshot; month: FinanceSnapshot } {
  const now = new Date();
  const windows = {
    today: { from: D(now), to: D(now) },
    week:  { from: D(startOfWeek(now, { weekStartsOn: 1 })), to: D(endOfWeek(now, { weekStartsOn: 1 })) },
    month: { from: D(startOfMonth(now)), to: D(endOfMonth(now)) },
  };
  const snap = (from: string, to: string): FinanceSnapshot => ({
    lessonCount: appointments.filter(a => a.status === "tamamlandi" && a.date >= from && a.date <= to).length,
    revenue: filterMovementsByRange(movements, from, to)
      .filter(m => m.status === "odendi").reduce((s, m) => s + m.paymentAmount, 0),
  });
  return {
    today: snap(windows.today.from, windows.today.to),
    week:  snap(windows.week.from, windows.week.to),
    month: snap(windows.month.from, windows.month.to),
  };
}

/* ── Top Öğrenciler ────────────────────────────────────────────────── */

export interface TopStudent {
  studentId: string; studentName: string; totalPaid: number; lessonCount: number;
}

/** En çok ödeme yapan öğrenciler (tüm zamanlar, sadece tahsil edilmiş) */
export function rankTopPayingStudents(
  movements: IncomeMovement[], appointments: Appointment[], limit = 5,
): TopStudent[] {
  const byStudent = new Map<string, { studentName: string; totalPaid: number }>();
  for (const m of movements) {
    if (m.status !== "odendi" || !m.studentId) continue;
    const cur = byStudent.get(m.studentId) ?? { studentName: m.studentName, totalPaid: 0 };
    cur.totalPaid += m.paymentAmount;
    byStudent.set(m.studentId, cur);
  }
  const lessonCounts = new Map<string, number>();
  for (const a of appointments) {
    if (a.status !== "tamamlandi") continue;
    lessonCounts.set(a.studentId, (lessonCounts.get(a.studentId) ?? 0) + 1);
  }
  return Array.from(byStudent.entries())
    .map(([studentId, v]) => ({ studentId, studentName: v.studentName, totalPaid: v.totalPaid, lessonCount: lessonCounts.get(studentId) ?? 0 }))
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, limit);
}

/* ── Ödeme Durumu Dağılımı ─────────────────────────────────────────── */

export interface PaymentStatusSlice { key: string; label: string; count: number; color: string }

export function computePaymentStatusBreakdown(students: Student[]): PaymentStatusSlice[] {
  const active = students.filter(s => s.isActive);
  const odendi    = active.filter(s => s.paymentStatus === "odendi").length;
  const bekliyor  = active.filter(s => s.paymentStatus === "beklemede").length;
  const borclu    = active.filter(s => s.paymentStatus === "kismi").length;
  return [
    { key: "odendi",   label: "Ödendi",  count: odendi,   color: "#4ADE80" },
    { key: "bekliyor", label: "Bekliyor", count: bekliyor, color: "#FBBF24" },
    { key: "borclu",   label: "Borçlu",  count: borclu,   color: "#F87171" },
  ];
}

/* ── Salon Performansı ─────────────────────────────────────────────── */

export interface GymPerformance extends GymReport { sharePctOfTotal: number }

export function computeGymPerformance(gymReports: GymReport[]): GymPerformance[] {
  const totalRevenue = gymReports.reduce((s, r) => s + r.totalRevenue, 0);
  return gymReports
    .map(r => ({ ...r, sharePctOfTotal: totalRevenue > 0 ? (r.totalRevenue / totalRevenue) * 100 : 0 }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/* ── Alt İstatistikler ─────────────────────────────────────────────── */

export interface BottomStats {
  busiestDay: string; busiestDayCount: number;
  busiestHour: string; busiestHourCount: number;
  avgLessonPrice: number;
  topGymName: string; topGymRevenue: number;
  topStudentName: string; topStudentPaid: number;
  totalCompleted: number; totalCancelled: number;
  avgMonthlyRevenue: number;
}

export function computeBottomStats(
  appointments: Appointment[], movements: IncomeMovement[], gymReports: GymReport[],
): BottomStats {
  const dayCounts = new Map<string, number>();
  const hourCounts = new Map<string, number>();
  for (const a of appointments) {
    let d: Date;
    try { d = parseISO(a.date); } catch { continue; }
    const dayLabel = format(d, "EEEE", { locale: tr });
    dayCounts.set(dayLabel, (dayCounts.get(dayLabel) ?? 0) + 1);
    const hour = (a.startTime ?? "").slice(0, 2);
    if (hour) hourCounts.set(`${hour}:00`, (hourCounts.get(`${hour}:00`) ?? 0) + 1);
  }
  const topEntry = (m: Map<string, number>): [string, number] =>
    Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];
  const [busiestDay, busiestDayCount]   = topEntry(dayCounts);
  const [busiestHour, busiestHourCount] = topEntry(hourCounts);

  const paidMovements = movements.filter(m => m.status === "odendi");
  const totalRevenueAllTime = paidMovements.reduce((s, m) => s + m.paymentAmount, 0);
  const totalCompleted = appointments.filter(a => a.status === "tamamlandi").length;
  const totalCancelled = appointments.filter(a => a.status === "iptal").length;
  const avgLessonPrice = totalCompleted > 0 ? totalRevenueAllTime / totalCompleted : 0;

  const topGym = [...gymReports].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
  const topStudents = rankTopPayingStudents(movements, appointments, 1);
  const topStudent = topStudents[0];

  const distinctMonths = new Set(paidMovements.map(m => m.paymentDate.slice(0, 7)));
  const avgMonthlyRevenue = distinctMonths.size > 0 ? totalRevenueAllTime / distinctMonths.size : 0;

  return {
    busiestDay, busiestDayCount, busiestHour, busiestHourCount, avgLessonPrice,
    topGymName: topGym?.gym.name ?? "—", topGymRevenue: topGym?.totalRevenue ?? 0,
    topStudentName: topStudent?.studentName ?? "—", topStudentPaid: topStudent?.totalPaid ?? 0,
    totalCompleted, totalCancelled, avgMonthlyRevenue,
  };
}

/* ── Kedi AI — kural tabanlı otomatik içgörüler ───────────────────── */

export interface AiInsight { icon: "trend" | "gym" | "forecast" | "calendar" | "student"; text: string }

export function generateAiInsights(
  movements: IncomeMovement[], appointments: Appointment[], gymReports: GymReport[],
): AiInsight[] {
  const insights: AiInsight[] = [];
  const now = new Date();
  const thisMonthKey = format(now, "yyyy-MM");
  const lastMonthKey = format(subDays(startOfMonth(now), 1), "yyyy-MM");

  const paid = movements.filter(m => m.status === "odendi");
  const thisMonthRevenue = paid.filter(m => m.paymentDate.startsWith(thisMonthKey)).reduce((s, m) => s + m.paymentAmount, 0);
  const lastMonthRevenue = paid.filter(m => m.paymentDate.startsWith(lastMonthKey)).reduce((s, m) => s + m.paymentAmount, 0);

  if (lastMonthRevenue > 0) {
    const pct = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    insights.push({
      icon: "trend",
      text: `Bu ay gelir geçen aya göre %${Math.abs(pct).toFixed(0)} ${pct >= 0 ? "arttı" : "azaldı"}.`,
    });
  }

  const topGym = [...gymReports].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
  if (topGym) insights.push({ icon: "gym", text: `En çok kazanç sağlayan salon: ${topGym.gym.name}.` });

  // Basit projeksiyon: son 4 haftanın ortalaması
  const weeklyTotals: number[] = [];
  for (let i = 0; i < 4; i++) {
    const wStart = startOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    const wEnd   = endOfWeek(subDays(now, i * 7), { weekStartsOn: 1 });
    weeklyTotals.push(filterMovementsByRange(paid, D(wStart), D(wEnd)).reduce((s, m) => s + m.paymentAmount, 0));
  }
  const avgWeekly = weeklyTotals.reduce((s, v) => s + v, 0) / weeklyTotals.length;
  if (avgWeekly > 0) insights.push({ icon: "forecast", text: `Beklenen haftalık gelir: ${fmtTL(avgWeekly)}.` });

  const dayCounts = new Map<string, number>();
  for (const a of appointments) {
    let d: Date;
    try { d = parseISO(a.date); } catch { continue; }
    const label = format(d, "EEEE", { locale: tr });
    dayCounts.set(label, (dayCounts.get(label) ?? 0) + 1);
  }
  const busiest = Array.from(dayCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (busiest) insights.push({ icon: "calendar", text: `En yoğun gün: ${busiest[0]}.` });

  const topStudent = rankTopPayingStudents(movements, appointments, 1)[0];
  if (topStudent && topStudent.lessonCount > 0) {
    insights.push({ icon: "student", text: `En çok ders yapan öğrenci: ${topStudent.studentName} (${topStudent.lessonCount} ders).` });
  }

  return insights;
}

/* ── CSV Dışa Aktarım ──────────────────────────────────────────────── */

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: IncomeMovement[]): string {
  const header = ["Tarih", "Öğrenci", "Tür", "Durum", "Salon", "Tutar", "Salon Payı", "Net"];
  const lines = rows.map(m => [
    m.paymentDate, m.studentName, m.paymentType, m.status, m.gymName ?? "",
    m.paymentAmount, m.gymShareAmount, m.trainerNetAmount,
  ].map(csvEscape).join(","));
  return [header.join(","), ...lines].join("\n");
}
