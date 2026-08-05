import { NextRequest, NextResponse } from "next/server";
import { saveKediMessage } from "@/lib/db";
import {
  buildStudentDigest, buildAdminDigest, buildBriefPrompt, extractMood, hasNotableBriefSignal,
} from "@/lib/kediAi";
import { hasOpenRouterKey, callOpenRouter } from "@/lib/openrouter";
import { KEDI_AI_BRIEF_MAX_TOKENS, OPENROUTER_TEXT_MODELS } from "@/lib/kediAiConfig";
import type { KediAiActorType } from "@/lib/types";

/**
 * Proaktif günlük özet — chat açılmadan, giriş sonrası tek seferlik çağrılır.
 * Üç katmanlı frekans kontrolü: (1) client tarafı bunu günde bir kere
 * çağıracak şekilde kendi kısıtlıyor (localStorage tarih kapısı), (2) burada
 * AI'ya gitmeden ÖNCE kural-tabanlı hasNotableBriefSignal kontrolü yapılıyor
 * — gerçek bir risk/fırsat sinyali yoksa AI'YA HİÇ GİDİLMİYOR (günlük 50
 * istek/gün ücretsiz kotasını koruyan en önemli optimizasyonlardan biri, her
 * girişte tetiklenebildiği için), (3) sinyal varsa bile modelin kendisi
 * "YOK" diyerek gereksiz konuşmayı reddedebiliyor.
 */
export async function POST(req: NextRequest) {
  if (!hasOpenRouterKey()) return NextResponse.json({ brief: null }, { status: 503 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const actorType = body.actorType as KediAiActorType;
  const studentId = typeof body.studentId === "string" ? body.studentId : undefined;

  if (actorType !== "student" && actorType !== "admin") {
    return NextResponse.json({ error: "actorType 'student' veya 'admin' olmalı" }, { status: 400 });
  }
  if (actorType === "student" && !studentId) {
    return NextResponse.json({ error: "studentId gerekli" }, { status: 400 });
  }

  try {
    const digest = actorType === "student" ? await buildStudentDigest(studentId!) : await buildAdminDigest();

    // Kural-tabanlı ön-filtre: yerel veride hiçbir dikkat çekici sinyal
    // yoksa AI çağrısı hiç yapılmaz — maliyet $0 ama günlük istek sayısını
    // gereksiz yere tüketmemek için bu kontrol AI'dan ÖNCE yapılıyor.
    if (!hasNotableBriefSignal(actorType, digest)) {
      return NextResponse.json({ brief: null });
    }

    const prompt = buildBriefPrompt(actorType, digest);
    const { content: raw, truncated } = await callOpenRouter(
      [{ role: "user", content: prompt }], { maxTokens: KEDI_AI_BRIEF_MAX_TOKENS, model: OPENROUTER_TEXT_MODELS },
    );
    // Yarıda kesilmiş çıktı muhtemelen modelin ham "düşünme" metni —
    // kullanıcıya güvenilmez/anlamsız bir şey göstermektense hiç gösterme.
    if (truncated) return NextResponse.json({ brief: null });

    const { text, mood } = extractMood(raw.trim());
    const cleanText = text.trim();

    if (!cleanText || cleanText.toUpperCase().startsWith("YOK")) {
      return NextResponse.json({ brief: null });
    }

    await saveKediMessage({ actorType, studentId, role: "assistant", content: cleanText, mood: mood ?? undefined });
    return NextResponse.json({ brief: cleanText, mood: mood ?? "calm" });
  } catch (err) {
    console.error("[kedi-ai/brief]", err);
    // Proaktif bir özellik olduğu için sessizce başarısız ol — kullanıcıya hata gösterme.
    return NextResponse.json({ brief: null });
  }
}
