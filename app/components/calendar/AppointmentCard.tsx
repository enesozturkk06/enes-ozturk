"use client";

/**
 * Dolu ders satırı içeriği — kompakt, tüm kart gradient border ile
 * ÇEVRİLMEZ (redesign talebi); sadece aktif/seçili durumda subtle accent.
 * Metin içeriği tamamen çağıran sayfa tarafından belirlenir — admin gerçek
 * öğrenci adını gösterir, öğrenci tarafı başkasının randevusu için sadece
 * "DOLU" gösterir (gizlilik burada bileşen seviyesinde değil, çağrı
 * yerinde garanti edilir).
 */
export default function AppointmentCard({
  title, subtitle, badgeLabel, badgeColor = "var(--color-success)", accent, onClick,
}: {
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeColor?: string;
  accent?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className="w-full flex items-center justify-between gap-3 text-left rounded-lg transition-colors"
      style={{
        padding: "6px 10px",
        marginLeft: -10, marginRight: -10,
        background: accent ? "rgba(245,158,11,0.06)" : "transparent",
        border: accent ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
        boxShadow: accent ? "0 0 12px -4px rgba(245,158,11,0.3)" : "none",
        cursor: onClick ? "pointer" : "default",
      }}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate" style={{ fontFamily: "var(--font-label)" }}>{title}</div>
        {subtitle && (
          <div className="text-[11px] text-white/35 truncate" style={{ fontFamily: "var(--font-label)" }}>{subtitle}</div>
        )}
      </div>
      {badgeLabel && (
        <span className="flex-shrink-0 text-[9px] font-semibold px-2 py-1 rounded-full uppercase tracking-wider"
          style={{ background: `${badgeColor}18`, color: badgeColor, fontFamily: "var(--font-label)" }}>
          {badgeLabel}
        </span>
      )}
    </Comp>
  );
}
