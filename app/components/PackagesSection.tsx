"use client";

import { useEffect, useState } from "react";
import { getPackages, type LessonPackage } from "@/lib/packages";
import { CheckCircle } from "lucide-react";

export default function PackagesSection() {
  const [packages, setPackages] = useState<LessonPackage[]>([]);

  useEffect(() => {
    getPackages().then(all => setPackages(all.filter(p => p.isActive)));
  }, []);

  if (packages.length === 0) return null;

  return (
    <section id="paketler" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-pitch" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-crimson/25 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/4 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-10 h-px bg-gold" />
            <span className="text-gold text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Özel Ders Paketleri</span>
            <span className="w-10 h-px bg-gold" />
          </div>
          <h2 className="font-display text-[clamp(40px,7vw,88px)] leading-none tracking-wide text-white" style={{ fontFamily: "var(--font-bebas)" }}>
            PAKETİNİZİ{" "}
            <span
              style={{
                background: "linear-gradient(90deg,#d97706,#fbbf24,#d97706)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shimmer-gold 3s linear infinite",
              }}
            >
              SEÇİN
            </span>
          </h2>
          <p className="mt-4 max-w-md mx-auto text-white/40 text-sm" style={{ fontFamily: "var(--font-inter)" }}>
            Her ders 50 dakika. Öğrencinin seviyesine ve hedefine göre kişisel program.
          </p>
        </div>

        {/* Paket kartları */}
        <div className={`grid gap-5 ${packages.length === 1 ? "max-w-sm mx-auto" : packages.length === 2 ? "md:grid-cols-2 max-w-2xl mx-auto" : "md:grid-cols-3"}`}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative flex flex-col p-8 border transition-all duration-300 ${
                pkg.highlight
                  ? "bg-steel ring-1 ring-crimson shadow-[0_0_50px_rgba(220,38,38,0.12)] border-crimson/20"
                  : "bg-carbon border-white/6 hover:border-white/12"
              }`}
            >
              {pkg.highlight && (
                <div className="absolute -top-px left-0 right-0 h-0.5 bg-crimson" />
              )}
              {!pkg.highlight && (
                <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              )}

              {/* Rozetler */}
              <div className="flex items-center justify-between mb-5">
                <span
                  className={`text-xs tracking-[0.3em] uppercase px-2 py-1 border ${
                    pkg.highlight
                      ? "border-crimson/40 text-crimson bg-crimson/8"
                      : "border-white/10 text-white/30"
                  }`}
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {pkg.highlight ? "Popüler" : `${pkg.durationDays} gün geçerli`}
                </span>
                {pkg.highlight && <div className="w-2 h-2 bg-crimson rounded-full animate-pulse" />}
              </div>

              {/* İsim */}
              <h3 className={`font-display text-4xl tracking-wider mb-2 ${pkg.highlight ? "text-crimson" : "text-white"}`} style={{ fontFamily: "var(--font-bebas)" }}>
                {pkg.name}
              </h3>

              {/* Ders sayısı vurgusu */}
              <div className="flex items-end gap-1.5 mb-6">
                <span className="text-5xl font-display text-white" style={{ fontFamily: "var(--font-bebas)" }}>{pkg.lessonCount}</span>
                <div className="pb-1.5">
                  <div className="text-sm text-white/40" style={{ fontFamily: "var(--font-barlow-condensed)" }}>ders</div>
                  <div className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>50 dk/ders</div>
                </div>
                <div className="ml-auto text-right pb-1">
                  <div className="text-2xl font-display text-gold-bright" style={{ fontFamily: "var(--font-bebas)" }}>₺{pkg.price.toLocaleString("tr-TR")}</div>
                </div>
              </div>

              <div className={`w-full h-px mb-6 ${pkg.highlight ? "bg-crimson/15" : "bg-white/5"}`} />

              {/* Açıklama */}
              <p className="text-sm text-white/45 leading-relaxed mb-6 flex-1" style={{ fontFamily: "var(--font-inter)" }}>{pkg.description}</p>

              {/* Standart dahil olanlar */}
              <ul className="space-y-2 mb-7">
                {[
                  "Kişiye özel program",
                  "50 dk birebir özel ders",
                  "Öğrenci takip paneli erişimi",
                  "AI antrenman sistemi",
                ].map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <CheckCircle size={14} className={pkg.highlight ? "text-crimson flex-shrink-0" : "text-white/30 flex-shrink-0"} />
                    <span className="text-xs text-white/55" style={{ fontFamily: "var(--font-inter)" }}>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={`https://wa.me/905389714459?text=${encodeURIComponent(`Merhaba Antrenör Enes, ${pkg.name} paket (${pkg.lessonCount} ders) hakkında bilgi almak istiyorum.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`block text-center font-semibold tracking-widest uppercase text-sm px-6 py-3.5 transition-all duration-300 ${
                  pkg.highlight
                    ? "bg-crimson hover:bg-crimson-bright text-white hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
                    : "border border-white/15 text-white/55 hover:border-white/30 hover:text-white"
                }`}
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                Bilgi Al
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/20 mt-6 tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          Fiyatlar ve paket içerikleri değişebilir · Detay için WhatsApp&apos;tan ulaşın
        </p>
      </div>
    </section>
  );
}
