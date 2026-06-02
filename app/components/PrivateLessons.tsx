const benefits = [
  {
    icon: "01",
    title: "Kişiselleştirilmiş Program",
    desc: "Antrenörünüz, hedeflerinize göre özel bir antrenman planı oluşturur — ister rekabet, ister fitness, ister öz savunma.",
  },
  {
    icon: "02",
    title: "Esnek Program",
    desc: "Hayatınıza uygun seanslar rezerve edin. Sabah, akşam veya hafta sonu — tercih ettiğiniz eğitmenle.",
  },
  {
    icon: "03",
    title: "Hızlı Beceri Gelişimi",
    desc: "Birebir ilgi, daha hızlı teknik gelişim demek. Çoğu öğrenci grup eğitimine kıyasla 3 kat daha hızlı ilerler.",
  },
  {
    icon: "04",
    title: "Video Analizi ve Geri Bildirim",
    desc: "Her seans inceleme için kayıt altına alınır. Tekniğinizi kare kare analiz eder, ayrıntılı geri bildirim veririz.",
  },
  {
    icon: "05",
    title: "Yarışma Hazırlığı",
    desc: "Müsabakaya mı hazırlanıyorsunuz? Dövüş kampı paketlerimiz ringe güvenle adım atmak için her şeyi sağlar.",
  },
  {
    icon: "06",
    title: "Hedef Takip Paneli",
    desc: "Seanslar genelindeki ilerlemenizi dijital takip sistemimizle izleyin. Sayılar yalan söylemez — gelişiminizi izleyin.",
  },
];

export default function PrivateLessons() {
  return (
    <section
      id="private"
      className="relative py-24 lg:py-36 bg-obsidian overflow-hidden"
    >
      {/* Dekoratif elementler */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-48 bg-gradient-to-b from-transparent via-crimson to-transparent" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-48 bg-gradient-to-b from-transparent via-gold to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-crimson/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Sol: İçerik */}
          <div>
            <div className="flex items-center gap-4 mb-6">
              <span className="w-12 h-px bg-crimson" />
              <span
                className="text-crimson text-xs tracking-[0.4em] uppercase"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                Birebir Antrenman
              </span>
            </div>

            <h2
              className="font-display text-[clamp(44px,7vw,88px)] leading-none tracking-wide text-white mb-6"
              style={{ fontFamily: "var(--font-bebas)" }}
            >
              SIZE ÖZEL{" "}
              <span className="text-crimson">ÖZEL</span>
              <br />
              DERSLER{" "}
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
                SİZİN İÇİN
              </span>
            </h2>

            <p
              className="text-white/50 text-base leading-relaxed mb-8"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Antrenör Enes Öztürk&apos;te özel antrenman, elit performansa giden
              en hızlı yoldur. Tamamen hedeflerinize odaklı, dikkat dağıtıcısı
              olmayan bir ortamda dünya standartlarında bir koçla çalışın.
            </p>

            {/* Fiyat kartları */}
            <div className="grid grid-cols-3 gap-3 mb-10">
              {[
                { sessions: "1", price: "₺750", note: "Tek Seans" },
                { sessions: "5", price: "₺3.250", note: "5&apos;li Paket · ₺500 Tasarruf" },
                { sessions: "10", price: "₺6.000", note: "10&apos;lu Paket · ₺1.500 Tasarruf" },
              ].map((pkg) => (
                <div
                  key={pkg.sessions}
                  className="group bg-carbon border border-white/5 hover:border-crimson/30 p-4 text-center transition-all duration-300 cursor-pointer"
                >
                  <div
                    className="text-3xl font-display text-white group-hover:text-crimson transition-colors duration-300 mb-1"
                    style={{ fontFamily: "var(--font-bebas)" }}
                  >
                    {pkg.sessions}x
                  </div>
                  <div
                    className="text-xl font-display text-gold mb-1"
                    style={{ fontFamily: "var(--font-bebas)" }}
                  >
                    {pkg.price}
                  </div>
                  <div
                    className="text-xs text-white/30 leading-tight"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                    dangerouslySetInnerHTML={{ __html: pkg.note }}
                  />
                </div>
              ))}
            </div>

            <a
              href="#contact"
              className="inline-flex items-center gap-3 bg-crimson hover:bg-crimson-bright text-white font-semibold tracking-widest uppercase px-8 py-4 text-sm transition-all duration-300 hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              Seans Rezerve Et
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>

          {/* Sağ: Avantajlar listesi */}
          <div className="space-y-4">
            {benefits.map((b, i) => (
              <div
                key={b.icon}
                className="group flex gap-5 p-5 bg-carbon/60 border border-white/5 hover:border-gold/20 hover:bg-steel/40 transition-all duration-300"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div
                  className="font-display text-2xl text-crimson/40 group-hover:text-gold/60 transition-colors duration-300 flex-shrink-0 leading-none mt-1"
                  style={{ fontFamily: "var(--font-bebas)" }}
                >
                  {b.icon}
                </div>
                <div>
                  <h4
                    className="text-white font-semibold tracking-wider mb-1 text-sm uppercase"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    {b.title}
                  </h4>
                  <p
                    className="text-white/40 text-sm leading-relaxed"
                    style={{ fontFamily: "var(--font-inter)" }}
                  >
                    {b.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
