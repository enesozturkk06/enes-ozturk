const branches = [
  {
    name: "Kickboks",
    icon: "🥊",
    desc: "K-1 kuralları, ayak ve el kombinasyonları, ring stratejisi. Tüm seviyelere uygun.",
    tags: ["K-1", "Kombinasyon", "Ring Stratejisi"],
    color: "crimson",
  },
  {
    name: "Boks",
    icon: "🎯",
    desc: "Temel duruş, jab-kros-kanca-aperkat, savunma hareketleri ve ayak çalışması.",
    tags: ["Teknik", "Savunma", "Kondisyon"],
    color: "gold",
  },
  {
    name: "Muay Thai",
    icon: "⚡",
    desc: "8 uzuvlu dövüş sanatı: dirsek, diz, tekme ve klinç çalışmaları dahil.",
    tags: ["8 Uzuv", "Klinç", "Tiyo"],
    color: "crimson",
  },
  {
    name: "Karate",
    icon: "🥋",
    desc: "Kata, kumite, blok teknikler ve öz disiplin odaklı kapsamlı karate eğitimi.",
    tags: ["Kata", "Kumite", "Disiplin"],
    color: "gold",
  },
];

export default function Branches() {
  return (
    <section id="branslar" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-obsidian" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-crimson/5 blur-[160px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <div className="text-center mb-14">
          <div className="flex items-center justify-center gap-4 mb-5">
            <span className="w-10 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Özel Ders Branşları</span>
            <span className="w-10 h-px bg-crimson" />
          </div>
          <h2 className="font-display text-[clamp(40px,7vw,88px)] leading-none tracking-wide text-white" style={{ fontFamily: "var(--font-bebas)" }}>
            ÖĞRETILEN{" "}
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
              BRANŞLAR
            </span>
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-white/40 text-sm" style={{ fontFamily: "var(--font-inter)" }}>
            Her branşta birebir özel ders ile kişiye özel program hazırlanır.
            Başlangıç seviyesinden ileri seviyeye kadar her aşama desteklenir.
          </p>
        </div>

        {/* Kartlar */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {branches.map((b, i) => {
            const isGold = b.color === "gold";
            return (
              <div
                key={b.name}
                className="group relative glass-card p-6 hover:scale-[1.02] transition-all duration-400 cursor-default"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Top accent */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${isGold ? "bg-gradient-to-r from-transparent via-gold to-transparent" : "bg-gradient-to-r from-transparent via-crimson to-transparent"}`} />

                {/* Icon */}
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">{b.icon}</div>

                {/* Name */}
                <h3 className="font-display text-2xl text-white tracking-wider mb-2" style={{ fontFamily: "var(--font-bebas)" }}>{b.name}</h3>

                {/* Desc */}
                <p className="text-white/45 text-sm leading-relaxed mb-4" style={{ fontFamily: "var(--font-inter)" }}>{b.desc}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {b.tags.map(t => (
                    <span key={t} className={`text-xs px-2 py-0.5 border ${isGold ? "border-gold/20 text-gold/60" : "border-crimson/20 text-crimson/60"}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      {t}
                    </span>
                  ))}
                </div>

                {/* Hover glow */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-sm ${isGold ? "shadow-[inset_0_0_40px_rgba(217,119,6,0.04)]" : "shadow-[inset_0_0_40px_rgba(220,38,38,0.05)]"}`} />
              </div>
            );
          })}
        </div>

        {/* Alt not */}
        <p className="text-center text-xs text-white/25 mt-8" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          Her ders 50 dakika · Seviyenize uygun program · Ankara'da yüz yüze özel ders
        </p>
      </div>
    </section>
  );
}
