"use client";

import { Lock, Unlock, Trash2 } from "lucide-react";

/** Boş saat satırı içeriği — dolu derslerden daha minimal (redesign talebi).
 * `onToggle`/`onRemove` verilirse (sadece admin) küçük ikinci seviye ikon
 * butonları olarak gösterilir — eskiden DayTimeline'da hover ile açılan
 * Aç/Kapat/Sil kontrolleri, mevcut yetenek kaybolmasın diye buraya taşındı. */
export default function EmptySlot({
  label = "BOŞ", actionLabel, onAction, muted, onToggle, isOpen, onRemove,
}: {
  label?: string;
  actionLabel?: string;
  onAction?: () => void;
  muted?: boolean;
  onToggle?: () => void;
  isOpen?: boolean;
  onRemove?: () => void;
}) {
  return (
    <div className="w-full flex items-center justify-between gap-2">
      <span className="text-xs uppercase tracking-wider flex-shrink-0" style={{ color: muted ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-label)" }}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        {onToggle && (
          <button onClick={onToggle} aria-label={isOpen ? "Kapat" : "Aç"}
            className="flex items-center justify-center rounded-lg text-white/25 hover:text-white transition-colors"
            style={{ width: 32, height: 32 }}>
            {isOpen ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        )}
        {onRemove && (
          <button onClick={onRemove} aria-label="Sil"
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ width: 32, height: 32, color: "rgba(239,68,68,0.5)" }}>
            <Trash2 size={12} />
          </button>
        )}
        {actionLabel && onAction && (
          <button onClick={onAction}
            className="text-xs font-semibold px-3.5 rounded-lg transition-transform hover:scale-[1.03] active:scale-95 flex-shrink-0"
            style={{ minHeight: 36, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA", fontFamily: "var(--font-label)" }}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
