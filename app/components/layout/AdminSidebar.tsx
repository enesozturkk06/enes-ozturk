"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import Logo from "@/app/components/shared/Logo";
import { useUnreadNotifCount } from "@/hooks/useUnreadNotifCount";
import {
  LayoutDashboard, Users, Calendar, CreditCard,
  BookOpen, LogOut, Menu, X, ChevronRight, Package, Shield, Bell, ShoppingBag, Building2, Sparkles,
} from "lucide-react";
import { CatIcon } from "@/app/components/shared/BlackCatAI";

const links = [
  { href: "/admin",                  label: "Bugünün Dersleri", icon: LayoutDashboard, exact: true },
  { href: "/admin/ogrenciler",       label: "Öğrenciler",       icon: Users },
  { href: "/admin/takvim",           label: "Takvim",           icon: Calendar },
  { href: "/admin/paketler",         label: "Ders Paketleri",   icon: Package },
  { href: "/admin/odemeler",         label: "Finans Merkezi",   icon: CreditCard },
  { href: "/admin/salonlar",         label: "Salonlar",         icon: Building2 },
  { href: "/admin/dersler",          label: "Ders Notları",     icon: BookOpen },
  { href: "/admin/kedi-koc",         label: "Kedi AI Koç Merkezi", icon: Sparkles },
  { href: "/admin/salon-sahipleri",  label: "Salon Sahipleri",  icon: Shield },
  { href: "/admin/bildirimler",      label: "Bildirimler",      icon: Bell },
  { href: "/admin/magaza",           label: "Online Mağaza",    icon: ShoppingBag },
];

export default function AdminSidebar() {
  const { logout }    = useAuth();
  const pathname      = usePathname();
  const router        = useRouter();
  const [open, setOpen] = useState(false);
  const { count: unread } = useUnreadNotifCount(30_000);

  const handleLogout = () => { logout(); router.push("/admin/login"); };

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen glass-strong fixed left-0 top-0 z-40" style={{ borderRadius: 0, border: "none" }}>
        <div className="absolute top-0 right-0 bottom-0 w-px gradient-animated gradient-slow gradient-violet-pink-orange" />

        <div className="p-5" style={{ borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={34} priority />
            <div>
              <div className="text-white text-sm tracking-widest leading-none" style={{ fontFamily: "var(--font-display)" }}>ENES ÖZTÜRK</div>
              <div className="text-[10px] tracking-wider" style={{ fontFamily: "var(--font-display)", color: "var(--color-achievement)" }}>ADMİN PANELİ</div>
            </div>
          </Link>
        </div>

        <div className="glass mx-4 mt-4 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-success)" }} />
            <span className="text-xs text-white/50 tracking-wider" style={{ fontFamily: "var(--font-label)" }}>
              Antrenör Enes Öztürk
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{ fontFamily: "var(--font-label)", color: "var(--color-achievement)", opacity: 0.7 }}>
            Tam erişim · Çevrimiçi
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 mt-3">
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            const isBell = href === "/admin/bildirimler";
            return (
              <Link key={href} href={href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 group ${active ? "text-white" : "text-white/35 hover:text-white hover:bg-white/[0.03]"}`}>
                {active && (
                  <motion.div layoutId="admin-sidebar-active" className="absolute inset-0 rounded-xl glass" style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}>
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl gradient-animated gradient-slow gradient-violet-pink-orange" />
                  </motion.div>
                )}
                <Icon size={16} style={{ color: active ? "#A78BFA" : undefined }} className={!active ? "group-hover:text-white/60" : ""} />
                <span className="text-sm tracking-wide flex-1" style={{ fontFamily: "var(--font-label)" }}>{label}</span>
                {/* Bildirim badge */}
                {isBell && unread > 0 && (
                  <span className="relative text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={{ background: "var(--color-error)", color: "#fff", boxShadow: "0 0 10px rgba(239,68,68,0.5)" }}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
                {active && !isBell && <ChevronRight size={13} className="ml-auto" style={{ color: "#A78BFA" }} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 space-y-1" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
          <button
            onClick={() => window.dispatchEvent(new Event("kedi-admin-open"))}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-white/45 hover:text-white transition-colors duration-200 rounded-xl"
          >
            <span className="w-4 h-4 flex items-center justify-center flex-shrink-0"><CatIcon size={16} /></span>
            <span className="text-sm tracking-wide" style={{ fontFamily: "var(--font-label)" }}>Kedi AI</span>
          </button>
          <Link href="/" className="flex items-center gap-3 px-3 py-2 text-white/25 hover:text-white/50 transition-colors text-xs rounded-xl"
            style={{ fontFamily: "var(--font-label)" }}>
            Ana Sayfaya Dön
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-white/25 transition-colors duration-200 rounded-xl"
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-error)")}
            onMouseLeave={e => (e.currentTarget.style.color = "")}>
            <LogOut size={16} />
            <span className="text-sm" style={{ fontFamily: "var(--font-label)" }}>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* ── Mobil header ─────────────────────────────────── */}
      <header
        className="lg:hidden glass-strong fixed top-0 left-0 right-0 z-50 flex items-end justify-between px-4"
        style={{
          borderRadius: 0, border: "none", borderBottom: "1px solid rgba(139,92,246,0.15)",
          paddingTop:    "calc(env(safe-area-inset-top, 0px) + 10px)",
          paddingBottom: "10px",
          minHeight:     "calc(env(safe-area-inset-top, 0px) + 56px)",
          // Android Chrome'da fixed + backdrop-blur kombinasyonu kaydırma
          // sırasında hatalı çiziliyor — kendi GPU katmanına zorluyoruz.
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          willChange: "transform",
          isolation: "isolate",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--color-achievement)" }} />
          <span className="text-sm text-white tracking-widest" style={{ fontFamily: "var(--font-display)" }}>
            ADMİN PANELİ
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Kedi AI — mobil header */}
          <button
            onClick={() => window.dispatchEvent(new Event("kedi-admin-open"))}
            className="relative flex items-center justify-center"
            style={{ minWidth: 40, minHeight: 40 }}
            aria-label="Kedi AI"
          >
            <span className="w-6 h-6 flex items-center justify-center rounded-full"
              style={{ background: "rgba(255,255,255,0.9)" }}>
              <CatIcon size={16} />
            </span>
          </button>

          {/* Bildirim zili — sağ üst */}
          <Link href="/admin/bildirimler"
            className="relative flex items-center justify-center"
            style={{ minWidth: 40, minHeight: 40 }}
            aria-label="Bildirimler">
            {unread > 0 && (
              <span className="absolute rounded-full animate-neon-pulse"
                style={{ width: 30, height: 30, background: "rgba(245,158,11,0.25)" }} />
            )}
            <Bell size={18} className="relative" style={{ color: unread > 0 ? "var(--color-achievement)" : "rgba(255,255,255,0.35)" }} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-white font-bold"
                style={{
                  background: "var(--color-error)",
                  boxShadow: "0 0 10px rgba(239,68,68,0.5)",
                  fontSize: 9,
                  minWidth: 16,
                  height: 16,
                  padding: "0 3px",
                  lineHeight: 1,
                }}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>

          {/* Hamburger */}
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center justify-center text-white/60 hover:text-white active:text-white transition-colors"
            style={{ minWidth: 44, minHeight: 44 }}
            aria-label="Menü"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* ── Mobil menü ───────────────────────────────────── */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <nav
            className="glass-strong absolute left-0 right-0 px-3 pb-4"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 56px)", paddingTop: "8px", borderRadius: "0 0 20px 20px", border: "none" }}
            onClick={e => e.stopPropagation()}
          >
            {links.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              const isBell = href === "/admin/bildirimler";
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 rounded-xl transition-all ${active ? "glass text-white" : "text-white/45 hover:text-white/70"}`}
                  style={{ minHeight: 48 }}>
                  <Icon size={17} style={{ color: active ? "#A78BFA" : undefined }} />
                  <span className="text-sm flex-1" style={{ fontFamily: "var(--font-label)" }}>{label}</span>
                  {isBell && unread > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "var(--color-error)", color: "#fff" }}>
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="mt-2 pt-2" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
              <button onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 rounded-xl text-white/30 transition-colors"
                style={{ minHeight: 48 }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--color-error)")}
                onMouseLeave={e => (e.currentTarget.style.color = "")}>
                <LogOut size={16} />
                <span className="text-sm" style={{ fontFamily: "var(--font-label)" }}>Çıkış Yap</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
