import type {
  Student, Appointment, LessonRecord,
  Notification, TimeSlot, Payment,
} from "./types";
import {
  MOCK_STUDENTS, MOCK_APPOINTMENTS, MOCK_LESSON_RECORDS,
  MOCK_NOTIFICATIONS, MOCK_ADMIN_NOTIFICATIONS,
  generateTimeSlots, MOCK_PAYMENTS,
} from "./mock-data";
import { supabase, isSupabaseConfigured } from "./supabase";

// ─── Students ────────────────────────────────────────────────────────────────

export async function getStudents(): Promise<Student[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("students").select("*").order("full_name");
    return (data as Student[]) || [];
  }
  return MOCK_STUDENTS;
}

export async function getStudent(id: string): Promise<Student | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("students").select("*").eq("id", id).single();
    return (data as Student) || null;
  }
  return MOCK_STUDENTS.find(s => s.id === id) ?? null;
}

export async function createStudent(student: Omit<Student, "id" | "createdAt">): Promise<Student | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("students").insert(student).select().single();
    return (data as Student) || null;
  }
  const newStudent: Student = {
    ...student,
    id: `std-${Date.now()}`,
    createdAt: new Date().toISOString().split("T")[0],
  };
  MOCK_STUDENTS.push(newStudent);
  return newStudent;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("students").update(updates).eq("id", id);
    return !error;
  }
  const idx = MOCK_STUDENTS.findIndex(s => s.id === id);
  if (idx >= 0) { Object.assign(MOCK_STUDENTS[idx], updates); return true; }
  return false;
}

export async function deleteStudent(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    return !error;
  }
  const idx = MOCK_STUDENTS.findIndex(s => s.id === id);
  if (idx >= 0) { MOCK_STUDENTS.splice(idx, 1); return true; }
  return false;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function getAppointments(filters?: {
  studentId?: string;
  date?: string;
  status?: string;
}): Promise<Appointment[]> {
  let result = [...MOCK_APPOINTMENTS];
  if (filters?.studentId) result = result.filter(a => a.studentId === filters.studentId);
  if (filters?.date) result = result.filter(a => a.date === filters.date);
  if (filters?.status) result = result.filter(a => a.status === filters.status);
  return result.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export async function createAppointment(apt: Omit<Appointment, "id" | "createdAt">): Promise<Appointment | null> {
  const newApt: Appointment = {
    ...apt,
    id: `apt-${Date.now()}`,
    createdAt: new Date().toISOString().split("T")[0],
  };
  MOCK_APPOINTMENTS.push(newApt);
  return newApt;
}

export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<boolean> {
  const idx = MOCK_APPOINTMENTS.findIndex(a => a.id === id);
  if (idx >= 0) { Object.assign(MOCK_APPOINTMENTS[idx], updates); return true; }
  return false;
}

export async function cancelAppointment(id: string): Promise<boolean> {
  return updateAppointment(id, {
    status: "iptal",
    cancelledAt: new Date().toISOString().split("T")[0],
  });
}

export async function completeAppointment(id: string): Promise<boolean> {
  const apt = MOCK_APPOINTMENTS.find(a => a.id === id);
  if (!apt) return false;
  apt.status = "tamamlandi";
  apt.completedAt = new Date().toISOString().split("T")[0];
  const student = MOCK_STUDENTS.find(s => s.id === apt.studentId);
  if (student && student.remainingLessons > 0) {
    student.remainingLessons -= 1;
    student.completedLessons += 1;
  }
  return true;
}

// ─── Time Slots ───────────────────────────────────────────────────────────────

export async function getTimeSlots(date: string): Promise<TimeSlot[]> {
  // Önce localStorage'daki admin tanımlı slotlara bak
  const { getSlotsForDate } = await import("./slots");
  const adminSlots = getSlotsForDate(date);

  if (adminSlots.length > 0) {
    // Admin slotları varsa bunları kullan
    const booked = MOCK_APPOINTMENTS
      .filter(a => a.date === date && a.status !== "iptal")
      .map(a => a.startTime);

    return adminSlots.map(s => ({
      id: `slot-${date}-${s.start}`,
      date,
      startTime: s.start,
      endTime: s.end,
      isAvailable: s.open && !booked.includes(s.start),
      isBlocked: !s.open,
    }));
  }

  // Admin henüz slot tanımlamamışsa boş döndür
  return [];
}

// ─── Lesson Records ───────────────────────────────────────────────────────────

export async function getLessonRecords(studentId?: string): Promise<LessonRecord[]> {
  let result = [...MOCK_LESSON_RECORDS];
  if (studentId) result = result.filter(r => r.studentId === studentId);
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export async function createLessonRecord(
  record: Omit<LessonRecord, "id" | "createdAt">
): Promise<LessonRecord | null> {
  const newRecord: LessonRecord = {
    ...record,
    id: `lr-${Date.now()}`,
    createdAt: new Date().toISOString().split("T")[0],
  };
  MOCK_LESSON_RECORDS.push(newRecord);
  return newRecord;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getStudentNotifications(studentId: string): Promise<Notification[]> {
  return MOCK_NOTIFICATIONS
    .filter(n => n.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAdminNotifications(): Promise<Notification[]> {
  return MOCK_ADMIN_NOTIFICATIONS.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markNotificationRead(id: string): Promise<void> {
  const n = [...MOCK_NOTIFICATIONS, ...MOCK_ADMIN_NOTIFICATIONS].find(x => x.id === id);
  if (n) n.isRead = true;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(): Promise<Payment[]> {
  return [...MOCK_PAYMENTS].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export async function addPayment(payment: Omit<Payment, "id">): Promise<Payment> {
  const newPayment: Payment = { ...payment, id: `pay-${Date.now()}` };
  MOCK_PAYMENTS.push(newPayment);
  const student = MOCK_STUDENTS.find(s => s.id === payment.studentId);
  if (student) {
    student.amountPaid += payment.amount;
    student.amountDue = Math.max(0, student.amountDue - payment.amount);
    if (student.amountDue === 0) student.paymentStatus = "odendi";
    else if (student.amountPaid > 0) student.paymentStatus = "kismi";
  }
  return newPayment;
}

export async function deletePayment(id: string): Promise<boolean> {
  const idx = MOCK_PAYMENTS.findIndex(p => p.id === id);
  if (idx < 0) return false;
  // Öğrencinin tutarını geri al
  const pay = MOCK_PAYMENTS[idx];
  const student = MOCK_STUDENTS.find(s => s.id === pay.studentId);
  if (student) {
    student.amountPaid = Math.max(0, student.amountPaid - pay.amount);
    student.amountDue += pay.amount;
    if (student.amountPaid === 0) student.paymentStatus = "beklemede";
    else student.paymentStatus = "kismi";
  }
  MOCK_PAYMENTS.splice(idx, 1);
  return true;
}
