"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const branches = [
  {
    name: "Kickboks",
    icon: "🥊",
    sub: "K-1 · Full Contact",
    desc: "K-1 kuralları, ayak ve el kombinasyonları, ring stratejisi. Tüm seviyelere uygun profesyonel eğitim.",
    tags: ["K-1", "Kombinasyon", "Ring Stratejisi"],
    accent: "#8B5CF6",
  },
  {
    name: "Boks",
    icon: "🎯",
    sub: "Boxing · Fundamentals",
    desc: "Temel duruş, jab-kros-kanca-aperkat, savunma hareketleri ve ayak çalışması. Teknik mükemmellik.",
    tags: ["Teknik", "Savunma", "Kondisyon"],
    accent: "#A855F7",
  },
  {
    name: "Muay Thai",
    icon: "⚡",
    sub: "8 Uzuv · Clinch",
    desc: "8 uzuvlu dövüş sanatı: dirsek, diz, tekme ve klinç çalışmaları dahil tam kapsamlı eğitim.",
    tags: ["8 Uzuv", "Klinç", "Tiyo"],
    accent: "#D946EF",
  },
  {
    name: "Karate",
    icon: "🥋",
    sub: "Kata · Kumite",
    desc: "Kata, kumite, blok teknikler ve öz disiplin odaklı kapsamlı karate eğitimi.",
    tags: ["Kata", "Kumite", "Disiplin"],
    accent: "#8B5CF6",
  },
];

export default function Branches() {
  const headRef = useRef(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });

  return (
    <section id="branslar" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "#111118" }} />
      {/* Arka plan glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(139,92,246,0.06) 0%, transparent 65%)", filter: "blur(80px)" }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <motion.div
          ref={headRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-10 h-px" style={{ background: "linear-gradient(to right, transparent, #8B5CF6)" }} />
            <span className="text-xs tracking-[0.4em] uppercase"
              style={{ color: "#8B5CF6", fontFamily: "var(--font-barlow-condensed)" }}>
              Özel Ders Branşları
            </span>
            <span className="w-10 h-px" style={{ background: "linear-gradient(to left, transparent, #8B5CF6)" }} />
          </div>

          <h2 className="font-display leading-none tracking-wide text-white"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(40px,7vw,88px)" }}>
            ÖĞRETILEN{" "}
            <span style={{
              background: "linear-gradient(90deg,#8B5CF6,#A855F7,#D946EF,#A855F7,#8B5CF6)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmer-violet 3s linear infinite",
            }}>
              BRANŞLAR
            </span>
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-sm text-white/38"
            style={{ fontFamily: "var(--font-inter)" }}>
            Her branşta birebir özel ders ile kişiye özel program hazırlanır.
            Başlangıç seviyesinden ileri seviyeye kadar her aşama desteklenir.
          </p>
        </motion.div>

        {/* Kart ızgarası */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {branches.map((b, i) => {
            const cardRef = useRef(null);
            const cardInView = useInView(cardRef, { once: true, margin: "-60px" });

            return (
              <motion.div
                key={b.name}
                ref={cardRef}
                initial={{ opacity: 0, y: 44 }}
                animate={cardInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative cursor-default"
                style={{ willChange: "transform" }}
              >
                {/* Glow efekti */}
                <motion.div
                  className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, ${b.accent}30, transparent 50%, ${b.accent}15)` }}
                />

                <div className="relative rounded-2xl p-6 h-full flex flex-col overflow-hidden"
                  style={{
                    background: "rgba(15,15,22,0.95)",
                    border: "1px solid rgba(139,92,246,0.1)",
                    backdropFilter: "blur(20px)",
                    transition: "border-color 0.4s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${b.accent}45`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.1)")}
                >
                  {/* Box shadow glow on hover */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${b.accent}35, 0 8px 40px ${b.accent}18` }}
                  />

                  {/* Üst çizgi */}
                  <div className="absolute top-0 left-8 right-8 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${b.accent}, transparent)` }} />

                  {/* İkon kutusu */}
                  <motion.div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-5"
                    style={{ background: `${b.accent}12`, border: `1px solid ${b.accent}22` }}
                    whileHover={{ scale: 1.12, rotate: -3 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {b.icon}
                  </motion.div>

                  {/* Sub */}
                  <p className="text-[9px] tracking-[0.35em] uppercase mb-1 font-semibold"
                    style={{ color: b.accent, fontFamily: "var(--font-barlow-condensed)" }}>
                    {b.sub}
                  </p>

                  {/* Name */}
                  <h3 className="text-2xl text-white font-display tracking-wider mb-3"
                    style={{ fontFamily: "var(--font-bebas)" }}>
                    {b.name}
                  </h3>

                  {/* Desc */}
                  <p className="text-white/40 text-sm leading-relaxed mb-5 flex-1"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    {b.desc}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {b.tags.map(t => (
                      <span key={t} className="text-xs px-2.5 py-1 rounded-full"
                        style={{
                          background: `${b.accent}10`,
                          border: `1px solid ${b.accent}28`,
                          color: `${b.accent}CC`,
                          fontFamily: "var(--font-barlow-condensed)",
                        }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Alt sweep animasyonu */}
                  <motion.div
                    className="absolute bottom-0 left-0 h-0.5 rounded-b-2xl"
                    style={{ background: `linear-gradient(90deg, ${b.accent}, transparent)` }}
                    initial={{ width: "0%" }}
                    whileHover={{ width: "100%" }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs mt-8"
          style={{ color: "rgba(255,255,255,0.22)", fontFamily: "var(--font-barlow-condensed)" }}>
          Her ders 50 dakika · Seviyenize uygun program · Ankara'da yüz yüze özel ders
        </motion.p>
      </div>
    </section>
  );
}
