"use client";

import { motion } from "framer-motion";

/* Altıgen SVG yolu */
const HEX = "M50 2 L93 26 L93 74 L50 98 L7 74 L7 26 Z";

export default function LandingBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">

      {/* ── 1. KATMAN: Derin arka plan gradyanları ─────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 15% 30%, rgba(224,32,32,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 85% 70%, rgba(217,119,6,0.09) 0%, transparent 55%),
            radial-gradient(ellipse 80% 40% at 50% 110%, rgba(224,32,32,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 70% 10%, rgba(100,80,200,0.06) 0%, transparent 50%),
            #0c0b1a
          `,
        }}
      />

      {/* ── 2. KATMAN: İnce nokta ızgarası ───────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* ── 3. KATMAN: Çapraz çizgiler ───────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 56px)",
          backgroundSize: "80px 80px",
        }}
      />

      {/* ── 4. KATMAN: Büyük yüzen kırmızı ışık küreleri ─────────── */}
      {/* Sol üst kırmızı küre */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 600, height: 600,
          left: "-15%", top: "-10%",
          background: "radial-gradient(circle, rgba(224,32,32,0.18) 0%, rgba(224,32,32,0.04) 50%, transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Sağ orta altın küre */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 500, height: 500,
          right: "-12%", top: "30%",
          background: "radial-gradient(circle, rgba(217,119,6,0.14) 0%, rgba(217,119,6,0.03) 50%, transparent 70%)",
          filter: "blur(50px)",
        }}
        animate={{ x: [0, -50, 20, 0], y: [0, 40, -25, 0], scale: [1, 0.92, 1.06, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Alt merkez kırmızı küre */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 700, height: 400,
          left: "20%", bottom: "-15%",
          background: "radial-gradient(ellipse, rgba(224,32,32,0.1) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
        animate={{ x: [0, 30, -20, 0], scale: [1, 1.05, 0.97, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
      />

      {/* Merkez küçük altın nokta */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 300, height: 300,
          left: "45%", top: "40%",
          background: "radial-gradient(circle, rgba(217,119,6,0.1) 0%, transparent 65%)",
          filter: "blur(30px)",
        }}
        animate={{ scale: [1, 1.2, 0.9, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* ── 5. KATMAN: Dönen altıgenler ──────────────────────────── */}

      {/* Büyük sol altıgen */}
      <motion.div
        className="absolute"
        style={{ width: 340, height: 340, left: "-60px", top: "8%" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d={HEX} fill="none" stroke="rgba(224,32,32,0.18)" strokeWidth="0.8" />
          <path d={HEX} fill="none" stroke="rgba(224,32,32,0.06)" strokeWidth="0.3"
            transform="scale(0.8) translate(12,12)" />
        </svg>
      </motion.div>

      {/* Orta sağ büyük altıgen */}
      <motion.div
        className="absolute"
        style={{ width: 280, height: 280, right: "-40px", top: "15%" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d={HEX} fill="none" stroke="rgba(217,119,6,0.2)" strokeWidth="0.8" />
        </svg>
      </motion.div>

      {/* Alt sol orta altıgen */}
      <motion.div
        className="absolute"
        style={{ width: 200, height: 200, left: "8%", bottom: "20%" }}
        animate={{ rotate: 360 }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d={HEX} fill="none" stroke="rgba(224,32,32,0.15)" strokeWidth="1" />
        </svg>
      </motion.div>

      {/* Küçük sağ alt altıgen */}
      <motion.div
        className="absolute"
        style={{ width: 160, height: 160, right: "12%", bottom: "25%" }}
        animate={{ rotate: -360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d={HEX} fill="rgba(217,119,6,0.04)" stroke="rgba(217,119,6,0.25)" strokeWidth="1.2" />
        </svg>
      </motion.div>

      {/* Merkez üst küçük altıgen */}
      <motion.div
        className="absolute"
        style={{ width: 120, height: 120, left: "45%", top: "5%" }}
        animate={{ rotate: 360, y: [0, -15, 0] }}
        transition={{ rotate: { duration: 20, repeat: Infinity, ease: "linear" }, y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d={HEX} fill="rgba(224,32,32,0.05)" stroke="rgba(224,32,32,0.3)" strokeWidth="1.5" />
        </svg>
      </motion.div>

      {/* ── 6. KATMAN: Yüzen geometrik çemberler ─────────────────── */}

      {/* Büyük kırmızı çember - sol */}
      <motion.div
        className="absolute rounded-full border border-crimson/10"
        style={{ width: 400, height: 400, left: "5%", top: "25%" }}
        animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div
          className="absolute inset-4 rounded-full border border-crimson/8"
          animate={{ rotate: -360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Orta altın çember - sağ */}
      <motion.div
        className="absolute rounded-full border border-gold/10"
        style={{ width: 300, height: 300, right: "8%", bottom: "30%" }}
        animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* ── 7. KATMAN: Çapraz parlak çizgiler ─────────────────────── */}

      {/* Yatay üst çizgi */}
      <motion.div
        className="absolute h-px"
        style={{
          top: "22%", left: 0, right: 0,
          background: "linear-gradient(90deg, transparent 0%, rgba(224,32,32,0.15) 30%, rgba(224,32,32,0.3) 50%, rgba(224,32,32,0.15) 70%, transparent 100%)",
        }}
        animate={{ opacity: [0.4, 0.9, 0.4], scaleX: [0.8, 1, 0.8] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Yatay alt çizgi */}
      <motion.div
        className="absolute h-px"
        style={{
          bottom: "28%", left: 0, right: 0,
          background: "linear-gradient(90deg, transparent 0%, rgba(217,119,6,0.12) 40%, rgba(217,119,6,0.25) 50%, rgba(217,119,6,0.12) 60%, transparent 100%)",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* Dikey sol çizgi */}
      <motion.div
        className="absolute w-px"
        style={{
          left: "18%", top: 0, bottom: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(224,32,32,0.12) 30%, rgba(224,32,32,0.2) 50%, rgba(224,32,32,0.12) 70%, transparent 100%)",
        }}
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Dikey sağ çizgi */}
      <motion.div
        className="absolute w-px"
        style={{
          right: "18%", top: 0, bottom: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(217,119,6,0.1) 30%, rgba(217,119,6,0.18) 50%, rgba(217,119,6,0.1) 70%, transparent 100%)",
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      {/* ── 8. KATMAN: Köşe dekoratif elemanlar ──────────────────── */}

      {/* Sol üst köşe takozu */}
      <div className="absolute top-0 left-0 w-32 h-32 opacity-20">
        <svg viewBox="0 0 128 128" className="w-full h-full">
          <path d="M0 0 L128 0 L0 128 Z" fill="none" stroke="rgba(224,32,32,0.6)" strokeWidth="0.5" />
          <path d="M0 0 L64 0 L0 64 Z" fill="rgba(224,32,32,0.05)" stroke="none" />
        </svg>
      </div>

      {/* Sağ alt köşe */}
      <div className="absolute bottom-0 right-0 w-32 h-32 opacity-20">
        <svg viewBox="0 0 128 128" className="w-full h-full">
          <path d="M128 128 L0 128 L128 0 Z" fill="none" stroke="rgba(217,119,6,0.6)" strokeWidth="0.5" />
          <path d="M128 128 L64 128 L128 64 Z" fill="rgba(217,119,6,0.05)" stroke="none" />
        </svg>
      </div>

      {/* ── 9. KATMAN: Parıltı noktaları ────────────────────────── */}
      {[
        { x: "25%", y: "15%", color: "rgba(224,32,32,0.7)", delay: 0 },
        { x: "75%", y: "25%", color: "rgba(217,119,6,0.6)", delay: 1.5 },
        { x: "15%", y: "60%", color: "rgba(224,32,32,0.6)", delay: 3 },
        { x: "80%", y: "55%", color: "rgba(217,119,6,0.7)", delay: 0.8 },
        { x: "50%", y: "85%", color: "rgba(224,32,32,0.5)", delay: 2 },
        { x: "35%", y: "45%", color: "rgba(217,119,6,0.5)", delay: 4 },
        { x: "65%", y: "72%", color: "rgba(224,32,32,0.6)", delay: 2.5 },
      ].map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ left: p.x, top: p.y, background: p.color, boxShadow: `0 0 6px ${p.color}` }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}

      {/* ── 10. KATMAN: Üstten gelen ışık huzmesi ──────────────── */}
      <div
        className="absolute"
        style={{
          top: 0, left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "300px",
          background: "conic-gradient(from 180deg at 50% 0%, transparent 60deg, rgba(224,32,32,0.06) 120deg, transparent 180deg)",
          filter: "blur(20px)",
        }}
      />
    </div>
  );
}
