"use client";

import { useMemo, useState } from "react";
import type { IncomeMovement, Appointment, Student } from "@/lib/types";
import type { GymReport } from "@/lib/db";
import { type TimeRange, getRangeBounds, rankTopPayingStudents, computeGymPerformance } from "@/lib/financeCenter";
import {
  type UnifiedTransaction, buildFlowSeries, computePaymentMethodBreakdown,
} from "@/lib/financeUnified";
import SimpleFlowChart from "./SimpleFlowChart";

const RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "week", label: "Bu Hafta" }, { value: "month", label: "Bu Ay" },
  { value: "lastMonth", label: "Geçen Ay" }, { value: "year", label: "Bu Yıl" }, { value: "custom", label: "Özel" },
];

function RankRow({ label, sub, value, pct, color }: { label: string; sub?: string; value: number; pct: number; color: string }) {
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2 text-sm mb-1">
        <span className="text-white/80 truncate flex-1 min-w-0" style={{ fontFamily: "var(--font-label)" }}>{label}{sub ? <span className="text-white/30"> · {sub}</span> : null}</span>
        <span className="font-semibold tabular-nums flex-shrink-0" style={{ fontFamily: "var(--font-display)", color }}>₺{value.toLocaleString("tr-TR")}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden bg-white/6">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl border border-white/8 p-4 sm:p-5">
      <h3 className="text-[11px] uppercase tracking-widest text-white/40 mb-3" style={{ fontFamily: "var(--font-label)" }}>{title}</h3>
      {children}
    </div>
  );
}

/** Raporlar — ayrı sekme, ana ekranı doldurmaz. Sade tablo/liste; 3D/neon grafik yok. */
export default function FinanceReports({
  unified, movements, appointments, gymReports, students,
}: {
  unified: UnifiedTransaction[];
  movements: IncomeMovement[];
  appointments: Appointment[];
  gymReports: GymReport[];
  students: Student[];
}) {
  const [range, setRange] = useState<TimeRange>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("day");

  const bounds = useMemo(() => getRangeBounds(range, custom), [range, custom]);
  const inRange = useMemo(() => unified.filter(t => t.date >= bounds.from && t.date <= bounds.to), [unified, bounds]);

  const income = useMemo(() => inRange.filter(t => t.isIncome).reduce((s, t) => s + t.amount, 0), [inRange]);
  const expense = useMemo(() => inRange.filter(t => !t.isIncome).reduce((s, t) => s + Math.abs(t.amount), 0), [inRange]);
  const net = income - expense;

  const flowSeries = useMemo(() => buildFlowSeries(unified, bounds.from, bounds.to, granularity), [unified, bounds, granularity]);

  const topStudents = useMemo(() => rankTopPayingStudents(movements, appointments, 8), [movements, appointments]);
  const gymPerf = useMemo(() => computeGymPerformance(gymReports), [gymReports]);

  // "Gider" toplamı (hero/özet) gider + iade'nin toplamıdır — bu kırılım da
  // ikisini birlikte göstermezse "gider yok" yanıltıcı görünür (iade varken bile).
  const expenseByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of inRange) {
      if (t.kind !== "gider" && t.kind !== "iade") continue;
      const label = t.kind === "iade" ? "İade" : t.title;
      totals.set(label, (totals.get(label) ?? 0) + Math.abs(t.amount));
    }
    return Array.from(totals.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [inRange]);

  const methodBreakdown = useMemo(() => computePaymentMethodBreakdown(inRange), [inRange]);

  const topPackage = useMemo(() => {
    const totals = new Map<string, number>();
    for (const m of movements) {
      if (m.status !== "odendi" || !m.packageType) continue;
      if (m.paymentDate < bounds.from || m.paymentDate > bounds.to) continue;
      totals.set(m.packageType, (totals.get(m.packageType) ?? 0) + m.paymentAmount);
    }
    return Array.from(totals.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }, [movements, bounds]);

  // students.amountDue kullanılıyor — bkz. PendingCollections.tsx'teki not
  // (payments tablosundaki tekil satırlar farklı akıştan kapanan borçlarda hayalet kalabiliyor).
  const pendingTotal = useMemo(
    () => students.filter(s => s.isActive && s.amountDue > 0).reduce((s, st) => s + st.amountDue, 0),
    [students],
  );
  const collectionRate = income + pendingTotal > 0 ? (income / (income + pendingTotal)) * 100 : 100;

  const maxExpense = expenseByCategory[0]?.value ?? 1;
  const maxStudent = topStudents[0]?.totalPaid ?? 1;
  const maxGym = gymPerf[0]?.totalRevenue ?? 1;
  const maxPackage = topPackage[0]?.value ?? 1;
  const maxMethod = methodBreakdown[0]?.total ?? 1;

  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex items-center gap-1 p-0.5 rounded-lg border border-white/8 overflow-x-auto min-w-0 max-w-full w-fit">
        {RANGE_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setRange(opt.value)}
            className="px-2.5 text-[11px] font-medium whitespace-nowrap rounded-md transition-colors flex-shrink-0"
            style={{ background: range === opt.value ? "rgba(255,255,255,0.08)" : "transparent", color: range === opt.value ? "#fff" : "rgba(255,255,255,0.4)", fontFamily: "var(--font-label)", minHeight: 36 }}>
            {opt.label}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={custom.from} onChange={e => setCustom({ ...custom, from: e.target.value })}
            className="bg-white/[0.03] border border-white/8 text-white px-2.5 py-1.5 text-base sm:text-xs outline-none rounded-lg min-w-0" />
          <span className="text-white/20 text-xs">—</span>
          <input type="date" value={custom.to} onChange={e => setCustom({ ...custom, to: e.target.value })}
            className="bg-white/[0.03] border border-white/8 text-white px-2.5 py-1.5 text-base sm:text-xs outline-none rounded-lg min-w-0" />
        </div>
      )}

      {/* Özet satırı — mobilde 2x2, geniş ekranda tek satır 4 kolon */}
      <div className="glass rounded-2xl border border-white/8 p-4 grid grid-cols-2 sm:grid-cols-4 gap-y-3 sm:gap-y-0 sm:divide-x sm:divide-white/8">
        <div className="px-2 min-w-0">
          <div className="text-[10px] text-white/35 uppercase tracking-widest mb-1 truncate" style={{ fontFamily: "var(--font-label)" }}>Gelir</div>
          <div className="text-sm sm:text-base font-semibold tabular-nums truncate" style={{ fontFamily: "var(--font-display)", color: "var(--color-success)" }}>₺{income.toLocaleString("tr-TR")}</div>
        </div>
        <div className="px-2 min-w-0">
          <div className="text-[10px] text-white/35 uppercase tracking-widest mb-1 truncate" style={{ fontFamily: "var(--font-label)" }}>Gider</div>
          <div className="text-sm sm:text-base font-semibold tabular-nums truncate" style={{ fontFamily: "var(--font-display)", color: "var(--color-error)" }}>₺{expense.toLocaleString("tr-TR")}</div>
        </div>
        <div className="px-2 min-w-0">
          <div className="text-[10px] text-white/35 uppercase tracking-widest mb-1 truncate" style={{ fontFamily: "var(--font-label)" }}>Net</div>
          <div className="text-sm sm:text-base font-semibold tabular-nums truncate" style={{ fontFamily: "var(--font-display)", color: "var(--color-achievement)" }}>₺{net.toLocaleString("tr-TR")}</div>
        </div>
        <div className="px-2 min-w-0">
          <div className="text-[10px] text-white/35 uppercase tracking-widest mb-1 truncate" style={{ fontFamily: "var(--font-label)" }}>Tahsilat Oranı</div>
          <div className="text-sm sm:text-base font-semibold tabular-nums text-white/70 truncate" style={{ fontFamily: "var(--font-display)" }}>%{collectionRate.toFixed(0)}</div>
        </div>
      </div>

      <SimpleFlowChart data={flowSeries} granularity={granularity} onGranularityChange={setGranularity} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Section title="Öğrenci Bazlı Gelir">
          {topStudents.length === 0 ? <p className="text-white/25 text-sm">Kayıt yok</p> :
            topStudents.map(s => <RankRow key={s.studentId} label={s.studentName} value={s.totalPaid} pct={(s.totalPaid / maxStudent) * 100} color="var(--color-success)" />)}
        </Section>

        <Section title="Salon Bazlı Gelir">
          {gymPerf.length === 0 ? <p className="text-white/25 text-sm">Kayıt yok</p> :
            gymPerf.map(g => <RankRow key={g.gym.id} label={g.gym.name} value={g.totalRevenue} pct={(g.totalRevenue / maxGym) * 100} color="#60A5FA" />)}
        </Section>

        <Section title="Gider ve İade Kategorileri">
          {expenseByCategory.length === 0 ? <p className="text-white/25 text-sm">Bu dönemde gider veya iade yok</p> :
            expenseByCategory.map(e => <RankRow key={e.label} label={e.label} value={e.value} pct={(e.value / maxExpense) * 100} color="var(--color-error)" />)}
        </Section>

        <Section title="En Çok Gelir Getiren Paket">
          {topPackage.length === 0 ? <p className="text-white/25 text-sm">Kayıt yok</p> :
            topPackage.map(p => <RankRow key={p.label} label={p.label} value={p.value} pct={(p.value / maxPackage) * 100} color="var(--color-achievement)" />)}
        </Section>

        <Section title="Ödeme Yöntemi Analizi">
          {methodBreakdown.length === 0 ? <p className="text-white/25 text-sm">Kayıt yok</p> :
            methodBreakdown.map(m => <RankRow key={m.method} label={m.label} value={m.total} pct={(m.total / maxMethod) * 100} color="#A78BFA" />)}
        </Section>

        <Section title="Giderler / Kategori — özet">
          <p className="text-2xl mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--color-error)" }}>₺{expense.toLocaleString("tr-TR")}</p>
          <p className="text-[11px] text-white/35" style={{ fontFamily: "var(--font-label)" }}>{expenseByCategory.length} kategori · seçilen dönem</p>
        </Section>
      </div>
    </div>
  );
}
