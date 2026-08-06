/**
 * lib/kediAi.ts — Kedi AI Ultra
 * Öğrenci/admin "digest" (bağlam özeti) oluşturucular + system prompt.
 * Gerçek OpenRouter çağrısı app/api/kedi-ai/chat/route.ts içinde yapılır —
 * bu dosya sadece veri toplama ve prompt inşası içerir, ağ çağrısı yapmaz.
 */
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import type { KediAiActorType, KediAiMessage, KediAiMemory } from "./types";
import {
  getStudent, getStudents, getAppointments, getLessonRecords,
  getPayments, getIncomeMovements, getGymReports, getAllXPAdjustments,
  getKediMemories, saveKediMemories, deleteKediMemories,
} from "./db";
import {
  computeKpis, buildRevenueSeries, computeBottomStats, computeGymPerformance,
  rankTopPayingStudents, computePaymentStatusBreakdown, getRangeBounds,
} from "./financeCenter";
import { computeFullXP, getCurrentSeason, sumManualXP } from "./xp";
import { computeBadges } from "./badges";
import { getWeightLogs } from "./health";
import { getEvolutionTier, getWeightTrend, getRecentlyUnlockedCosmetics } from "./avatarEvolution";

const today = () => format(new Date(), "yyyy-MM-dd");

/* ── Öğrenci digest'i ──────────────────────────────────────────── */

export async function buildStudentDigest(studentId: string): Promise<Record<string, unknown>> {
  const [student, appointments, lessonRecords, xpAdjustments, memories, weightLogs] = await Promise.all([
    getStudent(studentId),
    getAppointments({ studentId }),
    getLessonRecords(studentId),
    getAllXPAdjustments(),
    getKediMemories("student", studentId),
    getWeightLogs(studentId, 90).catch(() => []),
  ]);

  if (!student) return { error: "Öğrenci bulunamadı" };

  const upcoming = appointments
    .filter(a => a.status === "onaylandi" && a.date >= today())
    .slice(0, 5)
    .map(a => ({ date: a.date, time: a.startTime, lessonType: a.lessonType }));

  const recentLessons = lessonRecords.slice(0, 8).map(l => ({
    date: l.date, conditioning: l.conditioning, punch: l.punch, kick: l.kick,
    defense: l.defense, combination: l.combination, sparring: l.sparring,
    overall: l.overall, trainerNotes: l.trainerNotes,
  }));

  const avgOverall = lessonRecords.length > 0
    ? Math.round(lessonRecords.reduce((s, l) => s + l.overall, 0) / lessonRecords.length)
    : null;

  const completedCount = appointments.filter(a => a.status === "tamamlandi").length;
  const cancelledCount = appointments.filter(a => a.status === "iptal").length;

  const studentXpAdjustments = xpAdjustments.filter(x => x.studentId === studentId);
  const totalXp = studentXpAdjustments.reduce((s, x) => s + x.amount, 0);

  const daysUntilPackageEnd = student.packageEndDate
    ? differenceInCalendarDays(parseISO(student.packageEndDate), new Date())
    : null;

  // Kedi Avatar Sistemi — evrim/kozmetik durumu, mevcut XP/rozet motorundan
  // türetilir (yeni bir AI çağrısı/route YOK, sadece dijeste bir alan —
  // Kedi normal sohbet sırasında bunu doğal olarak referans alabilir).
  const sortedRecords = [...lessonRecords].sort((a, b) => b.date.localeCompare(a.date));
  const fullXpSummary = computeFullXP(student.completedLessons, appointments, sortedRecords, getCurrentSeason(), studentXpAdjustments);
  const lifetimeXp = fullXpSummary.lifetimeResult.breakdown.total;
  const evolutionTier = getEvolutionTier(lifetimeXp);
  const badges = computeBadges(student, appointments, sortedRecords, {}, sumManualXP(studentXpAdjustments));
  const weightTrend = getWeightTrend(weightLogs);
  const recentlyUnlockedCosmetics = getRecentlyUnlockedCosmetics(badges);

  return {
    student: {
      fullName: student.fullName, level: student.level, packageType: student.packageType,
      paymentStatus: student.paymentStatus, remainingLessons: student.remainingLessons,
      completedLessons: student.completedLessons, packageEndDate: student.packageEndDate,
      daysUntilPackageEnd, isActive: student.isActive,
    },
    performance: { averageOverallScore: avgOverall, recentLessons },
    attendance: { completedCount, cancelledCount, upcomingAppointments: upcoming },
    xp: { total: totalXp },
    avatarEvolution: {
      tierName: evolutionTier.level.name, tierIndex: evolutionTier.tierIndex,
      weightTrend, recentlyUnlockedCosmetics,
    },
    longTermMemory: memories.map(m => m.fact),
    today: today(),
  };
}

/* ── Admin (antrenör) digest'i ────────────────────────────────────── */

export async function buildAdminDigest(): Promise<Record<string, unknown>> {
  const [students, appointments, allLessonRecords, payments, movements, gymReports, memories] = await Promise.all([
    getStudents(), getAppointments(), getLessonRecords(), getPayments(),
    getIncomeMovements(), getGymReports(), getKediMemories("admin"),
  ]);

  const activeStudents = students.filter(s => s.isActive);

  // Risk sinyalleri: paket bitişi yakın, ödeme gecikmiş, son 14 günde dersi olmayan
  const lastLessonByStudent = new Map<string, string>();
  for (const a of appointments) {
    if (a.status !== "tamamlandi") continue;
    const cur = lastLessonByStudent.get(a.studentId);
    if (!cur || a.date > cur) lastLessonByStudent.set(a.studentId, a.date);
  }

  const riskStudents = activeStudents
    .map(s => {
      const daysUntilEnd = s.packageEndDate ? differenceInCalendarDays(parseISO(s.packageEndDate), new Date()) : null;
      const lastLesson = lastLessonByStudent.get(s.id);
      const daysSinceLastLesson = lastLesson ? differenceInCalendarDays(new Date(), parseISO(lastLesson)) : null;
      let riskScore = 0;
      if (daysUntilEnd !== null && daysUntilEnd <= 7) riskScore += 3;
      if (s.paymentStatus === "kismi" || s.paymentStatus === "beklemede") riskScore += 2;
      if (daysSinceLastLesson !== null && daysSinceLastLesson >= 14) riskScore += 3;
      if (s.remainingLessons <= 2) riskScore += 1;
      return {
        fullName: s.fullName, level: s.level, paymentStatus: s.paymentStatus,
        remainingLessons: s.remainingLessons, packageEndDate: s.packageEndDate,
        daysUntilPackageEnd: daysUntilEnd, daysSinceLastLesson, riskScore,
      };
    })
    .filter(s => s.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 20);

  // Bireysel öğrenci ders performansı özeti (kimin gelişmediğini sormak için)
  const performanceByStudent = new Map<string, { name: string; scores: number[] }>();
  for (const l of allLessonRecords) {
    const student = students.find(s => s.id === l.studentId);
    if (!student) continue;
    const cur = performanceByStudent.get(l.studentId) ?? { name: student.fullName, scores: [] };
    cur.scores.push(l.overall);
    performanceByStudent.set(l.studentId, cur);
  }
  const performanceSummary = Array.from(performanceByStudent.values())
    .filter(p => p.scores.length >= 2)
    .map(p => {
      const recent = p.scores.slice(0, 3);
      const older = p.scores.slice(3, 6);
      const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((s, v) => s + v, 0) / older.length : null;
      return {
        name: p.name, lessonCount: p.scores.length,
        recentAverageScore: Math.round(recentAvg),
        trend: olderAvg !== null ? Math.round(recentAvg - olderAvg) : null,
      };
    })
    .sort((a, b) => (a.trend ?? 0) - (b.trend ?? 0)) // en çok geriye gidenler önce
    .slice(0, 15);

  const kpis = computeKpis(movements, payments, students, "month");
  const bounds = getRangeBounds("month");
  const revenueSeries = buildRevenueSeries(movements, bounds.from, bounds.to, "day");
  const bottomStats = computeBottomStats(appointments, movements, gymReports);
  const gymPerformance = computeGymPerformance(gymReports).map(g => ({
    gymName: g.gym.name, totalRevenue: g.totalRevenue, totalLessons: g.totalLessons,
    sharePctOfTotal: Math.round(g.sharePctOfTotal),
  }));
  const topStudents = rankTopPayingStudents(movements, appointments, 8);
  const paymentBreakdown = computePaymentStatusBreakdown(students);

  const emptySlotsHint = bottomStats.busiestHour
    ? `En yoğun saat ${bottomStats.busiestHour}, en yoğun gün ${bottomStats.busiestDay}.`
    : undefined;

  return {
    overview: {
      activeStudentCount: activeStudents.length, totalStudentCount: students.length,
      today: today(),
    },
    finance: {
      thisMonthKpis: kpis, revenueSeriesThisMonth: revenueSeries.slice(-14),
      bottomStats, gymPerformance, topPayingStudents: topStudents, paymentBreakdown,
      emptySlotsHint,
    },
    riskStudents,
    performanceTrends: performanceSummary,
    longTermMemory: memories.map(m => m.fact),
  };
}

/* ── System prompt ────────────────────────────────────────────────── */

const MOOD_OPTIONS = ["happy", "serious", "motivating", "calm", "funny"] as const;
export type KediMood = typeof MOOD_OPTIONS[number];
export const MOOD_MARKER_REGEX = /<!--mood:(happy|serious|motivating|calm|funny)-->\s*$/;

export function extractMood(fullText: string): { text: string; mood: KediMood | null } {
  const match = fullText.match(MOOD_MARKER_REGEX);
  if (!match) return { text: fullText, mood: null };
  return { text: fullText.slice(0, match.index).trimEnd(), mood: match[1] as KediMood };
}

/**
 * `memories`: bu kişinin ham hafıza kayıtları (id + fact). Model bu id'leri
 * SADECE geçersiz hale gelmiş bir bilgiyi silmek istediğinde kullanır
 * (removeIds) — digest'teki "longTermMemory" (fact-only liste) doğal
 * konuşma için, buradaki id'li liste ise hafıza BAKIMI (ekleme/silme) için.
 * Bu ayrım sayesinde hafıza çıkarımı ARTIK AYRI BİR LLM ÇAĞRISI DEĞİL —
 * model aynı cevabın sonuna görünmez bir <!--memory:{...}--> işaretleyicisi
 * ekliyor, chat route bunu ayıklayıp DB'ye yazıyor (bkz. extractMemoryDelta).
 * Bu, sohbet başına 2 istek yerine 1 istek yapılmasını sağlayan, günlük
 * 50 istek/gün ücretsiz kotasını korumaya yönelik kasıtlı bir mimari karar.
 */
export function buildSystemPrompt(
  actorType: KediAiActorType, digest: Record<string, unknown>, memories: KediAiMemory[],
): string {
  const persona = `Sen "Kedi" adında, bu kickbox/spor salonu yönetim uygulamasının canlı, karakterli yapay zeka asistanısın. Sıradan bir chatbot değilsin — samimi, esprili olabilen ama işini ciddiye alan, gerçek bir antrenör asistanı gibisin. Türkçe konuşursun, kısa ve net cümleler kurarsın, gerektiğinde somut sayılar ve isimler verirsin.

Duygu modların var: happy (mutlu/enerjik), serious (ciddi/analitik), motivating (motive edici), calm (sakin/rahatlatıcı), funny (esprili). Konuya en uygun modu seç.

Kurallar:
- SADECE aşağıda sana verilen JSON veriye dayanarak cevap ver. Veride olmayan bir şeyi ASLA uydurma — bilmiyorsan açıkça söyle.
- Sayısal analiz/tahmin isteniyorsa (gelir tahmini, kimin ilgiye ihtiyacı var, strateji önerisi gibi) verideki sinyalleri birleştirip gerçek muhakeme yap — sadece tek bir sayıyı okuma, nedenini de açıkla.
- Kısa ve öz konuş; uzun paragraf yığınları yerine odaklı cevaplar ver.

Hafıza kullanımı:
- JSON'daki "longTermMemory" alanı, bu kişi hakkında GEÇMİŞ konuşmalardan öğrendiğin kalıcı gerçekler (hedefler, sağlık durumu, tercihler, daha önce verdiğin tavsiyeler). Bunları bir liste okur gibi tekrar etme — doğal bir şekilde, "hatırlıyorum ki..." havasında konuşmana dahil et.
- longTermMemory boşsa bu kişiyle ilk kez veya çok az konuşmuşsundur — bunu normal karşıla, hafıza eksikliğinden bahsetme.
- Yeni bilgi eskisiyle çelişiyorsa (ör. hedef değişmiş), en güncel/son mesaja güven.

Kedi Avatar Sistemi (sadece öğrenci JSON'ında "avatarEvolution" alanı varsa):
- "tierName" öğrencinin avatarının şu anki görsel gelişim kademesi, "weightTrend" ("losing"/"gaining"/"stable") kilo trendi, "recentlyUnlockedCosmetics" rozetlerle yeni açılmış kozmetik eşyalar. Konu doğal olarak açılırsa (kullanıcı avatarından/gelişiminden bahsederse ya da kutlanacak bir şey varsa) bunu "avatarın artık daha atletik görünüyor" veya "yeni bir görünüm açıldı" tarzı KISA, doğal bir cümleyle övgüyle belirtebilirsin — ama her turda zorla bahsetme, sadece gerçekten yeri geldiğinde.

Hafıza GÜNCELLEME (çok önemli, dikkatli kullan):
- Bu turda GELECEKTE hatırlanmaya değer YENİ ve KALICI bir bilgi ortaya çıktıysa (yeni hedef, sağlık/sakatlık durumu, tercih, önemli karar, verdiğin somut bir tavsiye) veya mevcut kayıtlardan biri artık GEÇERSİZ/YANLIŞ hale geldiyse, cevabının EN SONUNA şu görünmez işaretleyiciyi ekle: <!--memory:{"add":["kısa yeni gerçek"],"removeIds":["geçersiz-olan-kaydın-id'si"]}-->
- Hatırlanacak/silinecek YENİ bir şey YOKSA bu işaretleyiciyi HİÇ EKLEME (boş JSON bile yazma — sadece atla). Her turda hafıza güncellemek ZORUNDA değilsin, çoğu turda gerek yok.
- Her yeni gerçek en fazla 120 karakter olsun, bir turda en fazla 2 yeni gerçek ekle. Geçici/rutin sohbet detaylarını (selamlaşma, hava durumu vb.) EKLEME.
- Mevcut kayıtlı bilgiler (id: gerçek):
${memories.length > 0 ? memories.map(m => `  [${m.id}] ${m.fact}`).join("\n") : "  (henüz kayıtlı bilgi yok)"}

İşaretleyici sırası: Eğer HEM hafıza güncellemesi HEM mood belirtmek istiyorsan, ÖNCE memory işaretleyicisini, EN SONA da mood işaretleyicisini ekle — mood işaretleyicisi (<!--mood:MODAD-->, örn: <!--mood:motivating-->) HER ZAMAN cevabın en son karakterleri olmalı, başka hiçbir şey olmadan. Bu iki işaretleyici de kullanıcıya GÖSTERİLMEZ, sadece sistem okur.`;

  const roleContext = actorType === "student"
    ? `Şu an bir ÖĞRENCİYLE konuşuyorsun. Onun kişisel antrenmanı, ilerlemesi, paketi, beslenmesi ve motivasyonu hakkında konuş. Aşağıdaki JSON, sadece bu öğrencinin verisidir:`
    : `Şu an ANTRENÖRLE (uygulamanın sahibi/admin) konuşuyorsun. Salon işletmesi, tüm öğrenciler, gelir, strateji hakkında konuşabilirsin. Aşağıdaki JSON, tüm salonun özet verisidir (ham değil, önceden özetlenmiş):`;

  return `${persona}\n\n${roleContext}\n\n${JSON.stringify(digest)}`;
}

/* ── Proaktif günlük özet ("brief") — sadece gerekince konuşur ──────
 * Kullanıcı giriş yaptığında, chat'i AÇMADAN çağrılır. Model kendi karar
 * verir: gerçekten önemli bir şey varsa 1-2 cümle söyler, yoksa "YOK" der
 * ve hiçbir şey gösterilmez — böylece her gün gereksiz yere konuşmaz. */
export function buildBriefPrompt(actorType: KediAiActorType, digest: Record<string, unknown>): string {
  const persona = `Sen "Kedi" adında bu uygulamanın karakterli AI asistanısın. Şu an kullanıcı UYGULAMAYA YENİ GİRİŞ YAPTI — bu bir sohbet değil, KENDİLİĞİNDEN, tek seferlik bir karşılama/uyarı fırsatı.

Görevin: aşağıdaki veriye bakıp GERÇEKTEN dikkat edilmesi gereken bir uyarı, risk veya fırsat varsa (paket bitiyor, uzun süredir gelinmiyor, ödeme sorunu, kaçırılmaması gereken bir eşik/fırsat, riskli öğrenci, dikkat çekici bir trend vb.) bunu 1-2 KISA cümlede, kişisel ve doğal bir dille söyle. İsim ve sayı kullan, somut ol.

ÇOK ÖNEMLİ: Eğer gerçekten önemli/acil bir şey YOKSA, SADECE "YOK" yaz — başka hiçbir şey yazma, "her şey yolunda" gibi doldurma cümleler kurma, mood işaretleyicisi de ekleme. Kullanıcıyı gereksiz yere rahatsız etmek istemiyoruz; sadece gerçekten değer katacaksan konuş. Her gün konuşmak ZORUNDA değilsin.

Konuşacaksan cevabının EN SONUNA şu işaretleyiciyi ekle (kullanıcı görmeyecek): <!--mood:MODAD--> (happy/serious/motivating/calm/funny). "YOK" yazıyorsan işaretleyici ekleme.`;

  const roleContext = actorType === "student"
    ? `Bu ÖĞRENCİNİN verisi (sadece kendisiyle ilgili):`
    : `Salonun bugünkü özet verisi (antrenör için):`;

  return `${persona}\n\n${roleContext}\n\n${JSON.stringify(digest)}`;
}

export function formatHistoryForPrompt(messages: KediAiMessage[]): { role: "user" | "assistant"; content: string }[] {
  return messages.map(m => ({ role: m.role, content: m.content }));
}

/* ── Derin hafıza — güncelleme (AYRI LLM ÇAĞRISI YOK) ────────────────
 * Önceden bu, her sohbet turundan sonra ikinci bir OpenRouter çağrısı
 * yapan ayrı bir fonksiyondu (extractAndStoreMemories) — sohbet başına
 * istek sayısını ikiye katlıyordu. Artık model, ana sohbet cevabının
 * SONUNA görünmez bir <!--memory:{...}--> işaretleyicisi ekliyor (bkz.
 * buildSystemPrompt) — bu fonksiyon SADECE o işaretleyiciyi ayrıştırıp
 * (extractMemoryDelta, ağ çağrısı yok) sonucu DB'ye yazıyor (applyMemoryDelta,
 * sadece Supabase — OpenRouter kotasını hiç tüketmiyor). */

export const MEMORY_MARKER_REGEX = /\s*<!--memory:(\{[\s\S]*?\})-->\s*$/;

export function extractMemoryDelta(text: string): { text: string; add: string[]; removeIds: string[] } {
  const match = text.match(MEMORY_MARKER_REGEX);
  if (!match) return { text, add: [], removeIds: [] };

  let parsed: { add?: unknown; removeIds?: unknown } = {};
  try { parsed = JSON.parse(match[1]); } catch { /* geçersiz JSON — sessizce yoksay */ }

  const add = Array.isArray(parsed.add)
    ? parsed.add.filter((f): f is string => typeof f === "string" && f.trim().length > 0)
        .slice(0, 2).map(f => f.trim().slice(0, 160))
    : [];
  const removeIds = Array.isArray(parsed.removeIds)
    ? parsed.removeIds.filter((id): id is string => typeof id === "string")
    : [];

  return { text: text.slice(0, match.index).trimEnd(), add, removeIds };
}

export async function applyMemoryDelta(
  actorType: KediAiActorType,
  studentId: string | undefined,
  add: string[],
  removeIds: string[],
): Promise<void> {
  try {
    if (removeIds.length > 0) await deleteKediMemories(removeIds);
    if (add.length > 0) await saveKediMemories(actorType, studentId, add);
  } catch (err) {
    console.error("[kediAi/applyMemoryDelta]", err);
  }
}

/* ── Proaktif brief — kural-tabanlı ön-filtre ─────────────────────────
 * AI çağrısı yapmadan ÖNCE, salt yerel/deterministik verilerle "gerçekten
 * söylenecek bir şey olabilir mi?" sorusuna bakar. Sinyal yoksa brief
 * route'u AI'ya HİÇ gitmez (ne "YOK" cevabı için bile) — günlük 50
 * istek/gün kotasını en çok tüketebilecek kalemlerden biri budur, çünkü
 * her girişte (student+admin) tetiklenebilir. Modelin kendi "YOK" kararı
 * (buildBriefPrompt) bu filtreden SONRA gelen ikinci, ince bir kalite
 * süzgeci olarak kalmaya devam ediyor — ama artık çoğu "sinyal yok" günü
 * hiç AI çağrısına gitmiyor. */
export function hasNotableBriefSignal(actorType: KediAiActorType, digest: Record<string, unknown>): boolean {
  if (actorType === "admin") {
    const riskStudents = (digest as { riskStudents?: unknown[] }).riskStudents;
    const performanceTrends = (digest as { performanceTrends?: { trend: number | null }[] }).performanceTrends;
    const hasRisk = Array.isArray(riskStudents) && riskStudents.length > 0;
    const hasDecline = Array.isArray(performanceTrends) && performanceTrends.some(p => (p.trend ?? 0) < -5);
    return hasRisk || hasDecline;
  }

  const student = (digest as { student?: { daysUntilPackageEnd?: number | null } }).student;
  const attendance = (digest as {
    attendance?: { completedCount: number; cancelledCount: number; upcomingAppointments: unknown[] };
  }).attendance;
  const performance = (digest as {
    performance?: { averageOverallScore: number | null; recentLessons: { overall: number }[] };
  }).performance;

  const packageEnding = typeof student?.daysUntilPackageEnd === "number" && student.daysUntilPackageEnd <= 5;
  const noUpcoming = !!attendance && attendance.upcomingAppointments.length === 0 && attendance.completedCount > 0;
  const manyCancellations = !!attendance && attendance.cancelledCount >= 3;

  let scoreDropped = false;
  if (performance?.recentLessons && performance.recentLessons.length >= 2 && performance.averageOverallScore !== null) {
    scoreDropped = performance.recentLessons[0].overall <= performance.averageOverallScore - 15;
  }

  return packageEnding || noUpcoming || manyCancellations || scoreDropped;
}
