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

export const TRAINER_WHATSAPP = "905001234567";
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
