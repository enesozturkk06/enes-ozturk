/**
 * lib/kediVision.ts — Kedi AI Vision: fotoğraf/video teknik analizi
 *
 * Öğrenci veya antrenör bir kickboks/muay thai/boks fotoğrafı ya da kısa bir
 * video yükler; AI gard duruşu, ayak pozisyonu, yumruk tekniği, omuz
 * pozisyonu, kalça rotasyonu, denge ve vücut hizasını değerlendirir (video
 * için kare kare, jab/cross/hook/uppercut/tekme/diz/dirsek teknikleri
 * bazında), 0-100 teknik skor + kategori kırılımı (Gard/Hız/Güç/Denge/Ayak
 * Çalışması/Rotasyon/Savunma) verir, önceki analizlerle karşılaştırır ve
 * güçlü yön/geliştirilecek yön/ev ödevi/haftalık plan üretir.
 *
 * ÜCRETSİZ KOTA KORUMASI: aynı görsel iki kez analiz edilmeye çalışılırsa
 * (media_hash eşleşmesi) AI TEKRAR ÇAĞRILMAZ — önceki sonuç doğrudan
 * döndürülür (bkz. lib/db.ts getKediVisionAnalysisByHash). Fotoğraf VE
 * video analizi her biri TEK bir OpenRouter çağrısıdır (video için tüm
 * kareler aynı istekte gönderilir, kare başına ayrı çağrı YAPILMAZ).
 */
import { createHash } from "crypto";
import { getStudent, getKediVisionAnalyses, getKediVisionAnalysisByHash } from "./db";
import { callOpenRouter, extractJsonResponse, type OpenRouterContentPart } from "./openrouter";
import { OPENROUTER_VISION_MODELS, KEDI_VISION_PHOTO_MAX_TOKENS, KEDI_VISION_VIDEO_MAX_TOKENS } from "./kediAiConfig";
import type {
  KediVisionAnalysis, KediVisionMediaType, KediVisionCategoryScores,
  KediVisionDeficiency, KediVisionCoachNotes, KediProgramCreatedBy,
} from "./types";

export class KediVisionError extends Error {}

const SAFETY_RULES_VISION = `GÜVENLİK KURALLARI — KESİNLİKLE UYULACAK:
- Asla tıbbi teşhis koyma (bir duruşu/hareketi "sakatlanmışsın" gibi yorumlama YASAK — sadece TEKNİK gözlem yap).
- Ağrı/sakatlık ima eden bir duruş görürsen "bir sağlık uzmanına/fizyoterapiste danışması önerilir" tarzı NÖTR bir not ekle, kesin tıbbi yorum yapma.
- Sadece fotoğraf/videoda GERÇEKTEN GÖRDÜĞÜN şeyleri anlat, uydurma veya varsayımda bulunma.`;

const DEFAULT_VISION_SAFETY_NOTE =
  "Bu analiz bir antrenör asistanı tarafından bilgilendirme amacıyla oluşturulmuştur; profesyonel bir antrenörün gözlemlerinin veya tıbbi değerlendirmenin yerine geçmez.";

/* ── JSON çıkarma + doğrulama (paylaşılan — bkz. lib/openrouter.ts) ──── */

function extractJson<T>(raw: string, truncated: boolean, requiredKeys: (keyof T)[]): T {
  return extractJsonResponse(raw, truncated, requiredKeys, "kediVision", (msg) => new KediVisionError(msg));
}

interface VisionResponse {
  overallScore: number;
  categories: KediVisionCategoryScores;
  deficiencies: KediVisionDeficiency[];
  coachNotes: KediVisionCoachNotes;
  progressNote: string;
  rawSummary: string;
}

const RESPONSE_FORMAT_BLOCK = `SADECE şu JSON formatında cevap ver, başka HİÇBİR metin/markdown yazma:
{
  "overallScore": 0-100 arası tam sayı,
  "categories": {"gard": 0-100, "hiz": 0-100, "guc": 0-100, "denge": 0-100, "ayakCalismasi": 0-100, "rotasyon": 0-100, "savunma": 0-100},
  "deficiencies": [{"area": "örn. Gard Duruşu", "issue": "somut sorun açıklaması", "fix": "nasıl düzeltileceği"}],
  "coachNotes": {"strengths": ["..."], "improvements": ["..."], "homework": ["..."], "weeklyPlan": ["..."]},
  "progressNote": "önceki analizlerle karşılaştıran 1-2 cümle (örn: '3 hafta önce gardın daha açıktı, şimdi çok daha iyi.') — önceki analiz yoksa boş string",
  "rawSummary": "genel değerlendirme, 2-3 cümle"
}

deficiencies dizisinde TESPİT EDİLEN sorunlu unsurları itemize et (en az 2, en fazla 6 madde) — bir unsur zaten iyiyse deficiencies'e ekleme, sadece coachNotes.strengths'e ekle.`;

function buildPreviousAnalysesBlock(previous: { createdAt?: string; mediaType: KediVisionMediaType; overallScore: number; rawSummary: string }[]): string {
  if (previous.length === 0) return "Bu öğrencinin İLK analizi — önceki karşılaştırma yok, progressNote'u boş string bırak.";
  const list = previous.slice(0, 3).map(a => `- [${a.createdAt ?? "?"}] (${a.mediaType}, skor: ${a.overallScore}) ${a.rawSummary}`).join("\n");
  return `Bu öğrencinin ÖNCEKİ analizleri (en yeniden eskiye, gelişim karşılaştırması için kullan):\n${list}`;
}

function buildPhotoPrompt(previousBlock: string): string {
  return `Sen "Kedi" adında profesyonel bir dövüş sporları (kickboks/muay thai/boks) teknik analisti AI'sın. Aşağıdaki fotoğrafta bir sporcunun duruşu var. Şu unsurları TEK TEK analiz et: gard duruşu, ayak pozisyonu, yumruk tekniği, omuz pozisyonu, kalça rotasyonu, denge, vücut hizası.

${SAFETY_RULES_VISION}

${previousBlock}

${RESPONSE_FORMAT_BLOCK}`;
}

function buildVideoPrompt(previousBlock: string, frameCount: number): string {
  return `Sen "Kedi" adında profesyonel bir dövüş sporları (kickboks/muay thai/boks) teknik analisti AI'sın. Aşağıda bir antrenman videosundan alınmış ${frameCount} ardışık kare var (zaman sırasına göre). Kareleri KARE KARE incele ve şu tekniklerden hangileri görünüyorsa onları değerlendir: jab, cross, hook, uppercut, ön tekme/low kick, orta tekme, yüksek tekme, diz, dirsek.

${SAFETY_RULES_VISION}

${previousBlock}

${RESPONSE_FORMAT_BLOCK}
deficiencies alanındaki "area" değerleri, videoda GÖRDÜĞÜN somut teknik isimleri olsun (örn. "Cross", "Orta Tekme").`;
}

function toAnalysis(
  studentId: string, mediaType: KediVisionMediaType, mediaUrl: string,
  createdBy: KediProgramCreatedBy, parsed: VisionResponse,
): KediVisionAnalysis {
  return {
    studentId, mediaType, mediaUrl,
    overallScore: parsed.overallScore, categories: parsed.categories,
    deficiencies: parsed.deficiencies, coachNotes: parsed.coachNotes,
    progressNote: parsed.progressNote || undefined,
    rawSummary: parsed.rawSummary || DEFAULT_VISION_SAFETY_NOTE,
    createdBy,
  };
}

/** Fotoğraf/video base64 veri URL'lerinden deterministik bir önbellek anahtarı
 * üretir — aynı görsel(ler) tekrar gönderilirse AI'ya hiç gidilmez. */
function hashMedia(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export interface AnalyzePhotoOptions {
  studentId: string; imageDataUrl: string; createdBy: KediProgramCreatedBy;
}

export async function analyzeKediVisionPhoto(opts: AnalyzePhotoOptions): Promise<{ analysis: KediVisionAnalysis; cached: boolean }> {
  const student = await getStudent(opts.studentId);
  if (!student) throw new KediVisionError("Öğrenci bulunamadı.");

  const mediaHash = hashMedia([opts.imageDataUrl]);
  const cached = await getKediVisionAnalysisByHash(opts.studentId, mediaHash);
  if (cached) return { analysis: cached, cached: true };

  const previous = await getKediVisionAnalyses(opts.studentId);
  const prompt = buildPhotoPrompt(buildPreviousAnalysesBlock(previous));

  const content: OpenRouterContentPart[] = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: opts.imageDataUrl } },
  ];
  const { content: raw, truncated } = await callOpenRouter(
    [{ role: "user", content }], { maxTokens: KEDI_VISION_PHOTO_MAX_TOKENS, model: OPENROUTER_VISION_MODELS },
  );
  const parsed = extractJson<VisionResponse>(raw, truncated, ["overallScore", "categories", "deficiencies", "coachNotes", "rawSummary"]);

  return {
    analysis: toAnalysis(opts.studentId, "photo", "", opts.createdBy, parsed),
    cached: false,
  };
}

export interface AnalyzeVideoOptions {
  studentId: string; frameDataUrls: string[]; createdBy: KediProgramCreatedBy;
}

export async function analyzeKediVisionVideo(opts: AnalyzeVideoOptions): Promise<{ analysis: KediVisionAnalysis; cached: boolean }> {
  if (opts.frameDataUrls.length === 0) throw new KediVisionError("Video karesi bulunamadı.");
  const student = await getStudent(opts.studentId);
  if (!student) throw new KediVisionError("Öğrenci bulunamadı.");

  const mediaHash = hashMedia(opts.frameDataUrls);
  const cached = await getKediVisionAnalysisByHash(opts.studentId, mediaHash);
  if (cached) return { analysis: cached, cached: true };

  const previous = await getKediVisionAnalyses(opts.studentId);
  const prompt = buildVideoPrompt(buildPreviousAnalysesBlock(previous), opts.frameDataUrls.length);

  const content: OpenRouterContentPart[] = [{ type: "text", text: prompt }];
  opts.frameDataUrls.forEach((frame, i) => {
    content.push({ type: "text", text: `Kare ${i + 1}:` });
    content.push({ type: "image_url", image_url: { url: frame } });
  });

  const { content: raw, truncated } = await callOpenRouter(
    [{ role: "user", content }], { maxTokens: KEDI_VISION_VIDEO_MAX_TOKENS, model: OPENROUTER_VISION_MODELS },
  );
  const parsed = extractJson<VisionResponse>(raw, truncated, ["overallScore", "categories", "deficiencies", "coachNotes", "rawSummary"]);

  return {
    analysis: toAnalysis(opts.studentId, "video", "", opts.createdBy, parsed),
    cached: false,
  };
}

export { hashMedia, DEFAULT_VISION_SAFETY_NOTE };
