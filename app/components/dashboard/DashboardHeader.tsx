"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import Logo from "@/app/components/shared/Logo";
import AvatarBadge from "./AvatarBadge";
import type { XPLevel } from "@/lib/xp";
import { GOLD_BORDER_SOFT } from "./theme";

/**
 * Kompakt premium header — logo + karşılama + bildirim + profil. Eskiden
 * ProfileHeroCard'ın büyük "Hoş Geldin" bloğu + ayrı "bildirim bandı"
 * ikisi birden vardı; ikisi tek satırlık kompakt bir header'da birleşti.
 */
export default function DashboardHeader({
  firstName, photoUrl, fullName, level, unreadCount,
}: {
  firstName: string;
  photoUrl?: string;
  fullName: string;
  level: XPLevel;
  unreadCount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Logo size={34} className="flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-white/30 leading-none" style={{ fontFamily: "var(--font-label)" }}>Merhaba</p>
          <h1 className="text-base sm:text-lg text-white tracking-wide truncate" style={{ fontFamily: "var(--font-display)" }}>{firstName}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href="/ogrenci/bildirimler" aria-label="Bildirimler"
          className="relative flex items-center justify-center rounded-full transition-colors"
          style={{ width: 40, height: 40, background: "rgba(255,255,255,0.03)", border: `1px solid ${GOLD_BORDER_SOFT}` }}>
          <Bell size={16} className="text-white/60" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: "var(--color-error)", fontFamily: "var(--font-label)" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
        <Link href="/ogrenci/profil" aria-label="Profilim">
          <AvatarBadge photoUrl={photoUrl} fullName={fullName} size={40} level={level} />
        </Link>
      </div>
    </div>
  );
}
