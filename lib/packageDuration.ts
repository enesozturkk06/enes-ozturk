import type { SubscriptionType, Appointment } from "./types";
import {
  LESSON_DURATIONS, MONTHLY_DURATION_DAYS, DEFAULT_DURATION_DAYS,
  PACKAGE_WARNING_DAYS, PACKAGE_URGENT_DAYS, PACKAGE_CRITICAL_DAYS,
} from "./constants";

/** Ders sayısı / üyelik tipine göre paket geçerlilik süresi (gün) */
export function getPackageDurationDays(totalLessons: number, subscriptionType?: SubscriptionType): number {
  if (subscriptionType === "monthly") return MONTHLY_DURATION_DAYS;
  return LESSON_DURATIONS[totalLessons] ?? DEFAULT_DURATION_DAYS;
}

/** Başlangıç tarihinden itibaren bitiş tarihini hesaplar (YYYY-MM-DD) */
export function calcPackageEndDate(startDate: string | Date, durationDays: number): string {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return end.toISOString().split("T")[0];
}

/** Bitiş tarihine göre kalan gün sayısı (negatifse paket süresi dolmuş) */
export function getDaysRemaining(endDate?: string): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

export type PackageUrgencyLevel = "normal" | "warning" | "urgent" | "critical" | "expired";

export interface PackageUrgencyInfo {
  level: PackageUrgencyLevel;
  color: string;
  bg: string;
  border: string;
  label: string;
}

/** Kalan gün sayısına göre uyarı seviyesi ve renk bilgisi döner (sarı → turuncu → kırmızı → süresi doldu) */
export function getPackageUrgency(daysRemaining: number | null): PackageUrgencyInfo {
  if (daysRemaining === null) {
    return { level: "normal", color: "text-white/40", bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", label: "—" };
  }
  if (daysRemaining < 0) {
    return { level: "expired", color: "text-red-400", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", label: "Süresi Doldu" };
  }
  if (daysRemaining <= PACKAGE_CRITICAL_DAYS) {
    return { level: "critical", color: "text-red-400", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", label: "Kritik" };
  }
  if (daysRemaining <= PACKAGE_URGENT_DAYS) {
    return { level: "urgent", color: "text-orange-400", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)", label: "Acil" };
  }
  if (daysRemaining <= PACKAGE_WARNING_DAYS) {
    return { level: "warning", color: "text-yellow-400", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.2)", label: "Uyarı" };
  }
  return { level: "normal", color: "text-green-400", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", label: "Normal" };
}

/** Paket süresi dolmuş mu? (bitiş tarihi geçmişse true → randevu alma kapanır) */
export function isPackageExpired(endDate?: string): boolean {
  const days = getDaysRemaining(endDate);
  return days !== null && days < 0;
}

export interface PackagePaceProjection {
  avgLessonsPerWeek: number;
  estimatedDaysUntilLessonsRunOut: number;
}

/**
 * Kalan ders hakkının GERÇEK ders temposuna göre kaç günde tükeneceğini
 * hesaplar (son 4 haftadaki tamamlanan ders sayısından ortalama haftalık
 * tempo çıkarılır). `getDaysRemaining` (paketin TAKVİM bitişi) ile
 * KARIŞTIRILMASIN — bu ayrı, tempo-bazlı bir sinyal.
 *
 * Aylık üyelikte (sınırsız ders) veya son 4 haftada hiç tamamlanan ders
 * yoksa (tempo hesaplanamaz) null döner — çağıran taraf bunu "yeterli veri
 * yok" olarak ele almalı, sayı uydurmamalı. Hem lib/kediAi.ts (buildStudentDigest)
 * HEM app/components/shared/BlackCatAI.tsx (Smart Notification) BURADAN
 * çağırır — aynı hesaplamanın iki yerde bağımsız yazılmasını önlemek için.
 */
export function computePackagePaceProjection(
  appointments: Appointment[], remainingLessons: number, subscriptionType?: SubscriptionType,
): PackagePaceProjection | null {
  if (subscriptionType === "monthly" || remainingLessons <= 0) return null;
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentCompletedCount = appointments.filter(a => {
    if (a.status !== "tamamlandi") return false;
    const d = new Date(a.date);
    return !isNaN(d.getTime()) && d >= fourWeeksAgo;
  }).length;
  const avgLessonsPerWeek = recentCompletedCount / 4;
  if (avgLessonsPerWeek <= 0) return null;
  return {
    avgLessonsPerWeek: Math.round(avgLessonsPerWeek * 10) / 10,
    estimatedDaysUntilLessonsRunOut: Math.round((remainingLessons / avgLessonsPerWeek) * 7),
  };
}
