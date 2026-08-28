"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { SlidersHorizontal, X } from "lucide-react";
import type { UnifiedTransaction, TxFilters } from "@/lib/financeUnified";
import { PAYMENT_METHOD_LABEL } from "@/lib/financeUnified";
import type { FinancePaymentMethod } from "@/lib/types";

const QUICK_OPTIONS: { value: TxFilters["quick"]; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "income", label: "Gelir" },
  { value: "expense", label: "Gider" },
  { value: "student", label: "Öğrenci" },
  { value: "manual", label: "Manuel" },
];

/**
 * Finansal Hareketler — banka-uygulaması tarzı temiz işlem listesi.
 * Kart-grid DEĞİL; her satır 🟢/🔴 + isim/kategori + tarih + tutar taşır.
 */
export default function TransactionList({
  transactions, filters, onFiltersChange, onRowClick, limit,
}: {
  transactions: UnifiedTransaction[];
  filters: TxFilters;
  onFiltersChange: (patch: Partial<TxFilters>) => void;
  onRowClick?: (tx: UnifiedTransaction) => void;
  limit?: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const visible = limit ? transactions.slice(0, limit) : transactions;
  const activeAdvanced = !!(filters.from || filters.to || filters.paymentMethod || filters.search);

  return (
    <div className="glass rounded-2xl border border-white/8 overflow-hidden">
      <div className="flex items-center gap-2 p-3 sm:p-4 border-b border-white/8">
        <div className="no-scrollbar flex items-center gap-1 p-0.5 rounded-lg border border-white/8 overflow-x-auto min-w-0">
          {QUICK_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onFiltersChange({ quick: opt.value })}
              className="px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap rounded-md transition-colors flex-shrink-0"
              style={{
                background: filters.quick === opt.value ? "rgba(255,255,255,0.08)" : "transparent",
                color: filters.quick === opt.value ? "#fff" : "rgba(255,255,255,0.4)",
                fontFamily: "var(--font-label)",
              }}>
              {opt.label}
            </button>
          ))}
        </div>
        <button onClick={() => setDrawerOpen(true)}
          className="ml-auto flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors"
          style={{
            borderColor: activeAdvanced ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)",
            color: activeAdvanced ? "var(--color-achievement)" : "rgba(255,255,255,0.4)",
            fontFamily: "var(--font-label)",
          }}>
          <SlidersHorizontal size={12} /> Filtre
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-12 text-white/25 text-sm" style={{ fontFamily: "var(--font-label)" }}>
          Bu filtrede hareket yok
        </div>
      ) : (
        <div className="divide-y divide-white/6">
          {visible.map(tx => (
            <button key={tx.id} onClick={() => onRowClick?.(tx)}
              className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tx.isIncome ? "var(--color-success)" : "var(--color-error)" }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate" style={{ fontFamily: "var(--font-label)" }}>{tx.title}</div>
                <div className="text-[11px] text-white/35 truncate" style={{ fontFamily: "var(--font-label)" }}>
                  {format(parseISO(tx.date), "dd MMM yyyy", { locale: tr })}
                  {tx.subtitle ? ` · ${tx.subtitle}` : ""}
                  {tx.paymentMethod ? ` · ${PAYMENT_METHOD_LABEL[tx.paymentMethod]}` : ""}
                </div>
              </div>
              <span className="text-sm font-semibold tabular-nums flex-shrink-0"
                style={{ fontFamily: "var(--font-display)", color: tx.isIncome ? "var(--color-success)" : "var(--color-error)" }}>
                {tx.isIncome ? "+" : "−"}₺{Math.abs(tx.amount).toLocaleString("tr-TR")}
              </span>
            </button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {drawerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setDrawerOpen(false)}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-strong relative z-10 w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl border border-white/10 p-5"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base text-white" style={{ fontFamily: "var(--font-display)" }}>FİLTRELE</h3>
                <button onClick={() => setDrawerOpen(false)} className="text-white/30 hover:text-white"><X size={16} /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Tarih Aralığı</label>
                  <div className="flex items-center gap-2">
                    <input type="date" value={filters.from ?? ""} onChange={e => onFiltersChange({ from: e.target.value || undefined })}
                      className="bg-white/[0.03] border border-white/8 text-white px-2.5 py-2 text-base sm:text-xs outline-none rounded-lg flex-1 min-w-0" />
                    <input type="date" value={filters.to ?? ""} onChange={e => onFiltersChange({ to: e.target.value || undefined })}
                      className="bg-white/[0.03] border border-white/8 text-white px-2.5 py-2 text-base sm:text-xs outline-none rounded-lg flex-1 min-w-0" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Ödeme Yöntemi</label>
                  <select value={filters.paymentMethod ?? ""} onChange={e => onFiltersChange({ paymentMethod: (e.target.value || undefined) as FinancePaymentMethod | undefined })}
                    className="bg-white/[0.03] border border-white/8 text-white w-full px-2.5 py-2 text-base sm:text-xs outline-none rounded-lg appearance-none">
                    <option value="" className="bg-carbon">Tümü</option>
                    {(Object.keys(PAYMENT_METHOD_LABEL) as FinancePaymentMethod[]).map(m => (
                      <option key={m} value={m} className="bg-carbon">{PAYMENT_METHOD_LABEL[m]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Öğrenci / Salon Ara</label>
                  <input value={filters.search ?? ""} onChange={e => onFiltersChange({ search: e.target.value || undefined })}
                    placeholder="İsim yazın..."
                    className="bg-white/[0.03] border border-white/8 text-white w-full px-2.5 py-2 text-base sm:text-xs outline-none rounded-lg" />
                </div>
              </div>

              <div className="flex gap-2 mt-5" style={{ paddingBottom: "var(--safe-bottom, 0px)" }}>
                <button onClick={() => { onFiltersChange({ from: undefined, to: undefined, paymentMethod: undefined, search: undefined }); }}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold uppercase rounded-lg transition-colors"
                  style={{ fontFamily: "var(--font-label)", minHeight: 44 }}>Temizle</button>
                <button onClick={() => setDrawerOpen(false)}
                  className="flex-1 text-xs font-semibold uppercase rounded-lg transition-colors"
                  style={{ background: "var(--color-achievement)", color: "#1a1005", fontFamily: "var(--font-label)", minHeight: 44 }}>Uygula</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
