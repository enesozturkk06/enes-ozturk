"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import AdminSidebar from "@/app/components/layout/AdminSidebar";

// Bu path'lerde auth kontrolü yapma — bunlar giriş sayfalarıdır
const PUBLIC_PATHS = ["/admin/login", "/admin/giris"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    // Giriş sayfasındaysak kontrol etme
    if (isPublicPage) return;
    // Context henüz yüklenmediyse bekle
    if (!loaded) return;
    // Giriş yapılmamışsa login'e gönder
    if (!isAdmin) router.replace("/admin/login");
  }, [loaded, isAdmin, router, isPublicPage]);

  // ── Giriş sayfaları: sidebar yok, auth kontrolü yok ──────────────
  if (isPublicPage) {
    return <>{children}</>;
  }

  // ── Korumalı sayfalar: yükleniyor ────────────────────────────────
  if (!loaded) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span
            className="text-xs text-white/30 tracking-widest uppercase"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            Yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  // ── Auth yok → redirect tetiklenirken boş göster ─────────────────
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Admin görünümü ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-obsidian">
      <AdminSidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="lg:ml-64 min-h-screen"
      >
        <div className="pt-14 lg:pt-0 p-4 lg:p-8">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
