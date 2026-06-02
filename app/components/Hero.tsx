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
          <motion.span className="w-10 h-px bg-violet"
            initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ duration:0.8, delay:0.2 }} />
          <span className="text-violet-bright text-xs tracking-[0.45em] uppercase"
            style={{ fontFamily:"var(--font-barlow-condensed)" }}>
            Ankara · Birebir Özel Ders
          </span>
          <motion.span className="w-10 h-px bg-violet"
            initial={{ scaleX:0 }} animate={{ scaleX:1 }} transition={{ duration:0.8, delay:0.2 }} />
        </motion.div>

        {/* Ana başlık */}
        <motion.h1 className="font-display leading-none tracking-wide mb-5" style={{ fontFamily:"var(--font-bebas)" }}>
          <motion.span {...fadeUp(0.15)} className="block text-[clamp(56px,10vw,140px)] text-white"
            style={{ textShadow:"0 0 80px rgba(139,92,246,0.2)" }}>
            BİREBİR ÖZEL
          </motion.span>
          <motion.span {...fadeUp(0.28)} className="block text-[clamp(56px,10vw,140px)]"
            style={{
              background:"linear-gradient(90deg,#8B5CF6 0%,#A855F7 30%,#D946EF 60%,#A855F7 80%,#8B5CF6 100%)",
              backgroundSize:"200% auto",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              backgroundClip:"text",
              animation:"shimmer-violet 3s linear infinite",
              filter:"drop-shadow(0 0 40px rgba(139,92,246,0.4))",
            }}>
            KİCKBOKS DERSİ
          </motion.span>
        </motion.h1>

        {/* Alt başlık */}
        <motion.div {...fadeUp(0.4)} className="flex items-center justify-center gap-4 mb-7">
          <span className="h-px flex-1 max-w-20" style={{ background:"linear-gradient(to right, transparent, #8B5CF6)" }} />
          <h2 className="text-[clamp(15px,2.5vw,22px)] tracking-[0.45em] text-white/50 uppercase"
            style={{ fontFamily:"var(--font-barlow-condensed)" }}>
            Antrenör Enes Öztürk
          </h2>
          <span className="h-px flex-1 max-w-20" style={{ background:"linear-gradient(to left, transparent, #8B5CF6)" }} />
        </motion.div>

        {/* Açıklama */}
        <motion.p {...fadeUp(0.5)} className="max-w-xl mx-auto text-base lg:text-lg text-white/45 leading-relaxed mb-12"
          style={{ fontFamily:"var(--font-inter)" }}>
          Şampiyon dövüşçü, profesyonel antrenör. Kickboks, Boks, Muay Thai ve Karate
          alanlarında birebir özel ders ile gerçek ring deneyimini aktarıyorum.
        </motion.p>

        {/* CTA butonlar */}
        <motion.div {...fadeUp(0.6)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <motion.a href="#contact"
            whileHover={{ scale:1.04, boxShadow:"0 0 50px rgba(139,92,246,0.65)" }}
            whileTap={{ scale:0.97 }}
            className="group inline-flex items-center gap-2.5 text-white font-semibold tracking-widest uppercase px-10 py-4 text-sm transition-all duration-300"
            style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", fontFamily:"var(--font-barlow-condensed)" }}>
            Randevu Al
            <motion.svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              animate={{ x:[0,3,0] }} transition={{ duration:1.5, repeat:Infinity, ease:"easeInOut" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </motion.svg>
          </motion.a>

          <motion.a href="#about"
            whileHover={{ scale:1.03, borderColor:"rgba(168,85,247,0.7)" }}
            whileTap={{ scale:0.97 }}
            className="inline-flex items-center gap-2.5 border text-white/65 hover:text-violet-bright font-semibold tracking-widest uppercase px-10 py-4 text-sm transition-all duration-300"
            style={{ borderColor:"rgba(139,92,246,0.35)", fontFamily:"var(--font-barlow-condensed)" }}>
            Hakkımda
          </motion.a>

          {/* PWA yükleme */}
          <PWAInstallButton variant="hero" />
        </motion.div>

        {/* Stat kartları */}
        <motion.div {...fadeUp(0.75)} className="grid grid-cols-2 lg:grid-cols-4 gap-px max-w-3xl mx-auto"
          style={{ background:"rgba(139,92,246,0.1)", boxShadow:"0 0 0 1px rgba(139,92,246,0.15)" }}>
          {[
            { n:"20+", l:"Profesyonel Maç" },
            { n:"16",  l:"Nakavt Galibiyeti" },
            { n:"2",   l:"Pro Şampiyonluk" },
            { n:"4",   l:"Disiplin" },
          ].map((s,i) => (
            <motion.div key={s.l}
              className="px-5 py-5 text-center group cursor-default"
              style={{ background:"rgba(9,9,11,0.8)", backdropFilter:"blur(12px)" }}
              whileHover={{ background:"rgba(139,92,246,0.08)" }}
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:0.8+i*0.07 }}>
              <motion.div className="text-3xl lg:text-4xl font-display text-violet group-hover:text-violet-bright transition-colors duration-300"
                style={{ fontFamily:"var(--font-bebas)" }}
                animate={{ textShadow:["0 0 0px transparent","0 0 25px rgba(139,92,246,0.7)","0 0 0px transparent"] }}
                transition={{ duration:3, repeat:Infinity, delay:i*0.7 }}>
                {s.n}
              </motion.div>
              <div className="text-xs tracking-widest text-white/35 uppercase mt-0.5"
                style={{ fontFamily:"var(--font-barlow-condensed)" }}>{s.l}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Kaydır göstergesi */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs tracking-widest text-white/20 uppercase" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Kaydır</span>
        <div className="w-5 h-9 border rounded-full flex items-start justify-center pt-1.5" style={{ borderColor:"rgba(139,92,246,0.3)" }}>
          <motion.div className="w-1 h-2 rounded-full" style={{ background:"#8B5CF6" }}
            animate={{ y:[0,14,0], opacity:[1,0,1] }}
            transition={{ duration:1.6, repeat:Infinity, ease:"easeInOut" }} />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ background:"linear-gradient(to top, #09090B, transparent)" }} />
    </section>
  );
}
