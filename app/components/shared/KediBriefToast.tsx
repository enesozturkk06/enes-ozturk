"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import KediAvatar, { type KediMood } from "./KediAvatar";

interface KediBriefToastProps {
  text: string;
  mood: KediMood;
  onOpen: () => void;
  onDismiss: () => void;
}

/**
 * Kedi AI'nin proaktif günlük özeti — chat panelini zorla açmadan, küçük
 * bir dismissible kart olarak görünür. Tıklanınca tam sohbeti açar (bu
 * mesaj zaten geçmişe kaydedildiği için orada da görünür), X ile kapatılır.
 */
export default function KediBriefToast({ text, mood, onOpen, onDismiss }: KediBriefToastProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="fixed z-[52] glass-strong rounded-2xl p-3 flex items-start gap-2.5 cursor-pointer"
      style={{
        right: 16,
        left: 16,
        marginLeft: "auto",
        maxWidth: 340,
        bottom: "calc(var(--bottom-nav-total-h, calc(env(safe-area-inset-bottom, 0px) + 64px)) + 84px)",
      }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(139,92,246,0.3)" }}>
        <KediAvatar size={22} mood={mood} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: "#A78BFA", fontFamily: "var(--font-label)" }}>
          Kedi AI
        </div>
        <p className="text-xs leading-relaxed text-white/85" style={{ fontFamily: "var(--font-label)" }}>
          {text}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 transition-colors"
        aria-label="Kapat"
      >
        <X size={13} />
      </button>
    </motion.div>
  );
}
