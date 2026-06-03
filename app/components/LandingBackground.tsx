"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useIsMobile } from "@/hooks/useIsMobile";

const HEX = "M50 2 L93 26 L93 74 L50 98 L7 74 L7 26 Z";

// Mobil & reduced-motion: saf CSS, sıfır JS animasyonu
function StaticBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: "#09090B" }} />
      {/* Nokta ızgarası — CSS only */}
      <div className="absolute inset-0 opacity-[0.09]" style={{
        backgroundImage: "radial-gradient(rgba(139,92,246,0.6) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />
      {/* Statik gradient glow'lar */}
      <div className="absolute inset-0" style={{
        background: [
          "radial-gradient(ellipse 80% 55% at 10% 20%, rgba(139,92,246,0.11) 0%, transparent 55%)",
          "radial-gradient(ellipse 70% 45% at 90% 75%, rgba(217,70,239,0.08) 0%, transparent 55%)",
          "radial-gradient(ellipse 60% 35% at 50% 100%, rgba(139,92,246,0.07) 0%, transparent 50%)",
        ].join(", "),
      }} />
      {/* Köşe aksanları */}
      <div className="absolute top-0 left-0 w-28 h-28 opacity-10">
        <svg viewBox="0 0 144 144" className="w-full h-full">
          <path d="M0 0 L144 0 L0 144 Z" fill="none" stroke="rgba(139,92,246,0.7)" strokeWidth="0.5" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-28 h-28 opacity-10">
        <svg viewBox="0 0 144 144" className="w-full h-full">
          <path d="M144 144 L0 144 L144 0 Z" fill="none" stroke="rgba(217,70,239,0.7)" strokeWidth="0.5" />
        </svg>
      </div>
    </div>
  );
}

export default function LandingBackground() {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();

  if (reduced || isMobile) return <StaticBackground />;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">

      <div className="absolute inset-0 bg-[#09090B]" />

      {/* Nokta ızgarası */}
      <div className="absolute inset-0 opacity-[0.12]" style={{
        backgroundImage: "radial-gradient(rgba(139,92,246,0.5) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Büyük glow'lar — will-change: transform ile GPU katmanı */}
      <motion.div className="absolute rounded-full"
        style={{
          width: 700, height: 700, left: "-20%", top: "-15%",
          background: "radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.04) 50%, transparent 70%)",
          filter: "blur(60px)",
          willChange: "transform",
        }}
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div className="absolute rounded-full"
        style={{
          width: 600, height: 600, right: "-18%", top: "20%",
          background: "radial-gradient(circle, rgba(217,70,239,0.15) 0%, rgba(217,70,239,0.03) 50%, transparent 70%)",
          filter: "blur(70px)",
          willChange: "transform",
        }}
        animate={{ x: [0, -60, 30, 0], y: [0, 50, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div className="absolute rounded-full"
        style={{
          width: 800, height: 400, left: "15%", bottom: "-18%",
          background: "radial-gradient(ellipse, rgba(139,92,246,0.10) 0%, transparent 65%)",
          filter: "blur(80px)",
          willChange: "transform",
        }}
        animate={{ x: [0, 40, -25, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      {/* Dönen altıgenler — 3 adet (5'ten azaltıldı), will-change: transform */}
      {[
        { size: 320, left: "-50px", top: "8%",   dur: 65, dir:  1 },
        { size: 190, left: "7%",    bottom: "22%", dur: 38, dir:  1 },
        { size: 155, right: "10%",  bottom: "28%", dur: 28, dir: -1 },
      ].map((h, i) => (
        <motion.div key={i} className="absolute" style={{ width: h.size, height: h.size, willChange: "transform", ...h }}>
          <motion.svg viewBox="0 0 100 100" className="w-full h-full"
            animate={{ rotate: h.dir === 1 ? 360 : -360 }}
            transition={{ duration: h.dur, repeat: Infinity, ease: "linear" }}>
            <path d={HEX} fill="none"
              stroke={i % 2 === 0 ? "rgba(139,92,246,0.2)" : "rgba(217,70,239,0.18)"}
              strokeWidth="0.8" />
          </motion.svg>
        </motion.div>
      ))}

      {/* Yatay ışık çizgileri */}
      <motion.div className="absolute h-px" style={{
        top: "24%", left: 0, right: 0,
        background: "linear-gradient(90deg,transparent 0%,rgba(139,92,246,0.22) 35%,rgba(168,85,247,0.4) 50%,rgba(139,92,246,0.22) 65%,transparent 100%)",
        willChange: "opacity",
      }}
        animate={{ opacity: [0.3, 0.85, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div className="absolute h-px" style={{
        bottom: "30%", left: 0, right: 0,
        background: "linear-gradient(90deg,transparent 0%,rgba(217,70,239,0.18) 40%,rgba(217,70,239,0.32) 50%,rgba(217,70,239,0.18) 60%,transparent 100%)",
        willChange: "opacity",
      }}
        animate={{ opacity: [0.25, 0.6, 0.25] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Parıltı noktaları — 4 adet (7'den azaltıldı) */}
      {[
        { x: "22%", y: "14%", c: "rgba(139,92,246,0.9)", d: 0   },
        { x: "74%", y: "22%", c: "rgba(217,70,239,0.8)", d: 1.5 },
        { x: "12%", y: "58%", c: "rgba(139,92,246,0.8)", d: 3   },
        { x: "82%", y: "52%", c: "rgba(217,70,239,0.9)", d: 0.8 },
      ].map((p, i) => (
        <motion.div key={i} className="absolute w-1 h-1 rounded-full"
          style={{ left: p.x, top: p.y, background: p.c, willChange: "opacity, transform" }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.6, 0] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: p.d }}
        />
      ))}

      {/* Üst ışık huzmesi */}
      <div className="absolute" style={{
        top: 0, left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "280px",
        background: "conic-gradient(from 180deg at 50% 0%, transparent 55deg, rgba(139,92,246,0.07) 120deg, transparent 185deg)",
        filter: "blur(24px)",
      }} />

      {/* Köşe aksanları */}
      <div className="absolute top-0 left-0 w-36 h-36 opacity-15">
        <svg viewBox="0 0 144 144" className="w-full h-full">
          <path d="M0 0 L144 0 L0 144 Z" fill="none" stroke="rgba(139,92,246,0.7)" strokeWidth="0.5" />
          <path d="M0 0 L72 0 L0 72 Z" fill="rgba(139,92,246,0.04)" />
        </svg>
      </div>
      <div className="absolute bottom-0 right-0 w-36 h-36 opacity-15">
        <svg viewBox="0 0 144 144" className="w-full h-full">
          <path d="M144 144 L0 144 L144 0 Z" fill="none" stroke="rgba(217,70,239,0.7)" strokeWidth="0.5" />
          <path d="M144 144 L72 144 L144 72 Z" fill="rgba(217,70,239,0.04)" />
        </svg>
      </div>
    </div>
  );
}
