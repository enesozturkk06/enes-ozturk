"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { getPackages, type LessonPackage } from "@/lib/packages";
import { CheckCircle } from "lucide-react";

const PERKS = [
  "Kişiye özel antrenman programı",
  "50 dk birebir özel ders",
  "Öğrenci takip paneli erişimi",
  "AI destekli ev antrenman sistemi",
];

function PkgCard({ pkg, i }: { pkg: LessonPackage; i: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const isPopular = pkg.highlight;

  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 44 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="group relative flex flex-col"
      style={{ willChange: "transform" }}
    >
      {/* Outer glow */}
      {isPopular && (
        <motion.div className="absolute -inset-0.5 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
          style={{ background: "linear-gradient(135deg,#8B5CF640,#D946EF30,#8B5CF620)" }} />
      )}

      <div className="relative flex flex-col flex-1 rounded-2xl p-7 overflow-hidden"
        style={{
          background: isPopular ? "rgba(20,14,36,0.97)" : "rgba(15,15,22,0.95)",
          border: isPopular ? "1px solid rgba(139,92,246,0.4)" : "1px solid rgba(139,92,246,0.1)",
          backdropFilter: "blur(20px)",
          boxShadow: isPopular ? "0 0 60px rgba(139,92,246,0.12)" : "none",
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}
        onMouseEnter={e => {
          if (!isPopular) {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.35)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(139,92,246,0.08)";
          }
        }}
        onMouseLeave={e => {
          if (!isPopular) {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(139,92,246,0.1)";
            (e.currentTarget as HTMLElement).style.boxShadow = "none";
          }
        }}
      >
        {/* Üst çizgi */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: isPopular
            ? "linear-gradient(90deg,transparent,#8B5CF6,#D946EF,#8B5CF6,transparent)"
            : "linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent)" }} />

        {/* Popüler rozet */}
        {isPopular && (
          <div className="absolute -top-px left-1/2 -translate-x-1/2">
            <div className="text-[9px] font-bold tracking-widest uppercase px-4 py-1 -translate-y-1/2"
              style={{
                background: "linear-gradient(135deg,#8B5CF6,#D946EF)",
                color: "#fff",
                fontFamily: "var(--font-barlow-condensed)",
                borderRadius: "4px",
              }}>
              En Popüler
            </div>
          </div>
        )}

        {/* Paket adı */}
        <div className="mb-2 mt-1">
          <p className="text-[10px] tracking-[0.35em] uppercase mb-1"
            style={{ color: isPopular ? "#A855F7" : "rgba(139,92,246,0.7)", fontFamily: "var(--font-barlow-condensed)" }}>
            {pkg.durationDays} gün geçerli
          </p>
          <h3 className="text-3xl font-display tracking-wider"
            style={{ fontFamily: "var(--font-bebas)", color: isPopular ? "#C084FC" : "#fff" }}>
            {pkg.name}
          </h3>
        </div>

        {/* Fiyat */}
        <div className="flex items-end gap-2 mb-5">
          <motion.span className="text-5xl font-display"
            style={{ fontFamily: "var(--font-bebas)", color: "#fff" }}
            animate={isPopular ? { textShadow: ["0 0 0px transparent","0 0 30px rgba(139,92,246,0.5)","0 0 0px transparent"] } : {}}
            transition={{ duration: 3, repeat: Infinity }}>
            ₺{pkg.price.toLocaleString("tr-TR")}
          </motion.span>
          <div className="pb-2">
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
              {pkg.lessonCount} ders
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
              50 dk/ders
            </div>
          </div>
        </div>

        {/* Ders başı fiyat */}
        <div className="mb-5 py-2.5 px-3 rounded-lg"
          style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.12)" }}>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
            Ders başı: <strong style={{ color: "#C084FC" }}>₺{Math.round(pkg.price / pkg.lessonCount).toLocaleString("tr-TR")}</strong>
          </span>
        </div>

        {/* Açıklama */}
        {pkg.description && (
          <p className="text-sm leading-relaxed mb-5"
            style={{ color: "rgba(255,255,255,0.42)", fontFamily: "var(--font-inter)" }}>
            {pkg.description}
          </p>
        )}

        {/* Özellikler */}
        <ul className="space-y-2.5 mb-7 flex-1">
          {PERKS.map(f => (
            <li key={f} className="flex items-center gap-2.5">
              <CheckCircle size={14} style={{ color: isPopular ? "#A855F7" : "rgba(139,92,246,0.5)", flexShrink: 0 }} />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-inter)" }}>{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <motion.a
          href={`https://wa.me/905389714459?text=${encodeURIComponent(`Merhaba Antrenör Enes, ${pkg.name} paket (${pkg.lessonCount} ders) hakkında bilgi almak istiyorum.`)}`}
          target="_blank" rel="noopener noreferrer"
          whileHover={{ scale: 1.03, boxShadow: isPopular ? "0 0 30px rgba(139,92,246,0.5)" : "0 0 20px rgba(139,92,246,0.25)" }}
          whileTap={{ scale: 0.97 }}
          className="block text-center font-semibold tracking-widest uppercase text-sm py-3.5 rounded-xl transition-all"
          style={{
            fontFamily: "var(--font-barlow-condensed)",
            background: isPopular ? "linear-gradient(135deg,#8B5CF6,#A855F7,#D946EF)" : "transparent",
            border: isPopular ? "none" : "1px solid rgba(139,92,246,0.3)",
            color: isPopular ? "#fff" : "rgba(139,92,246,0.8)",
          }}>
          {isPopular ? "Hemen Başla" : "Bilgi Al"}
        </motion.a>

        {/* Alt sweep */}
        {!isPopular && (
          <motion.div className="absolute bottom-0 left-0 h-0.5 rounded-b-2xl"
            style={{ background: "linear-gradient(90deg,#8B5CF6,transparent)" }}
            initial={{ width: "0%" }}
            whileHover={{ width: "100%" }}
            transition={{ duration: 0.4, ease: "easeOut" }} />
        )}
      </div>
    </motion.div>
  );
}

export default function PackagesSection() {
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const headRef = useRef(null);
  const headInView = useInView(headRef, { once: true, margin: "-80px" });

  useEffect(() => {
    getPackages().then(all => setPackages(all.filter(p => p.isActive)));
  }, []);

  if (packages.length === 0) return null;

  return (
    <section id="paketler" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0" style={{ background: "#09090B" }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent)" }} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(217,70,239,0.2),transparent)" }} />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 65%)", filter: "blur(80px)" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <motion.div ref={headRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="h-px w-10" style={{ background: "linear-gradient(to right,transparent,#D946EF)" }} />
            <span className="text-xs tracking-[0.4em] uppercase"
              style={{ color: "#D946EF", fontFamily: "var(--font-barlow-condensed)" }}>Özel Ders Paketleri</span>
            <span className="h-px w-10" style={{ background: "linear-gradient(to left,transparent,#D946EF)" }} />
          </div>
          <h2 className="font-display leading-none tracking-wide text-white"
            style={{ fontFamily: "var(--font-bebas)", fontSize: "clamp(40px,7vw,88px)" }}>
            PAKETİNİZİ{" "}
            <span style={{
              background: "linear-gradient(90deg,#8B5CF6,#A855F7,#D946EF,#A855F7,#8B5CF6)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "shimmer-violet 3s linear infinite",
            }}>SEÇİN</span>
          </h2>
          <p className="mt-4 max-w-md mx-auto text-sm" style={{ color: "rgba(255,255,255,0.38)", fontFamily: "var(--font-inter)" }}>
            Her ders 50 dakika. Kişisel programa özel hazırlanmış paketler.
          </p>
        </motion.div>

        {/* Paket kartları */}
        <div className={`grid gap-5 ${packages.length === 1 ? "max-w-sm mx-auto" : packages.length === 2 ? "md:grid-cols-2 max-w-2xl mx-auto" : "md:grid-cols-3"}`}>
          {packages.map((pkg, i) => (
            <PkgCard key={pkg.id} pkg={pkg} i={i} />
          ))}
        </div>

        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
          className="text-center text-xs mt-7"
          style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
          Fiyatlar değişebilir · İndirimli fiyat için WhatsApp&apos;tan iletişime geçin
        </motion.p>
      </div>
    </section>
  );
}
