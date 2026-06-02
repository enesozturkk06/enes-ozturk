/**
 * lib/db.ts — Supabase öncelikli veri katmanı.
 * Supabase yapılandırılmışsa gerçek veritabanı kullanılır,
 * yoksa geliştirme için mock verilerle çalışır.
 *
 * Supabase: snake_case kolonlar → camelCase TypeScript tipleri
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

// ─── Mapper: DB satırı → TypeScript nesnesi ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStudent(row: any): Student {
  return {
    id: row.id,
    code: row.code,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email ?? undefined,
    level: row.level,
    packageType: row.package_type,
    totalLessons: row.total_lessons ?? 0,
    remainingLessons: row.remaining_lessons ?? 0,
    completedLessons: row.completed_lessons ?? 0,
    paymentStatus: row.payment_status,
    amountPaid: Number(row.amount_paid ?? 0),
    amountDue: Number(row.amount_due ?? 0),
    packageStartDate: row.package_start_date ?? "",
    packageEndDate: row.package_end_date ?? "",
    notes: row.notes ?? undefined,
    isActive: row.is_active ?? true,
    weight: row.weight ?? undefined,
    age: row.age ?? undefined,
    createdAt: row.created_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAppointment(row: any): Appointment {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentCode: row.student_code,
    studentPhone: row.student_phone ?? "",
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    cancelledAt: row.cancelled_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLessonRecord(row: any): LessonRecord {
  return {
    id: row.id,
    appointmentId: row.appointment_id ?? "",
    studentId: row.student_id,
    date: row.date,
    conditioning: row.conditioning ?? 5,
    punch: row.punch ?? 5,
    kick: row.kick ?? 5,
    defense: row.defense ?? 5,
    combination: row.combination ?? 5,
    sparring: row.sparring ?? 5,
    overall: row.overall ?? 5,
    trainerNotes: row.trainer_notes ?? "",
    durationMinutes: row.duration_minutes ?? 60,
    createdAt: row.created_at ?? "",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPayment(row: any): Payment {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    amount: Number(row.amount),
    paidAt: row.paid_at,
    method: row.method ?? "nakit",
    notes: row.notes ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(row: any): Notification {
  return {
    id: row.id,
    studentId: row.student_id ?? undefined,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read ?? false,
    createdAt: row.created_at ?? "",
  };
}

// TypeScript Partial<Student> → Supabase satır formatı
function studentToDb(s: Partial<Student>): Record<string, unknown> {
  const db: Record<string, unknown> = {};
  if (s.code !== undefined)             db.code              = s.code;
  if (s.fullName !== undefined)         db.full_name         = s.fullName;
  if (s.phone !== undefined)            db.phone             = s.phone;
  if (s.email !== undefined)            db.email             = s.email;
  if (s.level !== undefined)            db.level             = s.level;
  if (s.packageType !== undefined)      db.package_type      = s.packageType;
  if (s.totalLessons !== undefined)     db.total_lessons     = s.totalLessons;
  if (s.remainingLessons !== undefined) db.remaining_lessons = s.remainingLessons;
  if (s.completedLessons !== undefined) db.completed_lessons = s.completedLessons;
  if (s.paymentStatus !== undefined)    db.payment_status    = s.paymentStatus;
  if (s.amountPaid !== undefined)       db.amount_paid       = s.amountPaid;
  if (s.amountDue !== undefined)        db.amount_due        = s.amountDue;
  if (s.packageStartDate !== undefined) db.package_start_date = s.packageStartDate;
  if (s.packageEndDate !== undefined)   db.package_end_date  = s.packageEndDate;
  if (s.notes !== undefined)            db.notes             = s.notes;
  if (s.isActive !== undefined)         db.is_active         = s.isActive;
  if (s.weight !== undefined)           db.weight            = s.weight;
  if (s.age !== undefined)              db.age               = s.age;
  return db;
}

function appointmentToDb(a: Omit<Appointment, "id" | "createdAt">): Record<string, unknown> {
  const db: Record<string, unknown> = {
    student_id:    a.studentId,
    student_name:  a.studentName,
    student_code:  a.studentCode,
    student_phone: a.studentPhone,
    date:          a.date,
    start_time:    a.startTime,
    end_time:      a.endTime,
    status:        a.status,
  };
  if (a.notes) db.notes = a.notes;
  return db;
}

// ─── Students ────────────────────────────────────────────────────────────────

export async function getStudents(): Promise<Student[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("full_name");
    if (error) {
      console.log("[getStudents] Supabase hatası:", error.message);
      return [];
    }
    return (data || []).map(mapStudent);
  }
  return MOCK_STUDENTS;
}

export async function getStudent(id: string): Promise<Student | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      console.log("[getStudent] Supabase hatası:", error.message);
      return null;
    }
    return data ? mapStudent(data) : null;
  }
  return MOCK_STUDENTS.find(s => s.id === id) ?? null;
}

export async function getStudentByCode(code: string): Promise<Student | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();
    if (error) {
      console.log("[getStudentByCode] Supabase hatası:", error.message);
      return null;
    }
    return data ? mapStudent(data) : null;
  }
  return MOCK_STUDENTS.find(s => s.code === code.toUpperCase() && s.isActive) ?? null;
}

export async function createStudent(
  student: Omit<Student, "id" | "createdAt">
): Promise<Student | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("students")
      .insert(studentToDb(student))
      .select()
      .single();
    if (error) {
      console.log("[createStudent] Supabase hatası:", error.message, error.details);
      return null;
    }
    return data ? mapStudent(data) : null;
  }
  const newStudent: Student = {
    ...student,
    id: `std-${Date.now()}`,
    createdAt: new Date().toISOString().split("T")[0],
  };
  MOCK_STUDENTS.push(newStudent);
  return newStudent;
}

export async function updateStudent(
  id: string,
  updates: Partial<Student>
): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("students")
      .update(studentToDb(updates))
      .eq("id", id);
    if (error) {
      console.log("[updateStudent] Supabase hatası:", error.message);
      return false;
    }
    return true;
  }
  const idx = MOCK_STUDENTS.findIndex(s => s.id === id);
  if (idx >= 0) { Object.assign(MOCK_STUDENTS[idx], updates); return true; }
  return false;
}

export async function deleteStudent(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", id);
    if (error) {
      console.log("[deleteStudent] Supabase hatası:", error.message);
      return false;
    }
    return true;
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
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from("appointments")
      .select("*")
      .order("date")
      .order("start_time");
    if (filters?.studentId) query = query.eq("student_id", filters.studentId);
    if (filters?.date)      query = query.eq("date", filters.date);
    if (filters?.status)    query = query.eq("status", filters.status);
    const { data, error } = await query;
    if (error) {
      console.log("[getAppointments] Supabase hatası:", error.message);
      return [];
    }
    return (data || []).map(mapAppointment);
  }
  let result = [...MOCK_APPOINTMENTS];
  if (filters?.studentId) result = result.filter(a => a.studentId === filters.studentId);
  if (filters?.date)      result = result.filter(a => a.date === filters.date);
  if (filters?.status)    result = result.filter(a => a.status === filters.status);
  return result.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export async function createAppointment(
  apt: Omit<Appointment, "id" | "createdAt">
): Promise<Appointment | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("appointments")
      .insert(appointmentToDb(apt))
      .select()
      .single();
    if (error) {
      console.log("[createAppointment] Supabase hatası:", error.message);
      return null;
    }
    return data ? mapAppointment(data) : null;
  }
  const newApt: Appointment = {
    ...apt,
    id: `apt-${Date.now()}`,
    createdAt: new Date().toISOString().split("T")[0],
  };
  MOCK_APPOINTMENTS.push(newApt);
  return newApt;
}

export async function updateAppointment(
  id: string,
  updates: Partial<Appointment>
): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const db: Record<string, unknown> = {};
    if (updates.status)      db.status       = updates.status;
    if (updates.cancelledAt) db.cancelled_at = updates.cancelledAt;
    if (updates.completedAt) db.completed_at = updates.completedAt;
    if (updates.notes)       db.notes        = updates.notes;
    const { error } = await supabase
      .from("appointments")
      .update(db)
      .eq("id", id);
    if (error) {
      console.log("[updateAppointment] Supabase hatası:", error.message);
      return false;
    }
    return true;
  }
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
  if (isSupabaseConfigured && supabase) {
    // Randevuyu tamamlandı yap
    const today = new Date().toISOString().split("T")[0];
    const { data: apt, error: aptErr } = await supabase
      .from("appointments")
      .update({ status: "tamamlandi", completed_at: today })
      .eq("id", id)
      .select("student_id")
      .single();
    if (aptErr) {
      console.log("[completeAppointment] randevu güncelleme hatası:", aptErr.message);
      return false;
    }
    // Öğrencinin kalan dersini azalt
    if (apt?.student_id) {
      const { data: std } = await supabase
        .from("students")
        .select("remaining_lessons, completed_lessons")
        .eq("id", apt.student_id)
        .single();
      if (std && std.remaining_lessons > 0) {
        await supabase
          .from("students")
          .update({
            remaining_lessons: std.remaining_lessons - 1,
            completed_lessons: (std.completed_lessons || 0) + 1,
          })
          .eq("id", apt.student_id);
      }
    }
    return true;
  }
  // Mock fallback
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
  const { getSlotsForDate } = await import("./slots");
  const adminSlots = await getSlotsForDate(date);

  if (adminSlots.length > 0) {
    const allApts = await getAppointments({ date });
    const booked = allApts
      .filter(a => a.status !== "iptal")
      .map(a => a.startTime);

    return adminSlots.map(s => ({
      id: s.id || `slot-${date}-${s.start}`,
      date,
      startTime: s.start,
      endTime: s.end,
      isAvailable: s.open && !booked.includes(s.start),
      isBlocked: !s.open,
    }));
  }
  return [];
}

// ─── Lesson Records ───────────────────────────────────────────────────────────

export async function getLessonRecords(studentId?: string): Promise<LessonRecord[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase
      .from("lesson_records")
      .select("*")
      .order("date", { ascending: false });
    if (studentId) query = query.eq("student_id", studentId);
    const { data, error } = await query;
    if (error) {
      console.log("[getLessonRecords] Supabase hatası:", error.message);
      return [];
    }
    return (data || []).map(mapLessonRecord);
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
      .select()
      .single();
    if (error) {
      console.log("[createLessonRecord] Supabase hatası:", error.message);
      return null;
    }
    return data ? mapLessonRecord(data) : null;
  }
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
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (error) {
      console.log("[getStudentNotifications] Supabase hatası:", error.message);
      return [];
    }
    return (data || []).map(mapNotification);
  }
  return MOCK_NOTIFICATIONS
    .filter(n => n.studentId === studentId)
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

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getPayments(): Promise<Payment[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("paid_at", { ascending: false });
    if (error) {
      console.log("[getPayments] Supabase hatası:", error.message);
      return [];
    }
    return (data || []).map(mapPayment);
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
      .select()
      .single();
    if (error) {
      console.log("[addPayment] Supabase hatası:", error.message);
    } else if (data) {
      // Öğrenci tutarını güncelle
      const { data: std } = await supabase
        .from("students")
        .select("amount_paid, amount_due")
        .eq("id", payment.studentId)
        .single();
      if (std) {
        const newPaid = Number(std.amount_paid) + payment.amount;
        const newDue  = Math.max(0, Number(std.amount_due) - payment.amount);
        await supabase
          .from("students")
          .update({
            amount_paid:    newPaid,
            amount_due:     newDue,
            payment_status: newDue === 0 ? "odendi" : newPaid > 0 ? "kismi" : "beklemede",
          })
          .eq("id", payment.studentId);
      }
      return mapPayment(data);
    }
  }
  // Mock fallback
  const newPayment: Payment = { ...payment, id: `pay-${Date.now()}` };
  MOCK_PAYMENTS.push(newPayment);
  const student = MOCK_STUDENTS.find(s => s.id === payment.studentId);
  if (student) {
    student.amountPaid += payment.amount;
    student.amountDue   = Math.max(0, student.amountDue - payment.amount);
    student.paymentStatus =
      student.amountDue === 0 ? "odendi" :
      student.amountPaid > 0  ? "kismi"  : "beklemede";
  }
  return newPayment;
}

export async function deletePayment(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    // Tutarı bul
    const { data: pay } = await supabase
      .from("payments")
      .select("student_id, amount")
      .eq("id", id)
      .single();

    const { error } = await supabase
      .from("payments")
      .delete()
      .eq("id", id);
    if (error) {
      console.log("[deletePayment] Supabase hatası:", error.message);
      return false;
    }
    // Öğrenci tutarını geri al
    if (pay) {
      const { data: std } = await supabase
        .from("students")
        .select("amount_paid, amount_due")
        .eq("id", pay.student_id)
        .single();
      if (std) {
        const newPaid = Math.max(0, Number(std.amount_paid) - pay.amount);
        const newDue  = Number(std.amount_due) + pay.amount;
        await supabase
          .from("students")
          .update({
            amount_paid:    newPaid,
            amount_due:     newDue,
            payment_status: newPaid === 0 ? "beklemede" : "kismi",
          })
          .eq("id", pay.student_id);
      }
    }
    return true;
  }
  // Mock fallback
  const idx = MOCK_PAYMENTS.findIndex(p => p.id === id);
  if (idx < 0) return false;
  const pay = MOCK_PAYMENTS[idx];
  const student = MOCK_STUDENTS.find(s => s.id === pay.studentId);
  if (student) {
    student.amountPaid = Math.max(0, student.amountPaid - pay.amount);
    student.amountDue += pay.amount;
    student.paymentStatus = student.amountPaid === 0 ? "beklemede" : "kismi";
  }
  MOCK_PAYMENTS.splice(idx, 1);
  return true;
}
