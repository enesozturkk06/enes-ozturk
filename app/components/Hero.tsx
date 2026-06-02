"use client";

import { motion } from "framer-motion";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: "easeOut" as const, delay },
});

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* İçerik */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 text-center">

        {/* Üst rozet */}
        <motion.div {...fadeUp(0)} className="inline-flex items-center gap-3 mb-8">
          <motion.span
            className="w-10 h-px bg-crimson"
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
          />
          <span className="text-gold-bright text-xs tracking-[0.45em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Ankara · Birebir Özel Ders
          </span>
          <motion.span
            className="w-10 h-px bg-crimson"
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
          />
        </motion.div>

        {/* Ana başlık */}
        <motion.h1
          className="font-display leading-none tracking-wide mb-5"
          style={{ fontFamily: "var(--font-bebas)" }}
        >
          <motion.span
            {...fadeUp(0.15)}
            className="block text-[clamp(58px,10vw,140px)] text-white"
            style={{ textShadow: "0 0 60px rgba(224,32,32,0.15)" }}
          >
            BİREBİR ÖZEL
          </motion.span>
          <motion.span
            {...fadeUp(0.28)}
            className="block text-[clamp(58px,10vw,140px)]"
            style={{
              background: "linear-gradient(90deg,#d97706 0%,#fbbf24 30%,#fde68a 50%,#fbbf24 70%,#d97706 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmer-gold 3s linear infinite",
              filter: "drop-shadow(0 0 30px rgba(217,119,6,0.3))",
            }}
          >
            KİCKBOKS DERSİ
          </motion.span>
        </motion.h1>

        {/* Alt başlık */}
        <motion.div {...fadeUp(0.4)} className="flex items-center justify-center gap-4 mb-7">
          <span className="h-px flex-1 max-w-20 bg-gradient-to-r from-transparent to-crimson" />
          <h2
            className="text-[clamp(15px,2.5vw,22px)] tracking-[0.45em] text-white/55 uppercase"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            Antrenör Enes Öztürk
          </h2>
          <span className="h-px flex-1 max-w-20 bg-gradient-to-l from-transparent to-crimson" />
        </motion.div>

        {/* Açıklama */}
        <motion.p
          {...fadeUp(0.5)}
          className="max-w-xl mx-auto text-base lg:text-lg text-white/50 leading-relaxed mb-12"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Şampiyon dövüşçü, profesyonel antrenör. Kickboks, Boks, Muay Thai ve Karate
          alanlarında birebir özel ders ile gerçek ring deneyimini aktarıyorum.
        </motion.p>

        {/* CTA butonları */}
        <motion.div {...fadeUp(0.6)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(224,32,32,0.6)" }}
            whileTap={{ scale: 0.97 }}
            className="group inline-flex items-center gap-2.5 bg-crimson text-white font-semibold tracking-widest uppercase px-10 py-4 text-sm transition-colors duration-300 hover:bg-crimson-bright"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            Randevu Al
            <motion.svg
              className="w-4 h-4"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </motion.svg>
          </motion.a>

          <motion.a
            href="#about"
            whileHover={{ scale: 1.03, borderColor: "rgba(217,119,6,0.7)" }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2.5 border border-gold/35 text-white/65 hover:text-gold-bright font-semibold tracking-widest uppercase px-10 py-4 text-sm transition-colors duration-300"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            Hakkımda
          </motion.a>
        </motion.div>

        {/* Stat'lar */}
        <motion.div
          {...fadeUp(0.75)}
          className="grid grid-cols-2 lg:grid-cols-4 gap-px max-w-3xl mx-auto"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          {[
            { n: "20+", l: "Profesyonel Maç" },
            { n: "16",  l: "Nakavt Galibiyeti" },
            { n: "2",   l: "Pro Şampiyonluk" },
            { n: "4",   l: "Disiplin" },
          ].map((s, i) => (
            <motion.div
              key={s.l}
              className="bg-obsidian/60 backdrop-blur-sm px-5 py-5 text-center group cursor-default"
              whileHover={{ backgroundColor: "rgba(224,32,32,0.08)" }}
              transition={{ duration: 0.2 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              custom={i}
              // @ts-ignore
              viewport={{ once: true }}
            >
              <motion.div
                className="text-3xl lg:text-4xl font-display text-crimson group-hover:text-gold-bright transition-colors duration-300"
                style={{ fontFamily: "var(--font-bebas)" }}
                animate={{ textShadow: ["0 0 0px transparent", "0 0 20px rgba(224,32,32,0.5)", "0 0 0px transparent"] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.7 }}
              >
                {s.n}
              </motion.div>
              <div className="text-xs tracking-widest text-white/35 uppercase mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {s.l}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Aşağı kaydır göstergesi */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs tracking-widest text-white/25 uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          Kaydır
        </span>
        <div className="w-5 h-9 border border-white/15 rounded-full flex items-start justify-center pt-1.5">
          <motion.div
            className="w-1 h-2 bg-crimson rounded-full"
            animate={{ y: [0, 14, 0], opacity: [1, 0, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Alt geçiş */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-obsidian/80 to-transparent pointer-events-none" />
    </section>
  );
}
