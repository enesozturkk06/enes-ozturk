/** Ders sayısına göre paket fiyatları (TL) */
export const LESSON_PRICES: Record<number, number> = {
  8:  10000,
  10: 12000,
  12: 13500,
};

/** Ders sayısına göre paket geçerlilik süresi (gün) */
export const LESSON_DURATIONS: Record<number, number> = {
  8:  45,
  10: 60,
  12: 75,
};

/** Aylık sınırsız üyelik geçerlilik süresi (gün) */
export const MONTHLY_DURATION_DAYS = 30;

/** Eşleşme bulunamazsa kullanılacak varsayılan paket süresi (gün) */
export const DEFAULT_DURATION_DAYS = 45;

/** Paket süresi uyarı eşikleri (gün) */
export const PACKAGE_WARNING_DAYS = 14;
export const PACKAGE_URGENT_DAYS = 6;

/** Randevu sayfasındaki bilgi ikonu açıklaması */
export const PACKAGE_DURATION_INFO_TEXT =
  "Ders paketleri belirlenen süre içinde kullanılmalıdır. Bunun sebebi antrenman düzenini korumak, gelişimi aksatmamak ve program yoğunluğunu adil şekilde yönetmektir. Paket süresi dolmadan randevularını planlamanı öneririz.";

/** Paket süresi dolduğunda gösterilecek mesaj */
export const PACKAGE_EXPIRED_TEXT =
  "Paket süren doldu. Yeni paket için antrenörünle iletişime geç.";

export const PACKAGES = [
  {
    id: "pkg-1",
    name: "Savaşçı",
    type: "savasci" as const,
    lessonCount: 8,
    price: 1490,
    durationDays: 45,
    description: "Başlangıç seviyesi için ideal",
  },
  {
    id: "pkg-2",
    name: "Şampiyon",
    type: "sampiyon" as const,
    lessonCount: 16,
    price: 2490,
    durationDays: 60,
    description: "En popüler paket",
  },
  {
    id: "pkg-3",
    name: "Efsane",
    type: "efsane" as const,
    lessonCount: 32,
    price: 3990,
    durationDays: 90,
    description: "Profesyoneller için",
  },
];

export const TRAINER_WHATSAPP = "905389714459";
export const TRAINER_NAME = "Antrenör Enes Öztürk";
export const CANCEL_LIMIT_HOURS = 18;

export const SCORE_LABELS: Record<string, string> = {
  conditioning: "Kondisyon",
  punch: "Yumruk",
  kick: "Tekme",
  defense: "Savunma",
  combination: "Kombinasyon",
  sparring: "Serbest Çalışma",
  overall: "Genel Gelişim",
};

export const LEVEL_LABELS = {
  baslangic: "Başlangıç",
  orta: "Orta Seviye",
  ileri: "İleri Seviye",
};

export const STATUS_LABELS = {
  onaylandi: "Onaylandı",
  iptal: "İptal",
  tamamlandi: "Tamamlandı",
  gelmedi: "Gelmedi",
};

export const PAYMENT_LABELS = {
  odendi: "Ödendi",
  kismi: "Kısmi Ödeme",
  beklemede: "Beklemede",
};

export const WEEK_DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
export const WEEK_DAYS_FULL = [
  "Pazartesi", "Salı", "Çarşamba",
  "Perşembe", "Cuma", "Cumartesi", "Pazar",
];

export const DEFAULT_WORKING_HOURS = {
  start: "09:00",
  end: "21:00",
  slotMinutes: 60,
};
