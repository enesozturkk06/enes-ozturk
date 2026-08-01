"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const GRADIENT_ACCENTS = {
  "violet-blue": "gradient-violet-blue",
  "violet-gold": "gradient-violet-gold",
  "violet-pink": "gradient-violet-pink",
  "green-teal":  "gradient-green-teal",
} as const;

export type GradientAccent = keyof typeof GRADIENT_ACCENTS;

interface SectionCardProps {
  children: ReactNode;
  className?: string;
  /** Üst kenarda ince, yavaşça kayan gradient çizgi — vurgulanacak kartlarda kullanılır */
  gradientAccent?: GradientAccent;
  /** Hover'da hafif yükselme + glow — liste kartları için true, statik bilgi kartları için false */
  hover?: boolean;
  as?: "div" | "article";
}

/**
 * Landing sayfası için ortak premium kart kabuğu — glassmorphism + opsiyonel
 * hareketli gradient aksan. app/components/ui'nin admin-paletli Card'ı yerine
 * kullanılır (bu sayfa kendi mor marka rengini korur).
 */
export default function SectionCard({
  children, className = "", gradientAccent, hover = true, as = "div",
}: SectionCardProps) {
  const reduced = useReducedMotion();
  const Comp = motion[as];

  return (
    <Comp
      className={`glass relative overflow-hidden rounded-2xl ${className}`}
      whileHover={hover && !reduced ? { y: -4 } : undefined}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {gradientAccent && (
        <div
          className={`gradient-animated gradient-slow ${GRADIENT_ACCENTS[gradientAccent]} absolute top-0 left-0 right-0 h-px`}
          aria-hidden="true"
        />
      )}
      {children}
    </Comp>
  );
}
