import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({ error: "Supabase yapılandırılmamış" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth || !body?.role) {
    return NextResponse.json({ error: "Geçersiz abonelik verisi" }, { status: 400 });
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      student_id: body.role === "admin" ? null : body.studentId ?? null,
      role: body.role,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
      user_agent: body.userAgent ?? null,
    },
    { onConflict: "endpoint" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
