import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Bağlantı durumunu her iki ortamda da logla
if (typeof window !== "undefined") {
  // Browser tarafı
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "⛔ SUPABASE BAĞLANTI YOK — .env.local dosyasında NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY eksik veya dev server yeniden başlatılmadı."
    );
  } else {
    console.log("✅ Supabase yapılandırıldı:", supabaseUrl.substring(0, 40) + "...");
  }
}

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;
