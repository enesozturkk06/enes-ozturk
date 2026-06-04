/**
 * lib/db.ts — Supabase veri katmanı
 * Düet davet sistemi: creator/partner, invite_status, attendance
 */
import type {
  Student, Appointment, AppointmentStudent, LessonRecord,
  Notification, NotifType, TimeSlot, Payment, CompleteResult, LessonType,
  DuetPartner, PendingInvite, SalonOwner, SalonOwnerStudent,
} from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";

/* ── Hata yönetimi ─────────────────────────────────────────── */
function isSchemaError(e: { message?: string; code?: string }): boolean {
  const m = e.message ?? "";
  return (
    m.includes("schema cache") ||
    m.includes("Could not find the table") ||
    m.includes("Could not find the column") ||
    e.code === "PGRST200" || e.code === "PGRST204"
  );
}

function schemaHint(tableName: string): string {
  return `\n\n👉 Supabase SQL Editor'de SUPABASE_FIX_NOW.sql dosyasını çalıştırın (${tableName} tablosu/kolonu eksik).`;
}

function fail(fn: string, e: { message: string; details?: string; code?: string }): never {
  const hint = isSchemaError(e) ? schemaHint(fn) : "";
  const msg  = `[${fn}] ${e.message}${e.details ? " | " + e.details : ""}${hint}`;
  console.error("⛔ Supabase:", msg);
  throw new Error(msg);
}

function db() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase bağlı değil");
  return supabase!;
}

/* ── Row mappers ────────────────────────────────────────────── */
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
  id: r.id, studentId: r.student_id ?? "",
  studentName: r.student_name ?? "", studentCode: r.student_code ?? "",
  studentPhone: r.student_phone ?? "",
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
  role:             (r.role ?? "creator") as AppointmentStudent["role"],
  inviteStatus:     (r.invite_status ?? "accepted") as AppointmentStudent["inviteStatus"],
  attendanceStatus: (r.attendance_status ?? "pending") as AppointmentStudent["attendanceStatus"],
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
  id: r.id, studentId: r.student_id ?? undefined,
  appointmentId: r.appointment_id ?? undefined,
  title: r.title, message: r.message,
  type: r.type, isRead: r.is_read ?? false, createdAt: r.created_at ?? "",
});

/** Türkçe kısa tarih: "7 Haz 17:00" */
function fmtNotifDate(dateStr: string, timeStr?: string): string {
  const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  const [, m, d] = (dateStr ?? "").split("-").map(Number);
  const base = `${d} ${months[(m ?? 1)-1]}`;
  return timeStr ? `${base} ${timeStr}` : base;
}

/** Admin bildirimi oluştur — appointment_id kolonu yoksa fallback ile sessizce devam eder */
export async function createAdminNotification(
  title: string,
  message: string,
  type: NotifType = "info",
  options?: { appointmentId?: string; studentId?: string },
): Promise<void> {
  const base = { title, message, type, is_read: false, student_id: options?.studentId ?? null };
  if (options?.appointmentId) {
    const { error } = await db().from("notifications").insert({ ...base, appointment_id: options.appointmentId });
    if (!error) return;
    // appointment_id kolonu henüz yoksa sessizce devam et
    if (!error.message.includes("appointment_id") && !isSchemaError(error)) {
      console.error("createAdminNotification:", error.message); return;
    }
  }
  const { error } = await db().from("notifications").insert(base);
  if (error) console.error("createAdminNotification:", error.message);
}

function sRow(s: Partial<Student>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (s.code             !== undefined) r.code               = s.code;
  if (s.fullName         !== undefined) r.full_name          = s.fullName;
  if (s.phone            !== undefined) r.phone              = s.phone;
  if (s.email            !== undefined) r.email              = s.email;
  if (s.level            !== undefined) r.level              = s.level;
  if (s.packageType      !== undefined) r.package_type       = s.packageType;
  if (s.totalLessons     !== undefined) r.total_lessons      = s.totalLessons;
  if (s.remainingLessons !== undefined) r.remaining_lessons  = s.remainingLessons;
  if (s.completedLessons !== undefined) r.completed_lessons  = s.completedLessons;
  if (s.paymentStatus    !== undefined) r.payment_status     = s.paymentStatus;
  if (s.amountPaid       !== undefined) r.amount_paid        = s.amountPaid;
  if (s.amountDue        !== undefined) r.amount_due         = s.amountDue;
  if (s.packageStartDate !== undefined) r.package_start_date = s.packageStartDate || null;
  if (s.packageEndDate   !== undefined) r.package_end_date   = s.packageEndDate || null;
  if (s.notes            !== undefined) r.notes              = s.notes;
  if (s.isActive         !== undefined) r.is_active          = s.isActive;
  if (s.weight           !== undefined) r.weight             = s.weight;
  if (s.age              !== undefined) r.age                = s.age;
  return r;
}

/**
 * appointment_students'a kayıt ekle — 3 kademeli fallback:
 * 1. Tüm kolonlarla insert (ideal durum)
 * 2. Sadece zorunlu kolonlarla insert + ayrı update
 * 3. Sadece zorunlu kolonlarla insert (en az)
 */
async function insertAppointmentStudent(
  appointmentId: string,
  studentId: string,
  role: string,
  inviteStatus: string,
): Promise<boolean> {
  const fullRow = {
    appointment_id:    appointmentId,
    student_id:        studentId,
    role,
    invite_status:     inviteStatus,
    attendance_status: "pending",
    lesson_deducted:   false,
  };

  // Kademe 1: Tüm kolonlarla insert
  const { error: e1 } = await db().from("appointment_students").insert(fullRow);
  if (!e1) return true;

  // Kademe 2: Schema hatası → temel kolonlarla insert, sonra update
  if (isSchemaError(e1)) {
    console.warn("[insertApSt] Schema cache sorunu, temel insert deneniyor:", e1.message);
    const basicRow = { appointment_id: appointmentId, student_id: studentId };
    const { data: inserted, error: e2 } = await db()
      .from("appointment_students")
      .upsert(basicRow, { onConflict: "appointment_id,student_id" })
      .select("id").single();

    if (e2) {
      console.warn("[insertApSt] Temel insert de başarısız:", e2.message);
      return false;
    }

    // Kolon güncelleme denemesi (cache refresh sonrası çalışır)
    if (inserted?.id) {
      const { error: e3 } = await db()
        .from("appointment_students")
        .update({ role, invite_status: inviteStatus, attendance_status: "pending", lesson_deducted: false })
        .eq("id", inserted.id);
      if (e3) console.warn("[insertApSt] Kolon güncelleme başarısız (OK):", e3.message);
    }
    return true;
  }

  console.error("[insertApSt] Insert hatası:", e1.message);
  return false;
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

/* ═══════════════════════════════════════════════════════════════
   STUDENTS
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   SALON OWNERS
   ═══════════════════════════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSalonOwner(r: any): SalonOwner {
  return {
    id: r.id, name: r.name, accessCode: r.access_code,
    isActive: r.is_active ?? true, notes: r.notes ?? undefined,
    createdAt: r.created_at ?? "",
  };
}

function genAccessCode(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `SALON-${n}`;
}

export async function getSalonOwners(): Promise<SalonOwner[]> {
  const { data, error } = await db().from("salon_owners").select("*").order("created_at", { ascending: false });
  if (error) {
    if (isSchemaError(error)) { console.warn("getSalonOwners: tablo hazır değil"); return []; }
    console.error("getSalonOwners:", error.message); return [];
  }
  return (data ?? []).map(mapSalonOwner);
}

export async function getSalonOwnerById(id: string): Promise<SalonOwner | null> {
  const { data, error } = await db().from("salon_owners").select("*").eq("id", id).maybeSingle();
  if (error) { console.error("getSalonOwnerById:", error.message); return null; }
  return data ? mapSalonOwner(data) : null;
}

export async function createSalonOwner(name: string, notes?: string): Promise<SalonOwner> {
  // Benzersiz kod üret
  let code = genAccessCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data } = await db().from("salon_owners").select("id").eq("access_code", code).maybeSingle();
    if (!data) break;
    code = genAccessCode();
    attempts++;
  }
  const { data, error } = await db().from("salon_owners")
    .insert({ name, access_code: code, is_active: true, notes: notes ?? null })
    .select().single();
  if (error) fail("createSalonOwner", error);
  return mapSalonOwner(data);
}

export async function updateSalonOwner(id: string, updates: Partial<{ name: string; isActive: boolean; notes: string }>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.name     !== undefined) row.name      = updates.name;
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  if (updates.notes    !== undefined) row.notes     = updates.notes;
  const { error } = await db().from("salon_owners").update(row).eq("id", id);
  if (error) fail("updateSalonOwner", error);
}

export async function deleteSalonOwner(id: string): Promise<void> {
  const { error } = await db().from("salon_owners").delete().eq("id", id);
  if (error) fail("deleteSalonOwner", error);
}

/** Salon sahibine atanmış öğrencilerin ID listesi */
export async function getSalonOwnerStudentIds(ownerId: string): Promise<string[]> {
  const { data, error } = await db()
    .from("salon_owner_students").select("student_id").eq("salon_owner_id", ownerId);
  if (error) { console.error("getSalonOwnerStudentIds:", error.message); return []; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => r.student_id as string);
}

/** Salon sahibine atanmış öğrencilerin tam listesi */
export async function getSalonOwnerStudents(ownerId: string): Promise<Student[]> {
  const ids = await getSalonOwnerStudentIds(ownerId);
  if (ids.length === 0) return [];
  const { data, error } = await db().from("students").select("*").in("id", ids).order("full_name");
  if (error) { console.error("getSalonOwnerStudents:", error.message); return []; }
  return (data ?? []).map(ms);
}

export async function assignStudentToSalonOwner(ownerId: string, studentId: string): Promise<void> {
  const { error } = await db().from("salon_owner_students")
    .upsert({ salon_owner_id: ownerId, student_id: studentId }, { onConflict: "salon_owner_id,student_id" });
  if (error) fail("assignStudentToSalonOwner", error);
}

export async function removeStudentFromSalonOwner(ownerId: string, studentId: string): Promise<void> {
  const { error } = await db().from("salon_owner_students")
    .delete().eq("salon_owner_id", ownerId).eq("student_id", studentId);
  if (error) fail("removeStudentFromSalonOwner", error);
}

/* ═══════════════════════════════════════════════════════════════
   DUET PARTNERS
   ═══════════════════════════════════════════════════════════════ */

/** Öğrencinin düet partnerini döndür — tablo yoksa null */
export async function getDuetPartner(studentId: string): Promise<Student | null> {
  try {
    // Önce select("*") ile tablo erişilebilir mi kontrol et
    const { data, error } = await db()
      .from("duet_partners")
      .select("*")
      .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`)
      .limit(1);

    if (error) {
      if (isSchemaError(error)) {
        console.warn("getDuetPartner: duet_partners tablosu hazır değil (SUPABASE_FIX_NOW.sql çalıştırın)");
        return null;
      }
      console.warn("getDuetPartner:", error.message);
      return null;
    }

    if (!data || data.length === 0) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = data[0] as any;
    const partnerId = row.student_a_id === studentId ? row.student_b_id : row.student_a_id;
    return getStudent(partnerId);
  } catch {
    return null;
  }
}

export async function getAllDuetPairs(): Promise<DuetPartner[]> {
  try {
    const { data, error } = await db().from("duet_partners").select("*");
    if (error) { console.warn("getAllDuetPairs:", error.message); return []; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((r: any) => ({
      id: r.id, studentAId: r.student_a_id, studentBId: r.student_b_id, createdAt: r.created_at,
    }));
  } catch { return []; }
}

export async function setDuetPartner(aId: string, bId: string): Promise<void> {
  // Temizle
  const d1 = await db().from("duet_partners").delete()
    .or(`student_a_id.eq.${aId},student_b_id.eq.${aId}`);
  if (d1.error && !isSchemaError(d1.error)) console.warn("setDuetPartner:del1", d1.error.message);

  const d2 = await db().from("duet_partners").delete()
    .or(`student_a_id.eq.${bId},student_b_id.eq.${bId}`);
  if (d2.error && !isSchemaError(d2.error)) console.warn("setDuetPartner:del2", d2.error.message);

  const { error } = await db().from("duet_partners")
    .insert({ student_a_id: aId, student_b_id: bId });

  if (error) {
    if (isSchemaError(error)) {
      throw new Error(
        "duet_partners tablosu Supabase schema cache'inde görünmüyor.\n\n" +
        "Çözüm adımları:\n" +
        "1. Supabase Dashboard → SQL Editor\n" +
        "2. SUPABASE_FIX_NOW.sql dosyasındaki SQL'i çalıştırın\n" +
        "3. Dashboard → Settings → API → 'Reload Schema Cache' butonuna basın\n" +
        "4. 1 dakika bekleyip tekrar deneyin"
      );
    }
    fail("setDuetPartner", error);
  }
}

export async function removeDuetPartner(studentId: string): Promise<void> {
  const { error } = await db().from("duet_partners").delete()
    .or(`student_a_id.eq.${studentId},student_b_id.eq.${studentId}`);
  if (error && !isSchemaError(error)) fail("removeDuetPartner", error);
  // Schema hatası → sessizce devam et (tablo yoksa silecek bir şey de yok)
}

/* ═══════════════════════════════════════════════════════════════
   APPOINTMENTS
   ═══════════════════════════════════════════════════════════════ */

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

/**
 * Öğrenciye ait tüm randevular:
 * - Kendi oluşturduğu (student_id)
 * - Düet daveti kabul ettiği (appointment_students → invite_status != declined)
 */
export async function getStudentAppointments(studentId: string): Promise<Appointment[]> {
  // 1. Kendi oluşturduğu randevular
  const { data: direct, error: e1 } = await db()
    .from("appointments").select("*")
    .eq("student_id", studentId).order("date").order("start_time");
  if (e1) fail("getStudentAppointments:direct", e1);

  // 2. appointment_students üzerinden partner olduğu randevular
  //    select("*") ile — schema cache bağımsız
  const { data: apStRows } = await db()
    .from("appointment_students")
    .select("*")
    .eq("student_id", studentId);

  // JS'de filtrele: accepted olanlar ve creator olmayanlar
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const partnerAccepted = (apStRows ?? []).filter((r: any) =>
    r.role !== "creator" && r.invite_status === "accepted"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ).map((r: any) => r.appointment_id as string);

  const directIds = (direct ?? []).map(r => r.id);
  const extraIds  = partnerAccepted.filter(id => !directIds.includes(id));

  if (extraIds.length === 0) return (direct ?? []).map(ma);

  const { data: extra, error: e3 } = await db()
    .from("appointments").select("*").in("id", extraIds);
  if (e3) fail("getStudentAppointments:extra", e3);

  return [...(direct ?? []), ...(extra ?? [])].map(ma)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

/** Bekleyen davetleri sayısı (bildirim badge için) */
export async function getPendingInviteCount(studentId: string): Promise<number> {
  const invites = await getPendingInvites(studentId);
  return invites.length;
}

/** Randevuya bağlı tüm öğrenciler — batch isim çekimi ile N+1 ortadan kalkar */
export async function getAppointmentStudents(appointmentId: string): Promise<AppointmentStudent[]> {
  const { data, error } = await db()
    .from("appointment_students")
    .select("*")
    .eq("appointment_id", appointmentId);

  if (error) {
    if (isSchemaError(error)) {
      console.warn("getAppointmentStudents: schema cache hazır değil → SUPABASE_FIX_NOW.sql çalıştırın");
    } else {
      console.warn("getAppointmentStudents:", error.message);
    }
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return [];

  // Batch: tek sorguda tüm öğrenci adlarını çek (N+1 → 1 sorgu)
  const studentIds = rows.map(r => r.student_id as string);
  const { data: studs } = await db()
    .from("students").select("id, full_name").in("id", studentIds);
  const nameMap: Record<string, string> = {};
  (studs ?? []).forEach((s: { id: string; full_name: string }) => { nameMap[s.id] = s.full_name; });

  return rows.map(r => ({
    id:               r.id,
    appointmentId:    r.appointment_id,
    studentId:        r.student_id,
    studentName:      nameMap[r.student_id] || undefined,
    role:             (r.role ?? "creator")             as AppointmentStudent["role"],
    inviteStatus:     (r.invite_status ?? "accepted")   as AppointmentStudent["inviteStatus"],
    attendanceStatus: (r.attendance_status ?? "pending") as AppointmentStudent["attendanceStatus"],
    lessonDeducted:   r.lesson_deducted ?? false,
    createdAt:        r.created_at ?? "",
  }));
}

/** Salon paneli için: birden fazla öğrencinin randevularını tek sorguda çek */
export async function getAppointmentsForStudentIds(studentIds: string[]): Promise<Appointment[]> {
  if (studentIds.length === 0) return [];
  const { data, error } = await db()
    .from("appointments").select("*")
    .in("student_id", studentIds)
    .order("date", { ascending: false }).order("start_time");
  if (error) { console.error("getAppointmentsForStudentIds:", error.message); return []; }
  return (data ?? []).map(ma);
}

/** Birden fazla randevu için appointment_students bulk — salon/admin listesi için */
export async function bulkGetAppointmentStudents(
  aptIds: string[]
): Promise<Record<string, AppointmentStudent[]>> {
  if (aptIds.length === 0) return {};
  const { data, error } = await db()
    .from("appointment_students").select("*").in("appointment_id", aptIds);
  if (error) { console.warn("bulkGetAppointmentStudents:", error.message); return {}; }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return {};

  // Batch isim çekimi
  const studentIds = [...new Set(rows.map(r => r.student_id as string))];
  const { data: studs } = await db().from("students").select("id, full_name").in("id", studentIds);
  const nameMap: Record<string, string> = {};
  (studs ?? []).forEach((s: { id: string; full_name: string }) => { nameMap[s.id] = s.full_name; });

  const result: Record<string, AppointmentStudent[]> = {};
  rows.forEach(r => {
    const apSt: AppointmentStudent = {
      id: r.id, appointmentId: r.appointment_id, studentId: r.student_id,
      studentName:      nameMap[r.student_id] || undefined,
      role:             (r.role ?? "creator")             as AppointmentStudent["role"],
      inviteStatus:     (r.invite_status ?? "accepted")   as AppointmentStudent["inviteStatus"],
      attendanceStatus: (r.attendance_status ?? "pending") as AppointmentStudent["attendanceStatus"],
      lessonDeducted:   r.lesson_deducted ?? false,
      createdAt:        r.created_at ?? "",
    };
    if (!result[r.appointment_id]) result[r.appointment_id] = [];
    result[r.appointment_id].push(apSt);
  });
  return result;
}

/**
 * Bekleyen davetler — öğrenci panelinde gösterilecek
 * invite_status = 'pending' olan kayıtlar
 */
/** Bekleyen davetler — select("*") kullanarak schema cache'ten bağımsız */
export async function getPendingInvites(studentId: string): Promise<PendingInvite[]> {
  // Önce appointment_students'tan pending kayıtları al (select * ile)
  const { data: apStRows, error } = await db()
    .from("appointment_students")
    .select("*")
    .eq("student_id", studentId);

  if (error) {
    if (isSchemaError(error)) {
      console.warn("getPendingInvites: schema cache hazır değil → SUPABASE_FIX_NOW.sql çalıştırın");
    } else {
      console.warn("getPendingInvites:", error.message);
    }
    return [];
  }

  // invite_status = 'pending' ve role = 'partner' olanları JS'de filtrele
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pending = (apStRows ?? []).filter((r: any) =>
    r.invite_status === "pending" && r.role === "partner"
  );

  if (pending.length === 0) return [];

  // Her pending kayıt için randevu detayını ayrı çek
  const results: PendingInvite[] = [];
  for (const row of pending) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any;
    const { data: apt } = await db()
      .from("appointments")
      .select("date, start_time, end_time, lesson_type, student_name")
      .eq("id", r.appointment_id)
      .maybeSingle();

    if (apt) {
      results.push({
        appointmentId:        r.appointment_id,
        appointmentStudentId: r.id,
        creatorName:          apt.student_name ?? "?",
        date:                 apt.date ?? "",
        startTime:            apt.start_time ?? "",
        endTime:              apt.end_time ?? "",
        lessonType:           (apt.lesson_type ?? "duet") as LessonType,
      });
    }
  }

  return results;
}

/**
 * Düet davetini onayla veya reddet
 * Onaylamadan önce: öğrencinin kalan dersi > 0 kontrolü
 */
export async function respondToInvite(
  appointmentStudentId: string,
  studentId: string,
  accept: boolean
): Promise<{ success: boolean; error?: string }> {
  if (accept) {
    // Kalan ders kontrolü
    const { data: std } = await db()
      .from("students").select("remaining_lessons, full_name").eq("id", studentId).single();
    if (!std || Number(std.remaining_lessons ?? 0) <= 0) {
      return { success: false, error: "Kalan dersiniz yok. Düet randevusunu onaylayamazsınız." };
    }
  }

  const { error } = await db()
    .from("appointment_students")
    .update({ invite_status: accept ? "accepted" : "declined" })
    .eq("id", appointmentStudentId)
    .eq("student_id", studentId); // güvenlik: kendi kaydını güncelleyebilir

  if (error) {
    if (isSchemaError(error)) {
      return { success: false, error: "Sistem güncelleniyor. SUPABASE_FIX_NOW.sql çalıştırın ve tekrar deneyin." };
    }
    console.error("respondToInvite:", error.message);
    return { success: false, error: error.message };
  }

  // Admin bildirimi: kim, hangi randevu, onayladı/reddetti
  try {
    const { data: stdRow } = await db().from("students").select("full_name").eq("id", studentId).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stdName = (stdRow as any)?.full_name ?? "Öğrenci";
    const { data: apStRow } = await db().from("appointment_students").select("appointment_id").eq("id", appointmentStudentId).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aptId = (apStRow as any)?.appointment_id as string | undefined;
    if (aptId) {
      const { data: aptRow } = await db().from("appointments").select("date,start_time").eq("id", aptId).maybeSingle();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = aptRow as any;
      const label = r ? fmtNotifDate(r.date, r.start_time) : "?";
      await createAdminNotification(
        accept ? `Düet kabul: ${stdName}` : `Düet red: ${stdName}`,
        accept
          ? `${stdName}, ${label} tarihli düet randevu davetini onayladı.`
          : `${stdName}, ${label} tarihli düet randevu davetini reddetti.`,
        accept ? "success" : "warning",
        { appointmentId: aptId, studentId },
      );
    }
  } catch { /* bildirim hatası randevu akışını durdurmaz */ }

  return { success: true };
}

/** Randevu oluştur (creator + partner davetleri) */
export async function createAppointment(apt: {
  studentId: string; studentName: string; studentCode: string; studentPhone?: string;
  date: string; startTime: string; endTime: string;
  lessonType?: LessonType; notes?: string; status?: string;
  partnerStudentIds?: string[]; // düet partnerleri — pending olarak eklenir
}): Promise<Appointment> {
  const lessonType = apt.lessonType ?? "bireysel";

  // Temel randevu insert
  const baseRow: Record<string, unknown> = {
    student_id:    apt.studentId,
    student_name:  apt.studentName,
    student_code:  apt.studentCode,
    student_phone: apt.studentPhone ?? "",
    date:          apt.date,
    start_time:    apt.startTime,
    end_time:      apt.endTime,
    status:        apt.status ?? "onaylandi",
    notes:         apt.notes ?? null,
  };

  // lesson_type schema cache sorunu için fallback
  let result = await db().from("appointments")
    .insert({ ...baseRow, lesson_type: lessonType }).select().single();

  if (result.error) {
    const msg = result.error.message ?? "";
    if (msg.includes("lesson_type") || msg.includes("schema cache")) {
      console.warn("[createAppointment] lesson_type schema sorunu, fallback");
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
  const aptData = (result as any).data;
  const appointmentId = aptData.id;

  // appointment_students: creator (accepted) + partnerler (pending)
  const rows: Record<string, unknown>[] = [
    {
      appointment_id:   appointmentId,
      student_id:       apt.studentId,
      role:             "creator",
      invite_status:    "accepted",
      attendance_status:"pending",
      lesson_deducted:  false,
    },
  ];

  for (const partnerId of (apt.partnerStudentIds ?? [])) {
    rows.push({
      appointment_id:   appointmentId,
      student_id:       partnerId,
      role:             "partner",
      invite_status:    "pending",
      attendance_status:"pending",
      lesson_deducted:  false,
    });
  }

  // appointment_students kayıtlarını 3 kademeli güvenli insert ile oluştur
  for (const row of rows) {
    const fullInsertOk = await insertAppointmentStudent(
      appointmentId,
      row.student_id as string,
      row.role as string,
      row.invite_status as string,
    );
    if (!fullInsertOk) {
      console.error(
        `[createAppointment] ${row.student_id} için appointment_students kaydı oluşturulamadı!` +
        "\n→ SUPABASE_FIX_NOW.sql çalıştırın ve schema cache'i yenileyin."
      );
    }
  }

  // Admin bildirimi oluştur
  const dateLabel = fmtNotifDate(apt.date, apt.startTime);
  const typeLabel = lessonType === "duet" ? "düet" : lessonType === "grup" ? "grup" : "bireysel";
  if (lessonType === "duet" && (apt.partnerStudentIds ?? []).length > 0) {
    // Partner adını çek
    const partnerId = apt.partnerStudentIds![0];
    const { data: partnerRow } = await db().from("students").select("full_name").eq("id", partnerId).maybeSingle();
    const partnerName = (partnerRow as { full_name?: string } | null)?.full_name ?? "Partner";
    await createAdminNotification(
      `Düet randevu: ${apt.studentName}`,
      `${apt.studentName}, ${dateLabel} için düet randevu oluşturdu. Partner daveti gönderildi: ${partnerName}`,
      "info",
      { appointmentId, studentId: apt.studentId },
    );
  } else {
    await createAdminNotification(
      `Yeni randevu: ${apt.studentName}`,
      `${apt.studentName}, ${dateLabel} için ${typeLabel} randevu aldı.`,
      "info",
      { appointmentId, studentId: apt.studentId },
    );
  }

  return ma(aptData);
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

export async function cancelAppointment(id: string, cancelledByStudentName?: string): Promise<void> {
  await updateAppointment(id, { status: "iptal", cancelledAt: new Date().toISOString().split("T")[0] });
  // Admin bildirimi
  if (cancelledByStudentName) {
    const { data: apt } = await db().from("appointments").select("date,start_time,lesson_type").eq("id", id).maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = apt as any;
    const label = r ? fmtNotifDate(r.date, r.start_time) : "?";
    await createAdminNotification(
      `Randevu iptal: ${cancelledByStudentName}`,
      `${cancelledByStudentName}, ${label} tarihli randevusunu iptal etti.`,
      "warning",
      { appointmentId: id },
    );
  }
}

/**
 * Randevuyu katılım bilgisiyle tamamla.
 * Ders düşme kuralı:
 *   invite_status = 'accepted' VE attendance = 'attended' ise düş
 *   invite_status = 'pending' veya 'declined' ise düşme
 *   lesson_deducted = true ise tekrar düşme (çift koruma)
 */
export async function completeAppointmentWithAttendance(
  id: string,
  attendances: { studentId: string; attended: boolean }[]
): Promise<CompleteResult> {
  const today = new Date().toISOString().split("T")[0];
  const warnings: string[] = [];

  // Randevuyu tamamlandı yap
  const { error: e1 } = await db()
    .from("appointments")
    .update({ status: "tamamlandi", completed_at: today })
    .eq("id", id);
  if (e1) fail("completeAppointment:update", e1);

  // appointment_students kayıtlarını al
  const { data: apStudents } = await db()
    .from("appointment_students")
    .select("id, student_id, role, invite_status, lesson_deducted")
    .eq("appointment_id", id);

  const rows = apStudents ?? [];

  // Fallback: tablo boşsa ana student_id'yi kullan
  if (rows.length === 0) {
    const { data: apt } = await db().from("appointments").select("student_id").eq("id", id).single();
    if (apt?.student_id) {
      rows.push({ id: "", student_id: apt.student_id, role: "creator", invite_status: "accepted", lesson_deducted: false });
    }
  }

  for (const { studentId, attended } of attendances) {
    const row = rows.find(r => r.student_id === studentId);

    // İkinci kez tamamlama koruması
    if (row?.lesson_deducted) continue;

    // Sadece accepted olanlar ders düşer
    const isAccepted = !row || row.invite_status === "accepted" || row.invite_status === null;

    const newStatus = attended ? "attended" : "absent";

    if (attended && isAccepted) {
      const { data: std } = await db()
        .from("students")
        .select("full_name, remaining_lessons, completed_lessons")
        .eq("id", studentId).single();

      if (!std) { warnings.push(`Öğrenci bulunamadı (${studentId})`); }
      else {
        const remaining = Number(std.remaining_lessons ?? 0);
        if (remaining <= 0) {
          warnings.push(`⚠️ ${std.full_name} adlı öğrencinin kalan dersi yok.`);
        } else {
          await db().from("students").update({
            remaining_lessons: remaining - 1,
            completed_lessons: Number(std.completed_lessons ?? 0) + 1,
          }).eq("id", studentId);
        }
      }
    }

    // attendance_status + lesson_deducted güncelle
    const shouldDeduct = attended && isAccepted;
    try {
      if (row?.id) {
        await db().from("appointment_students").update({
          attendance_status: newStatus,
          lesson_deducted: shouldDeduct,
        }).eq("id", row.id);
      } else {
        await db().from("appointment_students").upsert({
          appointment_id: id, student_id: studentId,
          role: "creator", invite_status: "accepted",
          attendance_status: newStatus, lesson_deducted: shouldDeduct,
        }, { onConflict: "appointment_id,student_id" });
      }
    } catch { /* tablo yoksa sessizce geç */ }
  }

  return { success: true, warnings };
}

/** Geriye dönük uyumluluk */
export async function completeAppointment(id: string): Promise<CompleteResult> {
  const students = await getAppointmentStudents(id);
  if (students.length === 0) {
    const { data: apt } = await db().from("appointments").select("student_id").eq("id", id).single();
    if (apt?.student_id) {
      return completeAppointmentWithAttendance(id, [{ studentId: apt.student_id, attended: true }]);
    }
  }
  // Sadece accepted olanları al
  const entries = students
    .filter(s => s.inviteStatus === "accepted")
    .map(s => ({ studentId: s.studentId, attended: true }));
  return completeAppointmentWithAttendance(id, entries.length > 0 ? entries : []);
}

/* ═══════════════════════════════════════════════════════════════
   TIME SLOTS
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   LESSON RECORDS
   ═══════════════════════════════════════════════════════════════ */

export async function getLessonRecords(studentId?: string): Promise<LessonRecord[]> {
  let q = db().from("lesson_records").select("*").order("date", { ascending: false });
  if (studentId) q = q.eq("student_id", studentId);
  const { data, error } = await q;
  if (error) fail("getLessonRecords", error);
  return (data ?? []).map(ml);
}

export async function createLessonRecord(record: Omit<LessonRecord, "id" | "createdAt">): Promise<LessonRecord> {
  const { data, error } = await db().from("lesson_records").insert({
    appointment_id:   record.appointmentId || null,
    student_id:       record.studentId, date: record.date,
    conditioning:     record.conditioning, punch: record.punch, kick: record.kick,
    defense:          record.defense, combination: record.combination, sparring: record.sparring,
    overall:          record.overall, trainer_notes: record.trainerNotes,
    duration_minutes: record.durationMinutes,
  }).select().single();
  if (error) fail("createLessonRecord", error);
  return ml(data);
}

/* ═══════════════════════════════════════════════════════════════
   NOTIFICATIONS
   ═══════════════════════════════════════════════════════════════ */

export async function getStudentNotifications(studentId: string): Promise<Notification[]> {
  const { data, error } = await db()
    .from("notifications").select("*").eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) fail("getStudentNotifications", error);
  return (data ?? []).map(mn);
}

export async function getAdminNotifications(limit = 50): Promise<Notification[]> {
  const { data, error } = await db()
    .from("notifications").select("*").is("student_id", null)
    .order("created_at", { ascending: false }).limit(limit);
  if (error) { console.error("getAdminNotifications:", error.message); return []; }
  return (data ?? []).map(mn);
}

export async function markNotificationRead(id: string): Promise<void> {
  await db().from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllAdminNotificationsRead(): Promise<void> {
  await db().from("notifications").update({ is_read: true })
    .is("student_id", null).eq("is_read", false);
}

/* ═══════════════════════════════════════════════════════════════
   PAYMENTS
   ═══════════════════════════════════════════════════════════════ */

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
