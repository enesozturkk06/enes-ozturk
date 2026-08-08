import type { NextConfig } from "next";

// Supabase Storage'daki öğrenci profil fotoğrafları next/image ile
// optimize edilebilsin diye — bkz. lib/db.ts uploadStudentAvatar (aynı
// proje URL'i, env değişkeninden okunuyor, hiçbir değer hardcode edilmiyor).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
      : [],
  },
};

export default nextConfig;
