/**
 * app/components/shared/SportDecor.tsx — Genel amaçlı, çok düşük opacity
 * kickboks dekorasyonu (eldiven/kum torbası/dambıl/bandaj/ip atlama).
 *
 * BlackCatAI.tsx içindeki KediPanelDecor ile AYNI görsel prensip (sadece CSS
 * transform/opacity, mevcut animate-float-* keyframe'leri reuse edilir,
 * WebGL/Canvas/rAF YOK, pointer-events:none, z-index:0 — arkada, içeriğin
 * ASLA önüne geçmez). KediPanelDecor kasıtlı olarak AYRI/dokunulmadı bırakıldı
 * (zaten canlı test edilmiş bir panel, riske atılmadı) — bu, App genelinde
 * (Dashboard vb.) kullanılacak PAYLAŞILAN, genel amaçlı sürüm.
 *
 * Kullanım: bir `position: relative` konteynerin İLK çocuğu olarak render
 * edin — `absolute inset-0` ile kendi konteynerini doldurur.
 */
export default function SportDecor({ hideOnMobile = true }: { hideOnMobile?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={hideOnMobile ? "hidden sm:block" : undefined}
      style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", zIndex: -1 }}
    >
      {/* Boks eldiveni */}
      <svg className="sport-decor animate-float-slow" style={{ top: "4%", left: "-5%", width: 84, height: 84 }}
        viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 2a3 3 0 0 0-3 3v4.5A5.5 5.5 0 0 0 9.5 15H10v3a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4v-5a6 6 0 0 0-6-6h-1V5a3 3 0 0 0-3-3H7z" />
      </svg>
      {/* Kum torbası */}
      <svg className="sport-decor sport-decor-crimson animate-float-medium delay-300" style={{ top: "18%", right: "-6%", width: 60, height: 60 }}
        viewBox="0 0 24 24" fill="currentColor">
        <rect x="9" y="2" width="6" height="3" rx="1" /><path d="M8 6h8l1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L8 6z" />
      </svg>
      {/* Dambıl */}
      <svg className="sport-decor sport-decor-gold animate-float-fast delay-700" style={{ bottom: "28%", left: "-4%", width: 54, height: 54 }}
        viewBox="0 0 24 24" fill="currentColor">
        <rect x="2" y="9" width="3" height="6" rx="1" /><rect x="19" y="9" width="3" height="6" rx="1" />
        <rect x="5" y="10" width="2" height="4" /><rect x="17" y="10" width="2" height="4" /><rect x="7" y="11" width="10" height="2" />
      </svg>
      {/* Bandaj (el sargısı) */}
      <svg className="sport-decor animate-float-medium delay-500" style={{ bottom: "6%", right: "-5%", width: 68, height: 68 }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 6c4 0 4 4 8 4s4-4 8-4M2 12c4 0 4 4 8 4s4-4 8-4M2 18c4 0 4 4 8 4s4-4 8-4" />
      </svg>
      {/* İp atlama */}
      <svg className="sport-decor sport-decor-gold animate-float-slow delay-1000" style={{ top: "46%", left: "42%", width: 44, height: 44 }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="6" cy="6" r="2" /><circle cx="18" cy="6" r="2" /><path d="M6 8c-2 4 2 12 6 12s8-8 6-12" />
      </svg>
    </div>
  );
}
