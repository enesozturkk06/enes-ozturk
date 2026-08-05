import { NextRequest, NextResponse } from "next/server";
import { hasOpenRouterKey } from "@/lib/openrouter";
import {
  analyzeKediVisionPhoto, analyzeKediVisionVideo, hashMedia, KediVisionError,
} from "@/lib/kediVision";
import { uploadKediVisionMedia, insertKediVisionAnalysis } from "@/lib/db";
import { OPENROUTER_VISION_MODELS } from "@/lib/kediAiConfig";
import type { KediVisionMediaType, KediProgramCreatedBy } from "@/lib/types";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function base64ToBlob(dataUrl: string, contentType: string): Blob {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const buffer = Buffer.from(base64, "base64");
  return new Blob([buffer], { type: contentType });
}

/**
 * Kedi AI Vision — fotoğraf/video teknik analizi.
 * body: { studentId, mediaType: "photo"|"video", imageDataUrl?, frameDataUrls?: string[], createdBy? }
 *
 * OPENROUTER_VISION_MODELS boşsa (kullanıcının açık talimatı: "ücretsiz model
 * görüntü analizi desteklemiyorsa mimariyi buna hazır hale getir, ücretli
 * modele otomatik geçme") burada NET bir 503 mesajı döner — asla sessizce
 * başarısız olmaz veya ücretli bir modele düşmez.
 */
export async function POST(req: NextRequest) {
  if (!hasOpenRouterKey()) {
    return jsonError("OPENROUTER_API_KEY tanımlı değil — .env.local ve Vercel'e eklenmeli", 503);
  }
  if (OPENROUTER_VISION_MODELS.length === 0) {
    return jsonError(
      "Kedi AI Vision için görüntü destekli bir ücretsiz model tanımlı değil — bu özellik uygun bir görsel (vision) modeli gerektirir. Ücretli bir modele otomatik geçilmez; lib/kediAiConfig.ts içindeki OPENROUTER_VISION_MODELS listesine uygun bir model eklenmeli.",
      503,
    );
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const studentId = typeof body.studentId === "string" ? body.studentId : undefined;
  const mediaType = body.mediaType as KediVisionMediaType;
  const imageDataUrl = typeof body.imageDataUrl === "string" ? body.imageDataUrl : undefined;
  const frameDataUrls = Array.isArray(body.frameDataUrls)
    ? (body.frameDataUrls as unknown[]).filter((f): f is string => typeof f === "string")
    : undefined;
  const createdBy: KediProgramCreatedBy = body.createdBy === "admin" ? "admin" : "student";

  if (!studentId) return jsonError("studentId gerekli", 400);
  if (mediaType !== "photo" && mediaType !== "video") return jsonError("mediaType 'photo' veya 'video' olmalı", 400);
  if (mediaType === "photo" && !imageDataUrl) return jsonError("imageDataUrl gerekli", 400);
  if (mediaType === "video" && (!frameDataUrls || frameDataUrls.length === 0)) {
    return jsonError("frameDataUrls gerekli (en az 1 kare)", 400);
  }

  try {
    const result = mediaType === "photo"
      ? await analyzeKediVisionPhoto({ studentId, imageDataUrl: imageDataUrl!, createdBy })
      : await analyzeKediVisionVideo({ studentId, frameDataUrls: frameDataUrls!, createdBy });

    // Önbellekten geldiyse (aynı görsel daha önce analiz edilmiş) — AI'ya
    // hiç gidilmedi, DB'ye tekrar yazmaya da gerek yok, olduğu gibi dön.
    if (result.cached) {
      return NextResponse.json({ analysis: result.analysis, cached: true });
    }

    // Yeni analiz — temsili görseli (fotoğrafın kendisi ya da videonun ilk
    // karesi) Supabase Storage'a yükle, sonra analiz kaydını oluştur.
    const representativeImage = mediaType === "photo" ? imageDataUrl! : frameDataUrls![0];
    const mediaUrl = await uploadKediVisionMedia(studentId, base64ToBlob(representativeImage, "image/jpeg"), "image/jpeg");
    if (!mediaUrl) {
      return jsonError("Görsel Supabase Storage'a yüklenemedi — bucket ayarlarını kontrol et.", 500);
    }

    const mediaHash = mediaType === "photo" ? hashMedia([imageDataUrl!]) : hashMedia(frameDataUrls!);
    const saved = await insertKediVisionAnalysis({ ...result.analysis, mediaUrl }, mediaHash);

    return NextResponse.json({ analysis: saved, cached: false });
  } catch (err) {
    if (err instanceof KediVisionError) {
      return jsonError(err.message, 422);
    }
    console.error("[kedi-ai/vision]", err);
    return jsonError("Analiz sırasında bir hata oluştu, lütfen tekrar deneyin.", 500);
  }
}
