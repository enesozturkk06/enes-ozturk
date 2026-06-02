"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/providers";
import { Menu, X } from "lucide-react";
import Logo from "@/app/components/shared/Logo";

const navLinks = [
  { label: "Ana Sayfa", href: "#hero" },
  { label: "Hakkımda", href: "#about" },
  { label: "Branşlar", href: "#branslar" },
  { label: "Özel Ders", href: "#paketler" },
  { label: "İletişim", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { student, isAdmin } = useAuth();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-pitch/96 backdrop-blur-md border-b border-gold/10 shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 lg:h-[72px]">
        {/* Logo */}
        <a href="#hero" onClick={() => setMenuOpen(false)} className="flex items-center gap-2.5 group flex-shrink-0">
          <Logo size={38} priority className="group-hover:opacity-90 transition-opacity duration-300" />
          <div className="flex flex-col leading-none">
            <span className="text-white text-[15px] lg:text-base tracking-[0.15em] group-hover:text-gold-bright transition-colors duration-300" style={{ fontFamily: "var(--font-bebas)" }}>
              ENES ÖZTÜRK
            </span>
            <span className="text-crimson text-[10px] lg:text-xs tracking-[0.3em]" style={{ fontFamily: "var(--font-bebas)" }}>
              KİŞİSEL ANTRENÖR
            </span>
          </div>
        </a>

        {/* Desktop links */}
        <ul className="hidden lg:flex items-center gap-7">
          {navLinks.map(l => (
            <li key={l.href}>
              <a
                href={l.href}
                className="text-xs tracking-widest text-white/60 hover:text-gold-bright transition-colors duration-300 uppercase relative group"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {l.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-crimson group-hover:w-full transition-all duration-300" />
              </a>
            </li>
          ))}
        </ul>

        {/* Auth buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {student ? (
            <Link href="/ogrenci" className="text-xs text-gold/70 hover:text-gold tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Panelim →
            </Link>
          ) : isAdmin ? (
            <Link href="/admin" className="text-xs text-gold/70 hover:text-gold tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Admin →
            </Link>
          ) : (
            <>
              <Link href="/giris" className="text-xs text-white/40 hover:text-white/70 tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Öğrenci Girişi
              </Link>
              <Link href="/admin/login" className="text-xs text-white/25 hover:text-white/40 tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Antrenör
              </Link>
            </>
          )}
          <a
            href="#contact"
            className="bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(220,38,38,0.5)]"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            Randevu Al
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          className="lg:hidden p-2 text-white/60 hover:text-white transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Menü"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`lg:hidden transition-all duration-500 overflow-hidden ${menuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="bg-pitch/98 backdrop-blur-md border-t border-gold/8 px-6 py-5 space-y-3">
          {navLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block text-sm tracking-widest text-white/70 hover:text-gold-bright uppercase py-2 border-b border-white/5 transition-colors"
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              {l.label}
            </a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/giris" onClick={() => setMenuOpen(false)} className="block text-center border border-white/15 text-white/50 text-xs font-semibold tracking-widest uppercase px-5 py-2.5 hover:border-crimson/40 hover:text-white transition-all" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Öğrenci Girişi
            </Link>
            <Link href="/admin/login" onClick={() => setMenuOpen(false)} className="block text-center border border-gold/15 text-gold/50 text-xs font-semibold tracking-widest uppercase px-5 py-2.5 hover:border-gold/40 hover:text-gold transition-all" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Antrenör Girişi
            </Link>
            <a href="#contact" onClick={() => setMenuOpen(false)} className="block text-center bg-crimson text-white text-xs font-semibold tracking-widest uppercase px-5 py-3 hover:bg-crimson-bright transition-all" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Randevu Al
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
