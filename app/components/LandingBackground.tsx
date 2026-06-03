"use client";
import { motion, useReducedMotion } from "framer-motion";

const HEX = "M50 2 L93 26 L93 74 L50 98 L7 74 L7 26 Z";

export default function LandingBackground() {
  const reduced = useReducedMotion();

  // Hareketi azaltılmış modda veya düşük performanslı cihazlarda statik arka plan
  if (reduced) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        background: "radial-gradient(ellipse 70% 50% at 20% 30%, rgba(139,92,246,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 70%, rgba(217,70,239,0.07) 0%, transparent 60%), #09090B",
      }} />
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">

      {/* Katman 1: Temel arka plan */}
      <div className="absolute inset-0 bg-[#09090B]" />

      {/* Katman 2: Nokta ızgarası */}
      <div className="absolute inset-0 opacity-[0.12]" style={{
        backgroundImage: "radial-gradient(rgba(139,92,246,0.5) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Katman 3: Büyük neon glow'lar */}
      <motion.div className="absolute rounded-full"
        style={{ width:700, height:700, left:"-20%", top:"-15%",
          background:"radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(139,92,246,0.04) 50%, transparent 70%)",
          filter:"blur(60px)" }}
        animate={{ x:[0,50,-30,0], y:[0,-40,25,0], scale:[1,1.1,0.95,1] }}
        transition={{ duration:16, repeat:Infinity, ease:"easeInOut" }}
      />
      <motion.div className="absolute rounded-full"
        style={{ width:600, height:600, right:"-18%", top:"20%",
          background:"radial-gradient(circle, rgba(217,70,239,0.15) 0%, rgba(217,70,239,0.03) 50%, transparent 70%)",
          filter:"blur(70px)" }}
        animate={{ x:[0,-60,30,0], y:[0,50,-30,0], scale:[1,0.9,1.08,1] }}
        transition={{ duration:20, repeat:Infinity, ease:"easeInOut", delay:2 }}
      />
      <motion.div className="absolute rounded-full"
        style={{ width:800, height:400, left:"15%", bottom:"-18%",
          background:"radial-gradient(ellipse, rgba(139,92,246,0.12) 0%, transparent 65%)",
          filter:"blur(80px)" }}
        animate={{ x:[0,40,-25,0], scale:[1,1.06,0.97,1] }}
        transition={{ duration:14, repeat:Infinity, ease:"easeInOut", delay:4 }}
      />
      {/* Merkez küçük leke */}
      <motion.div className="absolute rounded-full"
        style={{ width:350, height:350, left:"40%", top:"35%",
          background:"radial-gradient(circle, rgba(192,132,252,0.1) 0%, transparent 65%)",
          filter:"blur(40px)" }}
        animate={{ scale:[1,1.25,0.9,1], opacity:[0.5,0.9,0.5] }}
        transition={{ duration:9, repeat:Infinity, ease:"easeInOut", delay:1 }}
      />

      {/* Katman 4: Dönen altıgenler */}
      {[
        { size:320, left:"-50px", top:"8%",  dur:65, dir:1  },
        { size:260, right:"-35px",top:"18%", dur:48, dir:-1 },
        { size:190, left:"7%",   bottom:"22%",dur:38, dir:1  },
        { size:155, right:"10%", bottom:"28%",dur:28, dir:-1 },
        { size:110, left:"44%",  top:"4%",   dur:22, dir:1  },
      ].map((h, i) => (
        <motion.div key={i} className="absolute" style={{ width:h.size, height:h.size, ...h }}>
          <motion.svg viewBox="0 0 100 100" className="w-full h-full"
            animate={{ rotate: h.dir === 1 ? 360 : -360 }}
            transition={{ duration:h.dur, repeat:Infinity, ease:"linear" }}>
            <path d={HEX} fill="none"
              stroke={i % 2 === 0 ? "rgba(139,92,246,0.22)" : "rgba(217,70,239,0.2)"}
              strokeWidth="0.8" />
            <path d={HEX} fill="none"
              stroke={i % 2 === 0 ? "rgba(139,92,246,0.06)" : "rgba(217,70,239,0.05)"}
              strokeWidth="0.3" transform="scale(0.8) translate(12,12)" />
          </motion.svg>
        </motion.div>
      ))}

      {/* Katman 5: Parlayan çember konturları */}
      <motion.div className="absolute rounded-full border border-violet/10"
        style={{ width:460, height:460, left:"3%", top:"22%"}}
        animate={{ scale:[1,1.04,1], opacity:[0.4,0.7,0.4] }}
        transition={{ duration:7, repeat:Infinity, ease:"easeInOut" }}
      />
      <motion.div className="absolute rounded-full border border-violet-glow/8"
        style={{ width:340, height:340, right:"6%", bottom:"28%"}}
        animate={{ scale:[1,1.07,1], opacity:[0.3,0.6,0.3] }}
        transition={{ duration:9, repeat:Infinity, ease:"easeInOut", delay:3 }}
      />

      {/* Katman 6: Yatay ışık çizgileri */}
      <motion.div className="absolute h-px" style={{ top:"24%", left:0, right:0,
        background:"linear-gradient(90deg,transparent 0%,rgba(139,92,246,0.25) 35%,rgba(168,85,247,0.45) 50%,rgba(139,92,246,0.25) 65%,transparent 100%)" }}
        animate={{ opacity:[0.3,0.9,0.3] }}
        transition={{ duration:5, repeat:Infinity, ease:"easeInOut" }}
      />
      <motion.div className="absolute h-px" style={{ bottom:"30%", left:0, right:0,
        background:"linear-gradient(90deg,transparent 0%,rgba(217,70,239,0.2) 40%,rgba(217,70,239,0.38) 50%,rgba(217,70,239,0.2) 60%,transparent 100%)" }}
        animate={{ opacity:[0.25,0.65,0.25] }}
        transition={{ duration:7, repeat:Infinity, ease:"easeInOut", delay:2 }}
      />
      {/* Dikey çizgiler */}
      <motion.div className="absolute w-px" style={{ left:"16%", top:0, bottom:0,
        background:"linear-gradient(180deg,transparent 0%,rgba(139,92,246,0.2) 35%,rgba(139,92,246,0.32) 50%,rgba(139,92,246,0.2) 65%,transparent 100%)" }}
        animate={{ opacity:[0.3,0.7,0.3] }}
        transition={{ duration:9, repeat:Infinity, ease:"easeInOut", delay:1 }}
      />
      <motion.div className="absolute w-px" style={{ right:"16%", top:0, bottom:0,
        background:"linear-gradient(180deg,transparent 0%,rgba(217,70,239,0.15) 35%,rgba(217,70,239,0.28) 50%,rgba(217,70,239,0.15) 65%,transparent 100%)" }}
        animate={{ opacity:[0.25,0.6,0.25] }}
        transition={{ duration:11, repeat:Infinity, ease:"easeInOut", delay:3 }}
      />

      {/* Katman 7: Parıltı noktaları */}
      {[
        { x:"22%", y:"14%", c:"rgba(139,92,246,0.9)", d:0   },
        { x:"74%", y:"22%", c:"rgba(217,70,239,0.8)", d:1.5 },
        { x:"12%", y:"58%", c:"rgba(139,92,246,0.8)", d:3   },
        { x:"82%", y:"52%", c:"rgba(217,70,239,0.9)", d:0.8 },
        { x:"48%", y:"82%", c:"rgba(139,92,246,0.7)", d:2   },
        { x:"33%", y:"44%", c:"rgba(192,132,252,0.7)",d:4   },
        { x:"63%", y:"70%", c:"rgba(139,92,246,0.8)", d:2.5 },
      ].map((p,i)=>(
        <motion.div key={i} className="absolute w-1 h-1 rounded-full"
          style={{ left:p.x, top:p.y, background:p.c, boxShadow:`0 0 8px ${p.c}` }}
          animate={{ opacity:[0,1,0], scale:[0,1.8,0] }}
          transition={{ duration:3+i*0.5, repeat:Infinity, ease:"easeInOut", delay:p.d }}
        />
      ))}

      {/* Katman 8: Üst ışık huzmesi */}
      <div className="absolute" style={{ top:0, left:"50%", transform:"translateX(-50%)", width:"600px", height:"280px",
        background:"conic-gradient(from 180deg at 50% 0%, transparent 55deg, rgba(139,92,246,0.08) 120deg, transparent 185deg)",
        filter:"blur(24px)" }}
      />

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
