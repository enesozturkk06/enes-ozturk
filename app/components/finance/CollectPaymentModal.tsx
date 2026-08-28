"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface CollectPaymentData { amount: number; method: string }

/**
 * "Tahsil Et" — Bekleyen Tahsilatlar listesinden doğrudan ödeme kaydeder.
 * Mevcut ödeme mantığını KULLANIR (page.tsx'te addPayment() çağrılır,
 * öğrenci bakiyesi ve income_movements OTOMATİK güncellenir) — burada
 * yeni bir tahsilat mantığı İCAT EDİLMEZ, sadece mevcut akış tetiklenir.
 */
export default function CollectPaymentModal({
  studentName, maxAmount, onClose, onSave,
}: {
  studentName: string;
  maxAmount: number;
  onClose: () => void;
  onSave: (data: CollectPaymentData) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(maxAmount));
  const [method, setMethod] = useState("nakit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = Number(amount);
  const valid = Number.isFinite(n) && n > 0 && n <= maxAmount;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ amount: n, method });
      onClose();
    } catch {
      setError("Kaydedilemedi. Lütfen tekrar deneyin.");
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
          className="glass-strong relative z-10 w-[92vw] sm:w-full sm:max-w-sm rounded-2xl border border-white/10 p-5"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-white" style={{ fontFamily: "var(--font-display)" }}>TAHSİL ET</h3>
            <button onClick={onClose} aria-label="Kapat" className="text-white/30 hover:text-white p-2 -m-2"><X size={16} /></button>
          </div>
          <p className="text-xs text-white/40 mb-4" style={{ fontFamily: "var(--font-label)" }}>
            {studentName} · Bekleyen: ₺{maxAmount.toLocaleString("tr-TR")}
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Tahsil Edilen Tutar (₺) *</label>
              <input type="number" min="0" max={maxAmount} value={amount} onChange={e => setAmount(e.target.value)}
                className="bg-white/[0.03] border border-white/10 w-full px-3 py-2.5 text-lg outline-none rounded-lg"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-success)" }} />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Ödeme Yöntemi</label>
              <select value={method} onChange={e => setMethod(e.target.value)}
                className="bg-white/[0.03] border border-white/10 text-white w-full px-3 py-2.5 text-base sm:text-sm outline-none appearance-none rounded-lg">
                <option value="nakit" className="bg-carbon">Nakit</option>
                <option value="havale" className="bg-carbon">Havale / EFT</option>
                <option value="kredi" className="bg-carbon">Kredi Kartı</option>
                <option value="papara" className="bg-carbon">Papara</option>
              </select>
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
            <button onClick={handleSave} disabled={!valid || saving}
              className="flex-1 disabled:opacity-40 text-xs font-semibold uppercase rounded-lg transition-colors"
              style={{ background: "var(--color-success)", color: "#04120a", fontFamily: "var(--font-label)", minHeight: 44 }}>
              {saving ? "Kaydediliyor..." : "Tahsil Et"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
