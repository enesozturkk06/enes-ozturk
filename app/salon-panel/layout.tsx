"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";

export default function SalonPanelLayout({ children }: { children: React.ReactNode }) {
  const { role, loaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loaded) return;
    if (role !== "salon_owner") router.replace("/salon-login");
  }, [loaded, role, router]);

  if (!loaded || role !== "salon_owner") {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"rgba(139,92,246,0.5)", borderTopColor:"transparent" }} />
      </div>
    );
  }

  return <>{children}</>;
}
