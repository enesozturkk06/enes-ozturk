/**
 * lib/kediAiConfig.ts — Kedi AI Ultra model konfigürasyonu
 *
 * Tüm proje OpenRouter (https://openrouter.ai) üzerinden çalışır — tek bir
 * API ile onlarca sağlayıcının modeline erişilebiliyor. Şu an ÜCRETSİZ
 * (":free" uzantılı) modeller kullanıyoruz.
 *
 * ══════════════════════════════════════════════════════════════════
 * KATI KURAL (kullanıcı tarafından açıkça belirtildi): Kedi AI'nin temel
 * prensibi TAMAMEN ÜCRETSİZ çalışmasıdır. OpenRouter hesabına ASLA kredi
 * eklenmeyecek. Ücretsiz katman günde 50 istek/anahtar ile sınırlı — bu
 * yüzden her modül (sohbet, hafıza, brief, program, vision) bu sınırı
 * gözeterek tasarlandı: gereksiz/arka plan çağrısı yok, tek istekte
 * birleştirilebilecek analizler birleştirildi, modelin kendisi çöktüğünde/
 * aşırı yüklendiğinde (429/5xx) SIRADAKİ ÜCRETSİZ modele otomatik geçilir
 * (bkz. OPENROUTER_TEXT_MODELS / OPENROUTER_VISION_MODELS) — bu, günlük
 * TOPLAM istek tavanını YÜKSELTMEZ (o anahtara bağlı), sadece tek bir
 * modelin geçici tıkanıklığına karşı dayanıklılık sağlar.
 *
 * İleride ücretli/daha güçlü bir modele geçmek istersen SADECE
 * `OPENROUTER_MODEL` değerini OpenRouter'daki model id'siyle değiştir —
 * ama bu KASITLI bir kullanıcı kararı olmalı, otomatik/varsayılan DEĞİL.
 * ══════════════════════════════════════════════════════════════════
 */

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Varsayılan (birincil) metin modeli — ücretsiz katman. */
export const OPENROUTER_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

/**
 * Sohbet/hafıza/program gibi SADECE METİN görevleri için sıralı ücretsiz
 * model listesi. İlk model 429 (rate limit) veya 5xx/timeout ile başarısız
 * olursa otomatik olarak sıradaki denenir (bkz. lib/openrouter.ts) —
 * TAMAMEN ücretsiz modeller arasında, asla ücretli bir modele düşülmez.
 * Farklı sağlayıcılardan (nvidia, openai-oss) seçildi ki tek bir
 * sağlayıcının tıkanıklığı tüm zinciri bloklamasın.
 */
export const OPENROUTER_TEXT_MODELS: string[] = [
  OPENROUTER_MODEL,
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "openai/gpt-oss-20b:free",
];

/** OpenRouter'ın istek başlıklarında önerdiği kimlik bilgileri (opsiyonel ama tavsiye edilir). */
export const OPENROUTER_SITE_URL = "https://enes-ozturk.vercel.app";
export const OPENROUTER_APP_NAME = "Kedi AI - EO OS";

/** Ana sohbet yanıtı için token bütçesi. Hafıza çıkarımı ARTIK ayrı bir
 * çağrı değil — model bu bütçe içinde cevabıyla BİRLİKTE görünmez bir
 * hafıza-güncelleme işaretleyicisi de üretir (bkz. lib/kediAi.ts,
 * MEMORY_MARKER_REGEX). Bu sayede sohbet başına 2 istek yerine 1 istek
 * yapılır — günlük 50 isteklik ücretsiz kotanın en çok tüketen kalemiydi. */
export const KEDI_AI_MAX_TOKENS = 4096;

/**
 * Proaktif özet ("brief") için token bütçesi.
 *
 * ÖNEMLİ: OPENROUTER_MODEL "reasoning" (düşünme zinciri) üreten bir model —
 * bu düşünme, `completion_tokens` bütçesinden düşer ve gerçek cevaptan ÖNCE
 * tüketilir. Bütçe çok düşük tutulursa model "düşünürken" tükenir ve asıl
 * cevabı hiç üretemeden `finish_reason: "length"` ile kesilir — ölçülen bir
 * örnekte 300 token bütçesinin 276'sı sadece düşünmeye gitmişti. Ayrıca
 * brief artık kural-tabanlı bir ön-filtreden geçmeden ASLA çağrılmıyor
 * (bkz. hasNotableBriefSignal — gerçek bir risk/fırsat sinyali yoksa AI'ya
 * hiç gidilmiyor, günlük istek sayısını daha da azaltıyor).
 */
export const KEDI_AI_BRIEF_MAX_TOKENS = 900;

/**
 * Yapılandırılmış antrenman + beslenme programı üretimi (lib/kediPrograms.ts).
 * Antrenman ve beslenme TEK bir istekte, TEK bir JSON çıktısında birlikte
 * üretilir (önceden 2 paralel çağrıydı — istek sayısını yarıya indirmek ve
 * "tek istekte birleştirilebilecek analizleri birleştir" kuralına uymak
 * için birleştirildi). Tek çağrıda iki bölüm birden üretileceği için bütçe
 * cömert tutuluyor (maliyet $0, ücretsiz katmandayız).
 * 8000 → 12000: "weeklyMeals" (7 GÜNÜN AYRI öğün planı, önceden tek temsili
 * gündü) eklenince çıktı boyutu belirgin arttı — bütçe artırılmazsa
 * "reasoning" modelinin düşünme+JSON çıktısı budanma (truncated) riski
 * yükselir (bkz. yukarıdaki KEDI_AI_BRIEF_MAX_TOKENS yorumundaki ölçülmüş
 * örnek — düşük bütçe düşünmeye gidip asıl cevaba hiç ulaşamayabiliyor).
 */
export const KEDI_AI_PROGRAM_MAX_TOKENS = 12000;

/**
 * Kedi AI Vision — fotoğraf/video teknik analizi için AYRI bir model listesi.
 * OPENROUTER_MODEL (varsayılan sohbet modeli) SADECE metin girdisi destekliyor
 * — görüntü gönderildiğinde ya hata verir ya da görseli sessizce yoksayar.
 * Bu yüzden vision için OpenRouter kataloğunda görüntü girdisi destekleyen
 * (`architecture.input_modalities` içinde "image") modeller seçildi ve
 * birincil aday gerçek bir kickboks/muay thai fotoğrafıyla canlı test edildi
 * (tutarlı Türkçe çıktı + geçerli JSON üretti). Kataloğun tek "vision"
 * etiketli ücretsiz modeli olan nvidia/nemotron-3.5-content-safety:free
 * sadece "safe/unsafe" döndüren bir içerik moderasyon sınıflandırıcısı
 * olduğu için KULLANILMADI — teknik analiz için uygun değil.
 *
 * Liste boş bırakılırsa Vision API route'u 503 ile net bir Türkçe hata
 * döner — ASLA otomatik olarak ücretli bir modele düşmez.
 */
export const OPENROUTER_VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";

export const OPENROUTER_VISION_MODELS: string[] = [
  OPENROUTER_VISION_MODEL,
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
];

/** Fotoğraf analizi — tek görsel + JSON skor/itemli çıktı. */
export const KEDI_VISION_PHOTO_MAX_TOKENS = 3500;
/** Video analizi — birden fazla kare (frame) aynı istekte, daha uzun çıktı. */
export const KEDI_VISION_VIDEO_MAX_TOKENS = 4500;
