"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical, Plus, Unlock, Lock, Trash2 } from "lucide-react";

/**
 * Admin araç çubuğu — "SAAT ARALIK EKLE" devasa kart yerine kompakt
 * "+ Ekle" tetikleyicisi + toplu işlemler "⋮ Yönet" menüsüne taşındı
 * (redesign talebi). Bu bileşen SADECE tetikleyicileri render eder;
 * gerçek formlar/işlem mantığı admin sayfasında kalır.
 */
export default function CalendarActionMenu({
  onAdd, onOpenAll, onCloseAll, onClearDay, disabled,
}: {
  onAdd: () => void;
  onOpenAll: () => void;
  onCloseAll: () => void;
  onClearDay: () => void;
  disabled?: boolean;
}) {
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button onClick={() => setManageOpen(o => !o)} aria-label="Yönet"
          className="flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
          style={{ width: 40, height: 40, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <MoreVertical size={16} />
        </button>
        <AnimatePresence>
          {manageOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setManageOpen(false)} />
              <motion.div initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 z-50 glass-strong rounded-xl overflow-hidden w-60 border border-white/10">
                <button onClick={() => { onOpenAll(); setManageOpen(false); }} disabled={disabled}
                  className="w-full flex items-center gap-2.5 px-4 text-xs text-left transition-colors hover:bg-white/5 disabled:opacity-40"
                  style={{ color: "var(--color-success)", fontFamily: "var(--font-label)", minHeight: 44 }}>
                  <Unlock size={13} />Tüm Saatleri Aç
                </button>
                <button onClick={() => { onCloseAll(); setManageOpen(false); }} disabled={disabled}
                  className="w-full flex items-center gap-2.5 px-4 text-xs text-left transition-colors hover:bg-white/5 disabled:opacity-40"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-label)", minHeight: 44 }}>
                  <Lock size={13} />Tüm Saatleri Kapat
                </button>
                <button onClick={() => { onClearDay(); setManageOpen(false); }} disabled={disabled}
                  className="w-full flex items-center gap-2.5 px-4 text-xs text-left transition-colors hover:bg-white/5 disabled:opacity-40"
                  style={{ color: "var(--color-error)", fontFamily: "var(--font-label)", minHeight: 44, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <Trash2 size={13} />Güne Ait Saatleri Sil
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <button onClick={onAdd}
        className="gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange flex items-center gap-1.5 px-4 rounded-lg text-white text-xs font-semibold uppercase transition-transform hover:scale-[1.02] active:scale-95"
        style={{ height: 40, fontFamily: "var(--font-label)" }}>
        <Plus size={14} />Ekle
      </button>
    </div>
  );
}
