const trainers = [
  {
    name: "Enes 'Demir' Öztürk",
    title: "Baş Antrenör · Kickboks",
    record: "Baş Antrenör & Kurucu",
    disciplines: ["Kickboks", "K-1", "Muay Thai"],
    bio: "WKF Dünya Kickboks Şampiyonu unvanlı Enes Öztürk, 10+ yıllık koçluk deneyimiyle 30'dan fazla profesyonel dövüşçü yetiştirmiştir.",
    accentColor: "crimson",
    initials: "EÖ",
    icon: "🥊",
  },
  {
    name: "Selin 'Pençe' Kaya",
    title: "Baş Eğitmen · MMA",
    record: "15-2 Pro Kariyeri",
    disciplines: ["MMA", "Brezilya Jiu-Jitsu", "Güreş"],
    bio: "Bölgesel MMA şampiyonu. Selin'in zemin oyunu uzmanlığı ve vuruş tekniği onu eşsiz bir koç yapıyor.",
    accentColor: "gold",
    initials: "SK",
    icon: "🥋",
  },
  {
    name: "Baran 'Canavar' Demir",
    title: "Boks Antrenörü",
    record: "28-6 Pro Kariyeri",
    disciplines: ["Boks", "Güç & Kondisyon"],
    bio: "Eski ulusal boks takımı üyesi. Baran, elit boks temelleri ve nakavt gücü geliştirme konusunda rakipsizdir.",
    accentColor: "crimson",
    initials: "BD",
    icon: "🥊",
  },
  {
    name: "Nazlı 'Zehir' Yıldız",
    title: "Muay Thai Uzmanı",
    record: "IFMA Uluslararası Madalyası",
    disciplines: ["Muay Thai", "Klinç Çalışması", "Kondisyon"],
    bio: "IFMA uluslararası madalyalı Nazlı, teknik Muay Thai ve sert yastık çalışmasıyla salonda efsane olmuştur.",
    accentColor: "gold",
    initials: "NY",
    icon: "⚡",
  },
];

export default function Trainers() {
  return (
    <section
      id="trainers"
      className="relative py-24 lg:py-36 bg-obsidian overflow-hidden"
    >
      {/* Arka plan elementleri */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-crimson/4 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Bölüm başlığı */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-12 h-px bg-crimson" />
            <span
              className="text-crimson text-xs tracking-[0.4em] uppercase"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              Dünya Standartlarında Koçluk Kadrosu
            </span>
            <span className="w-12 h-px bg-crimson" />
          </div>
          <h2
            className="font-display text-[clamp(44px,7vw,88px)] leading-none tracking-wide text-white"
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            EĞİTMENLERİNİZLE{" "}
            <span className="text-crimson">TANIŞ</span>
          </h2>
          <p
            className="mt-4 max-w-xl mx-auto text-white/40 text-base leading-relaxed"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Arenada bulunmuş şampiyonlardan öğrenin. Kadromuzdaki her eğitmen
            en üst düzeyde yarışmıştır.
          </p>
        </div>

        {/* Eğitmenler ızgarası */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {trainers.map((trainer, i) => {
            const isGold = trainer.accentColor === "gold";
            return (
              <div
                key={trainer.name}
                className="group relative bg-carbon border border-white/5 hover:border-crimson/30 transition-all duration-500 overflow-hidden cursor-default"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Üst vurgu çizgisi */}
                <div
                  className={`absolute top-0 left-0 right-0 h-0.5 ${
                    isGold
                      ? "bg-gradient-to-r from-transparent via-gold to-transparent"
                      : "bg-gradient-to-r from-transparent via-crimson to-transparent"
                  }`}
                />

                {/* Avatar */}
                <div
                  className={`relative h-56 flex items-center justify-center overflow-hidden ${
                    isGold ? "bg-steel/50" : "bg-steel/30"
                  }`}
                  style={{
                    background: isGold
                      ? "radial-gradient(ellipse at 50% 80%, rgba(217,119,6,0.15) 0%, rgba(26,26,26,0.9) 70%)"
                      : "radial-gradient(ellipse at 50% 80%, rgba(220,38,38,0.15) 0%, rgba(26,26,26,0.9) 70%)",
                  }}
                >
                  <div
                    className={`w-28 h-28 rounded-full border-2 flex flex-col items-center justify-center transition-transform duration-500 group-hover:scale-110 ${
                      isGold ? "border-gold/40" : "border-crimson/40"
                    }`}
                    style={{
                      background: isGold
                        ? "radial-gradient(circle, rgba(217,119,6,0.2), rgba(10,10,10,0.8))"
                        : "radial-gradient(circle, rgba(220,38,38,0.2), rgba(10,10,10,0.8))",
                    }}
                  >
                    <span className="text-3xl mb-1">{trainer.icon}</span>
                    <span
                      className={`text-lg font-display tracking-wider ${
                        isGold ? "text-gold-bright" : "text-crimson"
                      }`}
                      style={{ fontFamily: "var(--font-bebas)" }}
                    >
                      {trainer.initials}
                    </span>
                  </div>

                  {/* Kayıt rozeti */}
                  <div
                    className={`absolute bottom-3 left-3 right-3 text-center px-2 py-1 text-xs tracking-widest uppercase ${
                      isGold
                        ? "bg-gold/10 text-gold-bright border border-gold/20"
                        : "bg-crimson/10 text-crimson border border-crimson/20"
                    }`}
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    {trainer.record}
                  </div>
                </div>

                {/* İçerik */}
                <div className="p-5">
                  <h3
                    className="font-display text-xl text-white tracking-wider mb-0.5"
                    style={{ fontFamily: "var(--font-bebas)" }}
                  >
                    {trainer.name}
                  </h3>
                  <div
                    className={`text-xs tracking-widest uppercase mb-3 ${
                      isGold ? "text-gold" : "text-crimson"
                    }`}
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    {trainer.title}
                  </div>

                  <p
                    className="text-xs text-white/40 leading-relaxed mb-4"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {trainer.bio}
                  </p>

                  {/* Disiplinler */}
                  <div className="flex flex-wrap gap-1.5">
                    {trainer.disciplines.map((d) => (
                      <span
                        key={d}
                        className="text-xs px-2 py-0.5 bg-iron/80 text-white/50 tracking-wide"
                        style={{ fontFamily: "var(--font-barlow-condensed)" }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Hover overlay */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
                    isGold
                      ? "bg-gradient-to-t from-gold/5 to-transparent"
                      : "bg-gradient-to-t from-crimson/5 to-transparent"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* Alt CTA */}
        <div className="text-center mt-12">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-sm tracking-widest text-white/40 hover:text-gold-bright uppercase transition-colors duration-300 border-b border-white/10 hover:border-gold/40 pb-1"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            Tüm 12 eğitmeni görüntüle
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
