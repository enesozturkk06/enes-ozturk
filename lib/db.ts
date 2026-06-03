/**
 * lib/db.ts — Supabase veri katmanı
 */
import type {
  Student, Appointment, AppointmentStudent, LessonRecord,
  Notification, TimeSlot, Payment, CompleteResult, LessonType,
  DuetPartner, AttendanceStatus,
} from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";

/* ── Hata yönetimi ─────────────────────────────────────────────── */
function fail(fn: string, e: { message: string; details?: string }): never {
  const msg = `[${fn}] ${e.message}${e.details ? " | " + e.details : ""}`;
  console.error("⛔ Supabase:", msg);
  throw new Error(msg);
}
function db() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase bağlı değil");
  return supabase!;
}

/* ── Row mappers ────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ms = (r: any): Student => ({
  id: r.id, code: r.code, fullName: r.full_name, phone: r.phone,
  email: r.email ?? undefined, level: r.level, packageType: r.package_type,
  packageId: r.package_id ?? undefined,
  customPrice: r.custom_price != null ? Number(r.custom_price) : undefined,
  totalLessons: Number(r.total_lessons ?? 0),
  remainingLessons: Number(r.remaining_lessons ?? 0),
  completedLessons: Number(r.completed_lessons ?? 0),
  paymentStatus: r.payment_status,
  amountPaid: Number(r.amount_paid ?? 0), amountDue: Number(r.amount_due ?? 0),
  packageStartDate: r.package_start_date ?? "", packageEndDate: r.package_end_date ?? "",
  notes: r.notes ?? undefined, isActive: r.is_active ?? true,
  weight: r.weight ?? undefined, age: r.age ?? undefined, createdAt: r.created_at ?? "",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ma = (r: any): Appointment => ({
  id: r.id, studentId: r.student_id ?? "", studentName: r.student_name ?? "",
  studentCode: r.student_code ?? "", studentPhone: r.student_phone ?? "",
  date: r.date, startTime: r.start_time, endTime: r.end_time, status: r.status,
  lessonType: (r.lesson_type ?? "bireysel") as LessonType,
  cancelledAt: r.cancelled_at ?? undefined, completedAt: r.completed_at ?? undefined,
  notes: r.notes ?? undefined, createdAt: r.created_at ?? "",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mApSt = (r: any): AppointmentStudent => ({
  id:               r.id,
  appointmentId:    r.appointment_id,
  studentId:        r.student_id,
  studentName:      r.students?.full_name ?? r.student_name ?? undefined,
  attendanceStatus: (r.attendance_status ?? "pending") as AttendanceStatus,
  lessonDeducted:   r.lesson_deducted ?? false,
  createdAt:        r.created_at ?? "",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ml = (r: any): LessonRecord => ({
  id: r.id, appointmentId: r.appointment_id ?? "", studentId: r.student_id, date: r.date,
  conditioning: r.conditioning ?? 5, punch: r.punch ?? 5, kick: r.kick ?? 5,
  defense: r.defense ?? 5, combination: r.combination ?? 5, sparring: r.sparring ?? 5,
  overall: r.overall ?? 5, trainerNotes: r.trainer_notes ?? "",
  durationMinutes: r.duration_minutes ?? 60, createdAt: r.created_at ?? "",
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mp = (r: any): Payment => ({
  id: r.id, studentId: r.student_id, studentName: r.student_name,
  amount: Number(r.amount), paidAt: r.paid_at, method: r.method ?? "nakit",
  notes: r.notes ?? undefined,
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mn = (r: any): Notification => ({
  id: r.id, studentId: r.student_id ?? undefined, title: r.title, message: r.message,
  type: r.type, isRead: r.is_read ?? false, createdAt: r.created_at ?? "",
});

function sRow(s: Partial<Student>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (s.code              !== undefined) r.code               = s.code;
  if (s.fullName          !== undefined) r.full_name          = s.fullName;
  if (s.phone             !== undefined) r.phone              = s.phone;
  if (s.email             !== undefined) r.email              = s.email;
  if (s.level             !== undefined) r.level              = s.level;
  if (s.packageType       !== undefined) r.package_type       = s.packageType;
  if (s.totalLessons      !== undefined) r.total_lessons      = s.totalLessons;
  if (s.remainingLessons  !== undefined) r.remaining_lessons  = s.remainingLessons;
  if (s.completedLessons  !== undefined) r.completed_lessons  = s.completedLessons;
  if (s.paymentStatus     !== undefined) r.payment_status     = s.paymentStatus;
  if (s.amountPaid        !== undefined) r.amount_paid        = s.amountPaid;
  if (s.amountDue         !== undefined) r.amount_due         = s.amountDue;
  if (s.packageStartDate  !== undefined) r.package_start_date = s.packageStartDate || null;
  if (s.packageEndDate    !== undefined) r.package_end_date   = s.packageEndDate || null;
  if (s.notes             !== undefined) r.notes              = s.notes;
  if (s.isActive          !== undefined) r.is_active          = s.isActive;
  if (s.weight            !== undefined) r.weight             = s.weight;
  if (s.age               !== undefined) r.age                = s.age;
  return r;
}

async function trySetPackageFields(id: string, packageId?: string, customPrice?: number) {
  if (packageId === undefined && customPrice === undefined) return;
  try {
    const extra: Record<string, unknown> = {};
    if (packageId  !== undefined) extra.package_id   = packageId || null;
    if (customPrice !== undefined) extra.custom_price = customPrice ?? null;
    await db().from("students").update(extra).eq("id", id);
  } catch { /* kolon henüz yoksa sessizce geç */ }
}

/* ════════════════════════════════════════════════════════════════
   STUDENTS
   ════════════════════════════════════════════════════════════════ */

export async function getStudents(): Promise<Student[]> {
  const { data, error } = await db().from("students").select("*").order("full_name");
  if (error) fail("getStudents", error);
  return (data ?? []).map(ms);
}
export async function getStudent(id: string): Promise<Student | null> {
  const { data, error } = await db().from("students").select("*").eq("id", id).maybeSingle();
  if (error) fail("getStudent", error);
  return data ? ms(data) : null;
}
export async function getStudentByCode(code: string): Promise<Student | null> {
  const { data, error } = await db()
    .from("students").select("*")
    .eq("code", code.trim().toUpperCase()).eq("is_active", true).maybeSingle();
  if (error) fail("getStudentByCode", error);
  return data ? ms(data) : null;
}
export async function createStudent(student: Omit<Student, "id" | "createdAt">): Promise<Student> {
  const { data, error } = await db().from("students").insert(sRow(student)).select().single();
  if (error) fail("createStudent", error);
  const created = ms(data);
  await trySetPackageFields(created.id, student.packageId, student.customPrice);
  return created;
}
export async function updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
  const { data, error } = await db().from("students").update(sRow(updates)).eq("id", id).select().single();
  if (error) fail("updateStudent", error);
  await trySetPackageFields(id, updates.packageId, updates.customPrice);
  return ms(data);
}
export async function deleteStudent(id: string): Promise<void> {
  const { error } = await db().from("students").delete().eq("id", id);
  if (error) fail("deleteStudent", error);
}

/* ════════════════════════════════════════════════════════════════
   DUET PARTNERS
   ════════════════════════════════════════════════════════════════ */

/** Öğrencinin düet partnerini getir (tek partner — iki yönlü) */
export async function getDuetPartner(studentId: string): Promise<Student | null> {
  const { data, error } = await db()
    .from("duet_partners")
    .select("student_a_id, student_b_id")
    .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`)
    .maybeSingle();
  if (error) { console.warn("getDuetPartner:", error.message); return null; }
  if (!data) return null;
  const partnerId = data.student_a_id === studentId ? data.student_b_id : data.student_a_id;
  return getStudent(partnerId);
}

/** Tüm düet çiftlerini getir (admin için) */
export async function getAllDuetPairs(): Promise<DuetPartner[]> {
  const { data, error } = await db()
    .from("duet_partners").select("*").order("created_at", { ascending: false });
  if (error) { console.warn("getAllDuetPairs:", error.message); return []; }
  return (data ?? []).map(r => ({
    id: r.id, studentAId: r.student_a_id, studentBId: r.student_b_id, createdAt: r.created_at,
  }));
}

/** Düet partneri ata */
export async function setDuetPartner(aId: string, bId: string): Promise<void> {
  // Önce ikisinin mevcut partnerlerini temizle
  await db().from("duet_partners").delete()
    .or(`student_a_id.eq.${aId},student_b_id.eq.${aId}`);
  await db().from("duet_partners").delete()
    .or(`student_a_id.eq.${bId},student_b_id.eq.${bId}`);
  // Yeni çift ekle
  const { error } = await db().from("duet_partners").insert({ student_a_id: aId, student_b_id: bId });
  if (error) fail("setDuetPartner", error);
}

/** Düet partnerliğini kaldır */
export async function removeDuetPartner(studentId: string): Promise<void> {
  const { error } = await db().from("duet_partners").delete()
    .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`);
  if (error) fail("removeDuetPartner", error);
}

/* ════════════════════════════════════════════════════════════════
   APPOINTMENTS
   ════════════════════════════════════════════════════════════════ */

export async function getAppointments(filters?: {
  studentId?: string; date?: string; status?: string;
}): Promise<Appointment[]> {
  let q = db().from("appointments").select("*").order("date").order("start_time");
  if (filters?.studentId) q = q.eq("student_id", filters.studentId);
  if (filters?.date)      q = q.eq("date", filters.date);
  if (filters?.status)    q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) fail("getAppointments", error);
  return (data ?? []).map(ma);
}

/** Öğrencinin tüm randevuları — düet dahil */
export async function getStudentAppointments(studentId: string): Promise<Appointment[]> {
  const { data: direct, error: e1 } = await db()
    .from("appointments").select("*")
    .eq("student_id", studentId).order("date").order("start_time");
  if (e1) fail("getStudentAppointments:direct", e1);

  // appointment_students üzerinden katıldığı randevular
  const { data: joined } = await db()
    .from("appointment_students").select("appointment_id").eq("student_id", studentId);

  const joinedIds = (joined ?? []).map((r: {appointment_id: string}) => r.appointment_id);
  const directIds = (direct ?? []).map(r => r.id);
  const extraIds  = joinedIds.filter(id => !directIds.includes(id));

  if (extraIds.length === 0) return (direct ?? []).map(ma);

  const { data: extra, error: e3 } = await db()
    .from("appointments").select("*").in("id", extraIds);
  if (e3) fail("getStudentAppointments:extra", e3);

  return [...(direct ?? []), ...(extra ?? [])].map(ma)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export async function getAppointmentStudents(appointmentId: string): Promise<AppointmentStudent[]> {
  const { data, error } = await db()
    .from("appointment_students")
    .select("*, students(full_name)")
    .eq("appointment_id", appointmentId);
  if (error) { console.warn("getAppointmentStudents:", error.message); return []; }
  return (data ?? []).map(mApSt);
}

export async function createAppointment(apt: {
  studentId: string; studentName: string; studentCode: string; studentPhone?: string;
  date: string; startTime: string; endTime: string;
  lessonType?: LessonType; notes?: string; status?: string;
  secondStudentIds?: string[];
}): Promise<Appointment> {
  const lessonType = apt.lessonType ?? "bireysel";
  const baseRow: Record<string, unknown> = {
    student_id: apt.studentId, student_name: apt.studentName,
    student_code: apt.studentCode, student_phone: apt.studentPhone ?? "",
    date: apt.date, start_time: apt.startTime, end_time: apt.endTime,
    status: apt.status ?? "onaylandi", notes: apt.notes ?? null,
  };

  // lesson_type ile dene, schema cache sorunu varsa fallback
  let result = await db().from("appointments").insert({ ...baseRow, lesson_type: lessonType }).select().single();
  if (result.error) {
    const msg = result.error.message ?? "";
    if (msg.includes("lesson_type") || msg.includes("schema cache")) {
      console.warn("[createAppointment] lesson_type schema cache sorunu, fallback ile deneniyor");
      const r2 = await db().from("appointments").insert(baseRow).select().single();
      if (r2.error) fail("createAppointment:fallback", r2.error);
      result = r2;
      db().from("appointments").update({ lesson_type: lessonType }).eq("id", r2.data.id)
        .then(({ error }) => { if (error) console.warn("lesson_type geç güncelleme:", error.message); });
    } else {
      fail("createAppointment", result.error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (result as any).data;
  const appointmentId = data.id;

  // appointment_students — tüm katılımcılar
  const allStudents = [apt.studentId, ...(apt.secondStudentIds ?? [])].filter(Boolean);
  if (allStudents.length > 0) {
    const rows = allStudents.map(sid => ({
      appointment_id: appointmentId, student_id: sid,
      attendance_status: "pending", lesson_deducted: false,
    }));
    const { error: e2 } = await db().from("appointment_students").insert(rows);
    if (e2) console.warn("[createAppointment] appointment_students:", e2.message);
  }

  return ma(data);
}

export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.status)      row.status       = updates.status;
  if (updates.cancelledAt) row.cancelled_at = updates.cancelledAt;
  if (updates.completedAt) row.completed_at = updates.completedAt;
  if (updates.notes)       row.notes        = updates.notes;
  const { error } = await db().from("appointments").update(row).eq("id", id);
  if (error) fail("updateAppointment", error);
}

export async function cancelAppointment(id: string): Promise<void> {
  return updateAppointment(id, { status: "iptal", cancelledAt: new Date().toISOString().split("T")[0] });
}

/**
 * Katılım bilgisiyle tamamla (Geldi/Gelmedi modalından çağrılır)
 * attendances: [{studentId, attended}]
 * Sadece attended=true olan öğrencilerden ders düşer.
 */
export async function completeAppointmentWithAttendance(
  id: string,
  attendances: { studentId: string; attended: boolean }[]
): Promise<CompleteResult> {
  const today = new Date().toISOString().split("T")[0];
  const warnings: string[] = [];

  // 1. Randevuyu tamamlandı yap
  const { error: e1 } = await db()
    .from("appointments")
    .update({ status: "tamamlandi", completed_at: today })
    .eq("id", id);
  if (e1) fail("completeAppointment:update", e1);

  // 2. Her katılımcı için işlem
  for (const { studentId, attended } of attendances) {
    const newStatus: string = attended ? "attended" : "absent";

    // Mevcut appointment_students kaydını bul
    const { data: existing } = await db()
      .from("appointment_students")
      .select("id, lesson_deducted")
      .eq("appointment_id", id)
      .eq("student_id", studentId)
      .maybeSingle();

    if (existing?.lesson_deducted) {
      // Zaten tamamlanmış — çift düşme koruması
      continue;
    }

    if (attended) {
      // Ders düş
      const { data: std, error: e2 } = await db()
        .from("students")
        .select("full_name, remaining_lessons, completed_lessons")
        .eq("id", studentId)
        .single();
      if (e2 || !std) { warnings.push(`Öğrenci bulunamadı (${studentId})`); continue; }

      const remaining = Number(std.remaining_lessons ?? 0);
      if (remaining <= 0) {
        warnings.push(`⚠️ ${std.full_name} adlı öğrencinin kalan dersi yok — ders düşülmedi.`);
      } else {
        await db().from("students").update({
          remaining_lessons: remaining - 1,
          completed_lessons: Number(std.completed_lessons ?? 0) + 1,
        }).eq("id", studentId);
      }
    }

    // attendance_status + lesson_deducted güncelle
    try {
      if (existing?.id) {
        await db().from("appointment_students").update({
          attendance_status: newStatus,
          lesson_deducted: attended,
        }).eq("id", existing.id);
      } else {
        await db().from("appointment_students").upsert({
          appointment_id: id, student_id: studentId,
          attendance_status: newStatus, lesson_deducted: attended,
        }, { onConflict: "appointment_id,student_id" });
      }
    } catch { /* appointment_students tablosu yoksa sessizce geç */ }
  }

  return { success: true, warnings };
}

/** Geriye dönük uyumluluk — Attendance bilgisi yoksa hepsini "attended" say */
export async function completeAppointment(id: string): Promise<CompleteResult> {
  const students = await getAppointmentStudents(id);
  if (students.length === 0) {
    // appointment_students boşsa — ana student_id'yi kullan
    const { data: apt } = await db().from("appointments").select("student_id").eq("id", id).single();
    if (apt?.student_id) {
      return completeAppointmentWithAttendance(id, [{ studentId: apt.student_id, attended: true }]);
    }
  }
  const attendances = students.map(s => ({ studentId: s.studentId, attended: true }));
  return completeAppointmentWithAttendance(id, attendances);
}

/* ════════════════════════════════════════════════════════════════
   TIME SLOTS
   ════════════════════════════════════════════════════════════════ */

export async function getTimeSlots(date: string): Promise<TimeSlot[]> {
  const { getSlotsForDate } = await import("./slots");
  const adminSlots = await getSlotsForDate(date);
  if (adminSlots.length === 0) return [];
  const apts = await getAppointments({ date });
  const booked = apts.filter(a => a.status !== "iptal").map(a => a.startTime);
  return adminSlots.map(s => ({
    id: s.id || `slot-${date}-${s.start}`, date,
    startTime: s.start, endTime: s.end,
    isAvailable: s.open && !booked.includes(s.start),
    isBlocked: !s.open,
  }));
}

/* ════════════════════════════════════════════════════════════════
   LESSON RECORDS
   ════════════════════════════════════════════════════════════════ */

export async function getLessonRecords(studentId?: string): Promise<LessonRecord[]> {
  let q = db().from("lesson_records").select("*").order("date", { ascending: false });
  if (studentId) q = q.eq("student_id", studentId);
  const { data, error } = await q;
  if (error) fail("getLessonRecords", error);
  return (data ?? []).map(ml);
}
export async function createLessonRecord(record: Omit<LessonRecord, "id" | "createdAt">): Promise<LessonRecord> {
  const { data, error } = await db().from("lesson_records").insert({
    appointment_id: record.appointmentId || null, student_id: record.studentId, date: record.date,
    conditioning: record.conditioning, punch: record.punch, kick: record.kick,
    defense: record.defense, combination: record.combination, sparring: record.sparring,
    overall: record.overall, trainer_notes: record.trainerNotes, duration_minutes: record.durationMinutes,
  }).select().single();
  if (error) fail("createLessonRecord", error);
  return ml(data);
}

/* ════════════════════════════════════════════════════════════════
   NOTIFICATIONS
   ════════════════════════════════════════════════════════════════ */

export async function getStudentNotifications(studentId: string): Promise<Notification[]> {
  const { data, error } = await db()
    .from("notifications").select("*").eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) fail("getStudentNotifications", error);
  return (data ?? []).map(mn);
}
export async function getAdminNotifications(): Promise<Notification[]> {
  const { data, error } = await db()
    .from("notifications").select("*").is("student_id", null)
    .order("created_at", { ascending: false }).limit(20);
  if (error) { console.error("getAdminNotifications:", error.message); return []; }
  return (data ?? []).map(mn);
}
export async function markNotificationRead(id: string): Promise<void> {
  await db().from("notifications").update({ is_read: true }).eq("id", id);
}

/* ════════════════════════════════════════════════════════════════
   PAYMENTS
   ════════════════════════════════════════════════════════════════ */

export async function getPayments(): Promise<Payment[]> {
  const { data, error } = await db().from("payments").select("*").order("paid_at", { ascending: false });
  if (error) fail("getPayments", error);
  return (data ?? []).map(mp);
}
export async function addPayment(payment: Omit<Payment, "id">): Promise<Payment> {
  const { data, error } = await db().from("payments").insert({
    student_id: payment.studentId, student_name: payment.studentName,
    amount: payment.amount, paid_at: payment.paidAt, method: payment.method, notes: payment.notes,
  }).select().single();
  if (error) fail("addPayment", error);
  const { data: std } = await db().from("students").select("amount_paid, amount_due").eq("id", payment.studentId).single();
  if (std) {
    const newPaid = Number(std.amount_paid) + payment.amount;
    const newDue  = Math.max(0, Number(std.amount_due) - payment.amount);
    await db().from("students").update({
      amount_paid: newPaid, amount_due: newDue,
      payment_status: newDue === 0 ? "odendi" : newPaid > 0 ? "kismi" : "beklemede",
    }).eq("id", payment.studentId);
  }
  return mp(data);
}
export async function deletePayment(id: string): Promise<void> {
  const { data: pay, error: e1 } = await db().from("payments").select("student_id, amount").eq("id", id).single();
  if (e1) fail("deletePayment:get", e1);
  const { error: e2 } = await db().from("payments").delete().eq("id", id);
  if (e2) fail("deletePayment:delete", e2);
  if (pay) {
    const { data: std } = await db().from("students").select("amount_paid, amount_due").eq("id", pay.student_id).single();
    if (std) {
      const newPaid = Math.max(0, Number(std.amount_paid) - pay.amount);
      await db().from("students").update({
        amount_paid: newPaid, amount_due: Number(std.amount_due) + pay.amount,
        payment_status: newPaid === 0 ? "beklemede" : "kismi",
      }).eq("id", pay.student_id);
    }
  }
}
