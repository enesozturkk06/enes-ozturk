"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import Logo from "@/app/components/shared/Logo";
import { CatIcon } from "@/app/components/shared/BlackCatAI";
import {
  LayoutDashboard, Calendar, TrendingUp, Dumbbell,
  Bell, LogOut, Menu, X, ChevronRight, Heart, Award, Zap,
  FileText, Medal, User, Swords, CreditCard, Building2, Sparkles,
} from "lucide-react";

const links = [
  { href: "/ogrenci",              label: "Panel",          icon: LayoutDashboard, exact: true },
  { href: "/ogrenci/kedi-ai",      label: "Kedi AI",        icon: Sparkles },
  { href: "/ogrenci/randevu",      label: "Randevu",        icon: Calendar },
  { href: "/ogrenci/gelisim",      label: "Gelişimim",      icon: TrendingUp },
  { href: "/ogrenci/saglik",       label: "Sağlık",         icon: Heart },
  { href: "/ogrenci/antrenman",    label: "AI Antrenman",   icon: Dumbbell },
  { href: "/ogrenci/salon",        label: "Dijital Salon",  icon: Building2 },
  { href: "/ogrenci/rozetler",     label: "Rozetlerim",     icon: Award },
  { href: "/ogrenci/seviye",       label: "Seviye Merkezi", icon: Zap },
  { href: "/ogrenci/arena",        label: "Arena",          icon: Swords },
  { href: "/ogrenci/fight-card",   label: "Fight Card",     icon: CreditCard },
  { href: "/ogrenci/profil",       label: "Profilim",       icon: User },
  { href: "/ogrenci/rapor",        label: "Gelişim Raporu", icon: FileText },
  { href: "/ogrenci/sertifika",    label: "Sertifikalarım", icon: Medal },
  { href: "/ogrenci/bildirimler",  label: "Bildirimler",    icon: Bell },
];

/** Alt navigasyon çubuğundaki 4 sekme (Kedi AI merkez butonunun iki yanına 2'şer dağılır) */
const bottomTabs = [
  { href: "/ogrenci",           label: "Ana Sayfa", icon: LayoutDashboard, exact: true },
  { href: "/ogrenci/randevu",   label: "Randevu",   icon: Calendar },
  { href: "/ogrenci/seviye",    label: "Seviye",    icon: Zap },
  { href: "/ogrenci/profil",    label: "Profil",    icon: User },
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
      {/* Desktop sidebar — h-screen (min-h-screen DEĞİL) + flex column: menü öğe
          sayısı ekran yüksekliğini aşınca `<aside>` kendisi büyümesin, sadece
          içindeki <nav> kayıtsın (aşağıda). Logo/kullanıcı kartı ve çıkış
          butonu flex-shrink olmadığı için sabit kalır. */}
      <aside className="hidden lg:flex flex-col w-64 h-screen glass-strong fixed left-0 top-0 z-40" style={{ borderRadius: 0, border: "none" }}>
        <div className="absolute top-0 right-0 bottom-0 w-px gradient-animated gradient-slow gradient-violet-pink-orange" />

        {/* Logo */}
        <div className="p-5" style={{ borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
          <Link href="/" className="flex items-center gap-2.5 group">
            <Logo size={34} priority />
            <div>
              <div className="text-white text-sm tracking-widest leading-none transition-colors" style={{ fontFamily: "var(--font-display)" }}>ENES ÖZTÜRK</div>
              <div className="text-[10px] tracking-wider" style={{ fontFamily: "var(--font-display)", color: "#A78BFA" }}>KİŞİSEL ANTRENÖR</div>
            </div>
          </Link>
        </div>

        {/* Öğrenci bilgisi */}
        {student && (
          <div className="glass mx-4 mt-4 p-3.5 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA", fontFamily: "var(--font-display)" }}>
                {student.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white font-semibold truncate" style={{ fontFamily: "var(--font-label)" }}>{student.fullName}</div>
                <div className="text-xs tracking-wider" style={{ fontFamily: "var(--font-label)", color: "var(--color-achievement)" }}>{student.code}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 flex justify-between text-xs" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
              <span className="text-white/30" style={{ fontFamily: "var(--font-label)" }}>Kalan Ders</span>
              <span className="font-semibold" style={{ fontFamily: "var(--font-display)", color: "#A78BFA" }}>{student.remainingLessons}</span>
            </div>
          </div>
        )}

        {/* Nav — TEK kaydırılabilir bölge. min-h-0 ZORUNLU: flex item'lar
            varsayılan olarak `min-height: auto` taşır (kendi içeriği kadar
            büyümek ister), bu da flex-1 + overflow-y:auto'yu etkisiz
            bırakır — min-h-0 olmadan scroll asla tetiklenmez. */}
        <nav
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 space-y-0.5 mt-3"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {links.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 group ${active ? "text-white" : "text-white/35 hover:text-white hover:bg-white/[0.03]"}`}>
                {active && (
                  <motion.div layoutId="student-sidebar-active" className="absolute inset-0 rounded-xl glass" style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}>
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl gradient-animated gradient-slow gradient-violet-pink-orange" />
                  </motion.div>
                )}
                <Icon size={16} style={{ color: active ? "#A78BFA" : undefined }} className={!active ? "group-hover:text-white/60" : ""} />
                <span className="text-sm tracking-wide" style={{ fontFamily: "var(--font-label)" }}>{label}</span>
                {active && <ChevronRight size={13} className="ml-auto" style={{ color: "#A78BFA" }} />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2.5 text-white/25 transition-colors duration-200 rounded-xl"
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-error)")}
            onMouseLeave={e => (e.currentTarget.style.color = "")}>
            <LogOut size={16} />
            <span className="text-sm" style={{ fontFamily: "var(--font-label)" }}>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Mobile header — safe area uyumlu */}
      <header
        className="lg:hidden glass-strong fixed top-0 left-0 right-0 z-50 flex items-end justify-between px-5"
        style={{
          borderRadius: 0, border: "none", borderBottom: "1px solid rgba(139,92,246,0.15)",
          paddingTop:    "calc(env(safe-area-inset-top, 0px) + 10px)",
          paddingBottom: "12px",
          minHeight:     "calc(env(safe-area-inset-top, 0px) + 56px)",
          // Android Chrome'da fixed + backdrop-blur kombinasyonu kaydırma sırasında
          // hatalı çiziliyor (kartlar üst üste biniyor gibi görünüyor) — kendi GPU
          // katmanına zorlayıp bu render hatasını önlüyoruz.
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          willChange: "transform",
          isolation: "isolate",
        }}
      >
        <Link href="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-sm text-white tracking-widest" style={{ fontFamily: "var(--font-display)" }}>ÖĞRENCİ PANELİ</span>
        </Link>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-center text-white/55 hover:text-white active:text-white transition-colors"
          style={{ minWidth: 44, minHeight: 44 }}
          aria-label="Menü"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <nav
            className="glass-strong absolute left-0 right-0 px-3 pb-4 overflow-y-auto overscroll-contain"
            style={{
              top: "calc(env(safe-area-inset-top, 0px) + 56px)",
              paddingTop: "8px",
              borderRadius: "0 0 20px 20px",
              border: "none",
              // Menü, üstte header'ın altından başlayıp alttaki sabit bottom-nav
              // bar'ının (safe-area dahil) HİÇBİR ZAMAN arkasına geçmeyecek
              // şekilde sınırlandırılıyor — 15 link + Çıkış butonu bu yüksekliği
              // aşarsa (kısa boylu iPhone'larda olduğu gibi) menü kendi içinde
              // kayar, "Çıkış" her zaman kaydırılarak görünür alana gelir.
              maxHeight: "calc(100dvh - (env(safe-area-inset-top, 0px) + 56px) - var(--bottom-nav-total-h, calc(env(safe-area-inset-bottom, 0px) + 64px)))",
              WebkitOverflowScrolling: "touch",
            }}
            onClick={e => e.stopPropagation()}
          >
            {links.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 rounded-xl transition-all ${active ? "glass text-white" : "text-white/45 hover:text-white/70"}`}
                  style={{ minHeight: 48 }}>
                  <Icon size={16} style={{ color: active ? "#A78BFA" : undefined }} />
                  <span className="text-sm" style={{ fontFamily: "var(--font-label)" }}>{label}</span>
                </Link>
              );
            })}
            <button onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 rounded-xl text-white/30 transition-colors mt-2"
              style={{ minHeight: 48 }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--color-error)")}
              onMouseLeave={e => (e.currentTarget.style.color = "")}>
              <LogOut size={16} /><span className="text-sm" style={{ fontFamily: "var(--font-label)" }}>Çıkış</span>
            </button>
          </nav>
        </div>
      )}

      {/* Mobile bottom navigation — ekrana tam birleşik (Instagram/Spotify tarzı) */}
      <div
        className="student-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-[46]"
        style={{
          // Android Chrome'da fixed + backdrop-blur kombinasyonu kaydırma sırasında
          // hatalı çiziliyor (kartlar üst üste biniyor gibi görünüyor) — kendi GPU
          // katmanına zorlayıp bu render hatasını önlüyoruz.
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          willChange: "transform",
          isolation: "isolate",
        }}
      >
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.12 }}
        >
          {/* Glass bar — ekranın tam kenarına yapışık, sadece üst köşeler yuvarlak */}
          <div
            className="relative"
            style={{
              background: "rgba(8,5,20,0.96)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              borderTop: "1px solid rgba(139,92,246,0.20)",
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.05), 0 -8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(139,92,246,0.06)",
              // Bar'ın gerçek yüksekliği: sabit içerik + safe-area — hiçbir öğe bu kutunun dışına taşmaz
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Üst akan neon şerit */}
            <div className="absolute top-0 left-3 right-3 h-px gradient-animated gradient-slow gradient-violet-pink-orange" />

            <div className="flex items-center px-1" style={{ height: "var(--bottom-nav-h, 64px)" }}>

              {/* Sol iki sekme */}
              {bottomTabs.slice(0, 2).map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Link key={href} href={href}
                    className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative transition-all duration-200 active:scale-90">
                    {active && (
                      <motion.div layoutId="student-bottom-nav-active" className="absolute inset-1.5 rounded-2xl -z-10"
                        style={{ background: "rgba(139,92,246,0.12)" }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                    )}
                    <Icon size={22} style={{
                      color: active ? "#C4B5FD" : "rgba(255,255,255,0.30)",
                      filter: active ? "drop-shadow(0 0 7px rgba(167,139,250,0.85))" : "none",
                      transition: "all 0.2s ease",
                    }} />
                    <span className="text-[9px] tracking-widest leading-none" style={{
                      fontFamily: "var(--font-label)",
                      color: active ? "#C4B5FD" : "rgba(255,255,255,0.26)",
                      transition: "color 0.2s ease",
                    }}>
                      {label}
                    </span>
                  </Link>
                );
              })}

              {/* CENTER: Kedi AI — bar'ın bir parçası, hiçbir zaman dışına taşmaz */}
              <div className="flex-1 flex justify-center items-center h-full">
                <button
                  onClick={() => window.dispatchEvent(new Event("kedi-open"))}
                  aria-label="Kedi AI"
                  className="relative flex items-center justify-center transition-all duration-200 active:scale-90 gradient-animated gradient-slow gradient-violet-pink-orange"
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    boxShadow:
                      "0 0 0 2px rgba(139,92,246,0.4), 0 0 0 5px rgba(139,92,246,0.10), 0 0 22px rgba(139,92,246,0.5), 0 0 34px rgba(236,72,153,0.2)",
                  }}
                >
                  {/* Beyaz daire arka plan — kedi logosu kontrast için */}
                  <div
                    className="absolute rounded-full flex items-center justify-center"
                    style={{
                      width: 34,
                      height: 34,
                      background: "rgba(255,255,255,0.95)",
                      boxShadow: "inset 0 0 0 1px rgba(139,92,246,0.18)",
                    }}
                  >
                    <CatIcon size={24} />
                  </div>
                  {/* Pulsing neon ring — kutunun içinde kalır */}
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: "rgba(139,92,246,0.22)", animationDuration: "2.8s" }}
                  />
                </button>
              </div>

              {/* Sağ iki sekme */}
              {bottomTabs.slice(2).map(({ href, label, icon: Icon, exact }) => {
                const active = isActive(href, exact);
                return (
                  <Link key={href} href={href}
                    className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative transition-all duration-200 active:scale-90">
                    {active && (
                      <motion.div layoutId="student-bottom-nav-active" className="absolute inset-1.5 rounded-2xl -z-10"
                        style={{ background: "rgba(139,92,246,0.12)" }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                    )}
                    <Icon size={22} style={{
                      color: active ? "#C4B5FD" : "rgba(255,255,255,0.30)",
                      filter: active ? "drop-shadow(0 0 7px rgba(167,139,250,0.85))" : "none",
                      transition: "all 0.2s ease",
                    }} />
                    <span className="text-[9px] tracking-widest leading-none" style={{
                      fontFamily: "var(--font-label)",
                      color: active ? "#C4B5FD" : "rgba(255,255,255,0.26)",
                      transition: "color 0.2s ease",
                    }}>
                      {label}
                    </span>
                  </Link>
                );
              })}

            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
