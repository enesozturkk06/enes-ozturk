"use client";

import { motion } from "framer-motion";
import PWAInstallButton from "@/app/components/shared/PWAInstallButton";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: "easeOut" as const, delay },
});

export default function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 text-center">

        {/* Üst rozet */}
        <motion.div {...fadeUp(0)} className="inline-flex items-center gap-3 mb-8">
          <motion.span className="w-10 h-px"
            style={{ background: "linear-gradient(to right, transparent, #8B5CF6)" }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.2 }} />
          <span className="text-xs tracking-[0.45em] uppercase"
            style={{ color: "#A855F7", fontFamily: "var(--font-barlow-condensed)" }}>
            Ankara · Birebir Özel Ders
          </span>
          <motion.span className="w-10 h-px"
            style={{ background: "linear-gradient(to left, transparent, #8B5CF6)" }}
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.2 }} />
        </motion.div>

        {/* Ana başlık */}
        <motion.h1 className="font-display leading-none tracking-wide mb-5" style={{ fontFamily: "var(--font-bebas)" }}>
          <motion.span {...fadeUp(0.15)} className="block text-[clamp(56px,10vw,140px)] text-white"
            style={{ textShadow: "0 0 80px rgba(139,92,246,0.18)" }}>
            BİREBİR ÖZEL
          </motion.span>
          <motion.span {...fadeUp(0.28)} className="block text-[clamp(56px,10vw,140px)]"
            style={{
              background: "linear-gradient(90deg,#8B5CF6 0%,#A855F7 30%,#D946EF 60%,#A855F7 80%,#8B5CF6 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmer-violet 3s linear infinite",
              filter: "drop-shadow(0 0 40px rgba(139,92,246,0.4))",
            }}>
            KİCKBOKS DERSİ
          </motion.span>
        </motion.h1>

        {/* Alt başlık */}
        <motion.div {...fadeUp(0.4)} className="flex items-center justify-center gap-4 mb-7">
          <span className="h-px flex-1 max-w-20"
            style={{ background: "linear-gradient(to right, transparent, #8B5CF6)" }} />
          <h2 className="text-[clamp(14px,2.2vw,20px)] tracking-[0.45em] uppercase"
            style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-barlow-condensed)" }}>
            Antrenör Enes Öztürk
          </h2>
          <span className="h-px flex-1 max-w-20"
            style={{ background: "linear-gradient(to left, transparent, #8B5CF6)" }} />
        </motion.div>

        {/* Açıklama */}
        <motion.p {...fadeUp(0.5)} className="max-w-xl mx-auto text-base lg:text-lg leading-relaxed mb-12"
          style={{ color: "rgba(255,255,255,0.42)", fontFamily: "var(--font-inter)" }}>
          Şampiyon dövüşçü, profesyonel antrenör. Kickboks, Boks, Muay Thai ve Karate
          alanlarında birebir özel ders ile gerçek ring deneyimini aktarıyorum.
        </motion.p>

        {/* CTA butonlar */}
        <motion.div {...fadeUp(0.6)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">

          {/* ANA CTA — En belirgin buton */}
          <div className="relative group">
            {/* Pulsing glow ring */}
            <motion.div
              className="absolute -inset-2 rounded-full opacity-60"
              style={{ background: "linear-gradient(135deg,#8B5CF6,#D946EF)", filter: "blur(14px)" }}
              animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.25, 0.55] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.06, boxShadow: "0 0 60px rgba(139,92,246,0.75), 0 0 120px rgba(139,92,246,0.25)" }}
              whileTap={{ scale: 0.96 }}
              className="relative inline-flex items-center gap-3 text-white font-bold tracking-widest uppercase px-10 py-4 text-sm"
              style={{
                background: "linear-gradient(135deg,#7C3AED,#8B5CF6,#A855F7,#D946EF)",
                backgroundSize: "200% 200%",
                animation: "shimmer-violet 3s linear infinite",
                fontFamily: "var(--font-barlow-condensed)",
                fontSize: "0.875rem",
                letterSpacing: "0.15em",
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.8, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}>
                ⚡
              </motion.span>
              HEMEN RANDEVU AL
              <motion.svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                animate={{ x: [0, 4, 0] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </motion.svg>
            </motion.a>
          </div>

          {/* İkincil CTA */}
          <motion.a href="#hizmetler"
            whileHover={{ scale: 1.03, borderColor: "rgba(168,85,247,0.6)", color: "#C084FC" }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2.5 font-semibold tracking-widest uppercase px-9 py-4 text-sm transition-all duration-300"
            style={{
              border: "1px solid rgba(139,92,246,0.3)",
              color: "rgba(255,255,255,0.6)",
              fontFamily: "var(--font-barlow-condensed)",
            }}>
            Hizmetleri Gör
          </motion.a>

          {/* PWA */}
          <PWAInstallButton variant="hero" />
        </motion.div>

        {/* Stat kartları */}
        <motion.div {...fadeUp(0.75)} className="grid grid-cols-2 lg:grid-cols-4 gap-px max-w-3xl mx-auto"
          style={{ background: "rgba(139,92,246,0.1)", boxShadow: "0 0 0 1px rgba(139,92,246,0.15)" }}>
          {[
            { n: "20+", l: "Profesyonel Maç" },
            { n: "16",  l: "Nakavt Galibiyeti" },
            { n: "2",   l: "Pro Şampiyonluk" },
            { n: "4",   l: "Disiplin" },
          ].map((s, i) => (
            <motion.div key={s.l}
              className="px-5 py-5 text-center group cursor-default"
              style={{ background: "rgba(9,9,11,0.85)", backdropFilter: "blur(12px)" }}
              whileHover={{ background: "rgba(139,92,246,0.09)" }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85 + i * 0.08 }}>
              <motion.div
                className="text-3xl lg:text-4xl font-display transition-colors duration-300"
                style={{ fontFamily: "var(--font-bebas)", color: "#8B5CF6" }}
                animate={{ textShadow: ["0 0 0px transparent", "0 0 28px rgba(139,92,246,0.8)", "0 0 0px transparent"] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}>
                {s.n}
              </motion.div>
              <div className="text-xs tracking-widest uppercase mt-0.5"
                style={{ color: "rgba(255,255,255,0.32)", fontFamily: "var(--font-barlow-condensed)" }}>
                {s.l}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Kaydır göstergesi */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-barlow-condensed)" }}>
          Kaydır
        </span>
        <div className="w-5 h-9 rounded-full flex items-start justify-center pt-1.5"
          style={{ border: "1px solid rgba(139,92,246,0.28)" }}>
          <motion.div className="w-1 h-2 rounded-full" style={{ background: "#8B5CF6" }}
            animate={{ y: [0, 14, 0], opacity: [1, 0, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background: "linear-gradient(to top, #09090B, transparent)" }} />
    </section>
  );
}
