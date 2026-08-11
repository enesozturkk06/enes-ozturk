/**
 * lib/kediPrograms.ts — Kedi AI Ultra: yapılandırılmış antrenman + beslenme programı
 *
 * Mevcut rule-tabanlı sistemlerden (lib/workout-generator.ts, lib/diet.ts) FARKLI
 * ve onları REPLACE ETMEYEN, katma bir modül: gerçek LLM muhakemesiyle spora özel
 * (kickboks/muay thai/boks/fitness), devamsızlık+performans farkındalıklı, aylık
 * ilerlemeli bir program üretir. Kalori/makro ARİTMETİĞİ modele bırakılmaz —
 * lib/health.ts (calcTDEE) ve lib/diet.ts (GOAL_KCAL_DELTA/GOAL_MACROS) ile
 * DETERMİNİSTİK hesaplanır, model sadece bu sayılara göre öğün/program kurar.
 * Bu hem daha güvenilir hem de mevcut "AI Diyet" sekmesiyle sayısal tutarlılık
 * sağlar (aynı öğrenci her yerde aynı kalori hedefini görür).
 */
import { getStudent, getKediProgramHistory } from "./db";
import { buildStudentDigest } from "./kediAi";
import { getHealthProfile, calcTDEE, type HealthProfile } from "./health";
import { GOAL_KCAL_DELTA, GOAL_MACROS, macrosFromCalories } from "./diet";
import { callOpenRouter, extractJsonResponse } from "./openrouter";
import { KEDI_AI_PROGRAM_MAX_TOKENS, OPENROUTER_TEXT_MODELS } from "./kediAiConfig";
import { SPORT_LABELS, GOAL_LABELS } from "./kediProgramLabels";
import type {
  KediSport, KediProgramGoal, KediProgram,
  KediProgramTrainingDay, KediProgramWeek, KediProgramMeal, KediProgramDayMeals, KediProgramAnalysis,
} from "./types";

export class KediProgramError extends Error {}

/* ── Spora özel yönlendirme ──────────────────────────────────────── */

const SPORT_GUIDANCE: Record<KediSport, string> = {
  kickboks: "Kickboks: yumruk teknikleri (jab, cross, hook, uppercut) + tekmeler (ön tekme, yan tekme, round kick), pad çalışması, ayak işi, kombinasyonlar.",
  muaythai: "Muay Thai: dirsek (elbow) ve diz (knee) vuruşları, klinç çalışması, teep, round kick — kickboksa göre dirsek/diz/klinç ağırlıklı olmalı, sekiz uzuv sanatını yansıt.",
  boks: "Boks: SADECE el teknikleri (jab, cross, hook, uppercut), ayak işi, kafa hareketleri (slip, bob-weave, roll). Tekme veya dirsek/diz tekniği KULLANMA — saf boks.",
  fitness: "Genel Fitness: dövüş sporu tekniği YOK — ağırlık antrenmanı, HIIT, kalistenik, kondisyon ve kas gelişimine odaklı fonksiyonel egzersizler.",
};

const SAFETY_RULES = `GÜVENLİK KURALLARI — KESİNLİKLE UYULACAK:
- Asla tıbbi teşhis koyma ("sakatlığın X hastalığıdır/yırtığıdır" gibi ifadeler YASAK).
- Riskli veya aşırı sağlık önerisi verme (aşırı düşük kalori, güvensiz açlık/detoks, aşırı hacimli antrenman YASAK).
- Kesin tedavi, ilaç veya takviye dozu önerisi sunma.
- "longTermMemory" alanında sakatlık/sağlık kısıtı geçiyorsa MUTLAKA dikkate al — riskli hareketten kaçın veya güvenli alternatif kullan, ama teşhis koyma.
- Ciddi bir sağlık riski ima eden bilgi varsa (şiddetli/kronik ağrı, tekrarlayan sakatlık vb.) "recommendations" listesine mutlaka "Bir sağlık uzmanına/fizyoterapiste danışmanı öneririm" tarzı bir madde ekle.
- Bu kurallar hem antrenman hem beslenme programı için geçerlidir.`;

const DEFAULT_SAFETY_NOTE =
  "Bu program bir antrenör asistanı tarafından bilgilendirme amacıyla oluşturulmuştur; tıbbi teşhis veya tedavi yerine geçmez. Sağlık sorunlarınız, sakatlık geçmişiniz veya beslenme kısıtlarınız için mutlaka bir doktor/diyetisyene danışın.";

/* ── Deterministik beslenme hedefi ───────────────────────────────── */

export interface NutritionBaseline {
  tdee: number; dailyCalories: number; protein: number; carbs: number; fat: number;
}

export function computeNutritionBaseline(profile: HealthProfile, goal: KediProgramGoal): NutritionBaseline {
  const tdee = calcTDEE(profile);
  const dailyCalories = Math.max(1200, tdee + GOAL_KCAL_DELTA[goal]);
  const macros = macrosFromCalories(dailyCalories, GOAL_MACROS[goal]);
  return { tdee, dailyCalories, ...macros };
}

/* ── JSON çıkarma + doğrulama (paylaşılan — bkz. lib/openrouter.ts) ─── */

function extractJson<T>(raw: string, truncated: boolean, requiredKeys: (keyof T)[]): T {
  return extractJsonResponse(raw, truncated, requiredKeys, "kediPrograms", (msg) => new KediProgramError(msg));
}

/* ── Antrenman + beslenme programı üretimi — TEK istekte birleşik ────
 * Önceden antrenman ve beslenme İKİ PARALEL OpenRouter çağrısıydı — program
 * üretimi başına istek sayısını ikiye katlıyordu. Artık TEK bir istekte,
 * TEK bir JSON çıktısında ikisi birden üretiliyor ("tek istekte
 * birleştirilebilecek analizleri birleştir" kuralı) — günlük 50 istek/gün
 * ücretsiz kotasını koruyan bir mimari karar. */

interface ProgramResponse {
  trainingDays: KediProgramTrainingDay[];
  monthlyProgression: KediProgramWeek[];
  analysis: KediProgramAnalysis;
  meals: KediProgramMeal[];
  weeklyMeals: KediProgramDayMeals[];
  shoppingList: string[];
}

function buildProgramPrompt(
  sport: KediSport, goal: KediProgramGoal, daysPerWeek: number,
  digest: Record<string, unknown>, profile: HealthProfile, baseline: NutritionBaseline,
): string {
  return `Sen "Kedi" adında profesyonel bir ${SPORT_LABELS[sport]} antrenörü VE spor beslenme asistanısın. Bu öğrenci için İKİ bölümü TEK seferde üret: (1) kişiselleştirilmiş, spora özel bir HAFTALIK antrenman programı + 4 HAFTALIK aylık ilerleme planı, (2) buna eşlik eden bir beslenme planı.

Spor dalı yönlendirmesi: ${SPORT_GUIDANCE[sport]}
Hedef: ${GOAL_LABELS[goal]}
Haftalık antrenman sıklığı: ${daysPerWeek} gün
Öğrenci profili: yaş ${profile.age}, cinsiyet ${profile.gender}, boy ${profile.height}cm, kilo ${profile.weight}kg, aktivite seviyesi ${profile.activityLevel}

Beslenme hedefleri ZATEN HESAPLANMIŞ, DEĞİŞTİRİLMEMESİ gereken sabit değerler — sen bunları KENDİN YENİDEN HESAPLAMA, sadece bu hedeflere uygun gerçekçi bir Türk mutfağı ağırlıklı öğün planı ve alışveriş listesi oluştur:
Günlük kalori hedefi (SABİT): ${baseline.dailyCalories} kcal
Günlük protein hedefi (SABİT): ${baseline.protein}g
Günlük karbonhidrat hedefi (SABİT): ${baseline.carbs}g
Günlük yağ hedefi (SABİT): ${baseline.fat}g

${SAFETY_RULES}

Öğrencinin devamsızlık, performans, seviye, hafıza (sağlık/tercih/alerji) ve önceki program verisi ("analysis" alanında ve beslenme tercihlerinde YORUMLA — devam durumu iyi/kötü mü, performans trendi nasıl, somut öneriler ver):
${JSON.stringify(digest)}

Antrenman gün planını (trainingDays) kurarken digest içindeki performance.technicalAverages / last5TechnicalAverages / last30DaysTrend alanlarını MUTLAKA dikkate al: en düşük teknik kategoriye (punch/kick/defense/conditioning) haftalık planda NORMALDEN FAZLA gün/egzersiz zamanı ayır, ama en güçlü kategoriyi programdan TAMAMEN çıkarma (en azından bir günde kısa bir egzersizle koru). technicalAverages null ise (yeterli ders verisi yok) dengeli standart bir dağılım kullan — ağırlıklandırma için veri UYDURMA.

SADECE şu JSON formatında cevap ver, başka HİÇBİR metin yazma (açıklama, giriş cümlesi, markdown kod bloğu işareti EKLEME):
{
  "trainingDays": [
    {"day": "Pazartesi", "focus": "kısa odak açıklaması", "exercises": [{"name": "...", "sets": "3", "reps": "12", "duration": "opsiyonel", "notes": "opsiyonel kısa not"}]}
  ],
  "monthlyProgression": [
    {"weekNumber": 1, "focus": "bu haftanın odağı", "intensityNote": "yoğunluk/hacim notu"}
  ],
  "analysis": {
    "attendanceSummary": "devamsızlık durumu hakkında 1-2 cümle",
    "performanceSummary": "performans trendi hakkında 1-2 cümle",
    "recommendations": ["somut öneri 1", "somut öneri 2"],
    "rationale": "Bu programı NEDEN bu şekilde kurduğunu 2-3 cümlede açıkla — yaş/boy/kilo/hedef/spor dalı, devamlılık, ders performansı, ÖNCEKİ PROGRAMLAR (varsa) ve gelişim/paket durumunu birlikte değerlendirerek somut gerekçe ver. Antrenöre yönelik, profesyonel bir dille."
  },
  "meals": [
    {"name": "Kahvaltı", "items": ["besin 1", "besin 2"], "calories": 0, "protein": 0, "carbs": 0, "fat": 0}
  ],
  "weeklyMeals": [
    {"day": "Pazartesi", "meals": [{"name": "Kahvaltı", "items": ["besin 1", "besin 2"], "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "alternative": ["benzer makrolu alternatif besin 1", "alternatif besin 2"]}]}
  ],
  "shoppingList": ["madde 1", "madde 2"]
}

trainingDays dizisinde TAM OLARAK ${daysPerWeek} gün olsun (haftanın günlerini kullan). monthlyProgression'da tam olarak 4 hafta olsun (weekNumber 1-4). Her günde 4-6 egzersiz olsun, spora ve hedefe uygun, gerçekçi ve uygulanabilir.

"meals": TEK, temsili bir günün öğün planı (3-5 öğün: Kahvaltı/Öğle/Akşam + varsa ara öğünler) — geriye dönük uyumluluk için var, "weeklyMeals"in İLK gününün BİREBİR AYNISI olsun.

"weeklyMeals": haftanın TAM 7 GÜNÜ için AYRI öğün planı (Pazartesi'den Pazar'a, gerçek gün isimleriyle). Her gün 3-5 öğün, her öğünün calories/protein/carbs/fat'ı olsun. GÜNLER ARASINDA GERÇEK ÇEŞİTLİLİK olsun (aynı öğünü 7 kez tekrarlama — farklı Türk mutfağı yemekleri/kahvaltılık seçenekleri kullan) ama HER GÜNÜN toplam kalori/makro'su verilen günlük hedeflere yakın kalsın (hedeften %10'dan fazla sapma). Her öğüne, o öğünle YAKLAŞIK AYNI makroyu veren 1-2 alternatif besin seçeneği ekle ("alternative" alanı) — öğrencinin elinde o malzeme yoksa veya sevmiyorsa değiştirebileceği gerçekçi bir seçenek.

shoppingList: weeklyMeals'daki TÜM 7 günün malzemelerini kapsayan, gruplu (ör. "Protein: ...", "Sebze: ...") ve tekrar etmeyen 15-25 maddelik bir market listesi olsun — sadece tek bir günün değil, haftanın tamamının alışverişi.`;
}

async function generateProgram(
  sport: KediSport, goal: KediProgramGoal, daysPerWeek: number,
  digest: Record<string, unknown>, profile: HealthProfile, baseline: NutritionBaseline,
): Promise<ProgramResponse> {
  const prompt = buildProgramPrompt(sport, goal, daysPerWeek, digest, profile, baseline);
  const { content, truncated } = await callOpenRouter(
    [{ role: "user", content: prompt }], { maxTokens: KEDI_AI_PROGRAM_MAX_TOKENS, model: OPENROUTER_TEXT_MODELS },
  );
  return extractJson<ProgramResponse>(
    content, truncated, ["trainingDays", "monthlyProgression", "analysis", "meals", "weeklyMeals", "shoppingList"],
  );
}

/* ── Ana orkestrasyon ─────────────────────────────────────────────── */

export interface GenerateProgramOptions {
  studentId: string; sport: KediSport; goal: KediProgramGoal; daysPerWeek: number;
}

/**
 * Tam program ÜRETİR (kaydetmez — kaydetme kararı çağırana ait: öğrencinin
 * kendi ürettiği program doğrudan yayınlanır, antrenörün Koç Merkezi'nden
 * ürettiği taslak olarak kalır, bkz. lib/db.ts insertKediProgramVersion).
 * Antrenman ve beslenme TEK bir LLM çağrısında birlikte üretilir (bkz.
 * generateProgram) — başarısız olursa (truncated/geçersiz JSON)
 * KediProgramError fırlatılır — çağıran taraf (API route) bunu kullanıcıya
 * net bir hata mesajı olarak döner, yarım/güvenilmez bir program asla
 * üretilmiş sayılmaz.
 */
export async function generateKediProgram(opts: GenerateProgramOptions): Promise<KediProgram> {
  const { studentId, sport, goal, daysPerWeek } = opts;

  const [student, profile, history] = await Promise.all([
    getStudent(studentId), getHealthProfile(studentId), getKediProgramHistory(studentId),
  ]);
  if (!student) throw new KediProgramError("Öğrenci bulunamadı.");
  if (!profile) {
    throw new KediProgramError(
      "Program oluşturmadan önce Sağlık sayfasından boy/kilo/yaş/aktivite seviyeni kaydetmelisin.",
    );
  }

  // Devamsızlık + performans + uzun vadeli hafıza (sakatlık/tercih vb.) —
  // mevcut chat digest'iyle AYNI fonksiyon, duplike edilmiyor. buildStudentDigest
  // longTermMemory'yi zaten içeriyor (bkz. lib/kediAi.ts). Önceki programların
  // kısa özeti de eklenir — "rationale" bunlara atıfta bulunabilsin diye.
  const digest = {
    ...await buildStudentDigest(studentId),
    previousPrograms: history.slice(0, 5).map(p => ({
      version: p.version, sport: p.sport, goal: p.goalType,
      status: p.status, createdBy: p.createdBy, date: p.createdAt,
    })),
  };
  const baseline = computeNutritionBaseline(profile, goal);

  const result = await generateProgram(sport, goal, daysPerWeek, digest, profile, baseline);

  const program: KediProgram = {
    studentId, sport, goalType: goal,
    dailyCalories: baseline.dailyCalories, proteinG: baseline.protein, carbsG: baseline.carbs, fatG: baseline.fat,
    trainingDays: result.trainingDays,
    monthlyProgression: result.monthlyProgression,
    analysis: result.analysis,
    meals: result.meals,
    weeklyMeals: result.weeklyMeals,
    shoppingList: result.shoppingList,
    safetyNote: DEFAULT_SAFETY_NOTE,
  };

  return program;
}
