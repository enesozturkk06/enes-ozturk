"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Edit2, Undo2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import type { UnifiedTransaction } from "@/lib/financeUnified";
import { PAYMENT_METHOD_LABEL } from "@/lib/financeUnified";

/** Bir işlem satırına tıklanınca açılan detay/aksiyon sayfası — Düzenle/Sil/İade Oluştur. */
export default function TransactionDetailSheet({
  tx, onClose, onEdit, onDelete, onRefund,
}: {
  tx: UnifiedTransaction;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onRefund?: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    setBusy(true);
    try { await onDelete(); onClose(); } finally { setBusy(false); }
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
        <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)" }} />
        <motion.div initial={{ scale: 0.96, y: 12, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="glass-strong relative z-10 w-[92vw] sm:w-full sm:max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 p-5"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tx.isIncome ? "var(--color-success)" : "var(--color-error)" }} />
              <h3 className="text-base text-white truncate" style={{ fontFamily: "var(--font-display)" }}>{tx.title}</h3>
            </div>
            <button onClick={onClose} aria-label="Kapat" className="text-white/30 hover:text-white p-2 -m-2 flex-shrink-0"><X size={16} /></button>
          </div>

          <p className="text-xs text-white/40 mb-4" style={{ fontFamily: "var(--font-label)" }}>
            {format(parseISO(tx.date), "dd MMMM yyyy", { locale: tr })}
            {tx.subtitle ? ` · ${tx.subtitle}` : ""}
            {tx.paymentMethod ? ` · ${PAYMENT_METHOD_LABEL[tx.paymentMethod]}` : ""}
          </p>

          <div className="text-2xl sm:text-3xl mb-5 pb-4 border-b border-white/8 truncate" style={{ fontFamily: "var(--font-display)", color: tx.isIncome ? "var(--color-success)" : "var(--color-error)" }}>
            {tx.isIncome ? "+" : "−"}₺{Math.abs(tx.amount).toLocaleString("tr-TR")}
          </div>

          <div className="flex flex-col gap-2">
            {onEdit && (
              <button onClick={onEdit}
                className="flex items-center justify-center gap-2 border border-white/10 text-white/70 hover:text-white text-xs font-semibold uppercase rounded-lg transition-colors"
                style={{ fontFamily: "var(--font-label)", minHeight: 44 }}>
                <Edit2 size={13} /> Düzenle
              </button>
            )}
            {onRefund && (
              <button onClick={onRefund}
                className="flex items-center justify-center gap-2 border border-white/10 text-white/70 hover:text-white text-xs font-semibold uppercase rounded-lg transition-colors"
                style={{ fontFamily: "var(--font-label)", minHeight: 44 }}>
                <Undo2 size={13} /> İade Oluştur
              </button>
            )}
            {onDelete && (
              <button onClick={confirmingDelete ? handleDelete : () => setConfirmingDelete(true)} disabled={busy}
                className="flex items-center justify-center gap-2 text-xs font-semibold uppercase rounded-lg transition-colors disabled:opacity-40"
                style={{
                  background: confirmingDelete ? "var(--color-error)" : "transparent",
                  border: confirmingDelete ? "none" : "1px solid rgba(239,68,68,0.3)",
                  color: confirmingDelete ? "#fff" : "var(--color-error)",
                  fontFamily: "var(--font-label)",
                  minHeight: 44,
                }}>
                <Trash2 size={13} /> {busy ? "Siliniyor..." : confirmingDelete ? "Evet, Sil" : "Sil"}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
