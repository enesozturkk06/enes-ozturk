"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { format } from "date-fns";

/**
 * İade formu — her zaman bir ödemeyle bağlantılı (payment_id). Gerçek
 * tahsilat kuralı: iade, orijinal ödeme kaydını DEĞİŞTİRMEZ, ayrı bir
 * negatif hareket olarak eklenir (net gerçek gelir otomatik düşer).
 */
export default function RefundModal({
  studentName, maxAmount, paymentId, studentId, onClose, onSave,
}: {
  studentName: string;
  maxAmount: number;
  paymentId: string;
  studentId?: string;
  onClose: () => void;
  onSave: (data: { paymentId: string; studentId?: string; studentName: string; amount: number; reason?: string; refundDate: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(maxAmount));
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0 || n > maxAmount) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ paymentId, studentId, studentName, amount: n, reason: reason.trim() || undefined, refundDate: date });
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
          className="glass-strong relative z-10 w-[92vw] sm:w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-5"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg text-white" style={{ fontFamily: "var(--font-display)" }}>İADE OLUŞTUR</h3>
            <button onClick={onClose} aria-label="Kapat" className="text-white/30 hover:text-white p-2 -m-2"><X size={16} /></button>
          </div>
          <p className="text-xs text-white/40 mb-4" style={{ fontFamily: "var(--font-label)" }}>
            {studentName} · Tahsil edilen: ₺{maxAmount.toLocaleString("tr-TR")}
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>İade Tutarı (₺) *</label>
              <input type="number" min="0" max={maxAmount} value={amount} onChange={e => setAmount(e.target.value)}
                className="bg-white/[0.03] border border-white/10 w-full px-3 py-2.5 text-lg outline-none rounded-lg"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-error)" }} />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Tarih</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="bg-white/[0.03] border border-white/10 text-white w-full px-3 py-2.5 text-base sm:text-sm outline-none rounded-lg" />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-1.5" style={{ fontFamily: "var(--font-label)" }}>Sebep</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="İsteğe bağlı..."
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
            <button onClick={handleSave} disabled={!amount || Number(amount) > maxAmount || saving}
              className="flex-1 disabled:opacity-40 text-xs font-semibold uppercase rounded-lg transition-colors"
              style={{ background: "var(--color-error)", color: "#fff", fontFamily: "var(--font-label)", minHeight: 44 }}>
              {saving ? "Kaydediliyor..." : "İadeyi Kaydet"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
