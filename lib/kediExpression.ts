/**
 * lib/kediExpression.ts — Kedi Life Expression System sözleşmesi.
 *
 * Katman: Gameplay Systems (bkz. lib/kediEquipment.ts üstündeki not — aynı
 * konum). Hangi gerçek uygulama olayının avatarın yüzünde hangi ifadeyi
 * (AvatarExpression, bkz. lib/types.ts) tetiklemesi GEREKTİĞİNİ tanımlar.
 *
 * KASITLI OLARAK YOK — bu SADECE bir eşleme tablosudur, hiçbir olayı
 * DİNLEMİYOR. Giriş/XP/rozet/Vision/Kedi AI konuşma olaylarının GERÇEKTEN
 * bu tabloyu çağırması ayrı bir entegrasyon adımı (login akışı, XP ödül
 * kodu, Vision analiz sonucu, Kedi AI chat route'u — hiçbiri şu an bu
 * dosyayı import ETMİYOR). Motor dosyalarına da BAĞIMLI DEĞİLDİR.
 */
import type { AvatarExpression } from "./types";

/** Bir expression'ı tetikleyebilecek gerçek uygulama olayı. */
export type ExpressionTrigger =
  | "login"            // öğrenci uygulamayı açtı
  | "xpGain"           // XP kazandı
  | "missedSession"    // planlanan dersi kaçırdı
  | "badgeUnlock"      // yeni rozet açıldı
  | "trainingStart"    // "Antrenmanı Başlat" tıklandı
  | "sessionEnd"       // antrenman/ders bitti
  | "visionAnalyzing"  // Kedi AI Vision analiz yapıyor
  | "aiSpeaking";       // Kedi AI konuşuyor/yazıyor

export const EXPRESSION_TRIGGER_MAP: Record<ExpressionTrigger, AvatarExpression> = {
  login: "greet",
  xpGain: "happy",
  missedSession: "sad",
  badgeUnlock: "proud",
  trainingStart: "focus",
  sessionEnd: "tired",
  visionAnalyzing: "thinking",
  aiSpeaking: "talking",
};

export function getExpressionForTrigger(trigger: ExpressionTrigger): AvatarExpression {
  return EXPRESSION_TRIGGER_MAP[trigger];
}
