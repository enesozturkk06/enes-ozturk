"use client";

import type { NetSummary } from "@/lib/financeUnified";
import type { TimeRange } from "@/lib/financeCenter";
import CountUpNumber from "./CountUpNumber";

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "week",      label: "Bu Hafta" },
  { value: "month",     label: "Bu Ay" },
  { value: "lastMonth", label: "Geçen Ay" },
  { value: "year",      label: "Bu Yıl" },
  { value: "custom",    label: "Özel" },
];

/**
 * Finans Merkezi'nin TEK bütünsel özet paneli — banka uygulaması hissi:
 * siyah/koyu zemin, beyaz tipografi, çok az altın vurgu, ince border.
 * Kesinlikle ayrı ayrı büyük kartlara bölünmez.
 *
 * Mobil: başlık üstte, dönem seçici altında ayrı bir satırda (kart dışına
 * taşmadan, gerekirse yalnızca kendi şeridi içinde yatay kaydırılır).
 */
export default function FinanceHero({
  summary, range, onRangeChange, custom, onCustomChange,
}: {
  summary: NetSummary;
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  custom: { from: string; to: string };
  onCustomChange: (c: { from: string; to: string }) => void;
}) {
  const rangeLabel = RANGE_OPTIONS.find(o => o.value === range)?.label ?? "Bu Ay";

  return (
    <div className="glass-strong rounded-2xl border border-white/8 p-4 sm:p-7 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl text-white tracking-wide truncate" style={{ fontFamily: "var(--font-display)" }}>
            FİNANS MERKEZİ
          </h1>
          <p className="text-[11px] text-white/35 mt-0.5" style={{ fontFamily: "var(--font-label)" }}>
            {rangeLabel} · net kazanç özeti
          </p>
        </div>

        <div className="no-scrollbar flex items-center gap-1 p-0.5 rounded-lg border border-white/8 overflow-x-auto min-w-0 max-w-full">
          {RANGE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onRangeChange(opt.value)}
              className="px-2.5 py-2 text-[11px] font-medium whitespace-nowrap rounded-md transition-colors flex-shrink-0"
              style={{
                background: range === opt.value ? "rgba(255,255,255,0.08)" : "transparent",
                color: range === opt.value ? "#fff" : "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-label)",
                minHeight: 36,
              }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {range === "custom" && (
        <div className="flex items-center gap-2 mb-5 -mt-2 flex-wrap">
          <input type="date" value={custom.from} onChange={e => onCustomChange({ ...custom, from: e.target.value })}
            className="bg-white/[0.03] border border-white/8 text-white px-2.5 py-1.5 text-base sm:text-xs outline-none rounded-lg min-w-0"
            style={{ fontFamily: "var(--font-label)" }} />
          <span className="text-white/20 text-xs">—</span>
          <input type="date" value={custom.to} onChange={e => onCustomChange({ ...custom, to: e.target.value })}
            className="bg-white/[0.03] border border-white/8 text-white px-2.5 py-1.5 text-base sm:text-xs outline-none rounded-lg min-w-0"
            style={{ fontFamily: "var(--font-label)" }} />
        </div>
      )}

      {/* Ana rakam */}
      <div className="mb-6 min-w-0">
        <span className="text-[11px] text-white/35 uppercase tracking-widest" style={{ fontFamily: "var(--font-label)" }}>
          Net Kazanç
        </span>
        <div className="flex items-end gap-2 sm:gap-3 flex-wrap mt-1 min-w-0">
          <span className="text-3xl sm:text-5xl leading-none" style={{ fontFamily: "var(--font-display)", color: "var(--color-achievement)", letterSpacing: "0.01em" }}>
            <CountUpNumber value={summary.net} prefix="₺" />
          </span>
          {summary.deltaPositive !== null && (
            <span className="text-xs font-semibold pb-1 whitespace-nowrap"
              style={{ color: summary.deltaPositive ? "var(--color-success)" : "var(--color-error)", fontFamily: "var(--font-label)" }}>
              {summary.deltaPositive ? "↑" : "↓"} {summary.deltaLabel}
            </span>
          )}
        </div>
      </div>

      {/* Gelir | Gider | Bekleyen — tek satır, her hücre kendi genişliğine sığar */}
      <div className="grid grid-cols-3 divide-x divide-white/8 border-t border-white/8 pt-4">
        <div className="px-1 sm:px-3 min-w-0">
          <div className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-widest mb-1 truncate" style={{ fontFamily: "var(--font-label)" }}>Gelir</div>
          <div className="text-sm sm:text-lg font-semibold tabular-nums truncate" style={{ fontFamily: "var(--font-display)", color: "var(--color-success)" }}>
            ₺{summary.income.toLocaleString("tr-TR")}
          </div>
        </div>
        <div className="px-1 sm:px-3 min-w-0">
          <div className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-widest mb-1 truncate" style={{ fontFamily: "var(--font-label)" }}>Gider</div>
          <div className="text-sm sm:text-lg font-semibold tabular-nums truncate" style={{ fontFamily: "var(--font-display)", color: "var(--color-error)" }}>
            ₺{summary.expense.toLocaleString("tr-TR")}
          </div>
        </div>
        <div className="px-1 sm:px-3 min-w-0">
          <div className="text-[9px] sm:text-[10px] text-white/35 uppercase tracking-widest mb-1 truncate" style={{ fontFamily: "var(--font-label)" }}>Bekleyen</div>
          <div className="text-sm sm:text-lg font-semibold tabular-nums text-white/70 truncate" style={{ fontFamily: "var(--font-display)" }}>
            ₺{summary.pending.toLocaleString("tr-TR")}
          </div>
        </div>
      </div>
    </div>
  );
}
