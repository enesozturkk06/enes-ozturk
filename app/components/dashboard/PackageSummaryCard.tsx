"use client";
import type { Student } from "@/lib/types";
import { Badge, ProgressBar } from "@/app/components/ui";
import { PAYMENT_LABELS, PACKAGE_EXPIRED_TEXT } from "@/lib/constants";
import { getDaysRemaining, getPackageUrgency } from "@/lib/packageDuration";
import { GOLD_BRIGHT } from "./theme";

/** Kompakt paket kartı — kalan ders + progress + kalan gün + durum. Eski
 * kartın "Kullanılan/Kalan" 2-kutu grid'i + tarih satırı kaldırıldı, tek
 * satırda özetlendi (spec: "kalan ders + progress + kalan gün + durum"). */
export default function PackageSummaryCard({
  student, packageLabel, totalLessons,
}: {
  student: Student;
  packageLabel: string;
  totalLessons: number;
}) {
  const daysRemaining = getDaysRemaining(student.packageEndDate);
  const urgency = daysRemaining !== null ? getPackageUrgency(daysRemaining) : null;

  return (
    <div className="card-gold rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm text-white/85 truncate" style={{ fontFamily: "var(--font-label)" }}>{packageLabel}</span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {urgency && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${urgency.color}`}
              style={{ background: urgency.bg, border: `1px solid ${urgency.border}`, fontFamily: "var(--font-label)" }}>
              {daysRemaining! < 0 ? "Süresi Doldu" : `${daysRemaining} gün kaldı`}
            </span>
          )}
          <Badge color={student.paymentStatus === "odendi" ? "green" : student.paymentStatus === "kismi" ? "gold" : "red"}>
            {PAYMENT_LABELS[student.paymentStatus]}
          </Badge>
        </div>
      </div>

      {student.subscriptionType === "monthly" ? (
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50" style={{ fontFamily: "var(--font-label)" }}>Bu ay tamamlanan ders</span>
          <span className="text-xl font-bold" style={{ color: GOLD_BRIGHT, fontFamily: "var(--font-display)" }}>{student.completedLessons}</span>
        </div>
      ) : (
        <ProgressBar value={student.completedLessons} max={totalLessons} color="red"
          label={`${student.completedLessons} / ${totalLessons} ders · ${student.remainingLessons} kaldı`} />
      )}

      {daysRemaining !== null && daysRemaining < 0 && (
        <p className="text-xs mt-2.5" style={{ color: "var(--color-error)", fontFamily: "var(--font-label)" }}>{PACKAGE_EXPIRED_TEXT}</p>
      )}
    </div>
  );
}
