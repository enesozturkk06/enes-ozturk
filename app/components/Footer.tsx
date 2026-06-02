"use client";
import Logo from "@/app/components/shared/Logo";

const WA = "905389714459";

const NAV = [
  ["Ana Sayfa","#hero"],["Hakkımda","#about"],["Hizmetler","#hizmetler"],
  ["Branşlar","#branslar"],["Özel Ders","#paketler"],["İletişim","#contact"],
];
const SYS = [["Öğrenci Girişi","/giris"],["Antrenör Girişi","/admin/login"]];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden" style={{ background: "#09090B" }}>
      {/* Üst glow çizgisi */}
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.4),rgba(217,70,239,0.2),transparent)" }} />

      {/* CTA bandı */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg,rgba(139,92,246,0.15),rgba(217,70,239,0.08))", borderBottom: "1px solid rgba(139,92,246,0.15)" }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(-45deg,white 0px,white 1px,transparent 1px,transparent 22px)" }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <h3 className="text-2xl lg:text-3xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
              ÖZEL DERS İÇİN RANDEVU ALIN
            </h3>
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-inter)" }}>
              WhatsApp&apos;tan hızlıca ulaşın, ilk dersi planlayalım.
            </p>
          </div>
          <a href={`https://wa.me/${WA}`} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-2 text-white font-semibold tracking-widest uppercase px-7 py-3 text-sm rounded-xl transition-all"
            style={{
              background: "linear-gradient(135deg,#8B5CF6,#A855F7,#D946EF)",
              fontFamily: "var(--font-barlow-condensed)",
              boxShadow: "0 0 20px rgba(139,92,246,0.35)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 35px rgba(139,92,246,0.55)"; (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(139,92,246,0.35)"; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            WhatsApp
          </a>
        </div>
      </div>

      {/* Ana gövde */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Marka */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Logo size={38} />
              <div>
                <div className="text-white text-base tracking-[0.15em] leading-none" style={{ fontFamily: "var(--font-bebas)" }}>ENES ÖZTÜRK</div>
                <div className="text-xs tracking-[0.3em]" style={{ fontFamily: "var(--font-bebas)", color: "#8B5CF6" }}>KİŞİSEL ANTRENÖR</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-5 max-w-xs" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-inter)" }}>
              Ankara&apos;da birebir özel kickboks, boks, Muay Thai ve karate dersleri. Şampiyon dövüşçüden gerçek ring deneyimi.
            </p>
            {/* Sosyaller */}
            <div className="flex gap-2">
              {[
                { href:"https://instagram.com/enesozturkkq", label:"@enesozturkkq", accent:"#8B5CF6" },
                { href:"https://instagram.com/p.t.enesozturk", label:"@p.t.enesozturk", accent:"#D946EF" },
              ].map(s => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all"
                  style={{
                    background: `${s.accent}0D`,
                    border: `1px solid ${s.accent}25`,
                    color: `${s.accent}AA`,
                    fontFamily: "var(--font-barlow-condensed)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${s.accent}50`; (e.currentTarget as HTMLElement).style.color = s.accent; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${s.accent}25`; (e.currentTarget as HTMLElement).style.color = `${s.accent}AA`; }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Sayfalar */}
          <div>
            <h4 className="text-sm font-semibold tracking-[0.2em] uppercase mb-4 pb-2"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-barlow-condensed)", borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
              Sayfalar
            </h4>
            <ul className="space-y-2.5">
              {NAV.map(([l, h]) => (
                <li key={l}><a href={h}
                  className="text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-barlow-condensed)", transition: "color 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#A855F7"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"; }}>
                  {l}
                </a></li>
              ))}
            </ul>
          </div>

          {/* Sistem */}
          <div>
            <h4 className="text-sm font-semibold tracking-[0.2em] uppercase mb-4 pb-2"
              style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-barlow-condensed)", borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
              Sistem
            </h4>
            <ul className="space-y-2.5">
              {SYS.map(([l, h]) => (
                <li key={l}><a href={h}
                  className="text-xs transition-colors"
                  style={{ color: "rgba(255,255,255,0.28)", fontFamily: "var(--font-barlow-condensed)", transition: "color 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#A855F7"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"; }}>
                  {l}
                </a></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Alt çubuk */}
      <div className="px-4 sm:px-6 lg:px-8 py-5" style={{ borderTop: "1px solid rgba(139,92,246,0.08)" }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs tracking-wider" style={{ color: "rgba(255,255,255,0.18)", fontFamily: "var(--font-barlow-condensed)" }}>
            © {new Date().getFullYear()} Antrenör Enes Öztürk. Tüm hakları saklıdır.
          </p>
          <div className="flex gap-5">
            {["Gizlilik Politikası","Kullanım Şartları"].map(t => (
              <a key={t} href="#"
                className="text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-barlow-condensed)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.15)"; }}>
                {t}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
