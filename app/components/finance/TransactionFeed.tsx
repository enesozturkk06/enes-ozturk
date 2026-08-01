"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, Package, RefreshCw, PlusCircle, CheckCircle2, Receipt, Check, X, ArrowUpDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { IncomeMovement, IncomeMovementType, PaymentRecordStatus, Student, Gym } from "@/lib/types";
import { StatusBadge, STATUS_CFG } from "./StatusBadge";

export interface TransactionFilters {
  search: string;
  dateFrom: string; dateTo: string;
  studentId: string; gymId: string;
  type: IncomeMovementType | ""; status: PaymentRecordStatus | "";
}

export const EMPTY_TRANSACTION_FILTERS: TransactionFilters = {
  search: "", dateFrom: "", dateTo: "", studentId: "", gymId: "", type: "", status: "",
};

export function applyTransactionFilters(movements: IncomeMovement[], f: TransactionFilters): IncomeMovement[] {
  return movements.filter(m => {
    if (f.dateFrom && m.paymentDate < f.dateFrom) return false;
    if (f.dateTo && m.paymentDate > f.dateTo) return false;
    if (f.studentId && m.studentId !== f.studentId) return false;
    if (f.gymId && m.gymId !== f.gymId) return false;
    if (f.type && m.paymentType !== f.type) return false;
    if (f.status && m.status !== f.status) return false;
    if (f.search) {
      const q = f.search.toLocaleLowerCase("tr-TR");
      const hay = `${m.studentName} ${m.gymName ?? ""} ${m.note ?? ""}`.toLocaleLowerCase("tr-TR");
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}

type SortOrder = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

const SORT_OPTIONS: [SortOrder, string][] = [
  ["date_desc", "Tarih ↓ Yeni-Eski"],
  ["date_asc", "Tarih ↑ Eski-Yeni"],
  ["amount_desc", "Tutar ↓ Yüksek-Düşük"],
  ["amount_asc", "Tutar ↑ Düşük-Yüksek"],
];

function sortMovements(movements: IncomeMovement[], order: SortOrder): IncomeMovement[] {
  const sorted = [...movements];
  switch (order) {
    case "date_asc": return sorted.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
    case "amount_desc": return sorted.sort((a, b) => b.paymentAmount - a.paymentAmount);
    case "amount_asc": return sorted.sort((a, b) => a.paymentAmount - b.paymentAmount);
    default: return sorted.sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
  }
}

const MOVEMENT_TYPE_LABELS: Record<IncomeMovementType, string> = {
  yeni_paket: "Yeni Paket", paket_yenileme: "Paket Yenileme",
  ek_odeme: "Ek Ödeme", ders_tamamlama: "Ders Tamamlama",
};

const MOVEMENT_TYPE_ICONS: Record<IncomeMovementType, React.ReactNode> = {
  yeni_paket: <Package size={14} />, paket_yenileme: <RefreshCw size={14} />,
  ek_odeme: <PlusCircle size={14} />, ders_tamamlama: <CheckCircle2 size={14} />,
};

function TransactionCard({
  m, editing, editValue, onEditStart, onEditChange, onEditSave, onEditCancel,
}: {
  m: IncomeMovement; editing: boolean; editValue: string;
  onEditStart: () => void; onEditChange: (v: string) => void;
  onEditSave: () => void; onEditCancel: () => void;
}) {
  const c = STATUS_CFG[m.status];
  return (
    <div className="glass relative overflow-hidden rounded-xl transition-transform hover:scale-[1.005]"
      style={{ borderColor: `${c.bar}30` }}>
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: c.bar }} />
      <div className="pl-4 pr-3 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${c.bar}18`, color: c.color }}>
            {MOVEMENT_TYPE_ICONS[m.paymentType]}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-label)" }}>{m.studentName}</span>
              <span className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-label)" }}>
                {format(parseISO(m.paymentDate), "dd MMM yy", { locale: tr })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[11px] text-white/40" style={{ fontFamily: "var(--font-label)" }}>
                {MOVEMENT_TYPE_LABELS[m.paymentType]}
              </span>
              {m.gymName && (
                <>
                  <span className="text-white/15 text-[10px]">·</span>
                  <span className="text-[11px] text-violet" style={{ fontFamily: "var(--font-label)" }}>{m.gymName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 justify-between sm:justify-end flex-shrink-0 flex-wrap">
          <div className="text-right">
            <div className="text-[9px] text-white/25 uppercase" style={{ fontFamily: "var(--font-label)" }}>Tutar</div>
            <div className="text-sm font-bold text-white tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
              {m.paymentAmount > 0 ? `₺${m.paymentAmount.toLocaleString("tr-TR")}` : "—"}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[9px] text-white/25 uppercase" style={{ fontFamily: "var(--font-label)" }}>Salon Payı</div>
            {editing ? (
              <div className="flex items-center gap-1">
                <input type="number" value={editValue} onChange={e => onEditChange(e.target.value)} autoFocus
                  className="glass w-16 text-white px-1 py-0.5 text-xs outline-none text-right rounded" />
                <button onClick={onEditSave} style={{ color: "var(--color-success)" }}><Check size={12} /></button>
                <button onClick={onEditCancel} className="text-white/30 hover:text-white"><X size={12} /></button>
              </div>
            ) : (
              <button onClick={onEditStart} className="text-sm font-bold text-violet hover:underline tabular-nums" style={{ fontFamily: "var(--font-display)" }}>
                {m.gymShareAmount > 0 ? `₺${m.gymShareAmount.toLocaleString("tr-TR")}` : "—"}
              </button>
            )}
          </div>

          <div className="text-right">
            <div className="text-[9px] text-white/25 uppercase" style={{ fontFamily: "var(--font-label)" }}>Net</div>
            <div className={`text-sm font-bold tabular-nums ${m.trainerNetAmount < 0 ? "text-red-400" : "text-green-400"}`} style={{ fontFamily: "var(--font-display)" }}>
              ₺{m.trainerNetAmount.toLocaleString("tr-TR")}
            </div>
          </div>

          <StatusBadge status={m.status} />
        </div>
      </div>
    </div>
  );
}

export default function TransactionFeed({
  movements, students, gyms, filters, onFiltersChange,
  editingShareId, editingShareValue, onShareEditStart, onShareValueChange, onShareSave, onShareCancel,
}: {
  movements: IncomeMovement[];
  students: Student[]; gyms: Gym[];
  filters: TransactionFilters;
  onFiltersChange: (patch: Partial<TransactionFilters>) => void;
  editingShareId: string | null; editingShareValue: string;
  onShareEditStart: (m: IncomeMovement) => void;
  onShareValueChange: (v: string) => void;
  onShareSave: (m: IncomeMovement) => void;
  onShareCancel: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("date_desc");
  const sortedMovements = useMemo(() => sortMovements(movements, sortOrder), [movements, sortOrder]);
  const visible = expanded ? sortedMovements : sortedMovements.slice(0, 20);

  return (
    <div>
      <div className="flex items-center gap-2 px-1 pb-2">
        <Receipt size={13} style={{ color: "#60A5FA" }} />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-display)" }}>
          Son Finans Hareketleri
        </span>
        <div className="h-px flex-1 bg-white/5" />
      </div>

      {/* Tek satır modern filtre alanı */}
      <div className="glass rounded-xl p-3 mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
          <input value={filters.search} onChange={e => onFiltersChange({ search: e.target.value })}
            placeholder="Ara: öğrenci, salon, not..."
            className="glass w-full text-white pl-8 pr-2 py-2 text-xs outline-none rounded-lg"
            style={{ fontFamily: "var(--font-label)" }} />
        </div>
        <select value={filters.studentId} onChange={e => onFiltersChange({ studentId: e.target.value })}
          className="glass text-white px-2 py-2 text-xs outline-none appearance-none rounded-lg" style={{ fontFamily: "var(--font-label)" }}>
          <option value="" className="bg-carbon">Tüm Öğrenciler</option>
          {students.sort((a, b) => a.fullName.localeCompare(b.fullName)).map(s => (
            <option key={s.id} value={s.id} className="bg-carbon">{s.fullName}</option>
          ))}
        </select>
        <select value={filters.gymId} onChange={e => onFiltersChange({ gymId: e.target.value })}
          className="glass text-white px-2 py-2 text-xs outline-none appearance-none rounded-lg" style={{ fontFamily: "var(--font-label)" }}>
          <option value="" className="bg-carbon">Tüm Salonlar</option>
          {gyms.map(g => <option key={g.id} value={g.id} className="bg-carbon">{g.name}</option>)}
        </select>
        <select value={filters.type} onChange={e => onFiltersChange({ type: e.target.value as IncomeMovementType | "" })}
          className="glass text-white px-2 py-2 text-xs outline-none appearance-none rounded-lg" style={{ fontFamily: "var(--font-label)" }}>
          <option value="" className="bg-carbon">Tüm Türler</option>
          <option value="yeni_paket" className="bg-carbon">Yeni Paket</option>
          <option value="paket_yenileme" className="bg-carbon">Paket Yenileme</option>
          <option value="ek_odeme" className="bg-carbon">Ek Ödeme</option>
          <option value="ders_tamamlama" className="bg-carbon">Ders Tamamlama</option>
        </select>
        <select value={filters.status} onChange={e => onFiltersChange({ status: e.target.value as PaymentRecordStatus | "" })}
          className="glass text-white px-2 py-2 text-xs outline-none appearance-none rounded-lg" style={{ fontFamily: "var(--font-label)" }}>
          <option value="" className="bg-carbon">Ödenen + Borçlu</option>
          <option value="odendi" className="bg-carbon">Sadece Ödenen</option>
          <option value="beklemede" className="bg-carbon">Sadece Borçlu</option>
          <option value="gecikti" className="bg-carbon">Sadece Gecikmiş</option>
        </select>
        <input type="date" value={filters.dateFrom} onChange={e => onFiltersChange({ dateFrom: e.target.value })}
          className="glass text-white px-2 py-2 text-xs outline-none rounded-lg" title="Başlangıç" />
        <input type="date" value={filters.dateTo} onChange={e => onFiltersChange({ dateTo: e.target.value })}
          className="glass text-white px-2 py-2 text-xs outline-none rounded-lg" title="Bitiş" />
        <div className="relative">
          <ArrowUpDown size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)}
            className="glass text-white pl-6 pr-2 py-2 text-xs outline-none appearance-none rounded-lg" style={{ fontFamily: "var(--font-label)" }}>
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value} className="bg-carbon">{label}</option>
            ))}
          </select>
        </div>
      </div>

      {movements.length === 0 ? (
        <div className="glass text-center py-10 rounded-xl">
          <Receipt size={28} className="text-white/10 mx-auto mb-2" />
          <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-label)" }}>Filtreye uyan gelir hareketi yok</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 10) * 0.02, duration: 0.25 }}>
              <TransactionCard
                m={m}
                editing={editingShareId === m.id}
                editValue={editingShareValue}
                onEditStart={() => onShareEditStart(m)}
                onEditChange={onShareValueChange}
                onEditSave={() => onShareSave(m)}
                onEditCancel={onShareCancel}
              />
            </motion.div>
          ))}
          {sortedMovements.length > 20 && (
            <button onClick={() => setExpanded(e => !e)}
              className="w-full py-2.5 text-xs font-semibold text-white/40 hover:text-white transition-colors"
              style={{ fontFamily: "var(--font-label)" }}>
              {expanded ? "Daha Az Göster" : `Tümünü Göster (${sortedMovements.length})`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
