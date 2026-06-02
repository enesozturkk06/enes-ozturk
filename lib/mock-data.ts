import type {
  Student, Appointment, LessonRecord,
  Notification, TimeSlot, BlockedDate, Payment,
} from "./types";

export const MOCK_STUDENTS: Student[] = [
  {
    id: "std-001",
    code: "ENES001",
    fullName: "Ahmet Kaya",
    phone: "05321234567",
    email: "ahmet@email.com",
    packageType: "sampiyon",
    totalLessons: 16,
    remainingLessons: 8,
    completedLessons: 8,
    paymentStatus: "odendi",
    amountPaid: 2490,
    amountDue: 0,
    packageStartDate: "2026-05-01",
    packageEndDate: "2026-06-30",
    notes: "Güçlü adayacılık refleksleri var, defans üzerine çalışılacak.",
    isActive: true,
    createdAt: "2026-05-01",
    level: "orta",
    weight: 78,
    age: 27,
  },
  {
    id: "std-002",
    code: "ENES002",
    fullName: "Defne Yıldız",
    phone: "05421234567",
    email: "defne@email.com",
    packageType: "savasci",
    totalLessons: 8,
    remainingLessons: 3,
    completedLessons: 5,
    paymentStatus: "odendi",
    amountPaid: 1490,
    amountDue: 0,
    packageStartDate: "2026-05-15",
    packageEndDate: "2026-06-29",
    isActive: true,
    createdAt: "2026-05-15",
    level: "baslangic",
    weight: 58,
    age: 23,
  },
  {
    id: "std-003",
    code: "ENES003",
    fullName: "Murat Demir",
    phone: "05521234567",
    packageType: "efsane",
    totalLessons: 32,
    remainingLessons: 20,
    completedLessons: 12,
    paymentStatus: "kismi",
    amountPaid: 2000,
    amountDue: 1990,
    packageStartDate: "2026-04-01",
    packageEndDate: "2026-06-30",
    notes: "Müsabaka hazırlığı yapıyor. Şiddetli kondisyon çalışması.",
    isActive: true,
    createdAt: "2026-04-01",
    level: "ileri",
    weight: 82,
    age: 31,
  },
  {
    id: "std-004",
    code: "ENES004",
    fullName: "Seda Arslan",
    phone: "05621234567",
    packageType: "sampiyon",
    totalLessons: 16,
    remainingLessons: 14,
    completedLessons: 2,
    paymentStatus: "beklemede",
    amountPaid: 0,
    amountDue: 2490,
    packageStartDate: "2026-05-25",
    packageEndDate: "2026-07-24",
    isActive: true,
    createdAt: "2026-05-25",
    level: "baslangic",
    weight: 62,
    age: 25,
  },
];

const today = new Date();
const fmt = (d: Date) => d.toISOString().split("T")[0];
const addDays = (d: Date, n: number) => {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
};

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "apt-001",
    studentId: "std-001",
    studentName: "Ahmet Kaya",
    studentCode: "ENES001",
    studentPhone: "05321234567",
    date: fmt(addDays(today, 1)),
    startTime: "10:00",
    endTime: "11:00",
    status: "onaylandi",
    createdAt: fmt(today),
  },
  {
    id: "apt-002",
    studentId: "std-002",
    studentName: "Defne Yıldız",
    studentCode: "ENES002",
    studentPhone: "05421234567",
    date: fmt(addDays(today, 1)),
    startTime: "14:00",
    endTime: "15:00",
    status: "onaylandi",
    createdAt: fmt(today),
  },
  {
    id: "apt-003",
    studentId: "std-003",
    studentName: "Murat Demir",
    studentCode: "ENES003",
    studentPhone: "05521234567",
    date: fmt(today),
    startTime: "09:00",
    endTime: "10:00",
    status: "tamamlandi",
    completedAt: fmt(today),
    createdAt: fmt(addDays(today, -1)),
  },
  {
    id: "apt-004",
    studentId: "std-001",
    studentName: "Ahmet Kaya",
    studentCode: "ENES001",
    studentPhone: "05321234567",
    date: fmt(addDays(today, -3)),
    startTime: "10:00",
    endTime: "11:00",
    status: "tamamlandi",
    completedAt: fmt(addDays(today, -3)),
    createdAt: fmt(addDays(today, -5)),
  },
  {
    id: "apt-005",
    studentId: "std-004",
    studentName: "Seda Arslan",
    studentCode: "ENES004",
    studentPhone: "05621234567",
    date: fmt(addDays(today, 3)),
    startTime: "16:00",
    endTime: "17:00",
    status: "onaylandi",
    createdAt: fmt(today),
  },
];

export const MOCK_LESSON_RECORDS: LessonRecord[] = [
  {
    id: "lr-001",
    appointmentId: "apt-004",
    studentId: "std-001",
    date: fmt(addDays(today, -3)),
    conditioning: 7,
    punch: 8,
    kick: 6,
    defense: 5,
    combination: 7,
    sparring: 6,
    overall: 7,
    trainerNotes: "Yumruk teknikleri iyileşti. Savunmada dikkat dağınıklığı var. Bir sonraki derste defansa odaklanılacak.",
    durationMinutes: 60,
    createdAt: fmt(addDays(today, -3)),
  },
  {
    id: "lr-002",
    appointmentId: "apt-003",
    studentId: "std-003",
    date: fmt(today),
    conditioning: 9,
    punch: 9,
    kick: 8,
    defense: 8,
    combination: 9,
    sparring: 8,
    overall: 9,
    trainerNotes: "Müsabakaya hazırlık çok iyi gidiyor. Kombinasyonlar güçlendi.",
    durationMinutes: 60,
    createdAt: fmt(today),
  },
  {
    id: "lr-003",
    appointmentId: "apt-999",
    studentId: "std-001",
    date: fmt(addDays(today, -10)),
    conditioning: 6,
    punch: 6,
    kick: 5,
    defense: 4,
    combination: 5,
    sparring: 5,
    overall: 5,
    trainerNotes: "İlk dersler iyi başlangıç. Isınmaya dikkat etmesi gerekiyor.",
    durationMinutes: 60,
    createdAt: fmt(addDays(today, -10)),
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "notif-001",
    studentId: "std-001",
    title: "Yarın Dersiniz Var",
    message: "Yarın saat 10:00'da Antrenör Enes Öztürk ile dersiniz bulunmaktadır.",
    type: "reminder",
    isRead: false,
    createdAt: fmt(today),
  },
  {
    id: "notif-002",
    studentId: "std-002",
    title: "Paketiniz Bitiyor",
    message: "3 dersiniz kaldı. Paketinizi yenilemek için Antrenör Enes ile iletişime geçin.",
    type: "warning",
    isRead: false,
    createdAt: fmt(today),
  },
  {
    id: "notif-003",
    studentId: "std-001",
    title: "Ders Tamamlandı",
    message: "3 gün önceki dersiniz tamamlandı. Antrenörünüz notlarınızı ekledi.",
    type: "success",
    isRead: true,
    createdAt: fmt(addDays(today, -3)),
  },
];

export const MOCK_ADMIN_NOTIFICATIONS: Notification[] = [
  {
    id: "an-001",
    title: "Yeni Rezervasyon",
    message: "Ahmet Kaya yarın 10:00 için rezervasyon oluşturdu.",
    type: "info",
    isRead: false,
    createdAt: fmt(today),
  },
  {
    id: "an-002",
    title: "Ödeme Bekliyor",
    message: "Seda Arslan ödeme yapmadı. ₺2.490 beklemede.",
    type: "warning",
    isRead: false,
    createdAt: fmt(addDays(today, -1)),
  },
  {
    id: "an-003",
    title: "Paket Bitiyor",
    message: "Defne Yıldız 3 ders kaldı. Paket yenileme hatırlatıcısı.",
    type: "warning",
    isRead: true,
    createdAt: fmt(addDays(today, -2)),
  },
];

export function generateTimeSlots(date: string): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const hours = ["09:00","10:00","11:00","12:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
  const taken = MOCK_APPOINTMENTS
    .filter(a => a.date === date && a.status !== "iptal")
    .map(a => a.startTime);

  hours.forEach((h, i) => {
    const endH = hours[i + 1] || "21:00";
    slots.push({
      id: `slot-${date}-${h}`,
      date,
      startTime: h,
      endTime: endH,
      isAvailable: !taken.includes(h),
      isBlocked: false,
    });
  });
  return slots;
}

export const MOCK_BLOCKED_DATES: BlockedDate[] = [];

export const MOCK_PAYMENTS: Payment[] = [
  {
    id: "pay-001",
    studentId: "std-001",
    studentName: "Ahmet Kaya",
    amount: 2490,
    paidAt: "2026-05-01",
    method: "Nakit",
    notes: "Şampiyon paketi",
  },
  {
    id: "pay-002",
    studentId: "std-002",
    studentName: "Defne Yıldız",
    amount: 1490,
    paidAt: "2026-05-15",
    method: "Havale",
    notes: "Savaşçı paketi",
  },
  {
    id: "pay-003",
    studentId: "std-003",
    studentName: "Murat Demir",
    amount: 2000,
    paidAt: "2026-04-01",
    method: "Nakit",
    notes: "Efsane paketi - kısmi ödeme",
  },
];
