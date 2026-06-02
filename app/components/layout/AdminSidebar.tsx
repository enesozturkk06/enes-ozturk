"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import Logo from "@/app/components/shared/Logo";
import {
  LayoutDashboard, Users, Calendar, CreditCard,
  BookOpen, LogOut, Menu, X, ChevronRight, Package,
} from "lucide-react";

const links = [
  { href: "/admin",            label: "Bugünün Dersleri", icon: LayoutDashboard, exact: true },
  { href: "/admin/ogrenciler", label: "Öğrenciler",       icon: Users },
  { href: "/admin/takvim",     label: "Takvim",           icon: Calendar },
  { href: "/admin/paketler",   label: "Ders Paketleri",   icon: Package },
  { href: "/admin/odemeler",   label: "Ödemeler",         icon: CreditCard },
  { href: "/admin/dersler",    label: "Ders Notları",     icon: BookOpen },
];

export default function AdminSidebar() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); router.push("/admin/login"); };
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href) && href !== "/admin";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-pitch border-r border-white/5 fixed left-0 top-0 z-40">
        <div className="p-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={34} priority />
            <div>
              <div className="text-white text-sm tracking-widest leading-none" style={{ fontFamily: "var(--font-bebas)" }}>ENES ÖZTÜRK</div>
              <div className="text-gold text-[10px] tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>ADMİN PANELİ</div>
            </div>
          </Link>
        </div>

        <div className="mx-4 mt-4 p-3 bg-gold/5 border border-gold/15">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-white/50 tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Antrenör Enes Öztürk</span>
          </div>
          <div className="text-xs text-gold/50 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Tam erişim · Çevrimiçi</div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 mt-3">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group ${active ? "bg-gold/8 border-l-2 border-gold text-white" : "text-white/35 hover:text-white hover:bg-white/3"}`}>
                <Icon size={16} className={active ? "text-gold" : "group-hover:text-white/60"} />
                <span className="text-sm tracking-wide" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</span>
                {active && <ChevronRight size={13} className="ml-auto text-gold" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 text-white/25 hover:text-white/50 transition-colors text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Ana Sayfaya Dön
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-white/25 hover:text-crimson transition-colors duration-200">
            <LogOut size={16} />
            <span className="text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-pitch/96 backdrop-blur-md border-b border-white/5 h-14 flex items-center justify-between px-4">
        <span className="text-sm text-white tracking-widest" style={{ fontFamily: "var(--font-bebas)" }}>ADMİN PANELİ</span>
        <button onClick={() => setOpen(o => !o)} className="text-white/50 hover:text-white">
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <nav className="absolute top-14 left-0 right-0 bg-pitch border-b border-white/5 p-3 space-y-0.5">
            {links.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 ${active ? "bg-gold/8 text-white" : "text-white/40"}`}>
                  <Icon size={16} className={active ? "text-gold" : ""} />
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
