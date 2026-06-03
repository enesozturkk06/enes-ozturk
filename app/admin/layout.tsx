"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import AdminSidebar from "@/app/components/layout/AdminSidebar";

const PUBLIC_PATHS = ["/admin/login", "/admin/giris"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loaded } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (isPublicPage) return;
    if (!loaded) return;
    if (!isAdmin) router.replace("/admin/login");
  }, [loaded, isAdmin, router, isPublicPage]);

  if (isPublicPage) return <>{children}</>;

  if (!loaded) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-white/30 tracking-widest uppercase"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <AdminSidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="lg:ml-64 min-h-screen"
      >
        {/* Mobil: header yüksekliği + safe area + extra boşluk */}
        <div
          className="lg:pt-0 lg:p-8 p-4"
          style={{
            paddingTop: "var(--content-pt-mobile, 72px)",
          }}
        >
          {/* Masaüstünde padding sıfırla */}
          <style>{`
            @media (min-width: 1024px) {
              .lg\\:pt-0 { padding-top: 0 !important; }
            }
          `}</style>
          {children}
        </div>
      </motion.main>
    </div>
  );
}
