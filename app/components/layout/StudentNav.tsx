"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import Logo from "@/app/components/shared/Logo";
import {
  LayoutDashboard, Calendar, TrendingUp, Dumbbell,
  Bell, LogOut, Menu, X, ChevronRight, Heart,
} from "lucide-react";

const links = [
  { href: "/ogrenci",              label: "Panel",        icon: LayoutDashboard, exact: true },
  { href: "/ogrenci/randevu",      label: "Randevu",      icon: Calendar },
  { href: "/ogrenci/gelisim",      label: "Gelişimim",    icon: TrendingUp },
  { href: "/ogrenci/saglik",       label: "Sağlık",       icon: Heart },
  { href: "/ogrenci/antrenman",    label: "AI Antrenman", icon: Dumbbell },
  { href: "/ogrenci/bildirimler",  label: "Bildirimler",  icon: Bell },
];

export default function StudentNav() {
  const { student, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); router.push("/giris"); };
  const isActive = (href: string, exact?: boolean) => exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-pitch border-r border-white/5 fixed left-0 top-0 z-40">
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={34} priority />
            <div>
              <div className="text-white text-sm tracking-widest leading-none group-hover:text-gold-bright transition-colors" style={{ fontFamily: "var(--font-bebas)" }}>ENES ÖZTÜRK</div>
              <div className="text-crimson text-[10px] tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>KİŞİSEL ANTRENÖR</div>
            </div>
          </Link>
        </div>

        {/* Öğrenci bilgisi */}
        {student && (
          <div className="mx-4 mt-4 p-3.5 bg-carbon border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson font-display text-sm flex-shrink-0" style={{ fontFamily: "var(--font-bebas)" }}>
                {student.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white font-semibold truncate" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{student.fullName}</div>
                <div className="text-xs text-gold tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{student.code}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex justify-between text-xs">
              <span className="text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kalan Ders</span>
              <span className="text-crimson font-semibold" style={{ fontFamily: "var(--font-bebas)" }}>{student.remainingLessons}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 mt-3">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group ${active ? "bg-crimson/10 border-l-2 border-crimson text-white" : "text-white/35 hover:text-white hover:bg-white/3"}`}>
                <Icon size={16} className={active ? "text-crimson" : "group-hover:text-white/60"} />
                <span className="text-sm tracking-wide" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</span>
                {active && <ChevronRight size={13} className="ml-auto text-crimson" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-white/25 hover:text-crimson transition-colors duration-200">
            <LogOut size={16} />
            <span className="text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-pitch/96 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4"
        style={{ paddingTop:"calc(env(safe-area-inset-top, 0px) + 8px)", paddingBottom:"8px", minHeight:"56px" }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7">
            <svg viewBox="0 0 44 44" fill="none" className="w-full h-full">
              <polygon points="22,2 42,12 42,32 22,42 2,32 2,12" stroke="#dc2626" strokeWidth="2" fill="rgba(220,38,38,0.08)" />
              <text x="22" y="28" textAnchor="middle" fill="#dc2626" fontSize="13" fontFamily="var(--font-bebas)">EÖ</text>
            </svg>
          </div>
          <span className="text-sm text-white tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>ÖĞRENCİ PANELİ</span>
        </Link>
        <button onClick={() => setOpen(o => !o)} className="text-white/50 hover:text-white transition-colors">
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <nav className="absolute top-14 left-0 right-0 bg-pitch border-b border-white/5 p-3 space-y-0.5">
            {links.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 ${active ? "bg-crimson/10 text-white" : "text-white/40"}`}>
                  <Icon size={16} className={active ? "text-crimson" : ""} />
                  <span className="text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</span>
                </Link>
              );
            })}
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-3 text-white/25">
              <LogOut size={16} /><span className="text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Çıkış</span>
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
