"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";

type ToastType = "success" | "error" | "warning";

interface Toast { id: string; message: string; type: ToastType }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const remove = (id: string) => setToasts(p => p.filter(t => t.id !== id));

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 min-w-[280px] max-w-[90vw]"
        style={{ bottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))" }}>
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = t.type === "success" ? CheckCircle : t.type === "error" ? XCircle : AlertTriangle;
            // Gerçek EO OS V3 token'ları — "info" tipi mevcut API'de yok (ToastType sadece
            // success|error|warning), o yüzden eklenmedi; sadece bu 3 gerçek tip renklendi.
            const color = {
              success: "var(--color-success)",
              error:   "var(--color-error)",
              warning: "var(--color-warning)",
            }[t.type];
            return (
              <motion.div key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.9, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 340, damping: 26 } }}
                exit={{ opacity: 0, y: -8, scale: 0.95, filter: "blur(4px)", transition: { duration: 0.25, ease: "easeIn" } }}
                className="glass-strong relative flex items-start gap-3 pl-4 pr-3 py-3 rounded-xl overflow-hidden"
                style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${color}30` }}
              >
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
                <div className="absolute top-0 bottom-0 left-0 w-1" style={{ background: color }} />
                <Icon size={17} className="flex-shrink-0 mt-0.5" style={{ color }} />
                <span className="flex-1 text-sm text-white/90" style={{ fontFamily: "var(--font-label)" }}>
                  {t.message}
                </span>
                <button onClick={() => remove(t.id)} className="text-white/30 hover:text-white transition-colors flex-shrink-0 rounded-full p-0.5 hover:bg-white/5">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
