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
