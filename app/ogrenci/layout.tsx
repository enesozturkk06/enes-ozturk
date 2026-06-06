"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/app/providers";
import StudentNav from "@/app/components/layout/StudentNav";
import WhatsAppButton from "@/app/components/shared/WhatsAppButton";
import BlackCatAI from "@/app/components/shared/BlackCatAI";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { student, loaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loaded) return;
    if (!student) router.replace("/giris");
  }, [loaded, student, router]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
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

  if (!student) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-crimson/40 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian">
      <StudentNav />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="lg:ml-64 min-h-screen"
      >
        <div
          className="lg:pt-0 lg:p-8 p-4"
          style={{ paddingTop: "var(--content-pt-mobile, 72px)" }}
        >
          {children}
        </div>
      </motion.main>
      <WhatsAppButton />
      <BlackCatAI />
    </div>
  );
}
