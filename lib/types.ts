export type PackageType    = "savasci" | "sampiyon" | "efsane";
export type PaymentStatus  = "odendi" | "kismi" | "beklemede";
export type AppointmentStatus = "onaylandi" | "iptal" | "tamamlandi" | "gelmedi";
export type LessonType     = "bireysel" | "duet" | "grup";
export type AttendanceStatus = "pending" | "attended" | "absent";
export type NotifType      = "info" | "warning" | "success" | "reminder";
export type UserRole       = "student" | "admin";

export interface Student {
  id: string; code: string; fullName: string; phone: string; email?: string;
  packageType: PackageType; packageId?: string; customPrice?: number;
  totalLessons: number; remainingLessons: number; completedLessons: number;
  paymentStatus: PaymentStatus; amountPaid: number; amountDue: number;
  packageStartDate: string; packageEndDate: string;
  notes?: string; isActive: boolean; createdAt: string;
  level: "baslangic" | "orta" | "ileri"; weight?: number; age?: number;
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
  partnerNames?: string[];
}

export interface AppointmentStudent {
  id: string; appointmentId: string; studentId: string;
  studentName?: string;
  attendanceStatus: AttendanceStatus;
  lessonDeducted: boolean; createdAt: string;
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
  id: string; studentId?: string; title: string; message: string;
  type: NotifType; isRead: boolean; createdAt: string;
}

export interface BlockedDate { id: string; date: string; reason: string; createdAt: string; }

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

export interface AuthState {
  role: UserRole | null; student: Student | null; isAdmin: boolean;
}
