"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Gerçek mobil bottom-sheet (aşağıdan kayarak açılır) — admin ders detayı
 * VE öğrenci randevu onay/detay akışı AYNI kabuğu kullanır, içerik
 * children ile role'e göre değişir. Safe-area-bottom + 44px dokunma
 * hedefleri gözetilir.
 */
export default function AppointmentBottomSheet({
  open, onClose, title, subtitle, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={onClose}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="glass-strong relative z-10 w-full sm:max-w-md rounded-t-[20px] sm:rounded-[20px] sm:mb-6 overflow-hidden max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-px gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange" />
            {/* sürükleme tutamağı — mobil bottom-sheet imasını güçlendirir */}
            <div className="flex justify-center pt-2.5 sm:hidden flex-shrink-0">
              <div className="w-9 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg text-white tracking-wide truncate" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
                {subtitle && <p className="text-xs text-white/40 mt-0.5 truncate" style={{ fontFamily: "var(--font-label)" }}>{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Kapat" className="flex-shrink-0 text-white/30 hover:text-white p-2 -m-2 rounded-lg">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 pb-5 overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
