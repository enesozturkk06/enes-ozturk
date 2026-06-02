"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  { n: "20+", label: "Profesyonel Maç", accent: "#8B5CF6" },
  { n: "16",  label: "Nakavt Galibiyeti", accent: "#A855F7" },
  { n: "2",   label: "Şampiyonluk Kemeri", accent: "#D946EF" },
  { n: "10+", label: "Yıllık Deneyim", accent: "#8B5CF6" },
];

const disciplines = ["Kickboks","Boks","Muay Thai","Karate","Wushu","K-1"];

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}>
      {children}
    </motion.div>
  );
}

export default function About() {
  return (
    <section id="about" className="relative py-24 lg:py-36 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "#0D0D14" }} />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(217,70,239,0.06) 0%, transparent 65%)", filter: "blur(80px)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Sol: Metin */}
          <div>
            <FadeIn>
              <div className="flex items-center gap-4 mb-6">
                <span className="h-px w-10" style={{ background: "linear-gradient(to right, transparent, #8B5CF6)" }} />
                <span className="text-xs tracking-[0.4em] uppercase"
                  style={{ color: "#8B5CF6", fontFamily: "var(--font-barlow-condensed)" }}>Hakkımda</span>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <h2 className="font-display leading-none tracking-wide mb-6"
                style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(36px,5.5vw,70px)" }}>
                <span className="block text-white">RİNGİN HAKİMİ:</span>
                <span className="block" style={{
                  background: "linear-gradient(90deg,#8B5CF6,#A855F7,#D946EF)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                }}>ENES &quot;KEDİ&quot;</span>
                <span className="block" style={{
                  background: "linear-gradient(90deg,#8B5CF6,#A855F7,#D946EF,#A855F7,#8B5CF6)",
                  backgroundSize: "200% auto",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  animation: "shimmer-violet 3s linear infinite",
                }}>ÖZTÜRK</span>
              </h2>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="space-y-4 text-sm leading-relaxed mb-8"
                style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-inter)" }}>
                <p>Ankara&apos;da kickboks, boks, Muay Thai, Wushu ve Karate disiplinlerinde tecrübe kazanmış, ring kariyeri ve antrenörlük vizyonuyla öne çıkan profesyonel bir dövüş sporları eğitmenidir.</p>
                <p>Türkiye şampiyonlukları, <strong style={{ color: "#C084FC" }}>20 profesyonel maç</strong>, <strong style={{ color: "#C084FC" }}>16 nakavt galibiyeti</strong> ve <strong style={{ color: "#C084FC" }}>2 profesyonel şampiyonluk kemeriyle</strong> yalnızca teknik bilgiye değil, gerçek ring deneyimine dayanan bir eğitim anlayışı sunar.</p>
                <p><em style={{ color: "#D946EF", fontStyle: "normal", fontWeight: 600 }}>&ldquo;Kedi&rdquo;</em> lakabı, ringdeki çevikliğini, rakibini okuma yeteneğini ve doğru zamanda hamle yapma refleksini temsil eder.</p>
              </div>
            </FadeIn>

            {/* Disiplinler */}
            <FadeIn delay={0.3}>
              <div className="flex flex-wrap gap-2 mb-8">
                {disciplines.map((d, i) => (
                  <motion.span key={d}
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    whileHover={{ scale: 1.06, borderColor: "rgba(139,92,246,0.6)" }}
                    className="text-xs px-3 py-1.5 cursor-default"
                    style={{
                      background: "rgba(139,92,246,0.06)",
                      border: "1px solid rgba(139,92,246,0.18)",
                      color: "rgba(255,255,255,0.5)",
                      fontFamily: "var(--font-barlow-condensed)",
                      borderRadius: "6px",
                      transition: "all 0.2s",
                    }}>
                    {d}
                  </motion.span>
                ))}
              </div>
            </FadeIn>

            {/* Instagram linkler */}
            <FadeIn delay={0.4}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { href:"https://instagram.com/enesozturkkq", label:"Kişisel", handle:"@enesozturkkq", accent:"#8B5CF6" },
                  { href:"https://instagram.com/p.t.enesozturk", label:"Eğitim PT", handle:"@p.t.enesozturk", accent:"#D946EF" },
                ].map(s => (
                  <motion.a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                    whileHover={{ scale: 1.03, borderColor: `${s.accent}50` }}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{ background: "rgba(15,15,22,0.9)", border: "1px solid rgba(139,92,246,0.12)" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${s.accent}18`, border: `1px solid ${s.accent}25` }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" style={{ color: s.accent }}>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-[9px] mb-0.5" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</div>
                      <div className="text-xs" style={{ color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-barlow-condensed)" }}>{s.handle}</div>
                    </div>
                  </motion.a>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Sağ: Stat kartları + Alıntı */}
          <div className="space-y-4">
            {/* Stat grid */}
            <FadeIn delay={0.2}>
              <div className="grid grid-cols-2 gap-3">
                {stats.map((s, i) => (
                  <motion.div key={s.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                    whileHover={{ scale: 1.04, y: -3 }}
                    className="relative p-5 rounded-xl overflow-hidden cursor-default"
                    style={{
                      background: "rgba(15,15,22,0.9)",
                      border: "1px solid rgba(139,92,246,0.1)",
                      backdropFilter: "blur(20px)",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${s.accent}40`; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${s.accent}12`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.1)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                    <div className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }} />
                    <motion.div className="text-4xl font-display mb-1"
                      style={{ fontFamily: "var(--font-bebas)", color: s.accent }}
                      animate={{ textShadow: [`0 0 0px transparent`, `0 0 20px ${s.accent}80`, `0 0 0px transparent`] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.8 }}>
                      {s.n}
                    </motion.div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </FadeIn>

            {/* Alıntı kartı */}
            <FadeIn delay={0.35}>
              <div className="relative p-6 rounded-2xl overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(217,70,239,0.06))",
                  border: "1px solid rgba(139,92,246,0.2)",
                  backdropFilter: "blur(20px)",
                }}>
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.5), transparent)" }} />
                <div className="text-4xl mb-3" style={{ color: "rgba(139,92,246,0.25)", fontFamily: "var(--font-bebas)" }}>&ldquo;</div>
                <p className="text-sm leading-relaxed mb-3"
                  style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-inter)" }}>
                  Öğrencimin hem fiziksel olarak gelişmesi hem de dövüş sporlarını bilinçli, güvenli ve profesyonel şekilde öğrenmesi temel hedefimdir.
                </p>
                <div className="text-xs" style={{ color: "#8B5CF6", fontFamily: "var(--font-barlow-condensed)" }}>— Antrenör Enes Öztürk</div>
              </div>
            </FadeIn>

            {/* WhatsApp */}
            <FadeIn delay={0.45}>
              <motion.a href="https://wa.me/905389714459" target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(34,197,94,0.2)" }}
                className="flex items-center gap-4 p-4 rounded-xl transition-all"
                style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.18)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.22)" }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-400">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-green-400" style={{ fontFamily: "var(--font-barlow-condensed)" }}>0538 971 44 59</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-barlow-condensed)" }}>WhatsApp ile hızlıca yazın</div>
                </div>
                <motion.div className="ml-auto text-green-400 text-lg" animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>→</motion.div>
              </motion.a>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
