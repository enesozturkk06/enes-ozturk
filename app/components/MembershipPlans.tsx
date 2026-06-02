const plans = [
  {
    name: "Savaşçı",
    price: "1.490",
    period: "/ay",
    tagline: "Yolculuğuna Başla",
    popular: false,
    color: "white",
    features: [
      "Grup derslerine erişim (3/hafta)",
      "Kickboks ve boks temelleri",
      "Soyunma odası erişimi",
      "Uygulama ile ilerleme takibi",
      "Topluluk forumu erişimi",
    ],
    missing: ["Açık mat erişimi", "Özel seans", "Serbest çalışma onayı", "Öncelikli rezervasyon"],
  },
  {
    name: "Şampiyon",
    price: "2.490",
    period: "/ay",
    tagline: "En Popüler",
    popular: true,
    color: "crimson",
    features: [
      "Sınırsız grup dersleri",
      "Tüm disiplinlere erişim",
      "Açık mat 3x/hafta",
      "Aylık 1 özel seans",
      "Serbest çalışma onayı",
      "Öncelikli ders rezervasyonu",
      "Tam uygulama + analitik",
      "%15 ekipman indirimi",
    ],
    missing: [],
  },
  {
    name: "Efsane",
    price: "3.990",
    period: "/ay",
    tagline: "Elit Erişim",
    popular: false,
    color: "gold",
    features: [
      "Her şeye sınırsız erişim",
      "Aylık 4 özel seans",
      "Sınırsız açık mat",
      "Tüm seviyelerde serbest çalışma",
      "Kişisel dövüş kampı erişimi",
      "Beslenme danışmanlığı",
      "Video analiz seansları",
      "Markalı ekipman paketi",
      "VIP etkinlik davetleri",
    ],
    missing: [],
  },
];

const CheckIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0 opacity-30" viewBox="0 0 16 16" fill="none">
    <path d="M5 5l6 6M11 5l-6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function MembershipPlans() {
  return (
    <section
      id="membership"
      className="relative py-24 lg:py-36 bg-pitch overflow-hidden"
    >
      {/* Arka plan */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-crimson/30 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      </div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/4 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-12 h-px bg-gold" />
            <span
              className="text-gold text-xs tracking-[0.4em] uppercase"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              Esnek Üyelik
            </span>
            <span className="w-12 h-px bg-gold" />
          </div>
          <h2
            className="font-display text-[clamp(44px,7vw,88px)] leading-none tracking-wide text-white"
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            PAKETİNİZİ{" "}
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
              SEÇİN
            </span>
          </h2>
          <p
            className="mt-4 max-w-xl mx-auto text-white/40 text-base"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Uzun vadeli sözleşme yok. İstediğiniz zaman iptal. Her paket
            tesisimize ve uzman koçluk kadrosuna erişim içerir.
          </p>
        </div>

        {/* Paketler ızgarası */}
        <div className="grid md:grid-cols-3 gap-0 md:gap-px bg-white/5 border border-white/5">
          {plans.map((plan) => {
            const isPopular = plan.popular;
            const isGold = plan.color === "gold";

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col p-8 lg:p-10 bg-carbon transition-all duration-300 ${
                  isPopular
                    ? "bg-steel ring-1 ring-crimson shadow-[0_0_60px_rgba(220,38,38,0.15)]"
                    : "hover:bg-steel/80"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-px left-0 right-0 h-0.5 bg-crimson" />
                )}
                {isGold && (
                  <div
                    className="absolute -top-px left-0 right-0 h-0.5"
                    style={{
                      background: "linear-gradient(90deg, transparent, #d97706, transparent)",
                    }}
                  />
                )}

                {/* Paket rozeti */}
                <div className="flex items-center justify-between mb-6">
                  <span
                    className={`text-xs tracking-[0.3em] uppercase px-2 py-1 border ${
                      isPopular
                        ? "border-crimson/40 text-crimson bg-crimson/10"
                        : isGold
                        ? "border-gold/40 text-gold bg-gold/10"
                        : "border-white/10 text-white/30"
                    }`}
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    {plan.tagline}
                  </span>
                  {isPopular && (
                    <div className="w-2 h-2 bg-crimson rounded-full animate-pulse" />
                  )}
                </div>

                {/* Paket adı */}
                <h3
                  className={`font-display text-4xl lg:text-5xl tracking-wider mb-2 ${
                    isPopular
                      ? "text-crimson"
                      : isGold
                      ? "text-gold-bright"
                      : "text-white"
                  }`}
                  style={{ fontFamily: "var(--font-bebas)" }}
                >
                  {plan.name}
                </h3>

                {/* Fiyat */}
                <div className="flex items-end gap-1 mb-8">
                  <span
                    className="text-white/30 text-xl"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    ₺
                  </span>
                  <span
                    className="text-5xl lg:text-6xl font-display text-white leading-none"
                    style={{ fontFamily: "var(--font-bebas)" }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className="text-white/30 text-sm pb-1"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    {plan.period}
                  </span>
                </div>

                {/* Ayırıcı */}
                <div
                  className={`w-full h-px mb-8 ${
                    isPopular
                      ? "bg-crimson/20"
                      : isGold
                      ? "bg-gold/20"
                      : "bg-white/5"
                  }`}
                />

                {/* Özellikler */}
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <span
                        className={
                          isPopular
                            ? "text-crimson"
                            : isGold
                            ? "text-gold"
                            : "text-white/40"
                        }
                      >
                        <CheckIcon />
                      </span>
                      <span
                        className="text-sm text-white/70"
                        style={{ fontFamily: "var(--font-inter)" }}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                  {plan.missing.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <XIcon />
                      <span
                        className="text-sm text-white/20 line-through"
                        style={{ fontFamily: "var(--font-inter)" }}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href="#contact"
                  className={`block text-center font-semibold tracking-widest uppercase text-sm px-6 py-4 transition-all duration-300 ${
                    isPopular
                      ? "bg-crimson hover:bg-crimson-bright text-white hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
                      : isGold
                      ? "bg-gold hover:bg-gold-bright text-obsidian hover:shadow-[0_0_30px_rgba(217,119,6,0.4)]"
                      : "border border-white/20 text-white/60 hover:border-white/40 hover:text-white"
                  }`}
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {isPopular ? "Bugün Başla" : isGold ? "Efsane Ol" : "Başla"}
                </a>
              </div>
            );
          })}
        </div>

        {/* Küçük not */}
        <p
          className="text-center text-xs text-white/20 mt-6 tracking-wider"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          Tüm üyelikler 7 günlük ücretsiz deneme içerir · Sözleşme yok · İstediğiniz zaman iptal
        </p>
      </div>
    </section>
  );
}
