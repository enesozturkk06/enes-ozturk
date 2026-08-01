"use client";

import type { PaymentRecordStatus } from "@/lib/types";

export const STATUS_CFG: Record<PaymentRecordStatus, { label: string; bg: string; color: string; bar: string }> = {
  odendi:    { label: "Ödendi",  bg: "rgba(34,197,94,0.12)",  color: "var(--color-success)", bar: "#22C55E" },
  beklemede: { label: "Bekliyor",bg: "rgba(245,158,11,0.12)", color: "var(--color-achievement)", bar: "#F59E0B" },
  gecikti:   { label: "Gecikti", bg: "rgba(239,68,68,0.12)",  color: "var(--color-error)", bar: "#DC2626" },
};

export function StatusBadge({ status }: { status: PaymentRecordStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className="relative inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
      style={{ background: c.bg, color: c.color, fontFamily: "var(--font-label)" }}>
      {status === "gecikti" && (
        <span className="w-1.5 h-1.5 rounded-full animate-neon-pulse flex-shrink-0" style={{ background: c.color }} />
      )}
      {c.label}
    </span>
  );
}
