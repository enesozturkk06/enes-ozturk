"use client";

import type { PaymentRecordStatus } from "@/lib/types";

export const STATUS_CFG: Record<PaymentRecordStatus, { label: string; bg: string; color: string; bar: string }> = {
  odendi:    { label: "Ödendi",    bg: "rgba(34,197,94,0.12)",  color: "#4ADE80", bar: "#22C55E" },
  beklemede: { label: "Beklemede", bg: "rgba(251,191,36,0.12)", color: "#FBBF24", bar: "#F59E0B" },
  gecikti:   { label: "Gecikti",   bg: "rgba(220,38,38,0.12)",  color: "#F87171", bar: "#DC2626" },
};

export function StatusBadge({ status }: { status: PaymentRecordStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
      style={{ background: c.bg, color: c.color, fontFamily: "var(--font-barlow-condensed)" }}>
      {c.label}
    </span>
  );
}
