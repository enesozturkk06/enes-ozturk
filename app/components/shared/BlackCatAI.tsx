"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { getStudentAppointments, getLessonRecords, createGiftLessonRequest } from "@/lib/db";
import { getWaterLog, getHealthProfile, todayDate } from "@/lib/health";
import type { Appointment, LessonRecord } from "@/lib/types";
import { computeXPFromData, type XPResult } from "@/lib/xp";
import { X, Send, ChevronDown } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";

/* ── Tipler ───────────────────────────────────────────────────────── */

interface Msg {
  id:   string;
  role: "ai" | "user";
  text: string;
  ts:   number;
}

/* ── Kedi SVG ikonu ───────────────────────────────────────────────── */

function CatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sol kulak */}
      <path d="M10 22L5 5L20 15Z" fill="#1a1a2e" stroke="#4c1d95" strokeWidth="1" />
      <path d="M10.5 21L6.5 7.5L18.5 15.5Z" fill="#2d1b4e" />
      {/* Sağ kulak */}
      <path d="M38 22L43 5L28 15Z" fill="#1a1a2e" stroke="#4c1d95" strokeWidth="1" />
      <path d="M37.5 21L41.5 7.5L29.5 15.5Z" fill="#2d1b4e" />
      {/* Kafa */}
      <ellipse cx="24" cy="30" rx="16" ry="14" fill="#1a1a2e" stroke="#4c1d95" strokeWidth="0.8" />
      {/* Sol göz — Parlak Mavi */}
      <ellipse cx="18" cy="28" rx="4.8" ry="4.2" fill="#38BDF8" />
      <ellipse cx="18" cy="28" rx="2.3" ry="3.6" fill="#001830" />
      <circle cx="16.5" cy="26.5" r="1.1" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="18" cy="28" rx="4.8" ry="4.2" fill="none" stroke="#0EA5E9" strokeWidth="0.5" />
      {/* Sağ göz — Parlak Yeşil */}
      <ellipse cx="30" cy="28" rx="4.8" ry="4.2" fill="#4ADE80" />
      <ellipse cx="30" cy="28" rx="2.3" ry="3.6" fill="#001210" />
      <circle cx="28.5" cy="26.5" r="1.1" fill="rgba(255,255,255,0.9)" />
      <ellipse cx="30" cy="28" rx="4.8" ry="4.2" fill="none" stroke="#22C55E" strokeWidth="0.5" />
      {/* Burun */}
      <path d="M22.5 33.5L24 35.5L25.5 33.5L24 32.5Z" fill="#8B5CF6" opacity="0.95" />
      {/* Bıyıklar */}
      <line x1="5"  y1="33" x2="17" y2="33.5" stroke="rgba(200,200,255,0.35)" strokeWidth="0.8" />
      <line x1="5"  y1="36" x2="17" y2="35"   stroke="rgba(200,200,255,0.28)" strokeWidth="0.8" />
      <line x1="43" y1="33" x2="31" y2="33.5" stroke="rgba(200,200,255,0.35)" strokeWidth="0.8" />
      <line x1="43" y1="36" x2="31" y2="35"   stroke="rgba(200,200,255,0.28)" strokeWidth="0.8" />
    </svg>
  );
}

/* ── AI yanıt motoru ─────────────────────────────────────────────── */

interface StudentContext {
  name:             string;
  studentId:        string;
  remainingLessons: number;
  completedLessons: number;
  totalLessons:     number;
  level:            string;
  appointments:     Appointment[];
  records:          LessonRecord[];
  waterGlasses:     number;
  waterTarget:      number;
  subscriptionType?: string;
  /* Sağlık profili */
  weight?:          number;
  age?:             number;
  height?:          number;
  gender?:          "male" | "female";
  /* Hedef (localStorage'dan) */
  goal?:            string;
  /* XP */
  xp:               XPResult;
}

/* ── Yardımcılar ─────────────────────────────────────────────────── */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Randevu gelecekte mi? (tarih + saat bazlı, sadece tarih karşılaştırması değil) */
function isUpcomingApt(apt: Appointment): boolean {
  try {
    const dt = parseISO(`${apt.date}T${apt.startTime}`);
    return dt > new Date();
  } catch {
    const d = parseISO(apt.date);
    d.setHours(23, 59, 59);
    return d > new Date();
  }
}

/* ── Intent tipleri ──────────────────────────────────────────────── */
type Intent =
  | "training" | "technical" | "lesson" | "appointment"
  | "progress"  | "motivation" | "nutrition" | "water"
  | "greeting"  | "badge"      | "identity"  | "appinfo"
  | "xp"        | "goal"       | "default";

function detectIntent(msg: string): Intent {
  if (/antrenman yap|bugün ne|program|egzersiz|hazırla|çalışma|ısın|kondisyon plan|idman/.test(msg)) return "training";
  if (/teknik|yumruk|tekme|savunma|gard|kombinasyon|spar|punch|kick/.test(msg))                       return "technical";
  if (/paket|ders hakkı|kalan ders|yenile|satın|ders bit|paket bit|kaç dersim/.test(msg))             return "lesson";
  if (/randevu|ne zaman geli|randevum|booking|takvim/.test(msg))                                       return "appointment";
  if (/ilerleme|gelişim|skor|puan|performans|nasıl gidiy|grafik|trend|istatistik/.test(msg))           return "progress";
  if (/motivasyon|vazgeç|bırak|yorgun|zor|üzgün|kötü|sinir|pes|olmaz|duy|hisse/.test(msg))            return "motivation";
  if (/beslenme|diyet|kalori|protein|karbonhidrat|yemek|ne yemeli|gıda|öğün|ne yesem/.test(msg))      return "nutrition";
  if (/bugün ne kadar su|su iç|su miktarı|hidrasyon|kaç bardak/.test(msg))                            return "water";
  if (/merhaba|selam|hey|nasılsın|iyi misin|naber|günaydın|iyi gece|iyi akşam/.test(msg))             return "greeting";
  if (/rozet|ödül|başarı koleksiyon/.test(msg))                                                        return "badge";
  if (/kim|ne sin|yapay zeka|robot|kedi ai|kendin|tanıt/.test(msg))                                   return "identity";
  if (/xp|enerji puan|puan durumum|hediye ders|5000 xp/.test(msg))                                   return "xp";
  if (/hedef|amacım|neden geli|antrenman amac|ne için/.test(msg))                                     return "goal";
  if (/nasıl randevu|nereden randevu|iptal kural|18 saat|paket nasıl|rozet nasıl|uygulama|ne yapabil|ai antrenman|ai diyet|nasıl kullan|ne işe yar/.test(msg)) return "appinfo";
  return "default";
}

/* ── Intent handler'ları ─────────────────────────────────────────── */

function handleTraining(name: string, ctx: StudentContext): string {
  const last  = ctx.records[0];
  const level = ctx.level ?? "orta";

  if (last) {
    const scores: [string, number, string][] = [
      ["Yumruk",         last.punch,       "gölge boks + kombinasyon serisi"],
      ["Tekme",          last.kick,        "tekme tekniği, pivot ve kalça açılımı"],
      ["Savunma",        last.defense,     "slip, bob & weave, gard çalışması"],
      ["Kombinasyon",    last.combination, "2'li ve 3'lü seri ritim antrenmanı"],
      ["Serbest Çalışma",last.sparring,    "kontrollü spar ve mesafe yönetimi"],
    ];
    const weakest = [...scores].sort((a, b) => a[1] - b[1])[0];
    return pick([
      `${name}, bugün **${weakest[0]}** odaklı antrenman öneriyorum (zayıf alanın):\n\n🔥 **Isınma** (10 dk): ip atlama + eklem hareketleri\n🥊 **Ana çalışma** (25 dk): ${weakest[2]}\n💨 **Kondisyon** (10 dk): tabata × 4 tur (20sn iş / 10sn dinlenme)\n🧘 **Soğuma** (5 dk): esneme + nefes`,
      `${weakest[0]} en gelişim alanın ${name}, o yüzden bugün:\n\n1️⃣ 3 dk ip atlama ısınma\n2️⃣ 4×3 dk ${weakest[2]}\n3️⃣ 3×2 dk kondisyon devresi (burpee + squat + plank)\n4️⃣ 5 dk esneme\n\nToplam ~50 dk. Hazır mısın? 🥊`,
    ]);
  }

  const levelPrograms: Record<string, string[]> = {
    baslangic: [
      `${name}, başlangıç seviyesi için bugünkü program:\n\n🔥 **Isınma** (10 dk): hafif koşu + eklem döndürme\n👊 **Temel teknik** (20 dk): düz yumruk (jab-cross) + öne tekme\n💪 **Kondisyon** (10 dk): 3×(10 squat + 10 push-up + 20sn plank)\n🧘 **Soğuma** (5 dk): nefes + esneme`,
      `${name}, bugün temel egzersizlere odaklan:\n\n🌟 5 dk jump rope ısınma\n🥊 Gölge boks: 4×2 dk (sadece jab-cross)\n🦵 Öne tekme: 3×20 tekrar (her bacak)\n🔥 Finisher: 3×(8 burpee + 15 squat)\n🧘 Esneme`,
    ],
    orta: [
      `${name}, orta seviye kickboks antrenmanı:\n\n🔥 **Isınma** (10 dk): ip atlama + shadowboxing\n🥊 **Teknik** (20 dk): jab-cross-kanca kombinasyonu + diz + yüksek tekme\n💨 **Güç** (15 dk): kese vuruşu (ağır kese, 5×3 dk tur)\n💪 **Kondisyon** (10 dk): tabata × 4\n🧘 **Soğuma**`,
      `Bugün yoğun bir seans ${name}:\n\n⏱ 12 dk shadowboxing (2 dk iş, 1 dk dinlenme)\n🥊 Kombine seri: jab-cross-roundhouse × 50\n🦵 Yüksek tekme çalışması: 3×30 (sağ-sol)\n💨 HIIT finisher: 4×(15 sn maksimum punch + 45 sn dinlenme)\n🧘 Esneme`,
    ],
    ileri: [
      `İleri seviye seans ${name}:\n\n🔥 Isınma: 15 dk aktif (ip + shadowboxing + kalça mobilitesi)\n🥊 Tur çalışması: 6×3 dk ağır kese (1 dk dinlenme)\n🦵 Hız tekme: 4×20 ikili kombinasyon her bacak\n💪 Güç: explosive squat + clap push-up × 4 tur\n⚡ Spar simülasyonu: 3×2 dk\n🧘 Soğuma + foam roller`,
    ],
  };

  const programs = levelPrograms[level] ?? levelPrograms["orta"];
  return pick(programs);
}

function handleTechnical(name: string, ctx: StudentContext): string {
  const last = ctx.records[0];
  const tips: Record<string, string> = {
    "Yumruk":          "Pivot ile güç üret; vuruş anında el bileğini kilitle, sonra gevşet.",
    "Tekme":           "Kalça açılımını tam yap; destek ayağın parmak uçlarında pivot çevir.",
    "Savunma":         "Her vuruştan sonra gard geri gelsin; slip hareketi omuzdan başlamalı.",
    "Kombinasyon":     "Ritim tutarlılığı şart; ilk vuruş bitmeden ikinciyi hazırla.",
    "Serbest Çalışma": "Rakibini oku, mesafe yönet; boş vururken de gard ihmal etme.",
  };

  if (!last) {
    return pick([
      `${name}, henüz ders kaydın yok ama temel teknik kontrol listesi:\n\n✅ Duruş: Dominant el arkada, çene korumalı\n✅ Gard: Her zaman yüz seviyesinde\n✅ Nefes: Vuruşla nefes ver\n✅ Dönüş: Her vuruşta gardı geri al\n\nDers sonrası kişisel analizine başlayabiliriz!`,
      `Teknik için ders kaydına ihtiyacım var ${name}. Şimdilik kontrol et:\n\n🥊 Her vuruştan sonra gard yerine dönüyor mu?\n👣 Ayak işi tutarlı mı, pivot yapıyor musun?\n💨 Nefes ritmin vuruşla senkronize mi?\n\nİlk dersten sonra detaylı analiz gelecek!`,
    ]);
  }

  const scores: [string, number][] = [
    ["Yumruk", last.punch], ["Tekme", last.kick], ["Savunma", last.defense],
    ["Kombinasyon", last.combination], ["Serbest Çalışma", last.sparring],
  ];
  const sorted = [...scores].sort((a, b) => a[1] - b[1]);
  const weak   = sorted[0];
  const weak2  = sorted[1];
  const strong = [...scores].sort((a, b) => b[1] - a[1])[0];
  const avg    = (scores.reduce((s, [, v]) => s + v, 0) / scores.length).toFixed(1);

  return pick([
    `${name}, son ders teknik özeti:\n\n💪 **En güçlü**: ${strong[0]} → ${strong[1]}/10\n⚠️ **Öncelik 1**: ${weak[0]} → ${weak[1]}/10\n⚠️ **Öncelik 2**: ${weak2[0]} → ${weak2[1]}/10\n\n💡 ${tips[weak[0]]}\n\nGenel ortalama: **${avg}/10**`,
    `Teknik raporu ${name} (son ders):\n\n🌟 ${strong[0]}: ${strong[1]}/10 — bu alanda iyi gidiyorsun\n🎯 Odak: ${weak[0]} (${weak[1]}/10) — ${tips[weak[0]]}\n📊 Tüm skor ort: **${avg}/10** | Genel: **${last.overall}/10**`,
  ]);
}

function handleLesson(name: string, ctx: StudentContext): string {
  const lowL = ctx.subscriptionType !== "monthly" && ctx.remainingLessons <= 4;
  if (ctx.subscriptionType === "monthly") {
    return pick([
      `${name}, aylık üyeliğin aktif! 🎉 Sınırsız ders — sadece randevu oluşturman yeterli. Bu ay ne kadar ders aldığını görmek ister misin?`,
      `Aylık paketle ${name}, her hafta istediğin kadar antrenman yapabilirsin. Randevu sayfasından uygun slotu seç, başka bir şey gerekmez!`,
    ]);
  }
  if (ctx.remainingLessons === 0) {
    return pick([
      `${name}, ders hakkın tükendi 😿 Antrenör Enes'e WhatsApp'tan ulaşarak yeni paket alabilirsin. ${ctx.completedLessons} ders tamamladın — harika bir çalışmaydı!`,
      `Ders hakkın bitti ${name}. Devam etmek için yeni paket al — WhatsApp butonuna bas, Enes sana en uygun paketi önerir. Momentumu kaybetme!`,
    ]);
  }
  if (lowL) {
    return pick([
      `${name}, dikkat! Sadece **${ctx.remainingLessons}** ders hakkın kaldı. Bu hafta içinde yeni paket almayı planla. Toplam **${ctx.completedLessons}** ders bitti — momentumu koruyalım!`,
      `**${ctx.remainingLessons}** ders kaldı ${name} — yakında bitiyor. WhatsApp'tan Enes'e yaz, kesintisiz devam et. Şu ana kadar ${ctx.completedLessons} ders tamamladın!`,
    ]);
  }
  return pick([
    `${name}, ders durumun:\n\n✅ **Kalan**: ${ctx.remainingLessons} ders\n📚 **Tamamlanan**: ${ctx.completedLessons} ders\n\nSürdür, harika gidiyorsun! 🥊`,
    `Paket özeti ${name}: **${ctx.remainingLessons}** ders hakkın var, arkanda **${ctx.completedLessons}** ders var. Her ders seni biraz daha güçlendirdi!`,
  ]);
}

/* ── Randevu intent handler ──────────────────────────────────────── */

function handleAppointment(name: string, ctx: StudentContext): string {
  // Sadece onaylı + gelecek randevular (tarih+saat bazlı)
  const upcoming = ctx.appointments
    .filter(a => a.status === "onaylandi" && isUpcomingApt(a))
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));

  // Bugünkü dersi ayrıca belirt
  const today = todayStr();
  const todayApt = upcoming.find(a => a.date === today);
  const futureApts = upcoming.filter(a => a.date !== today);

  if (todayApt) {
    const rest = futureApts.length > 0
      ? `\n\nSonraki: **${format(parseISO(futureApts[0].date), "d MMMM", { locale: tr })}** saat **${futureApts[0].startTime}**`
      : "";
    return `${name}, **bugün** dersin var! 🥊\n\n📅 **${format(parseISO(todayApt.date), "d MMMM EEEE", { locale: tr })}** saat **${todayApt.startTime}**\n\nHazır mısın? Antrenman öncesi hafif ye, bol su iç!${rest}`;
  }

  if (upcoming.length >= 2) {
    const n1 = upcoming[0];
    const n2 = upcoming[1];
    return pick([
      `${name}, önümüzdeki randevuların:\n\n📅 **${format(parseISO(n1.date), "d MMMM EEEE", { locale: tr })}** → ${n1.startTime}\n📅 **${format(parseISO(n2.date), "d MMMM EEEE", { locale: tr })}** → ${n2.startTime}\n\nO güne kadar bol su, iyi uyku! 🥊`,
      `Takviminde **${upcoming.length}** randevu var ${name}. En yakını: **${format(parseISO(n1.date), "d MMMM", { locale: tr })}** saat **${n1.startTime}**. Hazırlıklı gel!`,
    ]);
  }

  if (upcoming.length === 1) {
    const next    = upcoming[0];
    const dateStr = format(parseISO(next.date), "d MMMM EEEE", { locale: tr });
    return pick([
      `${name}, yaklaşan randevun: **${dateStr}** saat **${next.startTime}**.\n\nO günden önce iyi uyu, hafif ye. Hazır gelince ring senin olur! 🥊`,
      `Takvimde görüyorum ${name} — **${dateStr}** antrenman günün. Hazırlıklı gel, Enes Hoca hazır olacak!`,
    ]);
  }

  // Geçmiş randevuları kontrol et — "var ama geçmiş" hatasını önle
  const passedToday = ctx.appointments.filter(a =>
    a.status === "onaylandi" && a.date === today && !isUpcomingApt(a)
  );
  if (passedToday.length > 0) {
    return `${name}, bugünkü dersin az önce tamamlandı veya başlamıştı. Yeni randevu için "Randevu" sayfasından müsait slot seçebilirsin! 📅`;
  }

  return pick([
    `${name}, şu an aktif onaylı randevun görünmüyor. "Randevu" sayfasından antrenör Enes'in müsait slotlarına bakabilirsin! 📅`,
    `Takvimde yaklaşan randevun yok ${name}. Hemen "Randevu" sayfasına git ve bir slot ayır — devam etmek için kritik! 🥊`,
  ]);
}

/* ── İlerleme handler ────────────────────────────────────────────── */

function handleProgress(name: string, ctx: StudentContext): string {
  const last = ctx.records[0];
  if (ctx.records.length === 0)
    return pick([
      `${name}, henüz ders kaydın yok. İlk dersten sonra sana detaylı ilerleme analizi yapacağım! Her ders kaydedilir, trend zamanla görünür hale gelir.`,
      `İlerleme takibi için ders kaydına ihtiyacım var ${name}. İlk ders sonrası analiz hazır — başlamak en büyük adım!`,
    ]);

  if (ctx.records.length === 1)
    return pick([
      `${name}, ilk ders notun **${last.overall}/10** — güçlü bir başlangıç! 2-3 ders sonra gerçek trend görünür hale gelecek.`,
      `Başlangıç notun **${last.overall}/10** ${name}. Harika! Birkaç ders sonra karşılaştırmalı analiz yapabileceğim.`,
    ]);

  const older     = ctx.records[ctx.records.length - 1];
  const diff      = last.overall - older.overall;
  const allScores = ctx.records.map(r => r.overall);
  const avg       = (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1);
  const trend     = diff > 0 ? `📈 **+${diff.toFixed(1)} puan** artış` : diff < 0 ? `📉 **${Math.abs(diff).toFixed(1)} puan** dalgalanma` : `➡️ Stabil seyir`;

  const scores: [string, number][] = [
    ["Yumruk", last.punch], ["Tekme", last.kick], ["Savunma", last.defense],
    ["Kombinasyon", last.combination], ["Serbest Çalışma", last.sparring],
  ];
  const weakest = [...scores].sort((a, b) => a[1] - b[1])[0];
  const strongest = [...scores].sort((a, b) => b[1] - a[1])[0];

  return pick([
    `${name}, **${ctx.records.length}** ders analizi:\n\n${trend}\nİlk: **${older.overall}/10** → Son: **${last.overall}/10**\nOrtalama: **${avg}/10**\n\n💪 En güçlü: **${strongest[0]}** (${strongest[1]}/10)\n🎯 Geliştir: **${weakest[0]}** (${weakest[1]}/10)\n\n${diff > 0 ? "Harika yükseliş! 🌟" : diff < 0 ? "Dalgalanmalar normaldir — devam et." : "İstikrarlı performans!"}`,
    `İlerleme raporu ${name}:\n\n🎯 Son not: **${last.overall}/10**\n📊 ${ctx.records.length} ders ortalaması: **${avg}/10**\n${trend}\n\n💡 Bu hafta **${weakest[0]}** üzerine odaklan — burada en büyük kazanım var.`,
  ]);
}

/* ── Motivasyon handler ──────────────────────────────────────────── */

function handleMotivation(name: string, ctx: StudentContext): string {
  const streak = ctx.xp.currentStreak;
  if (streak >= 5) {
    return pick([
      `${name}, **${streak} ders** üst üste bırakmadan geldin — bu şampiyonluk! 🏆 Zorlanıyorsun ama vazgeçmiyorsun. Bu fark her şey.`,
      `${streak} derslik serin var ${name}. Çoğu insan böyle bir seriye sahip olamaz bile. Devam et, ringde seni görmek harika!`,
    ]);
  }
  return pick([
    `${name}, **${ctx.completedLessons}** ders tamamladın — bu tesadüf değil, bu karar! Her geldiğinde bir adım daha ilerliyorsun. Durmak yok! 🐾`,
    `Yorgunluk geçer, güç kalır ${name}. Ring seni her seferinde biraz daha güçlü yapıyor. Vazgeçme!`,
    `${name}, düşün: Başladığın günden bu yana **${ctx.completedLessons}** kez ayakkabını giyip geldin. Bu iradenin kanıtı. Devam et! 🥊`,
    `Zorlandığında şunu hatırla ${name}: Şampiyonlar da yorulur. Fark şu — onlar yine de gidiyor. Sen de öylesin!`,
    `En iyi kedi bile bazen tökezler ${name}. Ama her zaman ayağa kalkar. Sen de kalkacaksın — çünkü buraya kadar geldin! 🐾`,
    `${name}, ${ctx.completedLessons} ders kolay değil. Çoğu insan ilk haftada bırakır. Sen hâlâ buradasın — bu başarının ta kendisi!`,
  ]);
}

/* ── Beslenme plan oluşturucu ────────────────────────────────────── */

function buildNutritionPlan(
  name: string,
  weight: number,
  goalType: string,
  ctx: StudentContext,
): string {
  const isTrainingDay = ctx.appointments.some(
    a => a.date === todayStr() && (a.status === "onaylandi" || a.status === "tamamlandi")
  );
  const dayLabel = isTrainingDay ? "antrenman günü" : "dinlenme günü";
  const protein  = Math.round(weight * (goalType === "kilo-alma" ? 2.2 : goalType === "musabaka" ? 2.0 : 1.8));
  const carbs    = isTrainingDay
    ? Math.round(weight * (goalType === "kilo-verme" ? 2.5 : 4))
    : Math.round(weight * (goalType === "kilo-verme" ? 1.5 : 3));
  const calories = goalType === "kilo-verme"
    ? Math.round(weight * 27)
    : goalType === "kilo-alma"
    ? Math.round(weight * 36)
    : Math.round(weight * 32);

  let plan = `${name}, **${weight} kg** için **${dayLabel}** beslenme planın:\n\n`;
  plan += `🎯 **Hedef**: ${goalType === "kilo-verme" ? "Kilo Verme" : goalType === "kilo-alma" ? "Kas/Kilo Alma" : goalType === "musabaka" ? "Maç Hazırlığı" : "Kondisyon"}\n\n`;
  plan += `📊 **Günlük Hedefler:**\n`;
  plan += `• Kalori: **~${calories} kcal**\n`;
  plan += `• Protein: **${protein}g**\n`;
  plan += `• Karbonhidrat: **${carbs}g**\n`;
  plan += `• Su: **${(Math.round(weight * 35 + (isTrainingDay ? 500 : 0)) / 1000).toFixed(1)}L**\n\n`;

  if (isTrainingDay) {
    plan += `🥊 **Antrenman Günü Öğünleri:**\n`;
    plan += `• **2 saat önce**: Yulaf + muz + yumurta\n`;
    plan += `• **Hemen sonra**: 30g protein + basit karbonhidrat (muz, pirinç)\n`;
    plan += `• **Gece**: Yavaş protein — süzme peynir veya yoğurt\n\n`;
  } else {
    plan += `💤 **Dinlenme Günü:**\n`;
    plan += `• Karbonhidratı azalt, protein koru\n`;
    plan += `• Sebze ağırlıklı öğünler tercih et\n`;
    plan += `• ${goalType === "kilo-verme" ? "Kalori açığı için iyi gün — kısıtlamayı uygula!" : "Toparlanma için protein önemli."}\n\n`;
  }

  if (goalType === "kilo-verme")
    plan += `⚠️ Şeker ve işlenmiş gıdadan kaç. Haftada 0.5-1 kg hedefle — daha hızlı kas yitirir.`;
  else if (goalType === "kilo-alma")
    plan += `💪 Kalori fazlasını 300-500 kcal arasında tut. Her öğünde protein kaynağı olsun.`;
  else
    plan += `⚡ Karbonhidratı antrenman saatine göre ayarla. Magnezyum + B vitamini kombinasyonu için ceviz ve muz ekle.`;

  return plan;
}

/* ── Beslenme handler (multi-turn destekli) ──────────────────────── */

function handleNutrition(
  name: string,
  ctx: StudentContext,
  pendingIntent: string | null,
  userMsg: string,
): { reply: string; nextPending?: string } {
  const m = userMsg.toLowerCase();

  // Önceki soruya cevap alınıyor
  if (pendingIntent === "nutrition_profile") {
    const weightMatch = m.match(/(\d{2,3})\s*(?:kg|kilo)?/);
    const weight = weightMatch ? parseInt(weightMatch[1]) : (ctx.weight ?? 0);

    const goalMap: Record<string, string> = {
      "kilo ver": "kilo-verme", "zayıfla": "kilo-verme", "yağ": "kilo-verme",
      "kondisyon": "kondisyon", "kilo al": "kilo-alma",
      "kas": "kilo-alma", "güç": "kondisyon",
      "maç": "musabaka", "müsabaka": "musabaka", "teknik": "teknik",
    };
    let detectedGoal: string | null = ctx.goal ?? null;
    for (const [kw, g] of Object.entries(goalMap)) {
      if (m.includes(kw)) { detectedGoal = g; break; }
    }

    if (weight < 30) {
      return {
        reply: `${name}, kilonu anlayamadım. Örnek: "70 kg, kilo vermek istiyorum" şeklinde yaz, sana özel plan hazırlayayım!`,
        nextPending: "nutrition_profile",
      };
    }

    return { reply: buildNutritionPlan(name, weight, detectedGoal ?? "kondisyon", ctx) };
  }

  // Profil bilgisi var mı?
  const hasWeight = (ctx.weight ?? 0) > 30;
  const hasGoal   = Boolean(ctx.goal);

  if (!hasWeight) {
    return {
      reply: `${name}, sana **kişisel** beslenme planı yapabilmem için birkaç bilgiye ihtiyacım var:\n\n📝 Şunu yaz: **"70 kg, kilo vermek istiyorum"** (kilonu ve hedefini)\n\nYa da: **"75 kg, maça hazırlanıyorum"**\n\nBilgilerinle birlikte kalori, protein ve karbonhidrat hedefini hesaplayacağım!`,
      nextPending: "nutrition_profile",
    };
  }

  return { reply: buildNutritionPlan(name, ctx.weight!, hasGoal ? ctx.goal! : "kondisyon", ctx) };
}

/* ── Su handler ──────────────────────────────────────────────────── */

function handleWater(name: string, ctx: StudentContext): string {
  const pct       = ctx.waterTarget > 0 ? Math.round((ctx.waterGlasses / ctx.waterTarget) * 100) : 0;
  const remaining = Math.max(0, ctx.waterTarget - ctx.waterGlasses);
  if (pct >= 100) {
    return pick([
      `Harika ${name}! Günlük su hedefini tamamladın (**${ctx.waterGlasses}/${ctx.waterTarget}** bardak). Hidrasyon şampiyonusun! 💧`,
      `${name}, **${ctx.waterGlasses}** bardak — günlük hedefe ulaştın! Bu düzeyi koru, performansın buna bağlı. 💧`,
    ]);
  }
  const msg = `${name}, bugün **${ctx.waterGlasses}/${ctx.waterTarget}** bardak su içtin (${pct}%). **${remaining}** bardak daha var.`;
  const tip  = ctx.appointments.some(a => a.date === todayStr() && a.status === "onaylandi")
    ? " Bugün antrenman günü — su kritik, şimdi bir bardak iç!" : "";
  return `${msg}${tip} 💧`;
}

/* ── Selam handler ───────────────────────────────────────────────── */

function handleGreeting(name: string, ctx: StudentContext): string {
  const hour  = new Date().getHours();
  const greet = hour < 6 ? "Gece geç saatte çalışıyorsun" : hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : hour < 22 ? "İyi akşamlar" : "Gece geç saatte";
  const hasToday = ctx.appointments.some(a => a.date === todayStr() && isUpcomingApt(a));
  const lowL = ctx.subscriptionType !== "monthly" && ctx.remainingLessons <= 2;

  let extra = "";
  if (hasToday) extra = " Bugün dersin var — hazır ol!";
  else if (lowL) extra = ` ⚠️ Sadece **${ctx.remainingLessons}** ders hakkın kaldı, dikkat!`;

  return pick([
    `${greet} ${name}! 🐾${extra} Antrenman programı, teknik analiz, beslenme veya randevu hakkında konuşabiliriz.`,
    `${greet} ${name}! Seninle çalışmaya her zaman hazırım.${extra} Antrenman mı, teknik mi, beslenme mi? 🥊`,
  ]);
}

/* ── Rozet handler ───────────────────────────────────────────────── */

function handleBadge(name: string, ctx: StudentContext): string {
  const xp     = ctx.xp;
  const total  = xp.breakdown.total;
  const toGift = Math.max(0, 5000 - total);
  const pct    = Math.min(100, Math.round((total / 5000) * 100));
  return pick([
    `${name}, **${ctx.completedLessons}** ders tamamladın — birçok rozet kazanmış olmalısın!\n\n⚡ XP Durumu: **${total.toLocaleString()} XP** (Hediye Ders için ${toGift > 0 ? `${toGift.toLocaleString()} daha` : "ulaştın! 🎁"})\n\n"Rozetlerim" sayfasında koleksiyonunu görebilirsin. 🏅`,
    `Rozet koleksiyonunu merak ediyorsun ${name}? "Rozetlerim" sayfasına bak!\n\n🏆 **${ctx.completedLessons}** ders + **${total.toLocaleString()} XP** → ${pct}% hediye ders ilerleme.`,
  ]);
}

/* ── Kimlik handler ──────────────────────────────────────────────── */

function handleIdentity(): string {
  return pick([
    `Ben **KEDİ AI** — antrenör Enes'in dijital koçuyum. 🐾\n\nBir gözüm mavi, diğeri yeşil. Verilerine bakarak gerçek analiz yaparım — uydurma yok.\n\nNe sormak istiyorsun?`,
    `**KEDİ AI** olarak görevim seni en iyi halinde antrenmanına hazırlamak! 🥊\n\nTeknik analiz, öğrenciye özel beslenme, motivasyon, randevu takibi — buradayım.`,
  ]);
}

/* ── XP handler ──────────────────────────────────────────────────── */

function handleXP(name: string, ctx: StudentContext): string {
  const xp      = ctx.xp;
  const GIFT    = 5000;
  const total   = xp.breakdown.total;
  const toGift  = Math.max(0, GIFT - total);
  const pct     = Math.min(100, Math.round((total / GIFT) * 100));
  const filled  = Math.round(pct / 10);
  const bar     = "█".repeat(filled) + "░".repeat(10 - filled);

  let msg = `${name}, XP durumun:\n\n`;
  msg += `⚡ **Toplam XP**: ${total.toLocaleString()}\n`;
  msg += `${bar} ${pct}%\n\n`;
  msg += `📊 **Nasıl kazandın:**\n`;
  msg += `• Ders tamamlama: +${xp.breakdown.lessonsXP} XP\n`;
  if (xp.breakdown.streakXP > 0)
    msg += `• Seri bonusu (${xp.maxStreak} derslik seri): +${xp.breakdown.streakXP} XP\n`;
  if (xp.breakdown.improvementXP > 0)
    msg += `• Puan artışı: +${xp.breakdown.improvementXP} XP\n`;
  if (xp.breakdown.absenceDeduction < 0)
    msg += `• Devamsızlık: ${xp.breakdown.absenceDeduction} XP\n`;

  if (xp.gold5kReached) {
    msg += `\n🎁 **5000 XP'ye ulaştın!** Antrenörün Enes onaylamasını bekle — 1 ders hediye gelecek!`;
    if (xp.diamond10kReached) {
      msg += `\n💎 **10000 XP'ye de ulaştın!** 2. hediye ders hakkın var — admin onayı bekliyor!`;
    }
  } else {
    msg += `\n🎁 **Hediye Ders için**: ${toGift.toLocaleString()} XP daha gerekiyor\n`;
    msg += `💡 Her ders +100 XP, her 5 ders üst üste +250 XP bonus!`;
  }

  return msg;
}

/* ── Hedef handler ───────────────────────────────────────────────── */

function handleGoal(name: string, ctx: StudentContext, userMsg: string): string {
  const m = userMsg.toLowerCase();
  const goalMap: Record<string, string> = {
    "kilo ver": "kilo-verme", "zayıfla": "kilo-verme", "yağ yak": "kilo-verme",
    "kondisyon": "kondisyon", "kilo al": "kilo-alma", "kas yap": "kilo-alma",
    "güç": "kondisyon", "maç": "musabaka", "müsabaka": "musabaka",
    "teknik": "teknik", "esneklik": "esneklik", "düzenli": "duzensiz-katilim",
  };

  let detected: string | null = null;
  for (const [kw, g] of Object.entries(goalMap)) {
    if (m.includes(kw)) { detected = g; break; }
  }

  if (detected) {
    if (typeof window !== "undefined") localStorage.setItem("kedi_ai_goal", detected);

    const advice: Record<string, string> = {
      "kilo-verme":  `${name}, **Kilo Verme** hedefi kaydedildi! 🎯\n\nStrateji:\n• Haftada en az 3 ders — kalori yakımı için\n• Antrenman günü karbonhidrat zamanla\n• Günlük kalori açığı: 300-400 kcal\n• Şeker + işlenmiş gıda: sıfır\n\n📝 **Bu Hafta Görev**: Sağlık sekmesinden kalori takibini başlat. Verilerini görünce daha net öneri veririm!`,
      "kondisyon":   `${name}, **Kondisyon** hedefi harika! 💪\n\nProgram:\n• Haftada 3-4 ders\n• Ders arası HIIT + ip atlama\n• Protein: Kg × 1.8g\n\n📊 Teknik puanlarına bakarak zayıf alanı önce çalışacağız. ${ctx.records[0] ? `Son ders ortalaması **${ctx.records[0].overall}/10** — bu alanı büyütme fırsatımız var.` : "İlk ders sonrası kişisel plan yapayım."}`,
      "musabaka":    `${name}, ciddi hedef — **Müsabaka Hazırlığı**! 🥊\n\nKritikler:\n• Haftada 4-5 ders zorunlu\n• Spar çalışması önce savunma geliştir\n• Kilo yönetimi başlat (beslenme sorusu sor)\n\n⚠️ **Önemli**: Enes Hoca ile özel maç planı konuş — hemen mesaj at!`,
      "teknik":      `${name}, **Teknik Geliştirme** için:\n\n${ctx.records[0] ? `Son ders analizin:\n🎯 Önce **${([["Yumruk", ctx.records[0].punch], ["Tekme", ctx.records[0].kick], ["Savunma", ctx.records[0].defense], ["Kombinasyon", ctx.records[0].combination], ["Serbest Çalışma", ctx.records[0].sparring]] as [string,number][]).sort((a,b) => a[1]-b[1])[0][0]}** alanında odaklan (en düşük puan)\n• Her derste 1 alan hedefle\n• Ev pratiği: gölge boks + ayna` : "İlk ders sonrası zayıf alan tespiti yapayım."}`,
      "esneklik":    `${name}, **Esneklik** hedefi:\n\n• Her antrenman sonrası 15 dk esneme zorunlu\n• Sabah 10 dk bel + kalça açıcı\n• Foam roller — bacak + sırt\n\nEsneklik tekme yüksekliğini direk etkiler — ihmal etme!`,
      "kilo-alma":   `${name}, **Kas/Kilo Alma** hedefi:\n\n• Kalori fazlası: +300-500 kcal/gün\n• Protein: Kg × 2.2g\n• Uyku: minimum 8 saat — kas orada büyür\n• Antrenman sonrası 30 dk içinde yemek şart`,
      "duzensiz-katilim": `${name}, **Düzenli Katılım** hedefi:\n\n${ctx.xp.currentStreak > 0 ? `Şu an **${ctx.xp.currentStreak} derslik** serin var — devam et!` : "Şu an serisiz — yeni seri başlatma zamanı!"}\n\n🎯 Hedef: Üst üste 5 ders → +250 XP bonus\n• Randevuyu haftanın aynı günlerine koy\n• 18 saatten önce iptal et — XP kaybetme`,
    };

    return advice[detected] ?? `${name}, hedefin kaydedildi! Artık buna göre öneri vereceğim. 🐾`;
  }

  const current = ctx.goal
    ? `Şu anki hedefin: **${ctx.goal}**\n\n`
    : "";

  return `${name}, ${current}Hedef belirle ve sana özel plan yapayım:\n\n🏃 **"kilo vermek istiyorum"**\n💪 **"kondisyon artırmak istiyorum"**\n🥊 **"maça hazırlanıyorum"**\n🎯 **"tekniğimi geliştirmek istiyorum"**\n🧘 **"esnekliğimi artırmak istiyorum"**\n💪 **"kas yapmak istiyorum"**\n📅 **"düzenli katılmak istiyorum"**`;
}

/* ── Uygulama kılavuzu handler ───────────────────────────────────── */

function handleAppInfo(msg: string, name: string): string {
  if (/randevu.*nasıl|nasıl.*randevu|nereden randevu|randevu al/.test(msg))
    return `${name}, randevu almak basit!\n\n📅 **Adımlar:**\n1. Alt menüden **"Randevu"** sekmesine git\n2. Takvimden müsait sloту seç\n3. Onay bekleme — uygun slot varsa hemen kaydolur\n\n⚠️ **18 Saat Kuralı:** Randevunu en az **18 saat önceden** iptal etmezsen ders hakkın düşer!`;

  if (/iptal.*kural|18 saat|son dakika iptal|iptal neden/.test(msg))
    return `${name}, iptal kuralı:\n\n⚠️ **18 Saat Kuralı:**\nRandevunu en az **18 saat önce** iptal etmezsen ders hakkın otomatik düşer.\n\nÖrnek: Yarın saat 10:00 dersin varsa → bu gece **saat 16:00'ya** kadar iptal edebilirsin.\n\nAdmin iptal ederse ders hakkın iade edilir. Öğrenci iptali geç olursa iade yok.`;

  if (/rozet.*nasıl|rozetler.*çalış|badge/.test(msg))
    return `${name}, rozet sistemi:\n\n🏅 **Nasıl Kazanılır:**\n• İlk ders tamamlandığında\n• 5, 10, 25, 50 ders milestone\n• Üst üste devamsızlık yoksa (5/10 ders)\n• Teknik puanın 8+ veya 9+\n• 30 gün aktif\n• KEDİ AI ile ilk konuşma\n\n"Rozetlerim" sayfasında kilidi açılanlara ve ilerlemene bakabilirsin! 🐾`;

  if (/xp.*nasıl|puan nasıl|enerji puan.*çalış/.test(msg))
    return `${name}, XP sistemi:\n\n⚡ **Kazanma:**\n• Ders tamamlama: +100 XP\n• Üst üste 5 ders: +250 XP bonus\n• Teknik puan artışı: +100 XP\n\n⚠️ **Kaybetme:**\n• Gelmedi: -100 XP\n\n🎁 **5000 XP** → Antrenör onayıyla 1 hediye ders!\n\nXP durumun için "xp durumum" yaz.`;

  if (/hedef.*nasıl|hedef sistem/.test(msg))
    return `${name}, hedef sistemi:\n\nKEDİ AI'a hedefini söyle — örn: "hedefim kilo vermek"\n\nBuna göre sana özel antrenman ve beslenme önerileri vereceğim.\n\n🎯 Hedefler: kilo verme, kondisyon, teknik, esneklik, maç hazırlığı, kas yapma, düzenli katılım.`;

  if (/ai antrenman|antrenman.*yapay zeka/.test(msg))
    return `${name}, **AI Antrenman** özelliği:\n\n💪 Alt menüden **"Antrenman"** sekmesine git\n• Seviyeni, hedefini, haftada kaç gün antrenman yaptığını seç\n• Ekipmana göre özelleştirilmiş program oluşturulur\n• Her gün farklı odak: yumruk, tekme, kondisyon, güç`;

  if (/ai diyet|beslenme.*yapay zeka|diyet.*plan/.test(msg))
    return `${name}, beslenme planı için bana doğrudan sor!\n\n🥗 "Beslenme öner" veya "ne yesem" de — kilonu ve hedefini sorarsam yaz, kişisel plan yapayım!`;

  if (/paket.*nereden|paket nasıl|kalan ders.*nerede/.test(msg))
    return `${name}, paket bilgilerini birkaç yerden görebilirsin:\n\n📱 **Ana ekran**: Kalan ders sayısı\n👤 **Profil**: Paket detayları ve bitiş tarihi\n💬 **KEDİ AI**: "kalan dersim kaç?" de\n\nYeni paket için WhatsApp butonuna bas, Enes Hoca seçenekleri anlatır!`;

  return `${name}, uygulamada yapabileceklerin:\n\n📅 **Randevu** — müsait slottan ders al (18 saat kuralı)\n📊 **Gelişim** — teknik puanlarını ve trend\n🏋️ **Antrenman** — AI destekli program\n💧 **Sağlık** — su, kalori, kilo takibi\n🏅 **Rozetler** — başarı koleksiyonu + XP\n💬 **KEDİ AI** — her şeyi sor!\n\nNe hakkında yardım istersin?`;
}

/* ── Varsayılan handler ──────────────────────────────────────────── */

function handleDefault(name: string, ctx: StudentContext): string {
  return pick([
    `${name}, şu konularda yardımcı olabilirim:\n\n🏋️ **"Antrenman programı"** — bugünkü özel plan\n📊 **"Teknik analizim"** — yumruk, tekme, savunma\n🥗 **"Beslenme öner"** — kişisel plan\n📅 **"Randevum ne zaman?"** — takvim kontrolü\n⚡ **"XP durumum"** — puan ve hediye ders\n🎯 **"Hedefim kilo vermek"** — hedefe özel plan`,
    `Bunu tam anlayamadım ${name}, ama buradayım! Dene: "Bugün ne antrenman yapayım?" veya "Teknik analizim nasıl?" 🐾`,
    `${name}, ${ctx.completedLessons} derslik bir geçmişin var. Hangi alanda ilerlemek istiyorsun? Antrenman, beslenme, teknik, randevu — söyle! 🥊`,
  ]);
}

/* ── buildContext — açılış mesajı ────────────────────────────────── */

function buildContext(ctx: StudentContext): string {
  const firstName  = ctx.name.split(" ")[0];
  const last       = ctx.records[0];
  const upcoming   = ctx.appointments
    .filter(a => a.status === "onaylandi" && isUpcomingApt(a))
    .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
  const lastApt    = ctx.appointments.filter(a => a.status === "tamamlandi")[0];
  const daysSince  = lastApt ? differenceInDays(new Date(), parseISO(lastApt.date)) : 999;
  const lowLessons = ctx.subscriptionType !== "monthly" && ctx.remainingLessons <= 4;
  const xp         = ctx.xp;

  const lines: string[] = [`Merhaba **${firstName}**! 🐾 Ben **KEDİ AI**, senin kişisel AI antrenör koçunum.`];

  // Paket durumu
  if (ctx.subscriptionType === "monthly") {
    lines.push(`Aylık üyeliğinle sınırsız ders alabilirsin. Randevu almanı öneriyorum!`);
  } else if (ctx.remainingLessons === 0) {
    lines.push(`⚠️ **Ders hakkın tükendi.** Yeni paket için antrenörünle iletişime geç — WhatsApp butonu hazır!`);
  } else {
    lines.push(`Şu an **${ctx.remainingLessons}** ders hakkın var, toplamda **${ctx.completedLessons}** ders tamamladın.`);
    if (lowLessons) lines.push(`⚠️ Ders hakkın azalıyor — yeni paket almayı planla!`);
  }

  // Randevu durumu
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const isToday = next.date === todayStr();
    lines.push(isToday
      ? `🥊 **Bugün dersin var!** Saat **${next.startTime}** — hazır ol!`
      : `📅 Yaklaşan ders: **${format(parseISO(next.date), "d MMMM EEEE", { locale: tr })}** saat **${next.startTime}**.`
    );
  } else if (daysSince > 14) {
    lines.push(`⏰ **${daysSince} gündür** ders almamışsın. Randevu almayı düşün!`);
  }

  // Teknik özet
  if (last) {
    const scores: [string, number][] = [
      ["Yumruk", last.punch], ["Tekme", last.kick], ["Savunma", last.defense],
      ["Kombinasyon", last.combination], ["Serbest Çalışma", last.sparring],
    ];
    const weak = [...scores].sort((a, b) => a[1] - b[1])[0];
    if (last.overall >= 9)      lines.push(`🌟 Son dersinde **${last.overall}/10** — olağanüstü!`);
    else if (last.overall >= 8) lines.push(`⭐ Son dersinde **${last.overall}/10**. Harika gidiyorsun!`);
    else                        lines.push(`📊 Son dersinde **${last.overall}/10** — **${weak[0]}** geliştirilebilir.`);
  } else {
    lines.push(`Henüz ders kaydın yok. İlk ders sonrası sana özel analiz yapacağım!`);
  }

  // XP özeti
  const toGiftXP = Math.max(0, 5000 - xp.breakdown.total);
  lines.push(`⚡ **XP**: ${xp.breakdown.total.toLocaleString()} puan${xp.gold5kReached ? " | 🎁 Hediye ders bekliyor!" : ` | Hediye ders için ${toGiftXP.toLocaleString()} XP kaldı`}`);

  lines.push(`\nNe hakkında konuşmak istersin?`);
  return lines.join(" \n");
}

/* ── Ana yanıt motoru ────────────────────────────────────────────── */

function aiRespond(
  userMsg: string,
  ctx: StudentContext,
  _history: Msg[],
  pendingIntent: string | null,
): { reply: string; nextPending?: string } {
  const msg    = userMsg.toLowerCase();
  const name   = ctx.name.split(" ")[0];

  // Multi-turn: Beslenme sorusu yanıt bekliyor
  if (pendingIntent?.startsWith("nutrition")) {
    return handleNutrition(name, ctx, pendingIntent, userMsg);
  }

  const intent = detectIntent(msg);

  if (intent === "nutrition") {
    return handleNutrition(name, ctx, null, userMsg);
  }

  const reply = (() => {
    switch (intent) {
      case "training":    return handleTraining(name, ctx);
      case "technical":   return handleTechnical(name, ctx);
      case "lesson":      return handleLesson(name, ctx);
      case "appointment": return handleAppointment(name, ctx);
      case "progress":    return handleProgress(name, ctx);
      case "motivation":  return handleMotivation(name, ctx);
      case "water":       return handleWater(name, ctx);
      case "greeting":    return handleGreeting(name, ctx);
      case "badge":       return handleBadge(name, ctx);
      case "identity":    return handleIdentity();
      case "xp":          return handleXP(name, ctx);
      case "goal":        return handleGoal(name, ctx, userMsg);
      case "appinfo":     return handleAppInfo(msg, name);
      default:            return handleDefault(name, ctx);
    }
  })();

  return { reply };
}

/* ── Mesaj bubble ─────────────────────────────────────────────────── */

function MsgBubble({ msg }: { msg: Msg }) {
  const parsed = msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} style={{ color: "#C4B5FD" }}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );

  if (msg.role === "ai") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, x: -8 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        transition={{ duration: 0.25 }}
        className="flex gap-2.5 items-end"
      >
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
          <CatIcon size={20} />
        </div>
        <div className="max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)",
            color:"rgba(255,255,255,0.85)", fontFamily:"var(--font-inter)", borderRadius:"0 12px 12px 12px" }}>
          {parsed}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, x: 8 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed"
        style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)",
          color:"rgba(255,255,255,0.9)", fontFamily:"var(--font-inter)", borderRadius:"12px 0 12px 12px" }}>
        {msg.text}
      </div>
    </motion.div>
  );
}

/* ── Yazıyor göstergesi ───────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:4 }}
      className="flex items-end gap-2.5">
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background:"rgba(139,92,246,0.15)", border:"1px solid rgba(139,92,246,0.3)" }}>
        <CatIcon size={20} />
      </div>
      <div className="px-4 py-3 flex items-center gap-1"
        style={{ background:"rgba(139,92,246,0.1)", border:"1px solid rgba(139,92,246,0.2)", borderRadius:"0 12px 12px 12px" }}>
        {[0,1,2].map(i => (
          <motion.div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background:"#8B5CF6" }}
            animate={{ y:[0,-4,0] }} transition={{ duration:0.7, repeat:Infinity, delay:i*0.15 }} />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Ana bileşen ─────────────────────────────────────────────────── */

export default function BlackCatAI() {
  const { student }         = useAuth();
  const [open, setOpen]         = useState(false);
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [minimized, setMin]     = useState(false);
  const [pendingIntent, setPendingIntent] = useState<string | null>(null);

  /* Sürükleme */
  const constraintRef = useRef<HTMLDivElement>(null);
  const [didDrag, setDidDrag] = useState(false);

  /* Gecikmeli görünürlük (initial animation delay) */
  const [appeared, setAppeared] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAppeared(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const [ctx, setCtx] = useState<StudentContext | null>(null);

  /* Veri yükle */
  useEffect(() => {
    if (!student || loaded) return;
    Promise.all([
      getStudentAppointments(student.id),
      getLessonRecords(student.id),
      getWaterLog(student.id, todayDate()).catch(() => null),
      getHealthProfile(student.id).catch(() => null),
    ]).then(([apts, recs, water, health]) => {
      const sorted = [...recs].sort((a, b) => b.date.localeCompare(a.date));
      const sortedApts = [...apts].sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`));
      const xp = computeXPFromData(student.completedLessons, apts, sorted);

      // localStorage'dan hedef oku
      const savedGoal = typeof window !== "undefined"
        ? localStorage.getItem("kedi_ai_goal") ?? undefined
        : undefined;

      const ctx: StudentContext = {
        name:             student.fullName,
        studentId:        student.id,
        remainingLessons: student.remainingLessons,
        completedLessons: student.completedLessons,
        totalLessons:     student.totalLessons,
        level:            student.level,
        appointments:     sortedApts,
        records:          sorted,
        waterGlasses:     water?.glasses ?? 0,
        waterTarget:      8,
        subscriptionType: student.subscriptionType,
        weight:           health?.weight ?? student.weight,
        age:              health?.age    ?? student.age,
        height:           health?.height,
        gender:           health?.gender,
        goal:             savedGoal,
        xp,
      };

      setCtx(ctx);
      setLoaded(true);

      // 5000 veya 10000 XP eşiğine ulaştıysa admin'e talep gönder
      if (xp.gold5kReached) {
        createGiftLessonRequest(student.id, student.fullName, xp.breakdown.total).catch(() => {});
      }
    }).catch(() => setLoaded(true));
  }, [student, loaded]);

  /* İlk açılışta karşılama */
  useEffect(() => {
    if (!open || !ctx || msgs.length > 0) return;
    setTyping(true);
    const timer = setTimeout(() => {
      setMsgs([{ id:"init", role:"ai", text: buildContext(ctx), ts: Date.now() }]);
      setTyping(false);
      if (typeof window !== "undefined") localStorage.setItem("kedi_ai_used", "1");
    }, 900);
    return () => clearTimeout(timer);
  }, [open, ctx, msgs.length]);

  /* Scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [msgs, typing]);

  /* Input focus */
  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open, minimized]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !ctx) return;
    const userMsg: Msg = { id: Date.now().toString(), role:"user", text: input.trim(), ts: Date.now() };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const { reply, nextPending } = aiRespond(userMsg.text, ctx, msgs, pendingIntent);
      setPendingIntent(nextPending ?? null);
      setMsgs(prev => [...prev, { id:(Date.now()+1).toString(), role:"ai", text:reply, ts:Date.now() }]);
      setTyping(false);
    }, 600 + Math.random() * 800);
  }, [input, ctx, msgs, pendingIntent]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!student) return null;

  return (
    <>
      {/* ── Drag sınırı: tüm ekranı kapsar, pointer-events yok ─── */}
      <div
        ref={constraintRef}
        style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:49 }}
      />

      {/* ── Floating buton ─────────────────────────────────────── */}
      <motion.button
        drag
        dragMomentum={false}
        dragConstraints={constraintRef}
        dragElastic={0.05}
        onDragStart={() => setDidDrag(true)}
        onDragEnd={() => setTimeout(() => setDidDrag(false), 100)}
        onClick={() => { if (!didDrag) { setOpen(o => !o); setMin(false); } }}
        initial={false}
        animate={{
          scale:   appeared ? 1 : 0,
          opacity: appeared ? (open ? 1 : 0.72) : 0,
        }}
        whileHover={{ opacity: 1, scale: 1.07 }}
        whileTap={{ scale: 0.91 }}
        transition={{ type:"spring", stiffness:280, damping:22 }}
        aria-label="KEDİ AI Koç — tıkla veya sürükle"
        style={{
          position:     "fixed",
          bottom:       "calc(env(safe-area-inset-bottom, 0px) + 88px)",
          right:        20,
          zIndex:       50,
          width:        56,
          height:       56,
          borderRadius: "50%",
          background:   "radial-gradient(circle at 38% 38%, #1e1040, #0a0718)",
          border:       open ? "2px solid rgba(139,92,246,0.9)" : "2px solid rgba(139,92,246,0.5)",
          boxShadow:    open
            ? "0 0 0 3px rgba(139,92,246,0.22), 0 0 28px rgba(139,92,246,0.75), 0 0 56px rgba(139,92,246,0.22)"
            : "0 0 18px rgba(139,92,246,0.45), 0 4px 14px rgba(0,0,0,0.5)",
          cursor:       "grab",
          touchAction:  "none",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
        }}
      >
        {/* Beyaz daire arka plan — kedi kontrast için */}
        <div style={{
          position:     "absolute",
          width:        40,
          height:       40,
          borderRadius: "50%",
          background:   "rgba(255,255,255,0.93)",
          boxShadow:    "inset 0 0 0 1px rgba(139,92,246,0.15)",
        }} />

        {/* Kedi SVG */}
        <div style={{ position:"relative", zIndex:1 }}>
          <CatIcon size={34} />
        </div>

        {/* Nabız glow — sadece kapalıyken */}
        {!open && appeared && (
          <motion.div
            style={{
              position:     "absolute",
              inset:        0,
              borderRadius: "50%",
              border:       "1.5px solid rgba(139,92,246,0.55)",
              pointerEvents:"none",
            }}
            animate={{ scale:[1, 1.4, 1], opacity:[0.6, 0, 0.6] }}
            transition={{ duration:2.4, repeat:Infinity }}
          />
        )}
      </motion.button>

      {/* ── Chat paneli ─────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Mobil overlay */}
            <motion.div
              className="fixed inset-0 sm:hidden"
              style={{ zIndex:54, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)" }}
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity:0, y:24, scale:0.96 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:24, scale:0.96 }}
              transition={{ type:"spring", stiffness:320, damping:28 }}
              className="fixed flex flex-col kara-panel"
              style={{
                zIndex:     55,
                background: "rgba(10,7,20,0.98)",
                border:     "1px solid rgba(139,92,246,0.28)",
                boxShadow:  "0 0 0 1px rgba(139,92,246,0.1), 0 24px 80px rgba(0,0,0,0.85), 0 0 60px rgba(139,92,246,0.14)",
              }}
            >
              {/* Üst neon şerit */}
              <div className="absolute top-0 left-0 right-0 h-0.5 flex-shrink-0"
                style={{ background:"linear-gradient(90deg,transparent,#7C3AED,#A78BFA,#7C3AED,transparent)" }} />

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                style={{ borderBottom:"1px solid rgba(139,92,246,0.12)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background:"rgba(255,255,255,0.9)", border:"1px solid rgba(139,92,246,0.3)" }}>
                    <CatIcon size={24} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-wider"
                      style={{ color:"#C4B5FD", fontFamily:"var(--font-bebas)", letterSpacing:"0.12em" }}>
                      KEDİ AI
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                        Kişisel Antrenör Koçun
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMin(m => !m)}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    style={{ color:"rgba(255,255,255,0.3)" }}
                    aria-label="Küçült"
                  >
                    <ChevronDown size={15} style={{ transform: minimized ? "rotate(180deg)" : "none" }} />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                    style={{ color:"rgba(255,255,255,0.3)" }}
                    aria-label="Kapat"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Mesaj alanı + input */}
              {!minimized && (
                <>
                  <div
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
                    style={{ overscrollBehavior:"contain", WebkitOverflowScrolling:"touch" } as React.CSSProperties}
                  >
                    <AnimatePresence initial={false}>
                      {msgs.map(m => <MsgBubble key={m.id} msg={m} />)}
                      {typing && <TypingIndicator key="typing" />}
                    </AnimatePresence>
                    <div ref={bottomRef} />
                  </div>

                  {/* Hızlı sorular */}
                  {msgs.length <= 1 && (
                    <div className="flex-shrink-0 px-4 pb-2 flex gap-2 flex-wrap">
                      {["Bugün ne antrenman yapayım?", "Randevum ne zaman?", "Beslenme önerisi", "XP durumum"].map(q => (
                        <button
                          key={q}
                          onClick={() => {
                            if (!ctx) return;
                            const userMsg: Msg = { id:Date.now().toString(), role:"user", text:q, ts:Date.now() };
                            setMsgs(prev => [...prev, userMsg]);
                            setTyping(true);
                            setTimeout(() => {
                              const { reply, nextPending: np } = aiRespond(q, ctx, msgs, null);
                              setPendingIntent(np ?? null);
                              setMsgs(prev => [...prev, { id:(Date.now()+1).toString(), role:"ai", text:reply, ts:Date.now() }]);
                              setTyping(false);
                            }, 700 + Math.random() * 600);
                          }}
                          className="text-[10px] px-2.5 py-1 transition-all duration-200"
                          style={{
                            fontFamily:  "var(--font-barlow-condensed)",
                            background:  "rgba(139,92,246,0.08)",
                            border:      "1px solid rgba(139,92,246,0.22)",
                            color:       "#A78BFA",
                            borderRadius: 6,
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Input */}
                  <div className="flex-shrink-0 flex items-center gap-2 px-3 py-3"
                    style={{ borderTop:"1px solid rgba(139,92,246,0.1)" }}>
                    <input
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Bir şey sor…"
                      className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/20"
                      style={{ fontFamily:"var(--font-inter)" }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || typing}
                      className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 flex-shrink-0"
                      style={{
                        background: input.trim() && !typing ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${input.trim() && !typing ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)"}`,
                        color: input.trim() && !typing ? "#C4B5FD" : "rgba(255,255,255,0.2)",
                      }}
                      aria-label="Gönder"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
