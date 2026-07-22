/**
 * lib/groupLessonFinance.ts — Grup Dersi Finans Modülü
 * Özel ders finans katmanından (lib/financeCenter.ts) tamamen bağımsız,
 * saf hesaplama — DB çağrısı yok. Grup dersi verileri income_movements'a
 * hiç karışmaz; Finans Merkezi'nin kategori toplamları bu dosyadaki
 * fonksiyonlarla ayrıca hesaplanıp financeCenter.ts'in ürettiği KPI'ların
 * yanına eklenir.
 */
import type {
  GroupLesson, GroupLessonMember, GroupLessonPayment, GroupLessonSession,
  IncomeMovement, OtherIncome,
} from "./types";

const currentMonthKey = () => new Date().toISOString().slice(0, 7);

/* ── Grup Performansı ──────────────────────────────────────────────── */

export interface GroupPerformance {
  group: GroupLesson;
  activeMemberCount: number;
  /** Aidat × aktif öğrenci sayısı — üye sayısı değiştikçe otomatik güncellenir */
  expectedMonthlyRevenue: number;
  /** Bu ay gerçekten tahsil edilen (status='odendi' dönem kayıtları) */
  collectedThisMonth: number;
  gymShare: number;
  netEarnings: number;
  occupancyRate: number | null;
  /** fixed_per_lesson paylaşımında bu ay için ders sayısı girilmemişse true */
  needsSessionCount: boolean;
}

/** Tek bir grubun bu ayki finans özetini hesaplar */
export function computeGroupRevenue(
  group: GroupLesson,
  members: GroupLessonMember[],
  payments: GroupLessonPayment[],
  sessions: GroupLessonSession[],
  periodMonth: string = currentMonthKey(),
): GroupPerformance {
  const activeMembers = members.filter(m => m.groupId === group.id && m.isActive);
  const activeMemberCount = activeMembers.length;
  const expectedMonthlyRevenue = group.feePerStudent * activeMemberCount;

  const collectedThisMonth = payments
    .filter(p => p.groupId === group.id && p.periodMonth === periodMonth && p.status === "odendi")
    .reduce((s, p) => s + p.amount, 0);

  let gymShare = 0;
  let needsSessionCount = false;

  if (group.shareType === "percentage") {
    gymShare = expectedMonthlyRevenue * ((group.gymPercentage ?? 0) / 100);
  } else if (group.shareType === "fixed_monthly_rent") {
    gymShare = group.fixedMonthlyRent ?? 0;
  } else if (group.shareType === "fixed_per_lesson") {
    const session = sessions.find(s => s.groupId === group.id && s.periodMonth === periodMonth);
    if (session) gymShare = (group.fixedFeePerLesson ?? 0) * session.sessionCount;
    else needsSessionCount = true;
  }

  const occupancyRate = group.maxCapacity && group.maxCapacity > 0
    ? Math.min(100, Math.round((activeMemberCount / group.maxCapacity) * 100))
    : null;

  return {
    group, activeMemberCount, expectedMonthlyRevenue, collectedThisMonth,
    gymShare, netEarnings: expectedMonthlyRevenue - gymShare, occupancyRate, needsSessionCount,
  };
}

export function computeAllGroupPerformance(
  groups: GroupLesson[], members: GroupLessonMember[],
  payments: GroupLessonPayment[], sessions: GroupLessonSession[],
): GroupPerformance[] {
  return groups
    .filter(g => g.isActive)
    .map(g => computeGroupRevenue(g, members, payments, sessions))
    .sort((a, b) => b.expectedMonthlyRevenue - a.expectedMonthlyRevenue);
}

/* ── Kategori Toplamları — Finans Özeti / dashboard kartları ────────── */

export interface CategoryTotals {
  ozelDersi: number;
  grupDersi: number;
  digerGelirler: number;
  toplamGelir: number;
  toplamSalonPayi: number;
  netKazanc: number;
}

/**
 * Finans Özeti — bu ayki kategori kırılımı. Grup dersi rakamları
 * "beklenen aylık gelir" formülüyle (aidat × aktif üye) hesaplanır,
 * özel ders ve diğer gelirler ise gerçekten tahsil edilenle.
 */
export function computeCategoryTotals(
  movements: IncomeMovement[],
  groupPerformances: GroupPerformance[],
  otherIncome: OtherIncome[],
  monthKey: string = currentMonthKey(),
): CategoryTotals {
  const ozelDersi = movements
    .filter(m => m.status === "odendi" && m.paymentDate.startsWith(monthKey))
    .reduce((s, m) => s + m.paymentAmount, 0);
  const ozelDersiGymPayi = movements
    .filter(m => m.status === "odendi" && m.paymentDate.startsWith(monthKey))
    .reduce((s, m) => s + m.gymShareAmount, 0);

  const grupDersi = groupPerformances.reduce((s, g) => s + g.expectedMonthlyRevenue, 0);
  const grupSalonPayi = groupPerformances.reduce((s, g) => s + g.gymShare, 0);

  const digerGelirler = otherIncome
    .filter(o => o.incomeDate.startsWith(monthKey))
    .reduce((s, o) => s + o.amount, 0);

  const toplamGelir = ozelDersi + grupDersi + digerGelirler;
  const toplamSalonPayi = ozelDersiGymPayi + grupSalonPayi;

  return {
    ozelDersi, grupDersi, digerGelirler, toplamGelir, toplamSalonPayi,
    netKazanc: toplamGelir - toplamSalonPayi,
  };
}
