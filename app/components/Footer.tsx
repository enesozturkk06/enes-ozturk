import Logo from "@/app/components/shared/Logo";

const WHATSAPP = "905389714459";

export default function Footer() {
  return (
    <footer className="relative bg-pitch border-t border-white/5 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-crimson/25 to-transparent" />

      {/* CTA Bandı */}
      <div className="relative bg-crimson overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "repeating-linear-gradient(-45deg, white 0px, white 1px, transparent 1px, transparent 22px)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-2xl lg:text-3xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
              ÖZEL DERS İÇİN RANDEVU ALIN
            </h3>
            <p className="text-white/65 text-sm mt-0.5" style={{ fontFamily: "var(--font-inter)" }}>
              WhatsApp&apos;tan hızlıca ulaşın, ilk dersi planlayalım.
            </p>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 bg-white text-crimson font-semibold tracking-widest uppercase px-7 py-3 text-sm hover:bg-gold-light hover:text-obsidian transition-all duration-300"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>

      {/* Footer gövdesi */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Marka */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Logo size={40} />
              <div>
                <div className="text-white text-base tracking-[0.15em] leading-none" style={{ fontFamily: "var(--font-bebas)" }}>ENES ÖZTÜRK</div>
                <div className="text-crimson text-xs tracking-[0.3em]" style={{ fontFamily: "var(--font-bebas)" }}>KİŞİSEL ANTRENÖR</div>
              </div>
            </div>
            <p className="text-white/30 text-sm leading-relaxed mb-5 max-w-xs" style={{ fontFamily: "var(--font-inter)" }}>
              Ankara&apos;da birebir özel kickboks, boks, Muay Thai ve karate dersleri.
              Şampiyon dövüşçüden gerçek ring deneyimi.
            </p>
            {/* Sosyaller */}
            <div className="flex gap-3">
              {[
                { href: "https://instagram.com/enesozturkkq", label: "@enesozturkkq" },
                { href: "https://www.instagram.com/p.t.enesozturk", label: "@p.t.enesozturk" },
              ].map(s => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-carbon border border-white/6 hover:border-crimson/30 text-white/30 hover:text-crimson text-xs transition-all duration-300"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Hızlı bağlantılar */}
          <div>
            <h4 className="text-sm font-semibold tracking-[0.2em] text-white/55 uppercase mb-4 pb-2 border-b border-white/5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Sayfalar</h4>
            <ul className="space-y-2.5">
              {[
                ["Ana Sayfa", "#hero"],
                ["Hakkımda", "#about"],
                ["Branşlar", "#branslar"],
                ["Özel Ders", "#paketler"],
                ["İletişim", "#contact"],
              ].map(([l, h]) => (
                <li key={l}>
                  <a href={h} className="text-xs text-white/30 hover:text-gold-bright transition-colors tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Sistem */}
          <div>
            <h4 className="text-sm font-semibold tracking-[0.2em] text-white/55 uppercase mb-4 pb-2 border-b border-white/5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Sistem</h4>
            <ul className="space-y-2.5">
              {[
                ["Öğrenci Girişi", "/giris"],
                ["Antrenör Girişi", "/admin/login"],
              ].map(([l, h]) => (
                <li key={l}>
                  <a href={h} className="text-xs text-white/30 hover:text-gold-bright transition-colors tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Alt çubuk */}
      <div className="border-t border-white/5 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/20 tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            © {new Date().getFullYear()} Antrenör Enes Öztürk. Tüm hakları saklıdır.
          </p>
          <div className="flex gap-5">
            {["Gizlilik Politikası", "Kullanım Şartları"].map(t => (
              <a key={t} href="#" className="text-xs text-white/15 hover:text-white/35 tracking-wider transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
