"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const services = [
  {
    icon: "🥊",
    title: "Birebir Özel Ders",
    subtitle: "Private Training",
    desc: "Tamamen size özel hazırlanmış program. Zayıf noktalarınızı hedef alan, hızlı ilerleme sağlayan 1-on-1 antrenman.",
    features: ["Kişisel program", "Direkt geri bildirim", "Esnek saat"],
    accent: "#8B5CF6",
    glow: "rgba(139,92,246,0.4)",
    badge: "En Popüler",
  },
  {
    icon: "👥",
    title: "Grup Dersi",
    subtitle: "Group Session",
    desc: "Maksimum 4 kişilik küçük gruplarla motivasyonu yüksek, rekabetçi ortamda gelişim.",
    features: ["Max 4 kişi", "Takım dinamiği", "Uygun fiyat"],
    accent: "#A855F7",
    glow: "rgba(168,85,247,0.35)",
    badge: null,
  },
  {
    icon: "🎬",
    title: "Teknik Analiz",
    subtitle: "Video Analysis",
    desc: "Serbest çalışma veya maç videolarınızı kare kare inceler, teknik hatalarınızı ve gelişim alanlarını belirleriz.",
    features: ["Video inceleme", "Detaylı rapor", "Online yapılabilir"],
    accent: "#D946EF",
    glow: "rgba(217,70,239,0.35)",
    badge: "Yeni",
  },
  {
    icon: "⚡",
    title: "Kondisyon & Güç",
    subtitle: "Conditioning",
    desc: "Dövüş sporlarına özgü kondisyon, patlayıcı güç ve dayanıklılık antrenmanları. Ring içi performansı artır.",
    features: ["HIIT protokolü", "Fonksiyonel güç", "Enerji sistemi"],
    accent: "#8B5CF6",
    glow: "rgba(139,92,246,0.35)",
    badge: null,
  },
  {
    icon: "🏆",
    title: "Yarışma Hazırlığı",
    subtitle: "Fight Camp",
    desc: "Turnuva veya ring maçı öncesi yoğunlaştırılmış kamp. Strateji, fizik ve mental hazırlık bir arada.",
    features: ["Maç stratejisi", "Stres testi", "Mental koçluk"],
    accent: "#A855F7",
    glow: "rgba(168,85,247,0.4)",
    badge: "Premium",
  },
  {
    icon: "📱",
    title: "Online Danışmanlık",
    subtitle: "Remote Coaching",
    desc: "Farklı şehirdeyseniz bile antrenman programı, beslenme rehberi ve video geri bildirimi ile ilerleme kaydedin.",
    features: ["Uzaktan koçluk", "Haftalık plan", "WhatsApp destek"],
    accent: "#D946EF",
    glow: "rgba(217,70,239,0.3)",
    badge: null,
  },
];

function ServiceCard({ s, i }: { s: typeof services[0]; i: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
      whileHover={{ y: -6, scale: 1.01 }}
      className="group relative flex flex-col cursor-default"
      style={{ willChange: "transform" }}
    >
      {/* Dış glow (hover'da belirginleşir) */}
      <motion.div
        className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${s.accent}40, transparent, ${s.accent}20)` }}
      />

      {/* Kart gövdesi */}
      <div
        className="relative flex flex-col flex-1 rounded-2xl p-6 overflow-hidden transition-all duration-500"
        style={{
          background: "rgba(18,18,24,0.9)",
          border: `1px solid rgba(139,92,246,0.12)`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Hover'da çerçeve parlıyor */}
        <motion.div
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
          style={{ boxShadow: `inset 0 0 0 1px ${s.accent}40, 0 0 40px ${s.glow}` }}
        />

        {/* Üst çizgi gradyan */}
        <div
          className="absolute top-0 left-6 right-6 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }}
        />

        {/* Badge */}
        {s.badge && (
          <div
            className="absolute top-4 right-4 text-[9px] tracking-widest uppercase px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: `${s.accent}20`,
              border: `1px solid ${s.accent}40`,
              color: s.accent,
              fontFamily: "var(--font-barlow-condensed)",
            }}
          >
            {s.badge}
          </div>
        )}

        {/* İkon */}
        <motion.div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 flex-shrink-0"
          style={{ background: `${s.accent}15`, border: `1px solid ${s.accent}25` }}
          whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
          transition={{ duration: 0.4 }}
        >
          {s.icon}
        </motion.div>

        {/* Subtitle */}
        <p
          className="text-[10px] tracking-[0.35em] uppercase mb-1 font-semibold"
          style={{ color: s.accent, fontFamily: "var(--font-barlow-condensed)" }}
        >
          {s.subtitle}
        </p>

        {/* Title */}
        <h3
          className="text-xl text-white font-display tracking-wider mb-3"
          style={{ fontFamily: "var(--font-bebas)" }}
        >
          {s.title}
        </h3>

        {/* Desc */}
        <p
          className="text-white/45 text-sm leading-relaxed mb-5 flex-1"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          {s.desc}
        </p>

        {/* Features */}
        <ul className="space-y-1.5">
          {s.features.map(f => (
            <li key={f} className="flex items-center gap-2">
              <div
                className="w-1 h-1 rounded-full flex-shrink-0"
                style={{ background: s.accent }}
              />
              <span
                className="text-xs text-white/40"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {f}
              </span>
            </li>
          ))}
        </ul>

        {/* Alt çizgi animasyonu */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 rounded-b-2xl"
          style={{ background: `linear-gradient(90deg, ${s.accent}, transparent)` }}
          initial={{ width: "0%" }}
          whileHover={{ width: "100%" }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

export default function Services() {
  const titleRef = useRef(null);
  const titleInView = useInView(titleRef, { once: true, margin: "-80px" });

  return (
    <section id="hizmetler" className="relative py-24 lg:py-32 overflow-hidden">
      {/* BG */}
      <div className="absolute inset-0" style={{ background: "#09090B" }} />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)" }}
      />
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(217,70,239,0.2), transparent)" }}
      />
      {/* Arka plan glow */}
      <div
        className="absolute left-0 top-1/3 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 65%)", filter: "blur(60px)" }}
      />
      <div
        className="absolute right-0 bottom-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(217,70,239,0.06) 0%, transparent 65%)", filter: "blur(60px)" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 30 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center gap-4 mb-5">
            <motion.span
              className="h-px w-10"
              style={{ background: "linear-gradient(to right, transparent, #8B5CF6)" }}
              initial={{ scaleX: 0 }} animate={titleInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <span
              className="text-xs tracking-[0.4em] uppercase"
              style={{ color: "#8B5CF6", fontFamily: "var(--font-barlow-condensed)" }}
            >
              Neler Sunuyorum
            </span>
            <motion.span
              className="h-px w-10"
              style={{ background: "linear-gradient(to left, transparent, #8B5CF6)" }}
              initial={{ scaleX: 0 }} animate={titleInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
          </div>

          <h2
            className="font-display leading-none tracking-wide text-white"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(40px,7vw,88px)" }}
          >
            HİZMETLER &{" "}
            <span
              style={{
                background: "linear-gradient(90deg,#8B5CF6 0%,#A855F7 35%,#D946EF 65%,#A855F7 85%,#8B5CF6 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shimmer-violet 3s linear infinite",
              }}
            >
              PROGRAMLAR
            </span>
          </h2>
          <p
            className="mt-4 max-w-xl mx-auto text-sm text-white/40"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Her öğrencinin ihtiyacına özel çözümler. Başlangıç seviyesinden
            profesyonel maç hazırlığına kadar kapsamlı eğitim.
          </p>
        </motion.div>

        {/* Kart ızgarası */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s, i) => (
            <ServiceCard key={s.title} s={s} i={i} />
          ))}
        </div>

        {/* Alt CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <motion.a
            href="#contact"
            whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(139,92,246,0.55)" }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-3 text-white font-semibold tracking-widest uppercase px-10 py-4 text-sm"
            style={{
              background: "linear-gradient(135deg,#8B5CF6,#A855F7,#D946EF)",
              fontFamily: "var(--font-barlow-condensed)",
            }}
          >
            Hizmet Hakkında Bilgi Al
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
