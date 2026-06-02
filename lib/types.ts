export type PackageType = "savasci" | "sampiyon" | "efsane";
export type PaymentStatus = "odendi" | "kismi" | "beklemede";
export type AppointmentStatus = "onaylandi" | "iptal" | "tamamlandi" | "gelmedi";
export type NotifType = "info" | "warning" | "success" | "reminder";
export type UserRole = "student" | "admin";

export interface Package {
  id: string;
  name: string;
  type: PackageType;
  lessonCount: number;
  price: number;
  durationDays: number;
  description: string;
}

export interface Student {
  id: string;
  code: string; // ENES001
  fullName: string;
  phone: string;
  email?: string;
  packageType: PackageType;
  totalLessons: number;
  remainingLessons: number;
  completedLessons: number;
  paymentStatus: PaymentStatus;
  amountPaid: number;
  amountDue: number;
  packageStartDate: string;
  packageEndDate: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  level: "baslangic" | "orta" | "ileri";
  weight?: number;
  age?: number;
}

export interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isAvailable: boolean;
  isBlocked: boolean;
  blockReason?: string;
}

export interface Appointment {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  studentPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancelledAt?: string;
  completedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface LessonRecord {
  id: string;
  appointmentId: string;
  studentId: string;
  date: string;
  conditioning: number; // 1-10
  punch: number;
  kick: number;
  defense: number;
  combination: number;
  sparring: number;
  overall: number;
  trainerNotes: string;
  durationMinutes: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  studentId?: string; // null = trainer notification
  title: string;
  message: string;
  type: NotifType;
  isRead: boolean;
  createdAt: string;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  paidAt: string;
  method: string;
  notes?: string;
}

export interface WorkoutInput {
  level: "baslangic" | "orta" | "ileri";
  goal: "kondisyon" | "teknik" | "guc" | "kilo-verme" | "musabaka";
  weight: number;
  hasEquipment: boolean;
  daysPerWeek: number;
}

export interface WorkoutPlan {
  warmup: WorkoutExercise[];
  main: WorkoutExercise[];
  cardio: WorkoutExercise[];
  cooldown: WorkoutExercise[];
  combinations: string[];
  dailyTips: string[];
  restAdvice: string;
  weeklySchedule: string[];
}

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: string;
  duration?: string;
  rest?: string;
  description: string;
  icon: string;
}

export interface AuthState {
  role: UserRole | null;
  student: Student | null;
  isAdmin: boolean;
}
