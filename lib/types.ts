export type PackageType      = "savasci" | "sampiyon" | "efsane";
export type SubscriptionType = "lesson_pack" | "monthly";
export type PaymentStatus    = "odendi" | "kismi" | "beklemede";
export type AppointmentStatus= "onaylandi" | "iptal" | "tamamlandi" | "gelmedi";
export type LessonType       = "bireysel" | "duet" | "grup";
export type AttendanceStatus = "pending" | "attended" | "absent";
export type InviteStatus     = "pending" | "accepted" | "declined";
export type ParticipantRole  = "creator" | "partner";
export type NotifType        = "info" | "warning" | "success" | "reminder";
export type UserRole         = "student" | "admin" | "salon_owner";

export interface Student {
  id: string; code: string; fullName: string; phone: string; email?: string;
  packageType: PackageType; packageId?: string; customPrice?: number;
  totalLessons: number; remainingLessons: number; completedLessons: number;
  paymentStatus: PaymentStatus; amountPaid: number; amountDue: number;
  packageStartDate: string; packageEndDate: string;
  notes?: string; isActive: boolean; createdAt: string;
  level: "baslangic" | "orta" | "ileri"; weight?: number; age?: number;
  /** Ders paketi mi yoksa aylık üyelik mi — default: lesson_pack */
  subscriptionType?: SubscriptionType;
  /** Aylık üyelik aylık tutarı */
  monthlyFee?: number;
  /** Onur Listesi'nde (Hall of Fame) görünmek istiyor mu — default: true */
  showInHallOfFame?: boolean;
  /** Admin tarafından Onur Listesi'nde manuel öne çıkarılmış mı */
  hallFeatured?: boolean;
  /** Admin tarafından "Ayın Sporcusu" olarak seçilmiş mi */
  isStudentOfMonth?: boolean;
  /** Supabase Storage'daki profil fotoğrafı URL'si */
  avatarUrl?: string;
  /** Gelir paylaşımlı çalıştığı salon — gyms tablosuna referans, yoksa salon payı yok.
   *  null = düzenleme formundan açıkça temizlendi (undefined = dokunulmadı) */
  gymId?: string | null;
  /** Öğrenciye özel anlaşma — tanımlıysa salonun varsayılan anlaşmasını ezer */
  gymShareOverrideType?: GymShareType | null;
  gymShareOverrideValue?: number | null;
  /** Ders bilgilendirme kartını (süre, iptal kuralı vb.) onayladı mı — default: false */
  rulesAccepted?: boolean;
  /** Kedi AI Ultra tanıtım ekranını (tek seferlik "Başlayalım" karşılama) gördü mü — default: false */
  kediIntroSeen?: boolean;
}

/* ── Salon Gelir Paylaşımı ────────────────────────────────────────── */

export type GymShareType = "fixed_per_lesson" | "percentage" | "no_share";

export interface Gym {
  id: string;
  name: string;
  shareType: GymShareType;
  /** share_type='fixed_per_lesson' iken: ders başı salona ödenecek tutar */
  fixedLessonFee?: number;
  /** share_type='percentage' iken: salonun yüzdesi (0-100) */
  gymPercentage?: number;
  /** Bilgi amaçlı — 100 - gymPercentage */
  trainerPercentage?: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export type IncomeMovementType = "yeni_paket" | "paket_yenileme" | "ek_odeme" | "ders_tamamlama";

/** Gelir Hareketleri — her ödeme ve her ders tamamlama otomatik buraya düşer */
export interface IncomeMovement {
  id: string;
  studentId?: string;
  studentName: string;
  paymentId?: string;
  paymentType: IncomeMovementType;
  /** Bu satırda tahsil edilen tutar — ders_tamamlama satırlarında 0 */
  paymentAmount: number;
  /** odendi = gerçekten tahsil edildi, beklemede/gecikti = henüz tahsil edilmedi.
   *  Sadece "odendi" satırlar ciro/net kazanç toplamlarına dahil edilir. */
  status: PaymentRecordStatus;
  paymentDate: string;
  packageType?: string;
  gymId?: string;
  gymName?: string;
  /** Salonun bu satırdaki payı — ders_tamamlama satırlarında bu sefer tahakkuk eder */
  gymShareAmount: number;
  /** payment_amount - gym_share_amount (ders_tamamlama satırlarında negatif: -fixedLessonFee) */
  trainerNetAmount: number;
  note?: string;
  createdAt: string;
}

/* ── Grup Dersi Finans Modülü — özel ders sisteminden tamamen bağımsız ──── */

export type GroupShareType = "percentage" | "fixed_per_lesson" | "fixed_monthly_rent";

export interface GroupLesson {
  id: string;
  name: string;
  gymId?: string;
  trainerName?: string;
  /** Kişi başı aylık aidat */
  feePerStudent: number;
  shareType: GroupShareType;
  /** shareType='percentage' iken: salon payı % (eğitmen payı = 100 - bu) */
  gymPercentage?: number;
  /** shareType='fixed_per_lesson' iken: ders başı salona ödenecek sabit tutar */
  fixedFeePerLesson?: number;
  /** shareType='fixed_monthly_rent' iken: aylık sabit salon kirası */
  fixedMonthlyRent?: number;
  /** Doluluk oranı için — boşsa doluluk gösterilmez */
  maxCapacity?: number;
  startDate: string;
  endDate?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

/** Grup dersi üyesi — mutlaka uygulama hesabı olan bir öğrenci olmak zorunda değil */
export interface GroupLessonMember {
  id: string;
  groupId: string;
  /** Bağlıysa push hatırlatması alabilir, değilse sadece gelir/doluluk sayımına dahildir */
  studentId?: string;
  fullName: string;
  phone?: string;
  joinedAt: string;
  isActive: boolean;
  createdAt: string;
}

/** Aylık aidat dönemi — her üye × her ay için bir satır */
export interface GroupLessonPayment {
  id: string;
  memberId: string;
  groupId: string;
  /** 'yyyy-MM' */
  periodMonth: string;
  amount: number;
  status: PaymentRecordStatus;
  paidAt?: string;
  createdAt: string;
}

/** Sadece fixed_per_lesson gruplarında kullanılır — grup+ay başına tek satır */
export interface GroupLessonSession {
  id: string;
  groupId: string;
  periodMonth: string;
  sessionCount: number;
  createdAt: string;
}

/* ── Diğer Gelirler — seminer, sponsorluk, ürün satışı vb. ────────────── */

export type OtherIncomeType =
  | "seminer" | "workshop" | "sponsorluk" | "urun_satisi"
  | "online_ders" | "ozel_etkinlik" | "diger";

export interface OtherIncome {
  id: string;
  incomeType: OtherIncomeType;
  description?: string;
  amount: number;
  incomeDate: string;
  createdAt: string;
}

export interface TimeSlot {
  id: string; date: string; startTime: string; endTime: string;
  isAvailable: boolean; isBlocked: boolean; blockReason?: string;
}

export interface Appointment {
  id: string; studentId: string; studentName: string;
  studentCode: string; studentPhone: string;
  date: string; startTime: string; endTime: string;
  status: AppointmentStatus; lessonType: LessonType;
  cancelledAt?: string; completedAt?: string;
  notes?: string; createdAt: string;
}

/** Bir randevuya bağlı öğrenci kaydı */
export interface AppointmentStudent {
  id: string;
  appointmentId: string;
  studentId: string;
  studentName?: string;
  role: ParticipantRole;          // creator | partner
  inviteStatus: InviteStatus;     // pending | accepted | declined
  attendanceStatus: AttendanceStatus; // pending | attended | absent
  lessonDeducted: boolean;
  createdAt: string;
}

/** Bekleyen davet — öğrenci panelinde gösterilir */
export interface PendingInvite {
  appointmentId: string;
  appointmentStudentId: string;
  creatorName: string;
  date: string;
  startTime: string;
  endTime: string;
  lessonType: LessonType;
}

export interface DuetPartner {
  id: string; studentAId: string; studentBId: string; createdAt: string;
}

export interface CompleteResult {
  success: boolean; warnings: string[];
}

export interface LessonRecord {
  id: string; appointmentId: string; studentId: string; date: string;
  conditioning: number; punch: number; kick: number; defense: number;
  combination: number; sparring: number; overall: number;
  trainerNotes: string; durationMinutes: number; createdAt: string;
}

export interface Notification {
  id: string; studentId?: string; appointmentId?: string;
  title: string; message: string;
  type: NotifType; isRead: boolean; createdAt: string;
}

export interface BlockedDate { id: string; date: string; reason: string; createdAt: string; }

/** Kedi AI Ultra — kalıcı sohbet mesajı */
export type KediAiActorType = "student" | "admin";
export type KediAiRole      = "user" | "assistant";
export interface KediAiMessage {
  id: string; actorType: KediAiActorType; studentId?: string;
  role: KediAiRole; content: string; mood?: string; createdAt: string;
}

/** Kedi AI Ultra — derin hafıza: uzun vadeli, kalıcı tek bir "gerçek" */
export interface KediAiMemory {
  id: string; actorType: KediAiActorType; studentId?: string;
  fact: string; createdAt: string;
}

/** Kedi AI Ultra — yapılandırılmış antrenman + beslenme programı (madde: gerçek LLM ile üretilen premium program) */
export type KediSport = "kickboks" | "muaythai" | "boks" | "fitness";
export type KediProgramGoal = "kilo-verme" | "kilo-alma" | "kas-kazanma" | "yag-yakma" | "kondisyon";

export interface KediProgramExercise {
  name: string; sets?: string; reps?: string; duration?: string; notes?: string;
}
export interface KediProgramTrainingDay {
  day: string; focus: string; exercises: KediProgramExercise[];
}
export interface KediProgramWeek {
  weekNumber: number; focus: string; intensityNote: string;
}
export interface KediProgramMeal {
  name: string; items: string[]; calories: number; protein: number; carbs: number; fat: number;
}
export interface KediProgramAnalysis {
  attendanceSummary: string; performanceSummary: string; recommendations: string[];
  /** Bu programın NEDEN bu şekilde oluşturulduğunu (yaş/boy/kilo/hedef/spor/devamlılık/
   * performans/önceki programlar/gelişim/paket durumu üzerinden) kısaca açıklayan gerekçe —
   * Koç Merkezi'nde antrenöre gösterilir. */
  rationale?: string;
}
/** Sürüm geçmişi durumu — Koç Merkezi'ndeki taslak/onay/yayın akışı için. */
export type KediProgramStatus = "draft" | "published" | "archived";
export type KediProgramCreatedBy = "student" | "admin";

export interface KediProgram {
  id?: string; studentId: string;
  sport: KediSport; goalType: KediProgramGoal;
  dailyCalories: number; proteinG: number; carbsG: number; fatG: number;
  trainingDays: KediProgramTrainingDay[];
  monthlyProgression: KediProgramWeek[];
  meals: KediProgramMeal[];
  shoppingList: string[];
  analysis: KediProgramAnalysis;
  safetyNote: string;
  version?: number; status?: KediProgramStatus; createdBy?: KediProgramCreatedBy;
  isEdited?: boolean; changeNote?: string;
  createdAt?: string; updatedAt?: string;
}

/** Kedi AI Vision — fotoğraf/video teknik analizi (madde: gard/ayak/yumruk/omuz/
 * kalça rotasyonu/denge/vücut hizası analizi, video için teknik bazlı kare-kare
 * inceleme, 0-100 teknik skor + kategori kırılımı + gelişim karşılaştırması). */
export type KediVisionMediaType = "photo" | "video";

export interface KediVisionCategoryScores {
  gard: number; hiz: number; guc: number; denge: number;
  ayakCalismasi: number; rotasyon: number; savunma: number;
}
export interface KediVisionDeficiency {
  area: string; issue: string; fix: string;
}
export interface KediVisionCoachNotes {
  strengths: string[]; improvements: string[]; homework: string[]; weeklyPlan: string[];
}

export interface KediVisionAnalysis {
  id?: string; studentId: string;
  mediaType: KediVisionMediaType; mediaUrl: string;
  overallScore: number;
  categories: KediVisionCategoryScores;
  deficiencies: KediVisionDeficiency[];
  coachNotes: KediVisionCoachNotes;
  /** Önceki analizlerle karşılaştıran kısa not (örn. "3 hafta önce gardın daha açıktı, şimdi çok daha iyi.") — ilk analizde boş. */
  progressNote?: string;
  rawSummary: string;
  createdBy: KediProgramCreatedBy;
  createdAt?: string;
}

/** Kedi Avatar Sistemi — öğrencinin kişiselleştirilebilir 2D karakteri.
 * Evrim kademesi (XP'ye göre) ve kozmetik açılımlar (rozetlere göre) burada
 * SAKLANMAZ — lib/avatarEvolution.ts tarafından mevcut lib/xp.ts/lib/badges.ts
 * verisinden her seferinde türetilir. Bu tip sadece kullanıcının KENDİ SEÇTİĞİ
 * kişiselleştirme değerlerini tutar. */
export type AvatarGender = "male" | "female";
export type AvatarBodyType = "slim" | "athletic" | "heavy";

/** Kedi Life — avatarın Dijital Salon'da döngüsel olarak yaptığı aktivite.
 * Bu, render katmanından (2D SVG şimdi, ileride 3D/GLB) BAĞIMSIZ bir veri
 * kavramı — hangi render motoru kullanılırsa kullanılsın aynı aktivite
 * isimleri geçerli olmalı (bkz. StudentAvatar.tsx'in bu tipin 2D yorumu). */
export type AvatarActivity = "idle" | "guard" | "shadowbox" | "jumprope" | "bagwork" | "stretch" | "drink" | "phone";

export interface StudentAvatarConfig {
  studentId: string;
  gender: AvatarGender;
  skinTone: string;
  eyeColor: string;
  hairStyle: string;
  hairColor: string;
  eyebrowStyle: string;
  beardStyle: string;
  bodyType: AvatarBodyType;
  outfitId: string;
  gloveColor: string;
  shoeId: string;
  tattooId?: string;
  /** Kullanıcının ekipmanladığı (kuşandığı) kozmetikler — sadece açık olanlar arasından seçilebilir. */
  equippedCosmetics: { aura?: string; background?: string; belt?: string };
  createdAt?: string;
  updatedAt?: string;
}

/** Öğrencinin satın aldığı/yenilediği paket kaydı */
export interface PackagePurchase {
  id:            string;
  studentId:     string;
  packageType:   PackageType;
  packageName:   string;
  lessonCount:   number;
  listPrice:     number;
  paidAmount:    number;
  paymentStatus: PaymentStatus;
  startDate:     string;
  endDate:       string;
  notes?:        string;
  createdAt:     string;
}

export type PaymentRecordStatus = "odendi" | "beklemede" | "gecikti";

export interface Payment {
  id:          string;
  studentId:   string;
  studentName: string;
  amount:      number;
  paidAt:      string;
  method:      string;
  notes?:      string;
  /** Ödeme kaydının durumu — sadece "odendi" gelir hesabına dahil edilir */
  status:      PaymentRecordStatus;
}

export interface WorkoutInput {
  level: "baslangic" | "orta" | "ileri";
  goal: "kondisyon" | "teknik" | "guc" | "kilo-verme" | "musabaka";
  weight: number; hasEquipment: boolean; daysPerWeek: number;
}

export interface WorkoutPlan {
  warmup: WorkoutExercise[]; main: WorkoutExercise[];
  cardio: WorkoutExercise[]; cooldown: WorkoutExercise[];
  combinations: string[]; dailyTips: string[];
  restAdvice: string; weeklySchedule: string[];
}

export interface WorkoutExercise {
  name: string; sets?: number; reps?: string; duration?: string;
  rest?: string; description: string; icon: string;
}

/** Salon sahibi / gözlemci hesabı */
export interface SalonOwner {
  id: string;
  name: string;
  accessCode: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

/** Salon sahibine atanmış öğrenci bağlantısı */
export interface SalonOwnerStudent {
  id: string;
  salonOwnerId: string;
  studentId: string;
  createdAt: string;
}

export interface AuthState {
  role: UserRole | null;
  student: Student | null;
  isAdmin: boolean;
  salonOwner: SalonOwner | null;
}

export type GoalType =
  | "kilo-verme" | "kondisyon" | "teknik"
  | "esneklik"   | "musabaka"  | "kilo-alma"
  | "duzensiz-katilim";

export interface GiftLessonRequest {
  id:          string;
  studentId:   string;
  studentName: string;
  xpAtRequest: number;
  seasonXP:    number;    // Bu sezondaki XP (eşik hesabında kullanılan)
  season:      string;    // Örn: "2026-Q2"
  threshold:   number;    // 5000 veya 10000
  status:      "pending" | "approved" | "rejected";
  approvedAt?: string;
  rejectedAt?: string;
  adminNote?:  string;
  requestedAt?:string;
  createdAt:   string;
}

/* ── Kedi AI Görev Sistemi ────────────────────────────────────────── */

/** Admin tarafından oluşturulan özel Kedi AI görevi */
export interface KediMission {
  id:           string;
  title:        string;
  description?: string;
  icon:         string;
  xpReward:     number;
  targetValue:  number;
  studentId?:   string;  // undefined/null → tüm öğrenciler
  isActive:     boolean;
  createdAt:    string;
}

/** Öğrenci bazlı hesaplanmış görev (auto + custom) */
export interface StudentMission {
  key:         string;   // auto: "weekly_2_lessons_2025-W03", custom: uuid
  title:       string;
  description: string;
  icon:        string;
  xpReward:    number;
  progress:    number;
  target:      number;
  completed:   boolean;
  xpAwarded:   boolean;  // XP zaten verildi mi?
  isCustom:    boolean;
}

/** Bekleme listesi girişi */
export interface WaitlistEntry {
  id:          string;
  studentId:   string;
  date:        string;
  startTime:   string;
  endTime:     string;
  lessonType:  string;
  notified:    boolean;
  createdAt:   string;
}

/** Arena düello kaydı */
export interface ArenaDuel {
  id:             string;
  challengerId:   string;
  challengerName: string;
  opponentId:     string;
  opponentName:   string;
  /** Her iki tarafın risk ettiği XP miktarı */
  wagerXP:        number;
  /** Admin'in belirlediği ödül XP (null = henüz belirlenmedi) */
  rewardXP:       number | null;
  /** pending | accepted | rejected | active | completed | cancelled */
  status:         "pending" | "accepted" | "rejected" | "active" | "completed" | "cancelled";
  winnerId:       string | null;
  adminNote:      string | null;
  createdAt:      string;
  acceptedAt:     string | null;
  completedAt:    string | null;
}

/** Admin tarafından elle eklenen/düşülen XP kaydı */
export interface XPAdjustment {
  id:          string;
  studentId:   string;
  studentName: string;
  amount:      number;   // Pozitif = ekleme, negatif = düşme
  reason:      string;   // "Turnuva Katılımı", "Manuel Düzeltme" vb.
  note:        string;   // Serbest metin açıklama
  adminName:   string;   // İşlemi yapan kişi
  season:      string;   // Örn: "2026-Q2"
  createdAt:   string;
}
