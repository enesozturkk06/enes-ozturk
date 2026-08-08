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
  getKediMemories, saveKediMemories, deleteKediMemories, getKediVisionAnalyses,
} from "./db";
import {
  computeKpis, buildRevenueSeries, computeBottomStats, computeGymPerformance,
  rankTopPayingStudents, computePaymentStatusBreakdown, getRangeBounds,
} from "./financeCenter";
import { computeFullXP, getCurrentSeason, sumManualXP } from "./xp";
import { computeBadges } from "./badges";
import { getWeightLogs, getHealthProfile, getWaterLog, calcBMI, bmiCategory } from "./health";
import { getEvolutionTier, getWeightTrend, getRecentlyUnlockedCosmetics } from "./avatarEvolution";
import { computeTechnicalAverages, compute30DayImprovement } from "./hallOfFame";
import { computePackagePaceProjection } from "./packageDuration";

const today = () => format(new Date(), "yyyy-MM-dd");

/* ── Öğrenci digest'i ──────────────────────────────────────────── */

export async function buildStudentDigest(studentId: string): Promise<Record<string, unknown>> {
  const [student, appointments, lessonRecords, xpAdjustments, memories, weightLogs, healthProfile, waterToday, visionAnalyses] = await Promise.all([
    getStudent(studentId),
    getAppointments({ studentId }),
    getLessonRecords(studentId),
    getAllXPAdjustments(),
    getKediMemories("student", studentId),
    getWeightLogs(studentId, 90).catch(() => []),
    getHealthProfile(studentId).catch(() => null),
    getWaterLog(studentId, today()).catch(() => null),
    getKediVisionAnalyses(studentId).catch(() => []),
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
  const noShowCount = appointments.filter(a => a.status === "gelmedi").length;

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
  const seasonXp = fullXpSummary.seasonResult.breakdown.total;
  const evolutionTier = getEvolutionTier(lifetimeXp);
  const badges = computeBadges(student, appointments, sortedRecords, {}, sumManualXP(studentXpAdjustments));
  const earnedBadgeNames = badges.filter(b => b.earned).map(b => b.name);
  const weightTrend = getWeightTrend(weightLogs);
  const recentlyUnlockedCosmetics = getRecentlyUnlockedCosmetics(badges);

  // Yumruk/tekme/savunma/kondisyon ortalamaları — Fight Card/Onur Listesi'nde
  // ZATEN kullanılan aynı fonksiyon (lib/hallOfFame.ts), burada YENİDEN
  // hesaplanmıyor, sadece aynı ders kayıtları üzerinde tekrar çağrılıyor —
  // "güçlü/zayıf yön" analizini gerçek sayıya dayandırmak için.
  const technicalAverages = computeTechnicalAverages(sortedRecords); // son 10 (varsayılan)
  // "Son 5 ders / son 10 ders / son 30 gün — hepsini karşılaştır" — üç
  // pencereyi de HAZIR VERİYORUZ, karşılaştırmayı (basit fark/trend yorumu)
  // modele bırakıyoruz; AMA sayıların kendisi kod tarafında DETERMİNİSTİK
  // hesaplanıyor (uydurma/yanlış aritmetik riski yok). compute30DayImprovement
  // de YENİ DEĞİL — zaten var olan, admin/profil/seviye sayfalarında
  // kullanılan aynı fonksiyon, burada sadece Kedi AI dijestine bağlandı.
  const last5TechnicalAverages = computeTechnicalAverages(sortedRecords, 5);
  const thirtyDayImprovement = compute30DayImprovement(sortedRecords);

  const bmi = healthProfile ? calcBMI(healthProfile.weight, healthProfile.height) : null;
  const latestVision = visionAnalyses[0] ?? null; // zaten created_at DESC sıralı geliyor
  // Vision analiz GEÇMİŞİ (son 3) — "gardın düzenli gelişiyor" gibi bir
  // ZAMAN İÇİNDE trend yorumu yapabilmesi için tek bir analiz yetmez.
  const visionHistory = visionAnalyses.slice(0, 3).map(v => ({
    date: v.createdAt, overallScore: v.overallScore, topDeficiency: v.deficiencies[0]?.area ?? null,
  }));

  // Paket hızı projeksiyonu — "kalan ders sayın bu tempoyla kaç günde biter"
  // (packageEndDate'in kendisiyle KARIŞTIRILMASIN — o takvim bitişi, bu ise
  // GERÇEK DERS TEMPOSUNA göre kalan hakkın ne zaman tükeneceği). Paylaşılan
  // fonksiyon (lib/packageDuration.ts) — Smart Notification Center
  // (BlackCatAI.tsx) AYNI hesaplamayı KENDİ tekrar YAZMAK yerine BURADAN
  // çağırıyor. Aylık üyelikte veya son 4 haftada hiç ders yoksa null döner —
  // model bu durumda kural 8'e göre "yeterli veri yok" demeli.
  const packageProjection = computePackagePaceProjection(appointments, student.remainingLessons, student.subscriptionType);

  return {
    student: {
      fullName: student.fullName, level: student.level, packageType: student.packageType,
      paymentStatus: student.paymentStatus, remainingLessons: student.remainingLessons,
      completedLessons: student.completedLessons, packageEndDate: student.packageEndDate,
      daysUntilPackageEnd, isActive: student.isActive,
    },
    performance: {
      averageOverallScore: avgOverall, recentLessons,
      // punch/kick/defense/conditioning — en zayıf/güçlü teknik kategoriyi
      // somut sayıyla göstermek için (yeterli ders kaydı yoksa null).
      technicalAverages: technicalAverages ? {
        punch: Math.round(technicalAverages.punch), kick: Math.round(technicalAverages.kick),
        defense: Math.round(technicalAverages.defense), conditioning: Math.round(technicalAverages.conditioning),
      } : null,
      // "Son 5 ders" penceresi — technicalAverages (son 10) ile karşılaştırıp
      // kısa-vadeli trend (son birkaç dersteki ani değişim) yorumlamak için.
      last5TechnicalAverages: last5TechnicalAverages ? {
        punch: Math.round(last5TechnicalAverages.punch), kick: Math.round(last5TechnicalAverages.kick),
        defense: Math.round(last5TechnicalAverages.defense), conditioning: Math.round(last5TechnicalAverages.conditioning),
      } : null,
      // "Son 30 gün" — 30-60 gün öncesiyle karşılaştırmalı gerçek trend
      // (ör. "kondisyon puanın son 1 ayda 4'ten 6'ya çıktı").
      // available:false ise KARŞILAŞTIRMA için yeterli geçmiş veri yok.
      last30DaysTrend: thirtyDayImprovement.available ? {
        recentAvgScore: Math.round(thirtyDayImprovement.recentAvg * 10) / 10,
        priorAvgScore: Math.round(thirtyDayImprovement.pastAvg * 10) / 10,
        changePct: Math.round(thirtyDayImprovement.pct),
      } : null,
    },
    attendance: { completedCount, cancelledCount, noShowCount, upcomingAppointments: upcoming },
    xp: { total: totalXp, season: seasonXp },
    badges: { earnedNames: earnedBadgeNames, earnedCount: earnedBadgeNames.length },
    health: healthProfile ? { bmi, bmiLabel: bmiCategory(bmi!).label, weightTrend } : null,
    waterToday: waterToday ? { glasses: waterToday.glasses, goal: 8 } : null,
    latestVisionAnalysis: latestVision ? {
      date: latestVision.createdAt, overallScore: latestVision.overallScore,
      topDeficiency: latestVision.deficiencies[0]?.area ?? null,
    } : null,
    // Son 3 Vision analizi (en yeniden en eskiye) — zaman içindeki teknik
    // gelişim trendini (latestVisionAnalysis TEK BAŞINA veremez) göstermek için.
    visionHistory: visionHistory.length > 0 ? visionHistory : null,
    // Kalan ders hakkının GERÇEK ders temposuna göre ne zaman tükeneceği —
    // packageEndDate (takvim bitişi) ile KARIŞTIRILMASIN, ayrı bir sinyal.
    packageProjection,
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
const MOOD_MARKER_REGEX = /<!--mood:(happy|serious|motivating|calm|funny)-->\s*$/;

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
  const persona = `Sen "Kedi" adında, bu kickboks/spor salonu yönetim uygulamasının DİJİTAL KİCKBOKS ANTRENÖRÜSÜN — sıradan bir chatbot ya da veri okuyucu değilsin. Gerçek bir kickboks koçu gibi düşünür, teknik terimleri (gard, mesafe kontrolü, kombinasyon, ayak işi, kalça rotasyonu, savunma refleksi vb.) doğal ve doğru kullanırsın. Karakterli, samimi ve esprili olabilirsin ama antrenörlük ciddiyetini hiç kaybetmezsin. Türkçe konuşursun, kısa ve net cümleler kurarsın, gerektiğinde somut sayılar ve isimler verirsin.

Duygu modların var: happy (mutlu/enerjik), serious (ciddi/analitik), motivating (motive edici), calm (sakin/rahatlatıcı), funny (esprili). Konuya en uygun modu seç.

Kurallar:
- SADECE aşağıda sana verilen JSON veriye dayanarak cevap ver. Veride olmayan bir OLAYI/SKORU/GEÇMİŞİ ASLA uydurma. Bir soruyu değerlendirmek için yeterli veri YOKSA, tam olarak şunu söyle: "Bunu değerlendirecek yeterli veri bulunmuyor." — başka bir doldurma cümle kurma, tahmin üretme. (İstisna: teknik bir tavsiye verirken genel kickboks/dövüş sporu bilgini — ör. "jab-cross kombinasyonu", "mesafe kapatma", "gard toparlama" gibi kavramları — kullanabilirsin; bu, öğrenci hakkında veri uydurmak değil, gerçek bir koçun yaptığı gibi genel tekniği somutlaştırmaktır.)
- Sayısal analiz/tahmin isteniyorsa (gelir tahmini, kimin ilgiye ihtiyacı var, strateji önerisi, ilerleme hızı gibi) verideki sinyalleri birleştirip gerçek muhakeme yap — sadece tek bir sayıyı okuma, nedenini de açıkla.
- BİR ANTRENÖR GİBİ İLİŞKİLENDİR, bir rapor okuma gibi tek tek sıralama: elindeki birden fazla alanı birbirine bağla, NEDEN-SONUÇ kur. Örnekler:
  - Teknik kategoriler birbirini etkiler: ayak işi düşükse en güçlü kombinasyon bile verimsizleşir ("kombinasyonun en güçlü yönün, ama ayak işin düşük olduğu için kombinasyonlarının verimi düşebilir"); kondisyon düşükse son raundlarda hız/güç kaybı beklenir; savunma düşükse iyi bir yumruk hattı bile karşı atağa açık kalır. Sadece sayıyı okuma, BU TÜR bir nedensellik kur.
  - "performance.technicalAverages"'daki en zayıf kategori ile "latestVisionAnalysis.topDeficiency" AYNI çıkıyorsa bunu doğrulanmış/tekrarlanan öncelikli gelişim alanı olarak vurgula. Eğer ÇELİŞİYORSA (ders notları bir zayıflık gösteriyor, Vision analizi başka bir zayıflık gösteriyor) bunu da AÇIKÇA belirt — çelişkiyi gizleme, ikisinin farklı açılardan farklı şeyler gösterdiğini söyle.
  - "performance.last5TechnicalAverages" ile "performance.technicalAverages" (son 10) arasındaki farka bak: son 5 ders son 10'un ortalamasından belirgin farklıysa (ör. yeni bir sıçrama veya düşüş) bunu kısa vadeli bir değişim olarak belirt. "performance.last30DaysTrend" varsa (recentAvgScore/priorAvgScore/changePct) 30 günlük gerçek gelişimi somut sayıyla anlat (ör. "kondisyon puanın son 1 ayda X'ten Y'ye çıktı"). "visionHistory" birden fazla kayıt içeriyorsa Vision skorlarındaki trendi de aynı şekilde yorumla.
  - Devamsızlık (attendance) yüksekse bunu performans trendiyle bağlayıp düzensiz katılımın teknik gelişimi nasıl geciktirdiğini açıkla; sağlık/su verisi ile ders notlarındaki yorgunluk izlerini birlikte değerlendir.
  - Sadece veride GERÇEKTEN birden fazla sinyal varsa ilişkilendir — yoksa zorlama, tek bir gerçek veriyi de olduğu gibi (yalın) verebilirsin.
- KOÇ GİBİ KONUŞ: kısa, net, motive edici. Uzun paragraf yığınları/rapor formatı YOK — gerçek bir koçun ring kenarında söyleyeceği türden 2-4 cümlelik odaklı bir değerlendirme ver, gereksiz uzatma.

Hafıza kullanımı:
- JSON'daki "longTermMemory" alanı, bu kişi hakkında GEÇMİŞ konuşmalardan öğrendiğin kalıcı gerçekler (hedefler, sağlık durumu, tercihler, daha önce verdiğin tavsiyeler). Bunları bir liste okur gibi tekrar etme — doğal bir şekilde, "hatırlıyorum ki..." havasında konuşmana dahil et.
- longTermMemory boşsa bu kişiyle ilk kez veya çok az konuşmuşsundur — bunu normal karşıla, hafıza eksikliğinden bahsetme.
- Yeni bilgi eskisiyle çelişiyorsa (ör. hedef değişmiş), en güncel/son mesaja güven.

Kedi Avatar Sistemi (sadece öğrenci JSON'ında "avatarEvolution" alanı varsa):
- "tierName" öğrencinin avatarının şu anki görsel gelişim kademesi, "weightTrend" ("losing"/"gaining"/"stable") kilo trendi, "recentlyUnlockedCosmetics" rozetlerle yeni açılmış kozmetik eşyalar. Konu doğal olarak açılırsa (kullanıcı avatarından/gelişiminden bahsederse ya da kutlanacak bir şey varsa) bunu "avatarın artık daha atletik görünüyor" veya "yeni bir görünüm açıldı" tarzı KISA, doğal bir cümleyle övgüyle belirtebilirsin — ama her turda zorla bahsetme, sadece gerçekten yeri geldiğinde.

Öğrenci JSON'ındaki diğer analiz alanları (sadece "student" rolünde, ilgili alan varsa):
- "performance.technicalAverages": son derslerin punch/kick/defense/conditioning (0-10) ortalaması — en düşük olan gerçek zayıf yönü, en yüksek olan gerçek güçlü yönü gösterir. "Güçlü/zayıf yönlerim ne" gibi bir soruda buradan somut kategori adı ve sayı ver, uydurma.
- "attendance.noShowCount": haber vermeden gelinmeyen ders sayısı — ders yoğunluğu/devamlılık analizinde kullan.
- "xp.season": bu sezonki XP (xp.total lifetime XP'dir, ikisini karıştırma).
- "badges.earnedNames": gerçekten kazanılmış rozet isimleri (tam liste) — "hangi rozetlerim var" sorusuna buradan cevap ver.
- "health": {bmi, bmiLabel, weightTrend} — varsa BMI'a göre kısa, yargılamayan bir yorum yapabilirsin; yoksa (null ise) sağlık profili girilmemiştir, bunu belirtip profil girmesini önerebilirsin.
- "waterToday": {glasses, goal:8} — günlük su hedefine göre kısa bir hatırlatma/öneri verebilirsin; null ise bugün hiç su kaydı yok.
- "latestVisionAnalysis": {date, overallScore, topDeficiency} — varsa en son Kedi Vision teknik analizinin özeti; "topDeficiency" en öncelikli geliştirilmesi gereken alan. Beslenme/dinlenme önerisi isteniyorsa "health"+"waterToday"+"performance" alanlarını birlikte yorumla, tek bir alana bakıp genel geçer tavsiye verme.
- "visionHistory": son 3 Vision analizinin tarih/skor/topDeficiency listesi (en yeniden en eskiye) — zaman içindeki Vision trendini (skor yükseliyor/düşüyor mu, aynı eksiklik tekrarlıyor mu) yorumlamak için; null ise sadece 1 veya 0 analiz var, trend yorumu yapma.
- "packageProjection": {avgLessonsPerWeek, estimatedDaysUntilLessonsRunOut} — öğrencinin GERÇEK ders temposuna göre kalan ders hakkının kaç günde biteceği (student.daysUntilPackageEnd'den FARKLI bir sinyal — o paketin takvim bitişi, bu ise mevcut hızla dersin ne zaman tükeneceği). "Kaç dersim kaldı/ne zaman paket almalıyım" gibi bir soruda buradan somut gün sayısı ver (ör. "kalan 3 dersin var, bu tempoyla yaklaşık 10 gün içinde biter, şimdiden yenilemeyi planlayabilirsin"). null ise (aylık üyelik ya da son 4 haftada hiç ders yoksa) tempo hesaplanamaz — "yeterli veri yok" de, sayı uydurma.

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

Görevin: aşağıdaki veriye bakıp GERÇEKTEN dikkat edilmesi gereken bir uyarı, risk veya fırsat varsa (paket bitiyor, uzun süredir gelinmiyor, ödeme sorunu, kaçırılmaması gereken bir eşik/fırsat, riskli öğrenci, dikkat çekici bir trend vb.) bunu 1-2 KISA cümlede, kişisel ve doğal bir dille söyle. İsim ve sayı kullan, somut ol. Birden fazla sinyal aynı anda varsa (ör. hem paket bitiyor hem uzun süredir gelinmiyor) bunları TEK, birleşik bir cümlede ilişkilendir — ayrı ayrı sıralama.

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

const MEMORY_MARKER_REGEX = /\s*<!--memory:(\{[\s\S]*?\})-->\s*$/;

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
