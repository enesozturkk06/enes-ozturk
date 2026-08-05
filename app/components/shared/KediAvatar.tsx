"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export type KediAvatarState = "idle" | "thinking" | "listening" | "speaking";
export type KediMood = "happy" | "serious" | "motivating" | "calm" | "funny" | null;

interface KediAvatarProps {
  size?: number;
  state?: KediAvatarState;
  mood?: KediMood;
  /** Her arttığında (onboundary/kelime sınırı), avatar ağzına kısa, güçlü bir "kelime vuruşu" ekler. */
  mouthPulseKey?: number;
  /** Arkada yumuşak bir hâle (glow) render edilsin mi — küçük buton içine gömülü kullanımlarda kapatılabilir. */
  glow?: boolean;
}

/** Panter temalı mod renkleri — göz ışıltısı + hâle rengi. */
const MOOD_EYE_COLOR: Record<Exclude<KediMood, null>, [string, string]> = {
  happy:      ["#4ADE80", "#38BDF8"],
  serious:    ["#818CF8", "#818CF8"],
  motivating: ["#FBBF24", "#F97316"],
  calm:       ["#38BDF8", "#4ADE80"],
  funny:      ["#F472B6", "#4ADE80"],
};
const DEFAULT_EYES: [string, string] = ["#A3E635", "#4ADE80"]; // panter yeşili — mood yokken varsayılan

/** Mood'a göre kaş açısı (derece) — [sol kaş, sağ kaş]. Negatif = dışa doğru kalkık. */
const MOOD_BROW: Record<Exclude<KediMood, null>, [number, number]> = {
  happy:      [-14, 14],
  serious:    [10, -10],
  motivating: [-8, 4],
  calm:       [-2, 2],
  funny:      [-20, 6],
};
const DEFAULT_BROW: [number, number] = [-4, 4];

/** Mood'a göre dinlenme (konuşmuyorken) ağız eğrisi. */
const MOOD_MOUTH: Record<Exclude<KediMood, null>, string> = {
  happy:      "M19.5 36.5 Q24 40 28.5 36.5",
  serious:    "M20.5 37.5 Q24 37.5 27.5 37.5",
  motivating: "M20 37 Q24 38.5 28 37",
  calm:       "M20.5 37 Q24 37.8 27.5 37",
  funny:      "M19.5 36.8 Q24 39.5 28.5 36",
};
const DEFAULT_MOUTH = "M20.5 37 Q24 37.8 27.5 37";

/**
 * Kedi AI'ın siyah panter temalı, katmanlı (kulak/kaş/göz/ağız ayrı grup) 2D
 * avatarı. Nefes alma, göz kırpma, dinlerken kullanıcıyı (imleci) takip etme,
 * konuşurken kelime-senkronlu ağız vuruşu (bkz. hooks/useKediVoice.ts
 * onMouthPulse) ve mood'a göre kaş/ağız/göz farklılaşması içerir.
 *
 * Gerçek 3D rig değil — bilinçli bir kapsam kararı (ayrı bir proje olarak
 * planlandı, bkz. Kedi AI Ultra Faz 1 kapsam kararları).
 */
export default function KediAvatar({ size = 32, state = "idle", mood = null, mouthPulseKey = 0, glow = true }: KediAvatarProps) {
  const [blink, setBlink] = useState(false);
  const [pulse, setPulse] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  // Konuşma döngüsü süresi — render sırasında Math.random() çağırmak yerine
  // (impure/kararsız), sadece gerçek bir kelime vuruşu geldiğinde değişir.
  const [mouthDuration, setMouthDuration] = useState(0.45);

  /* Göz kırpma döngüsü — düşünürken sabit bakar */
  useEffect(() => {
    if (state === "thinking") return;
    let cancelled = false;
    const loop = () => {
      const delay = 2200 + Math.random() * 2600;
      const t = setTimeout(() => {
        if (cancelled) return;
        setBlink(true);
        setTimeout(() => { if (!cancelled) setBlink(false); }, 140);
        loop();
      }, delay);
      return t;
    };
    const timer = loop();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [state]);

  /* Kelime-senkronlu ağız vuruşu (Chrome onboundary) — baseline döngünün ÜSTÜNE kısa bir vurgu ekler */
  useEffect(() => {
    if (mouthPulseKey === 0) return;
    setMouthDuration(0.4 + Math.random() * 0.15);
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 90);
    return () => clearTimeout(t);
  }, [mouthPulseKey]);

  /* Dinlerken kullanıcıya bak — imleç konumuna göre göz bebeği hafifçe kayar */
  useEffect(() => {
    if (state !== "listening" || typeof window === "undefined") { setGaze({ x: 0, y: 0 }); return; }
    const handler = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const clampDist = Math.min(dist, 400);
      setGaze({ x: (dx / dist) * (clampDist / 400) * 1.6, y: (dy / dist) * (clampDist / 400) * 1.2 });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [state]);

  const [leftEyeColor, rightEyeColor] = mood ? MOOD_EYE_COLOR[mood] : DEFAULT_EYES;
  const [browL, browR] = mood ? MOOD_BROW[mood] : DEFAULT_BROW;
  const restMouth = mood ? MOOD_MOUTH[mood] : DEFAULT_MOUTH;

  const eyeScaleY = blink ? 0.1 : state === "thinking" ? 0.85 : 1;
  const eyeOffsetY = state === "thinking" ? -1.4 : 0;
  const pupilX = state === "listening" ? gaze.x : 0;
  const pupilY = state === "listening" ? gaze.y : (state === "thinking" ? -0.8 : 0);

  const glowColor = state === "speaking" ? "rgba(245,158,11,0.5)"
    : state === "thinking" ? "rgba(139,92,246,0.55)"
    : state === "listening" ? "rgba(74,222,128,0.4)"
    : "rgba(139,92,246,0.18)";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {glow && (
        <motion.div
          aria-hidden
          style={{
            position: "absolute", inset: -size * 0.35, borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            filter: "blur(4px)", pointerEvents: "none",
          }}
          animate={{ opacity: state === "idle" ? [0.4, 0.6, 0.4] : [0.55, 0.85, 0.55], scale: state === "speaking" ? [1, 1.08, 1] : [1, 1.03, 1] }}
          transition={{ duration: state === "speaking" ? 0.9 : 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Nefes alma — tüm gövde çok hafif büyüyüp küçülür */}
      <motion.div
        animate={{ scale: [1, 1.014, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: size, height: size, position: "relative" }}
      >
        <svg ref={svgRef} width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {/* Kulaklar — sleeker/panter üçgen, dinlerken/düşünürken oynar */}
          <motion.g
            animate={
              state === "listening" ? { rotate: [0, -4, 0, 3, 0] }
              : state === "thinking" ? { rotate: -3 }
              : { rotate: 0 }
            }
            transition={state === "listening" ? { duration: 1.6, repeat: Infinity } : { duration: 0.4 }}
            style={{ originX: "10px", originY: "20px" }}
          >
            <path d="M10 22L4.5 4L20.5 15Z" fill="#0A0A10" stroke="#4c1d95" strokeWidth="1" />
            <path d="M10.5 21L6 7L19 15.5Z" fill="#1B0F2E" />
          </motion.g>
          <motion.g
            animate={
              state === "listening" ? { rotate: [0, 4, 0, -3, 0] }
              : state === "thinking" ? { rotate: 3 }
              : { rotate: 0 }
            }
            transition={state === "listening" ? { duration: 1.6, repeat: Infinity, delay: 0.2 } : { duration: 0.4 }}
            style={{ originX: "38px", originY: "20px" }}
          >
            <path d="M38 22L43.5 4L27.5 15Z" fill="#0A0A10" stroke="#4c1d95" strokeWidth="1" />
            <path d="M37.5 21L42 7L29 15.5Z" fill="#1B0F2E" />
          </motion.g>

          {/* Kafa — koyu panter siyahı, hafif mor sheen */}
          <ellipse cx="24" cy="30" rx="16" ry="14" fill="#0B0B12" stroke="#4c1d95" strokeWidth="0.8" />
          <ellipse cx="20" cy="24" rx="7" ry="4" fill="#1B0F2E" opacity="0.35" />

          {/* Kaşlar — mood'a göre açı değişir */}
          <motion.line x1="13.5" y1="21.5" x2="20" y2="20.5" stroke="rgba(196,181,253,0.55)" strokeWidth="1.1" strokeLinecap="round"
            animate={{ rotate: browL }} transition={{ duration: 0.35 }} style={{ originX: "16.75px", originY: "21px" }} />
          <motion.line x1="28" y1="20.5" x2="34.5" y2="21.5" stroke="rgba(196,181,253,0.55)" strokeWidth="1.1" strokeLinecap="round"
            animate={{ rotate: browR }} transition={{ duration: 0.35 }} style={{ originX: "31.25px", originY: "21px" }} />

          {/* Sol göz — dikey yarık göz bebeği (panter) */}
          <motion.g animate={{ scaleY: eyeScaleY, y: eyeOffsetY }} transition={{ duration: 0.12 }} style={{ originX: "18px", originY: "28px" }}>
            <ellipse cx="18" cy="28" rx="4.8" ry="4.2" fill={leftEyeColor} />
            <motion.g animate={{ x: pupilX, y: pupilY }} transition={{ duration: 0.15 }}>
              <ellipse cx="18" cy="28" rx="1.7" ry="3.7" fill="#000" />
              <circle cx="17" cy="26.3" r="0.9" fill="rgba(255,255,255,0.9)" />
            </motion.g>
            <ellipse cx="18" cy="28" rx="4.8" ry="4.2" fill="none" stroke="#0EA5E9" strokeWidth="0.4" opacity="0.6" />
          </motion.g>
          {/* Sağ göz */}
          <motion.g animate={{ scaleY: eyeScaleY, y: eyeOffsetY }} transition={{ duration: 0.12 }} style={{ originX: "30px", originY: "28px" }}>
            <ellipse cx="30" cy="28" rx="4.8" ry="4.2" fill={rightEyeColor} />
            <motion.g animate={{ x: pupilX, y: pupilY }} transition={{ duration: 0.15 }}>
              <ellipse cx="30" cy="28" rx="1.7" ry="3.7" fill="#000" />
              <circle cx="29" cy="26.3" r="0.9" fill="rgba(255,255,255,0.9)" />
            </motion.g>
            <ellipse cx="30" cy="28" rx="4.8" ry="4.2" fill="none" stroke="#22C55E" strokeWidth="0.4" opacity="0.6" />
          </motion.g>

          {/* Burun */}
          <path d="M22.5 33.5L24 35.5L25.5 33.5L24 32.5Z" fill="#8B5CF6" opacity="0.95" />

          {/* Ağız — mood'a göre dinlenme eğrisi, konuşurken döngü + kelime vuruşu.
              `d` her zaman bir başlangıç değeriyle set edilir — Framer Motion
              `animate` uygulanana kadar SVG'nin d="undefined" render etmesini
              (tarayıcı konsol hatası) önler. */}
          <motion.path
            stroke="rgba(196,181,253,0.6)"
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
            initial={{ d: restMouth }}
            animate={
              state === "speaking"
                ? { d: [restMouth, "M20.5 37 Q24 41 27.5 37", restMouth] }
                : { d: restMouth }
            }
            transition={state === "speaking" ? { duration: mouthDuration, repeat: Infinity } : { duration: 0.3 }}
            style={{ scaleY: pulse ? 1.5 : 1, transformOrigin: "24px 37px" }}
          />

          {/* Bıyıklar */}
          <line x1="5" y1="33" x2="17" y2="33.5" stroke="rgba(200,200,255,0.3)" strokeWidth="0.7" />
          <line x1="5" y1="36" x2="17" y2="35" stroke="rgba(200,200,255,0.24)" strokeWidth="0.7" />
          <line x1="43" y1="33" x2="31" y2="33.5" stroke="rgba(200,200,255,0.3)" strokeWidth="0.7" />
          <line x1="43" y1="36" x2="31" y2="35" stroke="rgba(200,200,255,0.24)" strokeWidth="0.7" />
        </svg>
      </motion.div>
    </div>
  );
}
