"use client";
import { CalendarClock, Package as PackageIcon, Infinity as InfinityIcon } from "lucide-react";
import type { Student } from "@/lib/types";
import { getDaysRemaining } from "@/lib/packageDuration";

interface Props {
  student: Student;
  busy: boolean;
  onExtend: (s: Student) => void;
  onRenew: (s: Student) => void;
  onUnlimited: (s: Student) => void;
}

export default function ExpiredWarningCard({ student: s, busy, onExtend, onRenew, onUnlimited }: Props) {
  const days = getDaysRemaining(s.packageEndDate);

  return (
    <div className="glass relative overflow-hidden rounded-2xl flex flex-wrap items-center justify-between gap-3 p-4"
      style={{ borderColor: "rgba(239,68,68,0.3)" }}>
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,var(--color-error),transparent)" }} />
      <div className="min-w-0">
        <div className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-label)" }}>{s.fullName}</div>
        <div className="text-xs text-white/35 mt-0.5" style={{ fontFamily: "var(--font-label)" }}>
          {s.code} · {days !== null ? `${Math.abs(days)} gün önce doldu` : "—"} · {s.remainingLessons} ders kaldı
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onExtend(s)} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider rounded-lg disabled:opacity-40 transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA", fontFamily: "var(--font-label)" }}>
          <CalendarClock size={12} />Süre Uzat
        </button>
        <button onClick={() => onRenew(s)} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider rounded-lg disabled:opacity-40 transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>
          <PackageIcon size={12} />Yeni Paket Ata
        </button>
        <button onClick={() => onUnlimited(s)} disabled={busy}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider rounded-lg disabled:opacity-40 transition-transform hover:scale-[1.03] active:scale-95"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ADE80", fontFamily: "var(--font-label)" }}>
          <InfinityIcon size={12} />Sınırsız Yap
        </button>
      </div>
    </div>
  );
}
