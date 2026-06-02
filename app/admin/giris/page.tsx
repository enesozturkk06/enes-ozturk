"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /admin/giris → /admin/login'e yönlendir
export default function AdminGirisRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/login"); }, [router]);
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
