import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
const VAPID_SUBJECT  = process.env.WEB_PUSH_VAPID_SUBJECT || "mailto:admin@example.com";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

/** Bildirim içeriğine göre tıklanınca açılacak sayfayı tahmin et (gerçek route'lara göre) */
function inferUrl(studentId: string | null, title: string, message: string): string {
  const t = `${title} ${message}`.toLowerCase();
  if (studentId) {
    if (t.includes("hediye ders")) return "/ogrenci/seviye";
    if (t.includes("rozet"))       return "/ogrenci/rozetler";
    if (t.includes("görev"))       return "/ogrenci/seviye";
    if (t.includes("slot") || t.includes("randevu")) return "/ogrenci/randevu";
    if (t.includes("paket"))       return "/ogrenci/profil";
    return "/ogrenci/bildirimler";
  }
  if (t.includes("ödeme"))   return "/admin/odemeler";
  if (t.includes("paket"))  return "/admin/ogrenciler";
  // randevu, düet, hediye ders talebi, görev/rozet bilgisi → dashboard
  return "/admin";
}

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: "Supabase yapılandırılmamış" }, { status: 500 });
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return NextResponse.json({ error: "VAPID anahtarları tanımlı değil" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  let title: string;
  let message: string;
  let studentId: string | null;
  let url: string;

  if (body.notificationId) {
    // Mod A: Supabase DB trigger çağrısı — notifications tablosundan iç bilgiyle doldurulur
    const internalSecret = process.env.PUSH_INTERNAL_SECRET;
    const providedSecret = req.headers.get("x-push-secret");
    if (internalSecret && providedSecret !== internalSecret) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { data: notif, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", body.notificationId as string)
      .maybeSingle();
    if (error || !notif) return NextResponse.json({ error: "Bildirim bulunamadı" }, { status: 404 });

    title     = notif.title;
    message   = notif.message;
    studentId = notif.student_id ?? null;
    url       = inferUrl(studentId, title, message);
  } else if (body.title && body.message) {
    // Mod B: Admin panelinden manuel test gönderimi
    title     = body.title as string;
    message   = body.message as string;
    studentId = (body.studentId as string) ?? null;
    url       = (body.url as string) || (studentId ? "/ogrenci/bildirimler" : "/admin");
  } else {
    return NextResponse.json({ error: "notificationId veya title+message gerekli" }, { status: 400 });
  }

  let query = supabase.from("push_subscriptions").select("*");
  query = studentId
    ? query.eq("role", "student").eq("student_id", studentId)
    : query.eq("role", "admin");

  const { data: subs, error: subErr } = await query;
  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 });
  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const payload = JSON.stringify({ title, body: message, url, icon: "/icons/icon-192.png" });

  let sent = 0;
  const expiredEndpoints: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(s.endpoint);
        } else {
          console.error("[push/send] gönderim hatası:", err);
        }
      }
    })
  );

  if (expiredEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({ ok: true, sent });
}
