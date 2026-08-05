import { NextRequest } from "next/server";
import { getKediMessages, getKediMemories, saveKediMessage } from "@/lib/db";
import {
  buildStudentDigest, buildAdminDigest, buildSystemPrompt,
  extractMood, extractMemoryDelta, applyMemoryDelta, formatHistoryForPrompt,
} from "@/lib/kediAi";
import { hasOpenRouterKey, streamOpenRouterChat, type OpenRouterMessage } from "@/lib/openrouter";
import { KEDI_AI_MAX_TOKENS, OPENROUTER_TEXT_MODELS } from "@/lib/kediAiConfig";
import type { KediAiActorType } from "@/lib/types";

// Stream'in en sonuna eklenen mood işaretleyici ayracı. Client bunu ayıklayıp
// avatar durumuna besler, mesaj metninde GÖSTERMEZ. Model çıktısında doğal
// olarak asla oluşmayacak bir dizi olduğu için güvenle son parça olarak
// akıtılabilir.
export const KEDI_MOOD_DELIM = " KEDI_MOOD::";

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status, headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  if (!hasOpenRouterKey()) {
    return jsonError("OPENROUTER_API_KEY tanımlı değil — .env.local ve Vercel'e eklenmeli", 503);
  }

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const actorType = body.actorType as KediAiActorType;
  const studentId = typeof body.studentId === "string" ? body.studentId : undefined;
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (actorType !== "student" && actorType !== "admin") {
    return jsonError("actorType 'student' veya 'admin' olmalı", 400);
  }
  if (!message) return jsonError("message gerekli", 400);
  if (actorType === "student" && !studentId) return jsonError("studentId gerekli", 400);

  const [digest, history, memories] = await Promise.all([
    actorType === "student" ? buildStudentDigest(studentId!) : buildAdminDigest(),
    getKediMessages(actorType, studentId, 20),
    getKediMemories(actorType, studentId, 30),
  ]);

  const system = buildSystemPrompt(actorType, digest, memories);

  await saveKediMessage({ actorType, studentId, role: "user", content: message });

  const messages: OpenRouterMessage[] = [
    { role: "system", content: system },
    ...formatHistoryForPrompt(history),
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();
  // Kuyruk tampon: sabit bir karakter sayısı yerine, işaretleyicilerin her
  // zaman "<!--" ile başladığı gerçeğinden faydalanılıyor — akışta bu dizi
  // görülene kadar her şey normal şekilde akıtılır (mood-only turlarda sabit
  // ~50 karakterlik eski davranışla aynı "daktilo" hissi korunur), "<!--"
  // görüldüğü andan itibaren (hafıza işaretleyicisi mood'dan çok daha uzun
  // olabildiği için) stream bitene kadar HİÇBİR ŞEY akıtılmaz — sabit 700
  // karakterlik bir tampon kullanmak KISA cevaplarda (700'den kısa çoğu
  // sohbet turu) akışı tamamen öldürürdü, bu yaklaşım öyle bir regresyona
  // yol açmadan güvenliği koruyor.
  const findHoldPoint = (text: string): number => {
    const idx = text.lastIndexOf("<!--");
    return idx === -1 ? text.length : idx;
  };

  const stream = new ReadableStream({
    async start(controller) {
      // Client sekmeyi kapatır/sayfadan ayrılırsa ReadableStream'in cancel()
      // callback'i tetiklenir ve controller kapanır — bundan sonra yapılan
      // her enqueue() "Controller is already closed" fırlatır. Bu bayrak
      // sayesinde teslimatı sessizce atlıyoruz ama DB'ye kayıt (aşağıdaki
      // saveKediMessage/applyMemoryDelta) client bağlı olmasa da tamamlanmaya
      // devam ediyor — cevap kaybolmasın diye.
      let clientGone = false;
      const safeEnqueue = (text: string) => {
        if (clientGone || !text) return;
        try { controller.enqueue(encoder.encode(text)); }
        catch { clientGone = true; }
      };
      const safeClose = () => {
        if (clientGone) return;
        try { controller.close(); } catch { /* zaten kapalı */ }
      };

      let held = "";
      let fullText = "";
      let sentChars = 0;
      const flush = (delta: string) => {
        fullText += delta;
        held += delta;
        const flushLen = findHoldPoint(held);
        if (flushLen > 0) {
          safeEnqueue(held.slice(0, flushLen));
          sentChars += flushLen;
          held = held.slice(flushLen);
        }
      };

      let streamError: unknown = null;
      try {
        await streamOpenRouterChat(messages, flush, {
          maxTokens: KEDI_AI_MAX_TOKENS, models: OPENROUTER_TEXT_MODELS,
        });
      } catch (err) {
        streamError = err;
        console.error("[kedi-ai/chat]", err);
      }

      if (streamError) {
        safeEnqueue("Kedi şu an düşüncelerini toparlayamadı, birazdan tekrar dener misin? 🐈");
        safeEnqueue(`${KEDI_MOOD_DELIM}calm`);
        safeClose();
        return;
      }

      // Sırasıyla: önce mood (her zaman en sonda), sonra hafıza işaretleyicisi
      // (mood'dan hemen önce) ayıklanır — bkz. buildSystemPrompt'taki sıra
      // talimatı. `held` içindeki extraction akışa gönderilecek son parçayı,
      // `fullText` üzerindeki extraction ise DB'ye kaydedilecek tam metni verir.
      const { text: tailAfterMood, mood } = extractMood(held);
      const { text: tailFinal, add: memAdd, removeIds: memRemoveIds } = extractMemoryDelta(tailAfterMood);
      sentChars += tailFinal.length;

      let fullDisplayText = extractMood(fullText).text;
      fullDisplayText = extractMemoryDelta(fullDisplayText).text;

      // Serbest katman modeli ara sıra sadece işaretleyicileri döndürüp
      // asıl cevabı hiç üretmiyor (gözlemlendi) — sessizce boş bir mesaj
      // göstermek/kaydetmek yerine kullanıcının fark edeceği bir geri bildirim ver.
      if (sentChars === 0 || fullDisplayText.trim().length === 0) {
        fullDisplayText = "Kedi bu soruya net bir cevap veremedi, biraz farklı ya da daha açık sorar mısın? 🐈";
        safeEnqueue(fullDisplayText);
      } else {
        safeEnqueue(tailFinal);
      }

      // Yanıt üretilmişse, client hâlâ bağlı olsa da olmasa da DAİMA kaydet
      // — kullanıcı sayfadan ayrılmış olabilir ama Kedi'nin cevabı kaybolmamalı.
      await saveKediMessage({
        actorType, studentId, role: "assistant",
        content: fullDisplayText, mood: mood ?? undefined,
      });

      safeEnqueue(`${KEDI_MOOD_DELIM}${mood ?? "calm"}`);

      // Hafıza güncelleme — ARTIK AYRI BİR LLM ÇAĞRISI DEĞİL, sadece Supabase
      // yazması (OpenRouter kotasını hiç tüketmiyor). Model bu turda hafıza
      // güncellemesi gerekmediğine karar verdiyse (çoğu tur) add/removeIds
      // boş gelir ve hiçbir DB işlemi yapılmaz.
      if (memAdd.length > 0 || memRemoveIds.length > 0) {
        await applyMemoryDelta(actorType, studentId, memAdd, memRemoveIds);
      }

      safeClose();
    },
    cancel() {
      // Consumer (fetch reader) iptal edildi — start() içindeki safeEnqueue
      // zaten try/catch ile korunuyor, burada ek bir şey yapmaya gerek yok.
    },
  });

  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8" } });
}
