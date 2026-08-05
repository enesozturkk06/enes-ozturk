/**
 * lib/openrouter.ts — OpenRouter için ince, yeniden kullanılabilir istemci.
 * Kedi AI'nin tüm modülleri (sohbet, hafıza çıkarımı, ileride beslenme/
 * tahmin/strateji modülleri) buradan geçer — model ve endpoint tek yerde
 * (`lib/kediAiConfig.ts`) tanımlı, hiçbir çağıran dosya URL/model hardcode
 * etmez.
 */
import {
  OPENROUTER_API_URL, OPENROUTER_MODEL, OPENROUTER_SITE_URL, OPENROUTER_APP_NAME,
} from "./kediAiConfig";

/** Görsel içerik parçası — OpenAI/OpenRouter uyumlu vision mesaj formatı.
 * `image_url.url` hem "data:image/jpeg;base64,..." hem de gerçek bir http(s)
 * URL'i olabilir; Kedi AI Vision, öğrenci/antrenörün Supabase Storage'a
 * yüklediği görselin base64'ünü kullanır (bkz. lib/kediVision.ts). */
export type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string | OpenRouterContentPart[];
};

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export function hasOpenRouterKey(): boolean {
  return !!OPENROUTER_API_KEY;
}

function headers(): Record<string, string> {
  return {
    "content-type": "application/json",
    "authorization": `Bearer ${OPENROUTER_API_KEY}`,
    "HTTP-Referer": OPENROUTER_SITE_URL,
    "X-Title": OPENROUTER_APP_NAME,
  };
}

/**
 * Akan (streaming) tamamlama — sohbet yanıtı için. `onDelta` her metin
 * parçası geldiğinde çağrılır. SSE satırlarını ayrıştırıp sadece
 * `choices[0].delta.content`'i dışarı verir; keep-alive yorumlarını
 * (":") ve bölünmüş JSON parçalarını sessizce yoksayar.
 *
 * `opts.models` sıralı bir ücretsiz model listesi verilirse: bir model
 * hiç içerik akıtmadan başarısız olursa (429/5xx/bağlantı hatası) otomatik
 * olarak sıradaki denenir. İçerik akmaya BAŞLADIKTAN sonra bir hata olursa
 * artık başka modele geçilmez (yarım kalan cevabı farklı bir modelle
 * tamamlamaya çalışmak karışık/tutarsız bir metin üretir) — bu durumda
 * hata olduğu gibi yukarı fırlatılır, çağıran taraf (chat route) zaten
 * bunu kullanıcıya nazik bir "tekrar dener misin" mesajıyla karşılıyor.
 */
export async function streamOpenRouterChat(
  messages: OpenRouterMessage[],
  onDelta: (delta: string) => void,
  opts?: { maxTokens?: number; models?: string[] },
): Promise<void> {
  const candidates = opts?.models?.length ? opts.models : [OPENROUTER_MODEL];
  let lastErr: unknown = null;

  for (const model of candidates) {
    let startedStreaming = false;
    try {
      const upstream = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          model, messages, stream: true,
          max_tokens: opts?.maxTokens ?? 2048,
        }),
      });

      if (!upstream.ok || !upstream.body) {
        const errText = await upstream.text().catch(() => "");
        throw new Error(`OpenRouter ${upstream.status}: ${errText.slice(0, 300)}`);
      }

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      outer: for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line || line.startsWith(":")) continue; // boş satır / SSE keep-alive yorumu
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") break outer;
          try {
            const json = JSON.parse(payload);
            const delta: string = json?.choices?.[0]?.delta?.content ?? "";
            if (delta) { startedStreaming = true; onDelta(delta); }
          } catch { /* ara sıra bölünmüş JSON parçası — yoksay */ }
        }
      }
      return; // başarılı — zincire devam etme
    } catch (err) {
      lastErr = err;
      if (startedStreaming) throw err;
      // aksi halde sıradaki ücretsiz modeli dene
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Tüm ücretsiz modeller başarısız oldu.");
}

export interface OpenRouterCompletion {
  content: string;
  /** true ise model max_tokens'a çarpıp yarıda kesildi — reasoning-üreten
   * modellerde bu genelde cevabın "düşünme" kısmında takılıp kaldığı, asıl
   * içeriğe hiç ulaşamadığı anlamına gelir. Çağıran taraf bu durumda
   * `content`'i KULLANMAMALI (yarım/güvenilmez metin) — sessizce atlamalı. */
  truncated: boolean;
}

/**
 * Tek seferlik (streaming olmayan) çağrı — arka plan görevleri için (proaktif
 * özet, program üretimi, Kedi AI Vision fotoğraf/video analizi). `opts.model`
 * bir dizi verilirse sırayla denenir — biri 429/5xx/hata verirse otomatik
 * olarak sıradaki ücretsiz modele geçilir (tek model verilirse eskisi gibi
 * tek seferlik davranır).
 */
export async function callOpenRouter(
  messages: OpenRouterMessage[],
  opts?: { maxTokens?: number; model?: string | string[] },
): Promise<OpenRouterCompletion> {
  const candidates = Array.isArray(opts?.model)
    ? (opts.model.length ? opts.model : [OPENROUTER_MODEL])
    : [opts?.model ?? OPENROUTER_MODEL];

  let lastErr: unknown = null;
  for (const model of candidates) {
    try {
      const res = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          model, messages,
          max_tokens: opts?.maxTokens ?? 400,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 300)}`);
      }

      const json = await res.json();
      const choice = json?.choices?.[0];
      return {
        content: choice?.message?.content ?? "",
        truncated: choice?.finish_reason === "length",
      };
    } catch (err) {
      lastErr = err;
      // sıradaki ücretsiz modeli dene
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Tüm ücretsiz modeller başarısız oldu.");
}
