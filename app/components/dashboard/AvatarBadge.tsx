"use client";
import { useState } from "react";
import Image from "next/image";
import type { XPLevel } from "@/lib/xp";
import { GOLD, GOLD_BRIGHT } from "./theme";

/**
 * Premium avatar rozeti — fotoğraf varsa gösterir, yoksa (veya yüklenemezse)
 * baş harflerle şık bir gradyan daireye düşer. Turuncu/çirkin bir "kırık
 * resim" placeholder'ı ASLA görünmez (next/image onError → initials'a geçer).
 */
export default function AvatarBadge({
  photoUrl, fullName, size = 56, level,
}: {
  photoUrl?: string;
  fullName: string;
  size?: number;
  /** Verilirse seviye rengiyle uyumlu kenarlık/glow — verilmezse sade altın. */
  level?: XPLevel;
}) {
  const [imgError, setImgError] = useState(false);
  const initials = fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const showPhoto = !!photoUrl && !imgError;

  const borderColor = level?.borderColor ?? "rgba(201,169,110,0.35)";
  const glow = level?.glowColor ?? "rgba(201,169,110,0.18)";
  const gradFrom = level?.gradFrom ?? GOLD;
  const gradTo = level?.gradTo ?? GOLD_BRIGHT;

  return (
    <div className="relative rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
      style={{
        width: size, height: size,
        background: showPhoto ? undefined : `linear-gradient(135deg, ${gradFrom}40, ${gradTo}1a)`,
        border: `1.5px solid ${borderColor}`,
        boxShadow: `0 0 16px ${glow}`,
      }}>
      {showPhoto ? (
        <Image src={photoUrl!} alt={fullName} fill sizes={`${size}px`} className="object-cover" onError={() => setImgError(true)} />
      ) : (
        <span style={{ fontFamily: "var(--font-display)", fontSize: size * 0.34, color: "#fff" }}>{initials}</span>
      )}
    </div>
  );
}
