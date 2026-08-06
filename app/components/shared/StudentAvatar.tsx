"use client";

/**
 * StudentAvatar.tsx — Kedi Avatar Sistemi render motoru.
 *
 * Öğrencinin kişiselleştirilebilir 2D karakteri. `KediAvatar.tsx` (panter
 * maskotu) İLE AYNI teknik: düz vektör dolgular + ince kontur, katmanlı
 * `<motion.g>` grupları, `useEffect`+`setTimeout` nefes/göz kırpma döngüsü,
 * `initial={{d:...}}` kuralı (d="undefined" konsol hatası fix'i). İsim
 * çakışmasını önlemek için `KediAvatar` (panter) ile AYRI bir bileşen.
 *
 * Foto-gerçekçi/"Bitmoji-fidelity" illüstrasyon HEDEFLENMİYOR (bkz. plan) —
 * stilize, premium bir vektör karakter hedefleniyor, KediAvatar ile aynı
 * kalite katmanında.
 *
 * PERFORMANS (bu modülün en yüksek önceliği):
 * - Her katman ayrı, React.memo'lı bir alt bileşen — props sadece primitive
 *   (renk string'i, sayı, boolean) olduğu için shallow-equality memoization
 *   gerçekten işe yarıyor; bir kategori değişince SADECE o katman render olur.
 * - Nefes/göz kırpma döngüleri sadece `animate=true` VE component gerçekten
 *   görünürken çalışır (görünürlük kontrolü çağıran tarafın sorumluluğu —
 *   bkz. hooks/useInView.ts + bu dosyanın altındaki `LazyStudentAvatar`).
 * - Yeni SVG filter/blur eklenmedi — aura/glow için sadece basit radial
 *   gradient + mevcut ölçekte animasyon (GPU-ucuz transform/opacity).
 */
import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { StudentAvatarConfig, AvatarActivity } from "@/lib/types";
import {
  SKIN_TONES, EYE_COLORS, HAIR_COLORS, EYEBROW_STYLES,
  BEARD_STYLES, GLOVE_COLORS, type CatalogOption,
} from "@/lib/avatarEvolution";
import type { EvolutionTier } from "@/lib/avatarEvolution";
import type { KediMood } from "./KediAvatar";

function findValue(catalog: CatalogOption[], id: string, fallback: string): string {
  return catalog.find(o => o.id === id)?.value ?? fallback;
}

const OUTFIT_COLORS: Record<string, { shirt: string; shorts: string; trim: string }> = {
  "starter-kit": { shirt: "#374151", shorts: "#1F2937", trim: "#DC2626" },
  "club-kit": { shirt: "#7C2D12", shorts: "#111827", trim: "#F59E0B" },
  "pro-kit": { shirt: "#1E3A8A", shorts: "#0F172A", trim: "#38BDF8" },
  "champion-kit": { shirt: "#78350F", shorts: "#000000", trim: "#FBBF24" },
};
const SHOE_COLORS: Record<string, string> = {
  starter: "#374151", hightop: "#1F2937", pro: "#DC2626",
};
const AURA_COLORS: Record<string, string> = {
  "gold-aura": "rgba(245,158,11,0.45)", "neon-aura": "rgba(56,189,248,0.45)",
};
const BACKGROUND_COLORS: Record<string, string> = {
  flame: "radial-gradient(circle, rgba(220,38,38,0.28), transparent 70%)",
  arena: "radial-gradient(circle, rgba(139,92,246,0.25), transparent 70%)",
};

/* ── Katman: Arka plan kozmetiği ─────────────────────────────────── */
const AvatarBackground = memo(function AvatarBackground({ bg }: { bg?: string }) {
  if (!bg || bg === "none" || !BACKGROUND_COLORS[bg]) return null;
  return (
    <div aria-hidden style={{ position: "absolute", inset: -10, borderRadius: "50%", background: BACKGROUND_COLORS[bg], pointerEvents: "none" }} />
  );
});

/* ── Katman: Aura kozmetiği ──────────────────────────────────────── */
const AvatarAura = memo(function AvatarAura({ aura, animate }: { aura?: string; animate: boolean }) {
  if (!aura || aura === "none" || !AURA_COLORS[aura]) return null;
  return (
    <motion.div
      aria-hidden
      style={{ position: "absolute", inset: -14, borderRadius: "50%", background: `radial-gradient(circle, ${AURA_COLORS[aura]}, transparent 70%)`, pointerEvents: "none" }}
      animate={animate ? { opacity: [0.5, 0.85, 0.5], scale: [1, 1.05, 1] } : { opacity: 0.6 }}
      transition={{ duration: 2.8, repeat: animate ? Infinity : 0, ease: "easeInOut" }}
    />
  );
});

/* ── Katman: Gövde + kıyafet (fizik ölçeği evrim kademesinden gelir) ─ */
const AvatarTorso = memo(function AvatarTorso({ outfitId, physiqueScale, muscleDefinition }: {
  outfitId: string; physiqueScale: number; muscleDefinition: number;
}) {
  const colors = OUTFIT_COLORS[outfitId] ?? OUTFIT_COLORS["starter-kit"];
  const shoulderW = 34 * physiqueScale;
  return (
    <g transform={`translate(80 150) scale(${physiqueScale})`}>
      {/* Şortlar */}
      <path d="M-22 28 L22 28 L20 58 L4 58 L0 40 L-4 58 L-20 58 Z" fill={colors.shorts} stroke={colors.trim} strokeWidth="0.8" />
      {/* Gövde */}
      <path d={`M-${shoulderW / 2} -30 Q-${shoulderW / 2 + 2} 0 -20 30 L20 30 Q${shoulderW / 2 + 2} 0 ${shoulderW / 2} -30 Q0 -${38} -${shoulderW / 2} -30 Z`}
        fill={colors.shirt} stroke={colors.trim} strokeWidth="1" />
      {/* Kas tanımı — evrim kademesi arttıkça belirginleşen ince çizgiler */}
      {muscleDefinition > 0.15 && (
        <g opacity={muscleDefinition} stroke={colors.trim} strokeWidth="0.6" fill="none">
          <path d="M-8 -10 Q0 -6 8 -10" />
          <path d="M-10 0 Q0 4 10 0" />
        </g>
      )}
    </g>
  );
});

/* ── Aktivite pozları — kol/dirsek/el konumları, render'dan bağımsız
 * bir "poz" veri kümesi (bkz. plan §1, render-katmanı sözleşmesi). Sadece
 * bu 2D yorumcusu tarafından kullanılıyor ama şekli ileride 3D pose/rig
 * eşlemesine kolayca taşınabilir olacak şekilde basit tutuldu. */
interface ArmPose { elbow: { x: number; y: number }; hand: { x: number; y: number } }
const ARM_POSES: Record<AvatarActivity, { left: ArmPose; right: ArmPose }> = {
  idle:      { left: { elbow: { x: -34, y: 5 }, hand: { x: -30, y: 22 } }, right: { elbow: { x: 34, y: 5 }, hand: { x: 30, y: 22 } } },
  guard:     { left: { elbow: { x: -26, y: -18 }, hand: { x: -14, y: -34 } }, right: { elbow: { x: 26, y: -18 }, hand: { x: 14, y: -34 } } },
  shadowbox: { left: { elbow: { x: -26, y: -14 }, hand: { x: -16, y: -30 } }, right: { elbow: { x: 26, y: -10 }, hand: { x: 12, y: -28 } } },
  bagwork:   { left: { elbow: { x: -24, y: -12 }, hand: { x: -10, y: -26 } }, right: { elbow: { x: 26, y: -8 }, hand: { x: 16, y: -30 } } },
  jumprope:  { left: { elbow: { x: -30, y: -2 }, hand: { x: -22, y: 14 } }, right: { elbow: { x: 30, y: -2 }, hand: { x: 22, y: 14 } } },
  stretch:   { left: { elbow: { x: -22, y: -34 }, hand: { x: -14, y: -52 } }, right: { elbow: { x: 22, y: -34 }, hand: { x: 14, y: -52 } } },
  drink:     { left: { elbow: { x: -32, y: 4 }, hand: { x: -28, y: 20 } }, right: { elbow: { x: 20, y: -20 }, hand: { x: 10, y: -38 } } },
  phone:     { left: { elbow: { x: -32, y: 4 }, hand: { x: -28, y: 20 } }, right: { elbow: { x: 24, y: -22 }, hand: { x: 16, y: -40 } } },
};

/* ── Katman: Kollar + eldivenler (aktiviteye göre poz + döngü animasyonu) ── */
const AvatarArmsGloves = memo(function AvatarArmsGloves({
  skinTone, gloveColor, physiqueScale, tattoo, activity, quality,
}: {
  skinTone: string; gloveColor: string; physiqueScale: number; tattoo?: string;
  activity: AvatarActivity; quality: "full" | "reduced";
}) {
  const armW = 8 * physiqueScale;
  const pose = ARM_POSES[activity] ?? ARM_POSES.idle;
  const looping = quality === "full" && (activity === "shadowbox" || activity === "bagwork" || activity === "jumprope");

  const armPath = (p: ArmPose) => `M${p.elbow.x * physiqueScale * 0.4} -20 Q${p.elbow.x * physiqueScale} ${p.elbow.y} ${p.hand.x * physiqueScale} ${p.hand.y}`;

  return (
    <g transform="translate(80 150)">
      <motion.g
        animate={looping ? { x: activity === "shadowbox" ? [0, -3, 0, 3, 0] : [0, 2, 0] } : { x: 0 }}
        transition={looping ? { duration: activity === "jumprope" ? 0.5 : 0.7, repeat: Infinity, ease: "easeInOut" } : { duration: 0.25 }}
      >
        <path d={armPath(pose.left)} stroke={skinTone} strokeWidth={armW} strokeLinecap="round" fill="none" />
        {tattoo && tattoo !== "none" && (
          <path d={`M${pose.left.elbow.x * 0.7} ${pose.left.elbow.y - 4} L${pose.left.elbow.x * 0.9} ${pose.left.elbow.y + 6}`} stroke="#1E293B" strokeWidth="1.4" opacity="0.7" strokeLinecap="round" />
        )}
        <circle cx={pose.left.hand.x * physiqueScale} cy={pose.left.hand.y} r={7} fill={gloveColor} stroke="#00000030" strokeWidth="0.6" />
      </motion.g>
      <motion.g
        animate={looping ? { x: activity === "shadowbox" ? [0, 4, 0, -2, 0] : [0, -2, 0] } : { x: 0 }}
        transition={looping ? { duration: activity === "jumprope" ? 0.5 : 0.65, repeat: Infinity, ease: "easeInOut", delay: 0.15 } : { duration: 0.25 }}
      >
        <path d={armPath(pose.right)} stroke={skinTone} strokeWidth={armW} strokeLinecap="round" fill="none" />
        <circle cx={pose.right.hand.x * physiqueScale} cy={pose.right.hand.y} r={7} fill={gloveColor} stroke="#00000030" strokeWidth="0.6" />
      </motion.g>
    </g>
  );
});

/* ── Katman: Aktivite prop'ları (ip/kum torbası/telefon/su şişesi) ───── */
const AvatarActivityProps = memo(function AvatarActivityProps({ activity, quality }: { activity: AvatarActivity; quality: "full" | "reduced" }) {
  const animateRope = quality === "full";
  switch (activity) {
    case "jumprope":
      return (
        <motion.path
          d="M50 158 Q80 100 110 158" stroke="#9CA3AF" strokeWidth="1.6" fill="none"
          animate={animateRope ? { d: ["M50 158 Q80 100 110 158", "M50 158 Q80 60 110 158", "M50 158 Q80 100 110 158"] } : {}}
          transition={{ duration: 0.5, repeat: animateRope ? Infinity : 0, ease: "easeInOut" }}
        />
      );
    case "bagwork":
      return (
        <g transform="translate(112 145)">
          <rect x="-8" y="-24" width="16" height="48" rx="8" fill="#3F2A1D" stroke="#1F1410" strokeWidth="1" />
          <line x1="0" y1="-24" x2="0" y2="-34" stroke="#4B5563" strokeWidth="1.4" />
        </g>
      );
    case "phone":
      return <rect x="66" y="10" width="10" height="18" rx="2" fill="#111827" stroke="#374151" strokeWidth="0.6" />;
    case "drink":
      return <rect x="90" y="18" width="7" height="14" rx="1.5" fill="#38BDF8" opacity="0.85" />;
    default:
      return null;
  }
});

/* ── Katman: Ağız (mood + aktivite bazlı — esneme/yawn ağız açık) ────── */
const MOOD_MOUTH_2D: Record<Exclude<KediMood, null>, string> = {
  happy: "M72 78 Q80 84 88 78", serious: "M74 79 Q80 79 86 79",
  motivating: "M73 78 Q80 82 87 78", calm: "M74 78.5 Q80 80 86 78.5", funny: "M72 78 Q80 85 88 77.5",
};
const AvatarMouth = memo(function AvatarMouth({ mood, activity }: { mood: KediMood; activity: AvatarActivity }) {
  if (activity === "stretch") return <ellipse cx="80" cy="80" rx="4" ry="5" fill="#3F2A1D" />; // esneme — ağız açık
  const d = mood ? MOOD_MOUTH_2D[mood] : "M74 79 Q80 80 86 79";
  return <path d={d} stroke="rgba(0,0,0,0.5)" strokeWidth="1.2" strokeLinecap="round" fill="none" />;
});

/* ── Katman: Bacaklar + ayakkabılar (ip atlarken hafif zıplama) ──────── */
const AvatarLegsShoes = memo(function AvatarLegsShoes({ skinTone, shoeId, physiqueScale, activity, quality }: {
  skinTone: string; shoeId: string; physiqueScale: number; activity: AvatarActivity; quality: "full" | "reduced";
}) {
  const shoeColor = SHOE_COLORS[shoeId] ?? SHOE_COLORS.starter;
  const bouncing = quality === "full" && activity === "jumprope";
  // ÖNEMLİ (canlı testte bulunan gerçek bug — düzeltildi): statik bir SVG
  // `transform` attribute'unu AYNI elemanın framer-motion `animate` prop'uyla
  // karıştırmak (KediAvatar.tsx'teki d/animate çakışmasıyla AYNI kategori
  // hata) — framer-motion animasyonu için CSS `transform: none` inline
  // style'ı YAZIYOR ve bu, CSS Transforms spec'ine göre SVG'nin presentation
  // attribute'undaki transform'u İPTAL EDİYOR, eleman (0,0)'a kayıyor. Fix:
  // statik konum DÜZ bir `<g>` üzerinde (framer-motion hiç dokunmuyor),
  // animasyonlu zıplama offset'i İÇ İÇE bir `<motion.g>` üzerinde — ikisi
  // asla aynı elemanda çakışmıyor.
  return (
    <g transform="translate(80 150)">
      <motion.g
        animate={bouncing ? { y: [0, -4, 0] } : { y: 0 }}
        transition={bouncing ? { duration: 0.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.25 }}
      >
        <rect x={-16 * physiqueScale} y="86" width={10 * physiqueScale} height="34" rx="4" fill={skinTone} />
        <rect x={6 * physiqueScale} y="86" width={10 * physiqueScale} height="34" rx="4" fill={skinTone} />
        <ellipse cx={-11 * physiqueScale} cy="122" rx={9 * physiqueScale} ry="5" fill={shoeColor} />
        <ellipse cx={11 * physiqueScale} cy="122" rx={9 * physiqueScale} ry="5" fill={shoeColor} />
      </motion.g>
    </g>
  );
});

/* ── Katman: Baş + ten ─────────────────────────────────────────────── */
const AvatarHead = memo(function AvatarHead({ skinTone }: { skinTone: string }) {
  return <ellipse cx="80" cy="62" rx="22" ry="24" fill={skinTone} stroke="#00000018" strokeWidth="0.6" />;
});

/* ── Katman: Saç ──────────────────────────────────────────────────── */
const AvatarHair = memo(function AvatarHair({ style, color }: { style: string; color: string }) {
  switch (style) {
    case "bald": return null;
    case "buzz": return <path d="M58 50 Q80 32 102 50 Q100 42 80 40 Q60 42 58 50Z" fill={color} />;
    case "mohawk": return <path d="M74 22 L86 22 L84 48 L76 48Z" fill={color} />;
    case "long": return <path d="M56 52 Q52 90 60 100 L64 100 Q60 70 66 52 Q80 34 94 52 Q100 70 96 100 L100 100 Q108 90 104 52 Q92 30 80 30 Q66 30 56 52Z" fill={color} />;
    case "short-2": return <path d="M56 50 Q58 28 80 26 Q102 28 104 50 Q98 40 92 44 Q86 36 80 40 Q74 36 68 44 Q62 40 56 50Z" fill={color} />;
    case "short-1":
    default:
      return <path d="M57 50 Q58 30 80 28 Q102 30 103 50 Q96 38 80 38 Q64 38 57 50Z" fill={color} />;
  }
});

/* ── Katman: Kaşlar ───────────────────────────────────────────────── */
const AvatarEyebrows = memo(function AvatarEyebrows({ style }: { style: string }) {
  const rotate = style === "angled" ? 12 : style === "thick" ? 4 : 0;
  const width = style === "thick" ? 2.2 : style === "thin" ? 1 : 1.5;
  return (
    <g stroke="rgba(0,0,0,0.55)" strokeWidth={width} strokeLinecap="round">
      <line x1="68" y1="56" x2="76" y2={56 - rotate * 0.15} />
      <line x1="84" y1={56 - rotate * 0.15} x2="92" y2="56" />
    </g>
  );
});

/* ── Katman: Gözler (göz kırpma parent'tan gelir) ─────────────────── */
const AvatarEyes = memo(function AvatarEyes({ color, blink }: { color: string; blink: boolean }) {
  const scaleY = blink ? 0.1 : 1;
  return (
    <g>
      <g style={{ transform: `scaleY(${scaleY})`, transformOrigin: "72px 62px", transition: "transform 0.1s" }}>
        <ellipse cx="72" cy="62" rx="3.2" ry="3" fill="#fff" />
        <circle cx="72" cy="62" r="1.6" fill={color} />
      </g>
      <g style={{ transform: `scaleY(${scaleY})`, transformOrigin: "88px 62px", transition: "transform 0.1s" }}>
        <ellipse cx="88" cy="62" rx="3.2" ry="3" fill="#fff" />
        <circle cx="88" cy="62" r="1.6" fill={color} />
      </g>
    </g>
  );
});

/* ── Katman: Sakal ────────────────────────────────────────────────── */
const AvatarBeard = memo(function AvatarBeard({ style, skinTone }: { style: string; skinTone: string }) {
  if (style === "none") return null;
  const darkTone = "rgba(30,20,10,0.55)";
  if (style === "stubble") return <ellipse cx="80" cy="76" rx="16" ry="10" fill={darkTone} opacity="0.35" />;
  if (style === "goatee") return <path d="M74 78 Q80 90 86 78 Q80 82 74 78Z" fill={darkTone} />;
  // full
  return <path d="M60 68 Q62 88 80 90 Q98 88 100 68 Q90 82 80 82 Q70 82 60 68Z" fill={darkTone} stroke={skinTone} strokeWidth="0" />;
});

/* ── Katman: Kemer kozmetiği ──────────────────────────────────────── */
const AvatarBelt = memo(function AvatarBelt({ belt }: { belt?: string }) {
  if (!belt || belt !== "champion-belt") return null;
  return (
    <g transform="translate(80 178)">
      <rect x="-24" y="-5" width="48" height="9" rx="3" fill="#F59E0B" stroke="#78350F" strokeWidth="1" />
      <circle cx="0" cy="0" r="4" fill="#78350F" />
    </g>
  );
});

/* ── Ana bileşen ──────────────────────────────────────────────────── */

export interface StudentAvatarProps {
  config: StudentAvatarConfig;
  tier?: EvolutionTier;
  size?: number;
  /** false ise nefes/göz kırpma döngüleri tamamen atlanır — reduced motion / zayıf donanım / görünür değilken kullanılır. */
  animate?: boolean;
  /** Kedi Life — Dijital Salon'un döngüsel aktivitesi. Varsayılan "idle". */
  activity?: AvatarActivity;
  /** Kedi AI bir şeyi kutlarken/yorumlarken ifade değişimi — bkz. KediAvatar.tsx'teki aynı kavram. */
  mood?: KediMood;
  /** "reduced" ise SADECE ikincil animasyonlar (nefes, aura pulse) durur — aktivitenin ana pozu/döngüsü etkilenmez. Bkz. hooks/useAdaptiveQuality.ts. */
  quality?: "full" | "reduced";
}

function StudentAvatarInner({
  config, tier, size = 120, animate = true, activity = "idle", mood = null, quality = "full",
}: StudentAvatarProps) {
  const [blink, setBlink] = useState(false);
  const effectiveQuality: "full" | "reduced" = animate ? quality : "reduced";

  useEffect(() => {
    if (!animate) return; // effectiveBlink aşağıda animate=false'ı zaten hesaba katıyor, state resetlemeye gerek yok
    let cancelled = false;
    const loop = () => {
      const delay = 2600 + Math.random() * 3000;
      const t = setTimeout(() => {
        if (cancelled) return;
        setBlink(true);
        setTimeout(() => { if (!cancelled) setBlink(false); }, 130);
        loop();
      }, delay);
      return t;
    };
    const timer = loop();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [animate]);

  const skinTone = findValue(SKIN_TONES, config.skinTone, "#C68863");
  const eyeColor = findValue(EYE_COLORS, config.eyeColor, "#6B4226");
  const hairColor = findValue(HAIR_COLORS, config.hairColor, "#0F0F12");
  const gloveColor = findValue(GLOVE_COLORS, config.gloveColor, "#DC2626");
  const eyebrowStyle = EYEBROW_STYLES.find(o => o.id === config.eyebrowStyle)?.value ?? "neutral";
  const beardStyle = BEARD_STYLES.find(o => o.id === config.beardStyle)?.value ?? "none";
  const physiqueScale = tier?.physiqueScale ?? 1;
  const muscleDefinition = tier?.muscleDefinition ?? 0;
  const effectiveBlink = animate && blink;

  const breathingOn = animate && effectiveQuality === "full";

  return (
    <div style={{ position: "relative", width: size, height: size * 1.35 }}>
      <AvatarBackground bg={config.equippedCosmetics?.background} />
      <AvatarAura aura={config.equippedCosmetics?.aura} animate={breathingOn} />
      <motion.div
        animate={breathingOn ? { scale: [1, 1.012, 1] } : {}}
        transition={{ duration: 3.8, repeat: breathingOn ? Infinity : 0, ease: "easeInOut" }}
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <svg width="100%" height="100%" viewBox="0 0 160 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <AvatarLegsShoes skinTone={skinTone} shoeId={config.shoeId} physiqueScale={physiqueScale} activity={activity} quality={effectiveQuality} />
          <AvatarTorso outfitId={config.outfitId} physiqueScale={physiqueScale} muscleDefinition={muscleDefinition} />
          <AvatarArmsGloves skinTone={skinTone} gloveColor={gloveColor} physiqueScale={physiqueScale} tattoo={config.tattooId} activity={activity} quality={effectiveQuality} />
          <AvatarActivityProps activity={activity} quality={effectiveQuality} />
          <AvatarBelt belt={config.equippedCosmetics?.belt} />
          <AvatarHead skinTone={skinTone} />
          <AvatarBeard style={beardStyle} skinTone={skinTone} />
          <AvatarEyebrows style={eyebrowStyle} />
          <AvatarEyes color={eyeColor} blink={effectiveBlink} />
          <AvatarMouth mood={mood} activity={activity} />
          <AvatarHair style={config.hairStyle} color={hairColor} />
        </svg>
      </motion.div>
    </div>
  );
}

const StudentAvatar = memo(StudentAvatarInner);
export default StudentAvatar;
