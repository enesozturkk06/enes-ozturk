/**
 * lib/db.ts — Supabase veri katmanı
 * Supabase aktifse gerçek DB kullanılır, yoksa mock veriye düşer.
 * Tüm hatalar console.error ile görünür.
 */

import type {
  Student, Appointment, LessonRecord,
  Notification, TimeSlot, Payment,
} from "./types";
import {
  MOCK_STUDENTS, MOCK_APPOINTMENTS, MOCK_LESSON_RECORDS,
  MOCK_NOTIFICATIONS, MOCK_ADMIN_NOTIFICATIONS, MOCK_PAYMENTS,
} from "./mock-data";
import { supabase, isSupabaseConfigured } from "./supabase";

// ── Hata gösterici ────────────────────────────────────────────────────────────
function dbError(fn: string, error: { message: string; details?: string; hint?: string; code?: string }) {
  const msg = `[${fn}] ${error.message} | ${error.details ?? ""} | hint: ${error.hint ?? ""} | code: ${error.code ?? ""}`;
  console.error("⛔ Supabase DB Hatası:", msg);
}

// ── Row mappers: snake_case → camelCase ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStudent(r: any): Student {
  return {
    id: r.id,
    code: r.code,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email ?? undefined,
    level: r.level,
    packageType: r.package_type,
    totalLessons: Number(r.total_lessons ?? 0),
    remainingLessons: Number(r.remaining_lessons ?? 0),
    completedLessons: Number(r.completed_lessons ?? 0),
    paymentStatus: r.payment_status,
    amountPaid: Number(r.amount_paid ?? 0),
    amountDue: Number(r.amount_due ?? 0),
    packageStartDate: r.package_start_date ?? "",
    packageEndDate: r.package_end_date ?? "",
    notes: r.notes ?? undefined,
    isActive: r.is_active ?? true,
    weight: r.weight ?? undefined,
    age: r.age ?? undefined,
    createdAt: r.created_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAppointment(r: any): Appointment {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    studentCode: r.student_code,
    studentPhone: r.student_phone ?? "",
    date: r.date,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status,
    cancelledAt: r.cancelled_at ?? undefined,
    completedAt: r.completed_at ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.created_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLessonRecord(r: any): LessonRecord {
  return {
    id: r.id,
    appointmentId: r.appointment_id ?? "",
    studentId: r.student_id,
    date: r.date,
    conditioning: r.conditioning ?? 5,
    punch: r.punch ?? 5,
    kick: r.kick ?? 5,
    defense: r.defense ?? 5,
    combination: r.combination ?? 5,
    sparring: r.sparring ?? 5,
    overall: r.overall ?? 5,
    trainerNotes: r.trainer_notes ?? "",
    durationMinutes: r.duration_minutes ?? 60,
    createdAt: r.created_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayment(r: any): Payment {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.student_name,
    amount: Number(r.amount),
    paidAt: r.paid_at,
    method: r.method ?? "nakit",
    notes: r.notes ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(r: any): Notification {
  return {
    id: r.id,
    studentId: r.student_id ?? undefined,
    title: r.title,
    message: r.message,
    type: r.type,
    isRead: r.is_read ?? false,
    createdAt: r.created_at ?? "",
  };
}

// Student → DB satırı (camelCase → snake_case)
function studentToRow(s: Partial<Student>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (s.code              !== undefined) row.code               = s.code;
  if (s.fullName          !== undefined) row.full_name          = s.fullName;
  if (s.phone             !== undefined) row.phone              = s.phone;
  if (s.email             !== undefined) row.email              = s.email;
  if (s.level             !== undefined) row.level              = s.level;
  if (s.packageType       !== undefined) row.package_type       = s.packageType;
  if (s.totalLessons      !== undefined) row.total_lessons      = s.totalLessons;
  if (s.remainingLessons  !== undefined) row.remaining_lessons  = s.remainingLessons;
  if (s.completedLessons  !== undefined) row.completed_lessons  = s.completedLessons;
  if (s.paymentStatus     !== undefined) row.payment_status     = s.paymentStatus;
  if (s.amountPaid        !== undefined) row.amount_paid        = s.amountPaid;
  if (s.amountDue         !== undefined) row.amount_due         = s.amountDue;
  if (s.packageStartDate  !== undefined) row.package_start_date = s.packageStartDate || null;
  if (s.packageEndDate    !== undefined) row.package_end_date   = s.packageEndDate || null;
  if (s.notes             !== undefined) row.notes              = s.notes;
  if (s.isActive          !== undefined) row.is_active          = s.isActive;
  if (s.weight            !== undefined) row.weight             = s.weight;
  if (s.age               !== undefined) row.age                = s.age;
  return row;
}

// ── STUDENTS ─────────────────────────────────────────────────────────────────

export async function getStudents(): Promise<Student[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("full_name");
    if (error) { dbError("getStudents", error); return []; }
    return (data ?? []).map(mapStudent);
  }
  console.warn("⚠️ getStudents: Supabase bağlı değil, mock data kullanılıyor");
  return MOCK_STUDENTS;
}

export async function getStudent(id: string): Promise<Student | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("students").select("*").eq("id", id).single();
    if (error) { dbError("getStudent", error); return null; }
    return data ? mapStudent(data) : null;
  }
  return MOCK_STUDENTS.find(s => s.id === id) ?? null;
}

export async function getStudentByCode(code: string): Promise<Student | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("students").select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();
    if (error) { dbError("getStudentByCode", error); return null; }
    return data ? mapStudent(data) : null;
  }
  return MOCK_STUDENTS.find(s => s.code === code.toUpperCase() && s.isActive) ?? null;
}

export async function createStudent(
  student: Omit<Student, "id" | "createdAt">
): Promise<Student | null> {
  if (isSupabaseConfigured && supabase) {
    const row = studentToRow(student);
    console.log("📤 createStudent insert row:", row);
    const { data, error } = await supabase
      .from("students")
      .insert(row)
      .select()
      .single();
    if (error) {
      dbError("createStudent", error);
      if (typeof window !== "undefined") {
        alert(`Öğrenci eklenemedi!\n${error.message}\n${error.details ?? ""}`);
      }
      return null;
    }
    console.log("✅ createStudent başarılı:", data.id);
    return mapStudent(data);
  }
  console.warn("⚠️ createStudent: Supabase bağlı değil!");
  const newS: Student = { ...student, id: `std-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] };
  MOCK_STUDENTS.push(newS);
  return newS;
}

export async function updateStudent(id: string, updates: Partial<Student>): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("students").update(studentToRow(updates)).eq("id", id);
    if (error) { dbError("updateStudent", error); return false; }
    return true;
  }
  const idx = MOCK_STUDENTS.findIndex(s => s.id === id);
  if (idx >= 0) { Object.assign(MOCK_STUDENTS[idx], updates); return true; }
  return false;
}

export async function deleteStudent(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) { dbError("deleteStudent", error); return false; }
    return true;
  }
  const idx = MOCK_STUDENTS.findIndex(s => s.id === id);
  if (idx >= 0) { MOCK_STUDENTS.splice(idx, 1); return true; }
  return false;
}

// ── APPOINTMENTS ─────────────────────────────────────────────────────────────

export async function getAppointments(filters?: {
  studentId?: string; date?: string; status?: string;
}): Promise<Appointment[]> {
  if (isSupabaseConfigured && supabase) {
    let q = supabase.from("appointments").select("*").order("date").order("start_time");
    if (filters?.studentId) q = q.eq("student_id", filters.studentId);
    if (filters?.date)      q = q.eq("date", filters.date);
    if (filters?.status)    q = q.eq("status", filters.status);
    const { data, error } = await q;
    if (error) { dbError("getAppointments", error); return []; }
    return (data ?? []).map(mapAppointment);
  }
  let result = [...MOCK_APPOINTMENTS];
  if (filters?.studentId) result = result.filter(a => a.studentId === filters.studentId);
  if (filters?.date)      result = result.filter(a => a.date === filters.date);
  if (filters?.status)    result = result.filter(a => a.status === filters.status);
  return result.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export async function createAppointment(apt: Omit<Appointment, "id" | "createdAt">): Promise<Appointment | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        student_id:    apt.studentId,
        student_name:  apt.studentName,
        student_code:  apt.studentCode,
        student_phone: apt.studentPhone,
        date:          apt.date,
        start_time:    apt.startTime,
        end_time:      apt.endTime,
        status:        apt.status,
        notes:         apt.notes,
      })
      .select().single();
    if (error) { dbError("createAppointment", error); return null; }
    return data ? mapAppointment(data) : null;
  }
  const newA: Appointment = { ...apt, id: `apt-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] };
  MOCK_APPOINTMENTS.push(newA);
  return newA;
}

export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const row: Record<string, unknown> = {};
    if (updates.status)      row.status       = updates.status;
    if (updates.cancelledAt) row.cancelled_at = updates.cancelledAt;
    if (updates.completedAt) row.completed_at = updates.completedAt;
    if (updates.notes)       row.notes        = updates.notes;
    const { error } = await supabase.from("appointments").update(row).eq("id", id);
    if (error) { dbError("updateAppointment", error); return false; }
    return true;
  }
  const idx = MOCK_APPOINTMENTS.findIndex(a => a.id === id);
  if (idx >= 0) { Object.assign(MOCK_APPOINTMENTS[idx], updates); return true; }
  return false;
}

export async function cancelAppointment(id: string): Promise<boolean> {
  return updateAppointment(id, { status: "iptal", cancelledAt: new Date().toISOString().split("T")[0] });
}

export async function completeAppointment(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const today = new Date().toISOString().split("T")[0];
    const { data: apt, error: e1 } = await supabase
      .from("appointments")
      .update({ status: "tamamlandi", completed_at: today })
      .eq("id", id)
      .select("student_id").single();
    if (e1) { dbError("completeAppointment:update", e1); return false; }
    if (apt?.student_id) {
      const { data: std } = await supabase
        .from("students").select("remaining_lessons, completed_lessons")
        .eq("id", apt.student_id).single();
      if (std && (std.remaining_lessons ?? 0) > 0) {
        await supabase.from("students").update({
          remaining_lessons: (std.remaining_lessons ?? 1) - 1,
          completed_lessons: (std.completed_lessons ?? 0) + 1,
        }).eq("id", apt.student_id);
      }
    }
    return true;
  }
  const apt = MOCK_APPOINTMENTS.find(a => a.id === id);
  if (!apt) return false;
  apt.status = "tamamlandi";
  apt.completedAt = new Date().toISOString().split("T")[0];
  const std = MOCK_STUDENTS.find(s => s.id === apt.studentId);
  if (std && std.remainingLessons > 0) { std.remainingLessons--; std.completedLessons++; }
  return true;
}

// ── TIME SLOTS ───────────────────────────────────────────────────────────────

export async function getTimeSlots(date: string): Promise<TimeSlot[]> {
  const { getSlotsForDate } = await import("./slots");
  const adminSlots = await getSlotsForDate(date);
  if (adminSlots.length === 0) return [];
  const allApts = await getAppointments({ date });
  const booked = allApts.filter(a => a.status !== "iptal").map(a => a.startTime);
  return adminSlots.map(s => ({
    id: s.id || `slot-${date}-${s.start}`,
    date,
    startTime: s.start,
    endTime:   s.end,
    isAvailable: s.open && !booked.includes(s.start),
    isBlocked:   !s.open,
  }));
}

// ── LESSON RECORDS ───────────────────────────────────────────────────────────

export async function getLessonRecords(studentId?: string): Promise<LessonRecord[]> {
  if (isSupabaseConfigured && supabase) {
    let q = supabase.from("lesson_records").select("*").order("date", { ascending: false });
    if (studentId) q = q.eq("student_id", studentId);
    const { data, error } = await q;
    if (error) { dbError("getLessonRecords", error); return []; }
    return (data ?? []).map(mapLessonRecord);
  }
  let result = [...MOCK_LESSON_RECORDS];
  if (studentId) result = result.filter(r => r.studentId === studentId);
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export async function createLessonRecord(
  record: Omit<LessonRecord, "id" | "createdAt">
): Promise<LessonRecord | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("lesson_records")
      .insert({
        appointment_id:   record.appointmentId || null,
        student_id:       record.studentId,
        date:             record.date,
        conditioning:     record.conditioning,
        punch:            record.punch,
        kick:             record.kick,
        defense:          record.defense,
        combination:      record.combination,
        sparring:         record.sparring,
        overall:          record.overall,
        trainer_notes:    record.trainerNotes,
        duration_minutes: record.durationMinutes,
      })
      .select().single();
    if (error) { dbError("createLessonRecord", error); return null; }
    return data ? mapLessonRecord(data) : null;
  }
  const n: LessonRecord = { ...record, id: `lr-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] };
  MOCK_LESSON_RECORDS.push(n);
  return n;
}

// ── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function getStudentNotifications(studentId: string): Promise<Notification[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("notifications").select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) { dbError("getStudentNotifications", error); return []; }
    return (data ?? []).map(mapNotification);
  }
  return MOCK_NOTIFICATIONS.filter(n => n.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getAdminNotifications(): Promise<Notification[]> {
  return MOCK_ADMIN_NOTIFICATIONS.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function markNotificationRead(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    return;
  }
  const n = [...MOCK_NOTIFICATIONS, ...MOCK_ADMIN_NOTIFICATIONS].find(x => x.id === id);
  if (n) n.isRead = true;
}

// ── PAYMENTS ─────────────────────────────────────────────────────────────────

export async function getPayments(): Promise<Payment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("payments").select("*").order("paid_at", { ascending: false });
    if (error) { dbError("getPayments", error); return []; }
    return (data ?? []).map(mapPayment);
  }
  return [...MOCK_PAYMENTS].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
}

export async function addPayment(payment: Omit<Payment, "id">): Promise<Payment> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("payments")
      .insert({
        student_id:   payment.studentId,
        student_name: payment.studentName,
        amount:       payment.amount,
        paid_at:      payment.paidAt,
        method:       payment.method,
        notes:        payment.notes,
      })
      .select().single();
    if (error) { dbError("addPayment", error); }
    else if (data) {
      // Öğrenci tutarını güncelle
      const { data: std } = await supabase
        .from("students").select("amount_paid, amount_due").eq("id", payment.studentId).single();
      if (std) {
        const newPaid = Number(std.amount_paid) + payment.amount;
        const newDue  = Math.max(0, Number(std.amount_due) - payment.amount);
        await supabase.from("students").update({
          amount_paid:    newPaid,
          amount_due:     newDue,
          payment_status: newDue === 0 ? "odendi" : newPaid > 0 ? "kismi" : "beklemede",
        }).eq("id", payment.studentId);
      }
      return mapPayment(data);
    }
  }
  const n: Payment = { ...payment, id: `pay-${Date.now()}` };
  MOCK_PAYMENTS.push(n);
  const std = MOCK_STUDENTS.find(s => s.id === payment.studentId);
  if (std) {
    std.amountPaid += payment.amount;
    std.amountDue   = Math.max(0, std.amountDue - payment.amount);
    std.paymentStatus = std.amountDue === 0 ? "odendi" : std.amountPaid > 0 ? "kismi" : "beklemede";
  }
  return n;
}

export async function deletePayment(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { data: pay } = await supabase
      .from("payments").select("student_id, amount").eq("id", id).single();
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) { dbError("deletePayment", error); return false; }
    if (pay) {
      const { data: std } = await supabase
        .from("students").select("amount_paid, amount_due").eq("id", pay.student_id).single();
      if (std) {
        const newPaid = Math.max(0, Number(std.amount_paid) - pay.amount);
        const newDue  = Number(std.amount_due) + pay.amount;
        await supabase.from("students").update({
          amount_paid:    newPaid,
          amount_due:     newDue,
          payment_status: newPaid === 0 ? "beklemede" : "kismi",
        }).eq("id", pay.student_id);
      }
    }
    return true;
  }
  const idx = MOCK_PAYMENTS.findIndex(p => p.id === id);
  if (idx < 0) return false;
  const pay = MOCK_PAYMENTS[idx];
  const std = MOCK_STUDENTS.find(s => s.id === pay.studentId);
  if (std) {
    std.amountPaid = Math.max(0, std.amountPaid - pay.amount);
    std.amountDue += pay.amount;
    std.paymentStatus = std.amountPaid === 0 ? "beklemede" : "kismi";
  }
  MOCK_PAYMENTS.splice(idx, 1);
  return true;
}
