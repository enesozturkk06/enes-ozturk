"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const achievements = [
  { n: "20+", l: "Profesyonel maç", color: "text-crimson" },
  { n: "16",  l: "Nakavt galibiyeti", color: "text-gold-bright" },
  { n: "2",   l: "Pro şampiyonluk", color: "text-crimson" },
  { n: "10+", l: "Yıllık deneyim", color: "text-gold-bright" },
];

const disciplines = ["Kickboks", "Boks", "Muay Thai", "Karate", "Wushu", "K-1"];

function ScrollReveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function About() {
  return (
    <section id="about" className="relative py-24 lg:py-36 overflow-hidden">
      {/* Bölüm arka planı */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-pitch/60 to-pitch/90" />
      <div className="absolute inset-0 bg-pitch/40" />

      {/* Dekoratif elemanlar */}
      <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-crimson/5 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gold/4 blur-[130px] rounded-full pointer-events-none" />

      {/* Dekoratif altıgen */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
        <motion.svg width="180" height="180" viewBox="0 0 100 100"
          animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}>
          <path d="M50 2 L93 26 L93 74 L50 98 L7 74 L7 26 Z" fill="none" stroke="rgba(224,32,32,0.8)" strokeWidth="0.8" />
          <path d="M50 12 L85 30 L85 70 L50 88 L15 70 L15 30 Z" fill="none" stroke="rgba(217,119,6,0.5)" strokeWidth="0.5" />
        </motion.svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Sol: Metin */}
          <div>
            <ScrollReveal>
              <div className="flex items-center gap-4 mb-6">
                <span className="w-10 h-px bg-crimson" />
                <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Hakkımda</span>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="font-display leading-none tracking-wide mb-6" style={{ fontFamily: "var(--font-bebas)" }}>
                <span className="block text-[clamp(34px,5vw,70px)] text-white">RİNGİN HAKİMİ:</span>
                <span className="block text-[clamp(34px,5vw,70px)] text-crimson">ENES "KEDİ"</span>
                <span
                  className="block text-[clamp(34px,5vw,70px)]"
                  style={{
                    background: "linear-gradient(90deg,#d97706,#fbbf24,#d97706)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text", animation: "shimmer-gold 3s linear infinite",
                  }}
                >
                  ÖZTÜRK
                </span>
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="space-y-4 text-white/55 text-base leading-relaxed mb-8" style={{ fontFamily: "var(--font-inter)" }}>
                <p>
                  Ankara&apos;da kickboks, boks, Muay Thai, Wushu ve Karate disiplinlerinde
                  tecrübe kazanmış, ring kariyeri ve antrenörlük vizyonuyla öne çıkan
                  profesyonel bir dövüş sporları eğitmenidir.
                </p>
                <p>
                  Türkiye şampiyonlukları, <strong className="text-white">20 profesyonel maç</strong>,{" "}
                  <strong className="text-white">16 nakavt galibiyeti</strong> ve{" "}
                  <strong className="text-white">2 profesyonel şampiyonluk kemeriyle</strong> yalnızca
                  teknik bilgiye değil, gerçek ring deneyimine dayanan bir eğitim anlayışı sunar.
                </p>
                <p>
                  <em className="text-gold-bright not-italic font-medium">&ldquo;Kedi&rdquo;</em> lakabı, ringdeki çevikliğini,
                  rakibini okuma yeteneğini ve doğru zamanda hamle yapma refleksini temsil eder.
                </p>
                <p>
                  Özel derslerinde yalnızca vuruş teknikleri öğretmez; disiplin, özgüven, kondisyon,
                  savunma, strateji ve dövüş zekası kazandırmayı hedefler.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.3}>
              <div className="flex flex-wrap gap-2 mb-8">
                {disciplines.map((d, i) => (
                  <motion.span
                    key={d}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    whileHover={{ scale: 1.05, borderColor: "rgba(224,32,32,0.5)" }}
                    className="text-xs px-3 py-1.5 bg-iron/60 border border-white/8 text-white/50 tracking-wider cursor-default transition-colors"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    {d}
                  </motion.span>
                ))}
              </div>
            </ScrollReveal>

            {/* İletişim linkleri */}
            <ScrollReveal delay={0.4}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href: "https://instagram.com/enesozturkkq", label: "Kişisel", handle: "@enesozturkkq" },
                  { href: "https://www.instagram.com/p.t.enesozturk", label: "Eğitim", handle: "@p.t.enesozturk" },
                ].map(s => (
                  <motion.a
                    key={s.href}
                    href={s.href} target="_blank" rel="noopener noreferrer"
                    whileHover={{ scale: 1.02, borderColor: "rgba(224,32,32,0.4)" }}
                    className="flex items-center gap-3 p-3 bg-carbon/60 border border-white/6 transition-all duration-300"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                    </div>
                    <div>
                      <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</div>
                      <div className="text-xs text-white/65" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.handle}</div>
                    </div>
                  </motion.a>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Sağ: Başarı kartları */}
          <div className="space-y-4">
            <ScrollReveal delay={0.2}>
              <div className="relative p-7 glass-card">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-crimson/50 to-transparent" />
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-crimson/60" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-gold/40" />

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {achievements.map((a, i) => (
                    <motion.div
                      key={a.l}
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      whileHover={{ scale: 1.04 }}
                      className="text-center p-4 bg-obsidian/60 border border-white/6 hover:border-crimson/20 transition-all cursor-default"
                    >
                      <div className={`text-4xl font-display ${a.color} mb-0.5`} style={{ fontFamily: "var(--font-bebas)" }}>{a.n}</div>
                      <div className="text-xs text-white/35 tracking-wider uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{a.l}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="border-t border-white/6 pt-5">
                  <p className="text-white/40 text-sm italic leading-relaxed text-center" style={{ fontFamily: "var(--font-inter)" }}>
                    &ldquo;Öğrencimin hem fiziksel olarak gelişmesi hem de dövüş sporlarını bilinçli,
                    güvenli ve profesyonel şekilde öğrenmesi temel hedefimdir.&rdquo;
                  </p>
                  <div className="text-center mt-2">
                    <span className="text-xs text-crimson tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      — Antrenör Enes Öztürk
                    </span>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* WhatsApp kartı */}
            <ScrollReveal delay={0.35}>
              <motion.a
                href="https://wa.me/905389714459"
                target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(34,197,94,0.2)" }}
                className="flex items-center gap-4 p-5 bg-green-600/8 border border-green-500/20 hover:border-green-500/40 transition-all duration-300"
              >
                <div className="w-11 h-11 bg-green-500/15 border border-green-500/25 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-400">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-base text-green-400 font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    0538 971 44 59
                  </div>
                  <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    WhatsApp ile hemen yazın
                  </div>
                </div>
                <motion.div
                  className="ml-auto text-green-400/50"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.div>
              </motion.a>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
