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

export interface Payment {
  id: string; studentId: string; studentName: string;
  amount: number; paidAt: string; method: string; notes?: string;
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
  createdAt:   string;
}
