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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 min-w-[280px] max-w-[90vw]">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = t.type === "success" ? CheckCircle : t.type === "error" ? XCircle : AlertTriangle;
            const colors = {
              success: "bg-green-900/90 border-green-500/40 text-green-400",
              error:   "bg-crimson/20 border-crimson/40 text-crimson",
              warning: "bg-yellow-900/90 border-yellow-500/40 text-yellow-400",
            }[t.type];
            return (
              <motion.div key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`flex items-start gap-3 px-4 py-3 border backdrop-blur-md ${colors}`}
              >
                <Icon size={16} className="flex-shrink-0 mt-0.5" />
                <span className="flex-1 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {t.message}
                </span>
                <button onClick={() => remove(t.id)} className="text-current opacity-50 hover:opacity-100 flex-shrink-0">
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
