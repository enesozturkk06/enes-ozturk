const classes = [
  {
    day: "Pazartesi",
    sessions: [
      { time: "06:00", name: "Sabah Kickboks", level: "Her Seviye", trainer: "Enes Ö.", duration: "60 dk", spots: 4 },
      { time: "12:00", name: "Boks Temelleri", level: "Başlangıç", trainer: "Baran D.", duration: "45 dk", spots: 8 },
      { time: "19:00", name: "İleri K-1", level: "İleri Seviye", trainer: "Enes Ö.", duration: "90 dk", spots: 2 },
    ],
  },
  {
    day: "Çarşamba",
    sessions: [
      { time: "06:30", name: "Muay Thai", level: "Orta Seviye", trainer: "Nazlı Y.", duration: "60 dk", spots: 6 },
      { time: "12:00", name: "MMA Çapraz Antrenman", level: "Orta Seviye", trainer: "Selin K.", duration: "60 dk", spots: 5 },
      { time: "18:30", name: "Kadın Kickboks", level: "Her Seviye", trainer: "Nazlı Y.", duration: "60 dk", spots: 10 },
    ],
  },
  {
    day: "Cuma",
    sessions: [
      { time: "06:00", name: "Dövüş Kondisyonu", level: "Her Seviye", trainer: "Baran D.", duration: "45 dk", spots: 12 },
      { time: "17:30", name: "Kickboks Serbest Çalışma", level: "Orta-İleri", trainer: "Enes Ö.", duration: "90 dk", spots: 3 },
      { time: "19:30", name: "Gece MMA", level: "İleri Seviye", trainer: "Selin K.", duration: "90 dk", spots: 0 },
    ],
  },
  {
    day: "Cumartesi",
    sessions: [
      { time: "09:00", name: "Açık Mat Kickboks", level: "Her Seviye", trainer: "Ekip", duration: "120 dk", spots: 20 },
      { time: "11:00", name: "Genç Boks", level: "8-16 Yaş", trainer: "Baran D.", duration: "60 dk", spots: 7 },
      { time: "14:00", name: "Dövüşçü Kampı", level: "Pro/Yarı-Pro", trainer: "Tüm Ekip", duration: "180 dk", spots: 1 },
    ],
  },
];

const levelColors: Record<string, string> = {
  "Her Seviye": "bg-white/10 text-white/50",
  "Başlangıç": "bg-green-500/10 text-green-400",
  "Orta Seviye": "bg-gold/10 text-gold",
  "Orta-İleri": "bg-gold/15 text-gold-bright",
  "İleri Seviye": "bg-crimson/10 text-crimson",
  "8-16 Yaş": "bg-blue-500/10 text-blue-400",
  "Pro/Yarı-Pro": "bg-purple-500/10 text-purple-400",
};

const disciplines = [
  { name: "Kickboks", classes: "18/hafta", icon: "🥊", color: "crimson" },
  { name: "Muay Thai", classes: "12/hafta", icon: "⚡", color: "gold" },
  { name: "MMA", classes: "10/hafta", icon: "🥋", color: "crimson" },
  { name: "Boks", classes: "8/hafta", icon: "🎯", color: "gold" },
  { name: "Grappling", classes: "6/hafta", icon: "💪", color: "crimson" },
  { name: "Kondisyon", classes: "14/hafta", icon: "🔥", color: "gold" },
];

export default function KickboxingClasses() {
  return (
    <section
      id="kickboxing"
      className="relative py-24 lg:py-36 bg-obsidian overflow-hidden"
    >
      {/* Arka plan doku */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 50%)",
          backgroundSize: "30px 30px",
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-px bg-gradient-to-r from-transparent via-crimson/30 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="w-12 h-px bg-crimson" />
            <span
              className="text-crimson text-xs tracking-[0.4em] uppercase"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              68+ Haftalık Ders
            </span>
            <span className="w-12 h-px bg-crimson" />
          </div>
          <h2
            className="font-display text-[clamp(44px,7vw,88px)] leading-none tracking-wide text-white"
            style={{ fontFamily: "var(--font-bebas)" }}
          >
            KİCKBOKS VE DÖVÜŞ{" "}
            <span className="text-crimson">DERS</span>
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
              PROGRAMI
            </span>
          </h2>
        </div>

        {/* Disiplin kartları */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-14">
          {disciplines.map((d) => (
            <div
              key={d.name}
              className={`group text-center p-4 bg-carbon border border-white/5 hover:border-${d.color}/30 transition-all duration-300 cursor-default`}
            >
              <div className="text-2xl mb-2">{d.icon}</div>
              <div
                className="text-sm font-semibold text-white tracking-wider mb-0.5"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {d.name}
              </div>
              <div
                className={`text-xs ${d.color === "gold" ? "text-gold/60" : "text-crimson/60"}`}
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {d.classes}
              </div>
            </div>
          ))}
        </div>

        {/* Program ızgarası */}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {classes.map((day) => (
            <div
              key={day.day}
              className="bg-carbon border border-white/5 overflow-hidden"
            >
              {/* Gün başlığı */}
              <div className="bg-crimson/10 border-b border-crimson/20 px-4 py-3 flex items-center justify-between">
                <h3
                  className="font-display text-lg text-crimson tracking-wider"
                  style={{ fontFamily: "var(--font-bebas)" }}
                >
                  {day.day}
                </h3>
                <span
                  className="text-xs text-white/30 tracking-wider"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {day.sessions.length} ders
                </span>
              </div>

              {/* Seanslar */}
              <div className="divide-y divide-white/5">
                {day.sessions.map((session) => {
                  const isFull = session.spots === 0;
                  const isAlmostFull = session.spots <= 3 && session.spots > 0;

                  return (
                    <div
                      key={`${session.time}-${session.name}`}
                      className={`px-4 py-4 transition-colors duration-200 ${
                        isFull ? "opacity-50" : "hover:bg-steel/40"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span
                          className="text-gold-bright text-xs font-semibold tracking-wider"
                          style={{ fontFamily: "var(--font-barlow-condensed)" }}
                        >
                          {session.time}
                        </span>
                        <span
                          className="text-xs text-white/20 tracking-wider"
                          style={{ fontFamily: "var(--font-barlow-condensed)" }}
                        >
                          {session.duration}
                        </span>
                      </div>

                      <div
                        className="text-sm text-white font-semibold tracking-wider mb-1"
                        style={{ fontFamily: "var(--font-barlow-condensed)" }}
                      >
                        {session.name}
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-sm ${
                            levelColors[session.level] || "bg-white/10 text-white/40"
                          }`}
                          style={{ fontFamily: "var(--font-barlow-condensed)" }}
                        >
                          {session.level}
                        </span>

                        <div className="flex items-center gap-1">
                          {isFull ? (
                            <span
                              className="text-xs text-crimson/60"
                              style={{ fontFamily: "var(--font-barlow-condensed)" }}
                            >
                              DOLU
                            </span>
                          ) : (
                            <>
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isAlmostFull ? "bg-gold animate-pulse" : "bg-green-500"
                                }`}
                              />
                              <span
                                className="text-xs text-white/30"
                                style={{ fontFamily: "var(--font-barlow-condensed)" }}
                              >
                                {session.spots} yer
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Tam program notu */}
        <div className="text-center mt-8">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-sm tracking-widest text-white/30 hover:text-gold-bright uppercase transition-colors duration-300"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            Tam programı görüntüle (68 haftalık ders)
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
