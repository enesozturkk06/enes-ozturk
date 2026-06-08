"use client";

import { useEffect, useRef, useCallback } from "react";

export type ConfettiKind = "xp" | "badge" | "levelup" | "certificate" | "mission";

type ConfettiOptions = {
  particleCount: number;
  spread: number;
  origin: { x?: number; y: number };
  colors: string[];
  scalar?: number;
  shapes?: string[];
  disableForReducedMotion?: boolean;
  zIndex?: number;
  drift?: number;
  gravity?: number;
  startVelocity?: number;
};

const CONFIGS: Record<ConfettiKind, ConfettiOptions | ConfettiOptions[]> = {
  xp: {
    particleCount: 60, spread: 80, origin: { y: 0.65 },
    colors: ["#7C3AED", "#A78BFA", "#38BDF8", "#818CF8"],
    scalar: 0.9, disableForReducedMotion: true,
  },
  badge: [
    { particleCount: 80,  spread: 120, origin: { y: 0.5  }, colors: ["#FBBF24", "#F59E0B", "#7C3AED", "#A78BFA"], scalar: 1.1, disableForReducedMotion: true },
    { particleCount: 50,  spread: 60,  origin: { x: 0.1, y: 0.5 }, colors: ["#FBBF24", "#EF4444"], startVelocity: 25, disableForReducedMotion: true },
    { particleCount: 50,  spread: 60,  origin: { x: 0.9, y: 0.5 }, colors: ["#A78BFA", "#22C55E"], startVelocity: 25, disableForReducedMotion: true },
  ],
  levelup: [
    { particleCount: 200, spread: 170, origin: { y: 0.35 }, colors: ["#7C3AED", "#A78BFA", "#FBBF24", "#F59E0B", "#22C55E"], gravity: 0.8, disableForReducedMotion: true },
    { particleCount: 80,  spread: 60,  origin: { x: 0,   y: 0.6  }, startVelocity: 30, angle: 60,  colors: ["#FBBF24", "#7C3AED"], disableForReducedMotion: true } as ConfettiOptions,
    { particleCount: 80,  spread: 60,  origin: { x: 1,   y: 0.6  }, startVelocity: 30, angle: 120, colors: ["#A78BFA", "#22C55E"], disableForReducedMotion: true } as ConfettiOptions,
  ],
  certificate: [
    { particleCount: 250, spread: 180, origin: { y: 0.3  }, colors: ["#FBBF24", "#F59E0B", "#22C55E", "#A78BFA", "#FB7185"], gravity: 0.7, scalar: 1.2, disableForReducedMotion: true },
    { particleCount: 80,  spread: 40,  origin: { x: 0,   y: 0.8  }, startVelocity: 40, angle: 55,  colors: ["#FBBF24", "#F59E0B"], disableForReducedMotion: true } as ConfettiOptions,
    { particleCount: 80,  spread: 40,  origin: { x: 1,   y: 0.8  }, startVelocity: 40, angle: 125, colors: ["#A78BFA", "#22C55E"], disableForReducedMotion: true } as ConfettiOptions,
  ],
  mission: {
    particleCount: 80, spread: 100, origin: { y: 0.6 },
    colors: ["#7C3AED", "#A78BFA", "#4ADE80", "#38BDF8"],
    scalar: 0.95, disableForReducedMotion: true,
  },
};

let confettiPromise: Promise<((options: ConfettiOptions) => void)> | null = null;

function loadConfetti(): Promise<(options: ConfettiOptions) => void> {
  if (confettiPromise) return confettiPromise;
  confettiPromise = import("canvas-confetti").then(m => m.default as unknown as (options: ConfettiOptions) => void);
  return confettiPromise;
}

export async function triggerConfetti(kind: ConfettiKind = "xp") {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    const fire = await loadConfetti();
    const cfg = CONFIGS[kind];
    const burst = (opts: ConfettiOptions) => fire(opts);
    if (Array.isArray(cfg)) {
      cfg.forEach(c => setTimeout(() => burst(c), 0));
    } else {
      burst(cfg);
    }
  } catch { /* silently skip */ }
}

/* ── Hook for declarative trigger ───────────────────────────── */

export function useConfetti(trigger: boolean, kind: ConfettiKind = "xp") {
  const firedRef = useRef(false);
  useEffect(() => {
    if (!trigger || firedRef.current) return;
    firedRef.current = true;
    triggerConfetti(kind);
  }, [trigger, kind]);
}

/* ── Glow ring animation ─────────────────────────────────────── */

export function GlowRing({ color = "#7C3AED", size = 80, visible }: {
  color?: string;
  size?: number;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}`,
        boxShadow: `0 0 ${size * 0.4}px ${color}80, 0 0 ${size * 0.8}px ${color}30`,
        animation: "glowPulse 1.2s ease-in-out infinite",
        pointerEvents: "none",
        position: "absolute",
        inset: 0,
      }}
    />
  );
}

/* ── Floating XP badge ───────────────────────────────────────── */

export function XPFloat({ amount, visible, onDone }: {
  amount: number;
  visible: boolean;
  onDone?: () => void;
}) {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onDone?.(), 1800);
    return () => clearTimeout(t);
  }, [visible, onDone]);

  if (!visible) return null;
  return (
    <span
      style={{
        position: "fixed",
        top: "30%",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        pointerEvents: "none",
        fontFamily: "var(--font-bebas)",
        fontSize: 48,
        letterSpacing: "0.05em",
        color: "#A78BFA",
        textShadow: "0 0 40px #7C3AED, 0 0 80px #7C3AED60",
        animation: "xpFloat 1.8s ease-out forwards",
      }}
    >
      +{amount} XP
    </span>
  );
}

/* ── Render-less component version ──────────────────────────── */

export default function ConfettiEffect({ trigger, kind = "xp" }: {
  trigger: boolean;
  kind?: ConfettiKind;
}) {
  useConfetti(trigger, kind);
  return null;
}
