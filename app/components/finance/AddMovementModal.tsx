"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { format } from "date-fns";
import type { OtherIncomeType, ExpenseCategory, FinancePaymentMethod, Gym } from "@/lib/types";
import { EXPENSE_CATEGORY_LABEL, OTHER_INCOME_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/financeUnified";

const INCOME_CATEGORIES: OtherIncomeType[] = ["ozel_ders", "grup_ders", "urun_satisi", "sponsorluk", "salon_geliri", "diger"];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ["salon_kirasi", "salon_payi", "ekipman", "reklam", "ulasim", "fatura", "personel", "vergi_harc", "diger"];
const METHODS: FinancePaymentMethod[] = ["nakit", "kart", "havale_eft", "diger"];

export interface MovementFormData {
  amount: number;
  category: string;
  description?: string;
  date: string;
  paymentMethod: FinancePaymentMethod;
  gymId?: string;
}

/** "+ Gelir Ekle" / "− Gider Ekle" — tek paylaşılan modal, mode'a göre kategori listesi değişir.
 * `initial` verilirse "Düzenle" moduna geçer (mevcut kaydı günceller). */
export default function AddMovementModal({
  mode, gyms, initial, onClose, onSave,
}: {
  mode: "income" | "expense";
  gyms: Gym[];
  initial?: MovementFormData;
  onClose: () => void;
  onSave: (data: MovementFormData) => Promise<void>;
}) {
  const categories = mode === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const labelMap = mode === "income" ? OTHER_INCOME_LABEL : EXPENSE_CATEGORY_LABEL;
  const accent = mode === "income" ? "var(--color-success)" : "var(--color-error)";
  const isEdit = !!initial;

  const [category, setCategory] = useState<string>(initial?.category ?? categories[0]);
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [date, setDate] = useState(initial?.date ?? format(new Date(), "yyyy-MM-dd"));
  const [method, setMethod] = useState<FinancePaymentMethod>(initial?.paymentMethod ?? "nakit");
  const [gymId, setGymId] = useState(initial?.gymId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ amount: n, category, description: description.trim() || undefined, date, paymentMethod: method, gymId: gymId || undefined });
      onClose();
    } catch (e) {
      setError(
        e instanceof Error && /schema cache|check constraint/i.test(e.message)
          ? "Bu kayıt için gerekli veritabanı güncellemesi henüz yapılmadı. Lütfen önce SUPABASE_FINANCE_EXPENSES_REFUNDS.sql dosyasını Supabase'de çalıştırın."
          : "Kaydedilemedi. Lütfen tekrar deneyin.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
        <motion.div initial={{ scale: 0.96, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="glass-strong relative z-10 w-[92vw] sm:w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-5"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-white" style={{ fontFamily: "var(--font-display)" }}>
              {isEdit ? (mode === "income" ? "GELİRİ DÜZENLE" : "GİDERİ DÜZENLE") : (mode === "income" ? "GELİR EKLE" : "GİDER EKLE")}
            </h3>
            <button onClick={onClose} aria-label="Kapat" className="text-white/30 hover:text-white p-2 -m-2"><X size={16} /></button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Tutar (₺) *</label>
              <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                className="bg-white/[0.03] border border-white/10 w-full px-3 py-2.5 text-lg outline-none rounded-lg"
                style={{ fontFamily: "var(--font-display)", color: accent }} />
            </div>

            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="bg-white/[0.03] border border-white/10 text-white w-full px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
                {categories.map(c => <option key={c} value={c} className="bg-carbon">{labelMap[c as keyof typeof labelMap]}</option>)}
              </select>
            </div>

            {mode === "expense" && (category === "salon_kirasi" || category === "salon_payi") && gyms.length > 0 && (
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Salon</label>
                <select value={gymId} onChange={e => setGymId(e.target.value)}
                  className="bg-white/[0.03] border border-white/10 text-white w-full px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
                  <option value="" className="bg-carbon">Seçilmedi</option>
                  {gyms.filter(g => g.isActive).map(g => <option key={g.id} value={g.id} className="bg-carbon">{g.name}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Tarih</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="bg-white/[0.03] border border-white/10 text-white w-full px-3 py-2.5 text-base sm:text-sm outline-none rounded-lg" />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Ödeme Yöntemi</label>
                <select value={method} onChange={e => setMethod(e.target.value as FinancePaymentMethod)}
                  className="bg-white/[0.03] border border-white/10 text-white w-full px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
                  {METHODS.map(m => <option key={m} value={m} className="bg-carbon">{PAYMENT_METHOD_LABEL[m]}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Açıklama</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="İsteğe bağlı..."
                className="bg-white/[0.03] border border-white/10 text-white w-full px-3 py-2.5 text-base sm:text-sm outline-none rounded-lg" />
            </div>
          </div>

          {error && (
            <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--color-error)", fontFamily: "var(--font-label)" }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-5">
            <button onClick={onClose}
              className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold uppercase rounded-lg transition-colors"
              style={{ fontFamily: "var(--font-label)", minHeight: 44 }}>Vazgeç</button>
            <button onClick={handleSave} disabled={!amount || saving}
              className="flex-1 disabled:opacity-40 text-xs font-semibold uppercase rounded-lg transition-colors"
              style={{ background: accent, color: "#0a0a0a", fontFamily: "var(--font-label)", minHeight: 44 }}>
              {saving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
