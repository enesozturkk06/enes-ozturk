"use client";
import { Bell } from "lucide-react";

interface Props {
  dateLabel: string;
  unreadCount: number;
  onOpenNotifications: () => void;
}

export default function AdminHeroCard({ dateLabel, unreadCount, onOpenNotifications }: Props) {
  return (
    <div className="glass-strong relative overflow-hidden rounded-3xl">
      <div className="relative p-6 sm:p-8 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
            Hoş Geldin, Enes!
          </h1>
          <p className="text-xs sm:text-sm text-white/40 mt-1" style={{ fontFamily: "var(--font-label)" }}>
            {dateLabel} · Admin Paneli
          </p>
        </div>

        {/* Premium bildirim zili */}
        <button onClick={onOpenNotifications}
          className="relative flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
          aria-label="Bildirimler">
          {unreadCount > 0 && (
            <span className="absolute inset-0 rounded-2xl animate-neon-pulse" style={{ background: "rgba(245,158,11,0.3)" }} />
          )}
          <Bell size={19} className="relative" style={{ color: unreadCount > 0 ? "var(--color-achievement)" : "rgba(255,255,255,0.35)" }} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
              style={{ background: "var(--color-error)", fontSize: 10, minWidth: 18, height: 18, padding: "0 4px", lineHeight: 1 }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
