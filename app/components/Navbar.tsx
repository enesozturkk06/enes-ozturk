"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { Menu, X } from "lucide-react";
import Logo from "@/app/components/shared/Logo";

const navLinks = [
  { label: "Ana Sayfa",  href: "#hero",     external: false },
  { label: "Hakkımda",   href: "#about",    external: false },
  { label: "Branşlar",   href: "#branslar", external: false },
  { label: "Özel Ders",  href: "#paketler", external: false },
  { label: "Mağaza",     href: "/magaza",   external: true  },
  { label: "İletişim",   href: "#contact",  external: false },
];

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const { student, isAdmin }      = useAuth();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "backdrop-blur-xl border-b"
          : "bg-transparent"
      }`}
      style={scrolled ? {
        background: "rgba(9,9,11,0.85)",
        borderColor: "rgba(139,92,246,0.15)",
        boxShadow: "0 4px 30px rgba(139,92,246,0.08)",
      } : {}}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-[72px]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>

        {/* Logo + isim */}
        <a href="#hero" onClick={() => setMenuOpen(false)}
          className="flex items-center gap-2.5 group flex-shrink-0">
          <div className="relative">
            <Logo size={38} priority className="group-hover:opacity-90 transition-opacity duration-300" />
            {/* Neon glow ring */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ boxShadow:"0 0 20px rgba(139,92,246,0.6)", borderRadius:"50%" }} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-white text-[15px] lg:text-base tracking-[0.15em] group-hover:text-violet-bright transition-colors duration-300"
              style={{ fontFamily:"var(--font-bebas)" }}>
              ENES ÖZTÜRK
            </span>
            <span className="text-[10px] lg:text-xs tracking-[0.3em]"
              style={{ fontFamily:"var(--font-bebas)", color:"#8B5CF6" }}>
              KİŞİSEL ANTRENÖR
            </span>
          </div>
        </a>

        {/* Desktop links */}
        <ul className="hidden lg:flex items-center gap-7">
          {navLinks.map(l => {
            const cls = "text-xs tracking-widest uppercase relative group transition-colors duration-300";
            const style = { fontFamily:"var(--font-barlow-condensed)" };
            const badge = l.external ? (
              <span className="ml-1.5 text-[8px] px-1 py-0.5 rounded align-middle"
                style={{ background:"rgba(139,92,246,0.2)", color:"#A855F7", verticalAlign:"middle" }}>
                YENİ
              </span>
            ) : null;
            const underline = (
              <span className="absolute -bottom-1 left-0 w-0 h-px transition-all duration-300 group-hover:w-full"
                style={{ background:"linear-gradient(to right,#8B5CF6,#D946EF)" }} />
            );
            return (
              <li key={l.href}>
                {l.external ? (
                  <Link href={l.href} className={`${cls} text-white/55`} style={style}
                    onMouseEnter={e=>(e.currentTarget.style.color="#A855F7")}
                    onMouseLeave={e=>(e.currentTarget.style.color="")}>
                    {l.label}{badge}{underline}
                  </Link>
                ) : (
                  <a href={l.href} className={`${cls} text-white/55`} style={style}
                    onMouseEnter={e=>(e.currentTarget.style.color="#A855F7")}
                    onMouseLeave={e=>(e.currentTarget.style.color="")}>
                    {l.label}{underline}
                  </a>
                )}
              </li>
            );
          })}
        </ul>

        {/* Auth butonlar */}
        <div className="hidden lg:flex items-center gap-3">
          {student ? (
            <Link href="/ogrenci" className="text-xs tracking-widest uppercase transition-colors"
              style={{ color:"rgba(168,85,247,0.7)", fontFamily:"var(--font-barlow-condensed)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#A855F7")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(168,85,247,0.7)")}>
              Panelim →
            </Link>
          ) : isAdmin ? (
            <Link href="/admin" className="text-xs tracking-widest uppercase transition-colors"
              style={{ color:"rgba(168,85,247,0.7)", fontFamily:"var(--font-barlow-condensed)" }}>
              Admin →
            </Link>
          ) : (
            <>
              <Link href="/giris" className="text-xs text-white/40 hover:text-white/70 tracking-widest uppercase transition-colors"
                style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                Öğrenci Girişi
              </Link>
              <Link href="/admin/login" className="text-xs tracking-widest uppercase transition-colors"
                style={{ color:"rgba(139,92,246,0.5)", fontFamily:"var(--font-barlow-condensed)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(139,92,246,0.8)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(139,92,246,0.5)")}>
                Antrenör
              </Link>
            </>
          )}
          <a href="#contact"
            className="text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all duration-300"
            style={{
              fontFamily:"var(--font-barlow-condensed)",
              background:"linear-gradient(135deg,#8B5CF6,#A855F7)",
              boxShadow:"0 0 0 0 rgba(139,92,246,0)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(139,92,246,0.55)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 0 rgba(139,92,246,0)"; }}>
            Randevu Al
          </a>
        </div>

        {/* Mobil toggle */}
        <button className="lg:hidden p-2 text-white/60 hover:text-white transition-colors"
          onClick={() => setMenuOpen(o => !o)} aria-label="Menü">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobil menü */}
      <div className={`lg:hidden transition-all duration-500 overflow-hidden ${menuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="px-6 py-5 space-y-3"
          style={{ background:"rgba(9,9,11,0.98)", backdropFilter:"blur(20px)", borderTop:"1px solid rgba(139,92,246,0.12)" }}>
          {navLinks.map(l => l.external ? (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 text-sm tracking-widest text-white/70 uppercase py-2 border-b transition-colors hover:text-violet-bright"
              style={{ fontFamily:"var(--font-barlow-condensed)", borderColor:"rgba(139,92,246,0.08)" }}>
              {l.label}
              <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background:"rgba(139,92,246,0.2)", color:"#A855F7" }}>YENİ</span>
            </Link>
          ) : (
            <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className="block text-sm tracking-widest text-white/70 uppercase py-2 border-b transition-colors hover:text-violet-bright"
              style={{ fontFamily:"var(--font-barlow-condensed)", borderColor:"rgba(139,92,246,0.08)" }}>
              {l.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/giris" onClick={() => setMenuOpen(false)}
              className="block text-center text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all"
              style={{ fontFamily:"var(--font-barlow-condensed)", border:"1px solid rgba(139,92,246,0.3)", color:"rgba(139,92,246,0.8)" }}>
              Öğrenci Girişi
            </Link>
            <Link href="/admin/login" onClick={() => setMenuOpen(false)}
              className="block text-center text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all"
              style={{ fontFamily:"var(--font-barlow-condensed)", border:"1px solid rgba(139,92,246,0.15)", color:"rgba(139,92,246,0.5)" }}>
              Antrenör Girişi
            </Link>
            <a href="#contact" onClick={() => setMenuOpen(false)}
              className="block text-center text-white text-xs font-semibold tracking-widest uppercase px-5 py-3 transition-all"
              style={{ fontFamily:"var(--font-barlow-condensed)", background:"linear-gradient(135deg,#8B5CF6,#A855F7)" }}>
              Randevu Al
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
