"use client";

import { useState } from "react";

const testimonials = [
  {
    name: "Emre Başaran",
    role: "2020'den beri üye · Amatör Kickboksçu",
    initials: "EB",
    rating: 5,
    text: "Antrenör Enes Öztürk beni 18 ayda sıfırdan rekabetçi bir kickboksçuya dönüştürdü. Enes sadece teknik öğretmiyor — gerçek dövüşçüler yetiştiriyor. İlk turnuvamda birinci oldum. Kapıdan girdiğimde bunun mümkün olduğunu düşünmüyordum.",
    discipline: "Kickboks",
    color: "crimson",
  },
  {
    name: "Yasemin Kaya",
    role: "2019'dan beri üye · MMA Dövüşçüsü",
    initials: "YK",
    rating: 5,
    text: "Dövüş sporlarına yeni başlayan bir kadın olarak biraz endişeliydim. Enes Öztürk beni gerçek bir savaşçı gibi hissettirdi. Selin Kaya antrenör olarak bulabileceğim en iyisi — teknik, sabırlı ve inanılmaz derecede teşvik edici. Bu yer gerçekten bambaşka.",
    discipline: "MMA",
    color: "gold",
  },
  {
    name: "Serkan Doğan",
    role: "2021'den beri üye · Boks Meraklısı",
    initials: "SD",
    rating: 5,
    text: "Ülke genelinde 5 farklı salonda çalıştım. Enes Öztürk'ün salonu elit. Tesis, antrenörler, antrenman ortakları — her şey üst düzey. Baran Demir 3 ayda beni bir profesyonel gibi vuruş saptırtıyor. Her kuruşa değer.",
    discipline: "Boks",
    color: "crimson",
  },
  {
    name: "Kaan Arslan",
    role: "2022'den beri üye · Muay Thai",
    initials: "KA",
    rating: 5,
    text: "Öğrenci takip paneli gerçekten etkileyici. Seanslarımı inceleyebilmek, ilerlemeyi görmek ve antrenör geri bildirimlerini dijital olarak almak motivasyonumu yüksek tutuyor. Ayrıca Nazlı'nın Muay Thai dersleri Türkiye'de deneyimlediğim en teknik dersler.",
    discipline: "Muay Thai",
    color: "gold",
  },
  {
    name: "Ece Şahin",
    role: "2023'ten beri üye · Yeni Başlayan",
    initials: "EŞ",
    rating: 5,
    text: "Dövüş sporları hakkında hiçbir şey bilmeden başladım. 4 ay içinde formda, özgüvenli ve gerçekten yetenekli hissediyorum. Buradaki topluluk harika — herkes birbirinin gelişimine yardımcı oluyor. Antrenörler zorlayıcı ama ulaşılabilir bir şekilde. Bu salon hayatımı değiştirdi.",
    discipline: "Kickboks",
    color: "crimson",
  },
];

const StarRating = ({ count }: { count: number }) => (
  <div className="flex gap-1">
    {Array.from({ length: count }).map((_, i) => (
      <svg
        key={i}
        className="w-3.5 h-3.5 text-gold-bright"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))}
  </div>
);

export default function Testimonials() {
  const [active, setActive] = useState(0);

  const prev = () => setActive((a) => (a - 1 + testimonials.length) % testimonials.length);
  const next = () => setActive((a) => (a + 1) % testimonials.length);

  const current = testimonials[active];
  const isGold = current.color === "gold";

  return (
    <section
      id="testimonials"
      className="relative py-24 lg:py-36 bg-pitch overflow-hidden"
    >
      {/* Arka plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[300px] bg-crimson/4 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bölüm başlığı */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-12 h-px bg-gold" />
            <span
              className="text-gold text-xs tracking-[0.4em] uppercase"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              Üye Hikayeleri
            </span>
            <span className="w-12 h-px bg-gold" />
          </div>
          <h2
            className="font-display text-[clamp(44px,7vw,88px)] leading-none tracking-wide text-white"
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            GERÇEK İNSANLAR.{" "}
            <span className="text-crimson">GERÇEK</span>
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #d97706, #fbbf24, #d97706)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                animation: "shimmer-gold 3s linear infinite",
              }}
            >
              SONUÇLAR.
            </span>
          </h2>
        </div>

        {/* Ana yorum */}
        <div className="max-w-4xl mx-auto mb-12">
          <div
            className={`relative bg-carbon border transition-all duration-500 p-8 lg:p-12 ${
              isGold ? "border-gold/20" : "border-crimson/20"
            }`}
          >
            {/* Üst vurgu */}
            <div
              className={`absolute top-0 left-0 right-0 h-0.5 ${
                isGold
                  ? "bg-gradient-to-r from-transparent via-gold to-transparent"
                  : "bg-gradient-to-r from-transparent via-crimson to-transparent"
              }`}
            />

            {/* Tırnak işareti */}
            <div
              className="absolute top-6 right-8 text-8xl font-display leading-none select-none pointer-events-none"
              style={{
                fontFamily: "var(--font-bebas)",
                color: isGold ? "rgba(217,119,6,0.08)" : "rgba(220,38,38,0.08)",
              }}
            >
              &ldquo;
            </div>

            <div className="flex items-start gap-6 mb-6">
              {/* Avatar */}
              <div
                className={`w-16 h-16 flex-shrink-0 flex items-center justify-center border-2 ${
                  isGold ? "border-gold/40 bg-gold/10" : "border-crimson/40 bg-crimson/10"
                }`}
              >
                <span
                  className={`text-xl font-display ${isGold ? "text-gold-bright" : "text-crimson"}`}
                  style={{ fontFamily: "var(--font-bebas)" }}
                >
                  {current.initials}
                </span>
              </div>

              <div>
                <div
                  className="text-white font-semibold tracking-wider text-lg"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {current.name}
                </div>
                <div
                  className="text-white/30 text-sm mb-2"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {current.role}
                </div>
                <StarRating count={current.rating} />
              </div>

              <div className="ml-auto hidden sm:block">
                <span
                  className={`text-xs tracking-widest uppercase px-3 py-1 border ${
                    isGold
                      ? "border-gold/30 text-gold bg-gold/5"
                      : "border-crimson/30 text-crimson bg-crimson/5"
                  }`}
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {current.discipline}
                </span>
              </div>
            </div>

            <blockquote
              className="text-white/70 text-base lg:text-lg leading-relaxed"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              &ldquo;{current.text}&rdquo;
            </blockquote>
          </div>

          {/* Navigasyon */}
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prev}
              className="group flex items-center gap-2 text-white/30 hover:text-white transition-colors duration-300"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              <span
                className="text-xs tracking-widest uppercase"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                Önceki
              </span>
            </button>

            {/* Noktalar */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`transition-all duration-300 ${
                    i === active
                      ? "w-8 h-1.5 bg-crimson"
                      : "w-2 h-1.5 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="group flex items-center gap-2 text-white/30 hover:text-white transition-colors duration-300"
            >
              <span
                className="text-xs tracking-widest uppercase"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                Sonraki
              </span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Alt istatistikler */}
        <div className="grid grid-cols-3 max-w-2xl mx-auto gap-px bg-white/5">
          {[
            { value: "4.9", label: "Google Puanı", sub: "340+ yorum" },
            { value: "%97", label: "Devam Oranı", sub: "Üyeler kalıyor" },
            { value: "500+", label: "Başarı Hikayesi", sub: "Ve artıyor" },
          ].map((s) => (
            <div key={s.label} className="bg-carbon px-6 py-5 text-center">
              <div
                className="text-3xl font-display text-gold mb-1"
                style={{ fontFamily: "var(--font-bebas)" }}
              >
                {s.value}
              </div>
              <div
                className="text-xs text-white/50 tracking-wider uppercase"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {s.label}
              </div>
              <div
                className="text-xs text-white/20 mt-0.5"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
