/**
 * lib/db.ts — Supabase veri katmanı
 * Düet davet sistemi: creator/partner, invite_status, attendance
 */
import type {
  Student, Appointment, AppointmentStudent, LessonRecord,
  Notification, NotifType, TimeSlot, Payment, CompleteResult, LessonType,
  DuetPartner, PendingInvite, SalonOwner, SalonOwnerStudent,
  PackagePurchase, PackageType, PaymentStatus, ArenaDuel,
  Gym, GymShareType, IncomeMovement, IncomeMovementType, PaymentRecordStatus,
} from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";
import { isPackageExpired, getDaysRemaining } from "./packageDuration";
import { PACKAGE_EXPIRED_NOTIFICATION_TEXT, PACKAGE_URGENT_DAYS } from "./constants";

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
  subscriptionType: (r.subscription_type ?? "lesson_pack") as import("./types").SubscriptionType,
  monthlyFee: r.monthly_fee != null ? Number(r.monthly_fee) : undefined,
  showInHallOfFame: r.show_in_hall_of_fame ?? true,
  hallFeatured: r.hall_featured ?? false,
  isStudentOfMonth: r.is_student_of_month ?? false,
  avatarUrl: r.avatar_url ?? undefined,
  gymId: r.gym_id ?? undefined,
  gymShareOverrideType: r.gym_share_override_type ?? undefined,
  gymShareOverrideValue: r.gym_share_override_value != null ? Number(r.gym_share_override_value) : undefined,
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
  status: (r.status ?? "odendi") as Payment["status"],
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

/**
 * Admin bildirimi oluştur.
 * KURAL: student_id HER ZAMAN NULL — böylece sadece admin görebilir.
 * Öğrenci bildirimleri ayrı fonksiyon ile oluşturulur.
 */
export async function createAdminNotification(
  title: string,
  message: string,
  type: NotifType = "info",
  options?: { appointmentId?: string },
): Promise<void> {
  // student_id her zaman NULL — admin bildirimi
  const base = { title, message, type, is_read: false, student_id: null };

  // appointment_id kolonu varsa dahil et, yoksa sade insert yap
  if (options?.appointmentId) {
    const { error: e1 } = await db().from("notifications")
      .insert({ ...base, appointment_id: options.appointmentId });
    if (!e1) return; // başarılı
    console.warn("[createAdminNotification] appointment_id ile insert başarısız:", e1.message);
    // Her türlü hatada fallback — return YOK, aşağıdaki insert çalışır
  }

  // Sade insert — appointment_id olmadan
  const { error: e2 } = await db().from("notifications").insert(base);
  if (e2) console.error("[createAdminNotification] Sade insert de başarısız:", e2.message, e2.code);
  else    console.log("[createAdminNotification] Bildirim oluşturuldu ✓ (sade)");
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
  if (s.subscriptionType !== undefined) r.subscription_type  = s.subscriptionType;
  if (s.monthlyFee       !== undefined) r.monthly_fee        = s.monthlyFee ?? null;
  if (s.showInHallOfFame !== undefined) r.show_in_hall_of_fame = s.showInHallOfFame;
  if (s.hallFeatured     !== undefined) r.hall_featured        = s.hallFeatured;
  if (s.isStudentOfMonth !== undefined) r.is_student_of_month  = s.isStudentOfMonth;
  if (s.avatarUrl        !== undefined) r.avatar_url            = s.avatarUrl ?? null;
  if (s.gymId                  !== undefined) r.gym_id                    = s.gymId || null;
  if (s.gymShareOverrideType   !== undefined) r.gym_share_override_type   = s.gymShareOverrideType || null;
  if (s.gymShareOverrideValue  !== undefined) r.gym_share_override_value  = s.gymShareOverrideValue ?? null;
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
 * Tarihi geçmiş (beforeDate'den önce) ama hâlâ "onaylandi" durumda kalan
 * randevular — admin aynı gün "Tamamla"ya basmadığı için listede unutulan dersler.
 */
export async function getIncompleteAppointments(beforeDate: string): Promise<Appointment[]> {
  const { data, error } = await db()
    .from("appointments").select("*")
    .lt("date", beforeDate)
    .eq("status", "onaylandi")
    .order("date", { ascending: false }).order("start_time");
  if (error) fail("getIncompleteAppointments", error);
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
        { appointmentId: aptId },
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

  // ── İKİ AYRI BİLDİRİM oluştur ───────────────────────────────
  //   1. Öğrenci bildirimi  → student_id = apt.studentId (dolu)
  //   2. Admin bildirimi    → student_id kolonu dahil edilmez (DB default NULL)
  try {
    const dateLabel   = fmtNotifDate(apt.date, apt.startTime);
    const lessonLabel = lessonType === "duet" ? " (Düet)" : lessonType === "grup" ? " (Grup)" : "";
    const title   = `Yeni randevu: ${apt.studentName}`;
    const message = `${apt.studentName}, ${dateLabel} için randevu aldı${lessonLabel}.`;

    // 1) Öğrenci bildirimi — student_id dolu
    const { error: se } = await db().from("notifications").insert({
      title, message, type: "reminder" as NotifType, is_read: false,
      student_id: apt.studentId,
    });
    if (se) console.warn("[createAppointment] Öğrenci bildirimi:", se.message);
    else    console.log("[createAppointment] Öğrenci bildirimi ✓");

    // 2) Admin bildirimi — student_id kolonu INSERT PAYLOAD'A DAHIL EDİLMEDİ
    //    DB default değeri NULL → getAdminNotifications (student_id IS NULL) filtresiyle görünür
    const adminRow: Record<string, unknown> = {
      title, message, type: "info", is_read: false,
      // student_id: kasıtlı olarak dahil edilmedi → NULL default
    };
    const { error: ae, data: aData } = await db().from("notifications")
      .insert(adminRow).select("id, student_id").single();
    if (ae) {
      console.error("[createAppointment] Admin bildirimi HATA:", ae.message, ae.code);
    } else {
      console.log("[createAppointment] Admin bildirimi ✓ →", aData);
    }
  } catch (err) {
    console.error("[createAppointment] Bildirim exception:", err);
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
 * Admin/Antrenör tarafından randevu iptali.
 * - 18 saat kısıtı uygulanmaz.
 * - lesson_deducted=true olan öğrencilerin ders hakkı geri yüklenir.
 * - Öğrenciye bildirim gönderilir.
 * - Admin bildirim geçmişine kaydedilir.
 * - notes alanına "ADMIN_CANCEL:" prefixi eklenir (öğrenci geçmişinde ayrı gösterim için).
 */
export async function adminCancelAppointment(
  appointmentId: string,
  reason?: string,
): Promise<void> {
  // 1. Randevu bilgilerini al
  const { data: apt } = await db()
    .from("appointments")
    .select("date, start_time, student_id, student_name")
    .eq("id", appointmentId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aptRow = apt as any;

  // 2. Katılımcı öğrencileri al (ders geri yükleme için)
  const { data: apStudents } = await db()
    .from("appointment_students")
    .select("id, student_id, lesson_deducted, invite_status")
    .eq("appointment_id", appointmentId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = apStudents ?? [];

  // Fallback: appointment_students boşsa ana student kullan
  if (rows.length === 0 && aptRow?.student_id) {
    rows.push({ id: null, student_id: aptRow.student_id, lesson_deducted: false, invite_status: "accepted" });
  }

  // 3. lesson_deducted=true olan öğrencilerin dersini geri yükle
  for (const row of rows) {
    if (!row.lesson_deducted) continue;
    const { data: std } = await db()
      .from("students")
      .select("remaining_lessons, completed_lessons, subscription_type")
      .eq("id", row.student_id)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stdRow = std as any;
    if (stdRow && stdRow.subscription_type !== "monthly") {
      await db().from("students").update({
        remaining_lessons: Number(stdRow.remaining_lessons ?? 0) + 1,
        completed_lessons: Math.max(0, Number(stdRow.completed_lessons ?? 0) - 1),
      }).eq("id", row.student_id);
    }
    // lesson_deducted flag'ini sıfırla
    if (row.id) {
      await db().from("appointment_students")
        .update({ lesson_deducted: false })
        .eq("id", row.id);
    }
  }

  // 4. Randevuyu iptal et — notes alanı geçmiş görünümü için işaretlenir
  const notesValue = reason
    ? `ADMIN_CANCEL: ${reason}`
    : "ADMIN_CANCEL:";
  await db().from("appointments").update({
    status:       "iptal",
    cancelled_at: new Date().toISOString().split("T")[0],
    notes:        notesValue,
  }).eq("id", appointmentId);

  // 5. Etkilenen öğrencilere bildirim gönder
  const dateLabel   = aptRow ? fmtNotifDate(aptRow.date, aptRow.start_time) : "?";
  const reasonText  = reason ? ` Sebep: ${reason}` : "";
  const studentIds  = [...new Set(rows.map((r: { student_id: string }) => r.student_id).filter(Boolean))];

  for (const studentId of studentIds) {
    await db().from("notifications").insert({
      student_id:   studentId,
      title:        "Randevunuz İptal Edildi",
      message:      `${dateLabel} tarihli randevunuz antrenör tarafından iptal edilmiştir.${reasonText}`,
      type:         "warning" as NotifType,
      is_read:      false,
    });
  }

  // 6. Admin bildirim geçmişine kaydet
  const adminMsg = reason
    ? `${dateLabel} tarihli randevu admin tarafından iptal edildi. Sebep: ${reason}`
    : `${dateLabel} tarihli randevu admin tarafından iptal edildi.`;
  await createAdminNotification(
    "Admin İptali",
    adminMsg,
    "info",
    { appointmentId },
  );
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

  // Randevuyu tamamlandı yap — tarih (date) alanına dokunulmaz, ders hangi gün
  // yapıldıysa o tarihte kalır; sadece completed_at "ne zaman işaretlendi"yi tutar
  const { data: updatedApt, error: e1 } = await db()
    .from("appointments")
    .update({ status: "tamamlandi", completed_at: today })
    .eq("id", id)
    .select("date, start_time")
    .single();
  if (e1) fail("completeAppointment:update", e1);

  const lessonDateLabel = updatedApt?.date
    ? `${updatedApt.date.split("-").reverse().join(".")}${updatedApt.start_time ? " " + updatedApt.start_time : ""}`
    : "";

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
        .select("full_name, remaining_lessons, completed_lessons, subscription_type")
        .eq("id", studentId).single();

      if (!std) { warnings.push(`Öğrenci bulunamadı (${studentId})`); }
      else {
        const isMonthly = std.subscription_type === "monthly";
        if (isMonthly) {
          // Aylık üyelik: remaining_lessons düşmez, sadece completed artar
          await db().from("students").update({
            completed_lessons: Number(std.completed_lessons ?? 0) + 1,
          }).eq("id", studentId);
        } else {
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

    // Öğrenciye bildirim — sadece dersi gerçekten düşülenlere
    if (shouldDeduct) {
      try {
        await db().from("notifications").insert({
          student_id: studentId,
          title:      "✅ Ders Tamamlandı",
          message:    lessonDateLabel
            ? `${lessonDateLabel} tarihli dersin tamamlandı olarak işaretlendi ve kalan ders hakkından düşüldü.`
            : "Dersin tamamlandı olarak işaretlendi ve kalan ders hakkından düşüldü.",
          type:       "success",
          is_read:    false,
        });
      } catch { /* bildirim tablosu sorunluysa ders düşümünü etkilemesin */ }

      // Finans Merkezi — ders-başı salon anlaşmasıysa salon payı tahakkuku
      const { data: nameRow } = await db().from("students").select("full_name").eq("id", studentId).maybeSingle();
      await recordLessonGymAccrual(studentId, nameRow?.full_name ?? "", today);
    }
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

const PACKAGE_EXPIRED_NOTIF_TITLE = "Paket Süresi Doldu";

/**
 * Öğrencinin paket süresi dolmuşsa bildirim gönderir.
 * Aynı paket dönemi için (packageStartDate sonrası) tekrar bildirim göndermez.
 */
export async function checkPackageExpiryNotification(student: Student): Promise<void> {
  if (!isPackageExpired(student.packageEndDate)) return;

  const { data, error } = await db()
    .from("notifications").select("id")
    .eq("student_id", student.id)
    .eq("title", PACKAGE_EXPIRED_NOTIF_TITLE)
    .gte("created_at", student.packageStartDate)
    .limit(1);
  if (error) { console.warn("[checkPackageExpiryNotification] kontrol hatası:", error.message); return; }
  if (data && data.length > 0) return; // bu dönem için zaten gönderildi

  await db().from("notifications").insert({
    student_id: student.id,
    title:      PACKAGE_EXPIRED_NOTIF_TITLE,
    message:    PACKAGE_EXPIRED_NOTIFICATION_TEXT,
    type:       "warning" as NotifType,
    is_read:    false,
  });
}

const PACKAGE_WARNING_NOTIF_TITLE = "Paketin Bitmesine Az Kaldı";

/**
 * Paket süresi yaklaşıyorsa (≤ PACKAGE_URGENT_DAYS gün, henüz dolmamış) uyarı bildirimi gönderir.
 * Aynı paket dönemi için tekrar göndermez (packageStartDate sonrası kontrolü).
 */
export async function checkPackageWarningNotification(student: Student): Promise<void> {
  if (student.subscriptionType === "monthly") return;
  const days = getDaysRemaining(student.packageEndDate);
  if (days === null || days < 0 || days > PACKAGE_URGENT_DAYS) return;

  const { data, error } = await db()
    .from("notifications").select("id")
    .eq("student_id", student.id)
    .eq("title", PACKAGE_WARNING_NOTIF_TITLE)
    .gte("created_at", student.packageStartDate)
    .limit(1);
  if (error) { console.warn("[checkPackageWarningNotification] kontrol hatası:", error.message); return; }
  if (data && data.length > 0) return; // bu dönem için zaten gönderildi

  await db().from("notifications").insert({
    student_id: student.id,
    title:      PACKAGE_WARNING_NOTIF_TITLE,
    message:    days === 0
      ? "Paketin bugün sona eriyor! Devam etmek için yeni paket almayı unutma."
      : `Paketinin bitmesine ${days} gün kaldı. Devam etmek için yeni paket almayı planla.`,
    type:       "warning" as NotifType,
    is_read:    false,
  });
}

/* ═══════════════════════════════════════════════════════════════
   GYMS — Salon gelir paylaşımı (mevcut "Salon Sahipleri" gözlemci
   sisteminden TAMAMEN AYRI, finansal hesaplama burada yapılır)
   ═══════════════════════════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mg = (r: any): Gym => ({
  id: r.id, name: r.name, shareType: r.share_type as GymShareType,
  fixedLessonFee: r.fixed_lesson_fee != null ? Number(r.fixed_lesson_fee) : undefined,
  gymPercentage: r.gym_percentage != null ? Number(r.gym_percentage) : undefined,
  trainerPercentage: r.trainer_percentage != null ? Number(r.trainer_percentage) : undefined,
  isActive: r.is_active ?? true, notes: r.notes ?? undefined, createdAt: r.created_at ?? "",
});

export async function getGyms(): Promise<Gym[]> {
  const { data, error } = await db().from("gyms").select("*").order("name");
  if (error) { if (isSchemaError(error)) return []; fail("getGyms", error); }
  return (data ?? []).map(mg);
}

export async function createGym(gym: Omit<Gym, "id" | "createdAt">): Promise<Gym> {
  const { data, error } = await db().from("gyms").insert({
    name: gym.name, share_type: gym.shareType,
    fixed_lesson_fee: gym.fixedLessonFee ?? null,
    gym_percentage: gym.gymPercentage ?? null,
    trainer_percentage: gym.trainerPercentage ?? null,
    is_active: gym.isActive ?? true, notes: gym.notes ?? null,
  }).select().single();
  if (error) fail("createGym", error);
  return mg(data);
}

export async function updateGym(id: string, updates: Partial<Gym>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.name              !== undefined) row.name               = updates.name;
  if (updates.shareType         !== undefined) row.share_type         = updates.shareType;
  if (updates.fixedLessonFee    !== undefined) row.fixed_lesson_fee   = updates.fixedLessonFee ?? null;
  if (updates.gymPercentage     !== undefined) row.gym_percentage     = updates.gymPercentage ?? null;
  if (updates.trainerPercentage !== undefined) row.trainer_percentage = updates.trainerPercentage ?? null;
  if (updates.isActive          !== undefined) row.is_active          = updates.isActive;
  if (updates.notes             !== undefined) row.notes              = updates.notes ?? null;
  const { error } = await db().from("gyms").update(row).eq("id", id);
  if (error) fail("updateGym", error);
}

/** Salonu pasifleştir — geçmiş gelir hareketlerini bozmamak için hard delete yapılmaz */
export async function deleteGym(id: string): Promise<void> {
  const { error } = await db().from("gyms").update({ is_active: false }).eq("id", id);
  if (error) fail("deleteGym", error);
}

/**
 * Bir ödeme/ders tutarı için salon payı + antrenör net kazancını hesapla.
 * Öğrenciye özel anlaşma (override) varsa salonun varsayılan anlaşmasını ezer.
 */
export function computeGymShare(
  gym: Gym | null,
  overrideType: GymShareType | null | undefined,
  overrideValue: number | null | undefined,
  amount: number,
): { gymShare: number; trainerNet: number } {
  const effectiveType = overrideType ?? gym?.shareType ?? "no_share";

  if (effectiveType === "no_share" || !gym) {
    return { gymShare: 0, trainerNet: amount };
  }
  if (effectiveType === "percentage") {
    const pct = overrideType === "percentage" ? (overrideValue ?? 0) : (gym.gymPercentage ?? 0);
    const gymShare = Math.round(amount * (pct / 100) * 100) / 100;
    return { gymShare, trainerNet: amount - gymShare };
  }
  // fixed_per_lesson: ödeme anında salon payı düşülmez — ders tamamlanınca tahakkuk eder
  return { gymShare: 0, trainerNet: amount };
}

/** Ders başı ücreti — override varsa onu, yoksa salonun varsayılanını döner */
function effectiveFixedLessonFee(
  gym: Gym | null,
  overrideType: GymShareType | null | undefined,
  overrideValue: number | null | undefined,
): number {
  if (overrideType === "fixed_per_lesson") return overrideValue ?? 0;
  if (!overrideType && gym?.shareType === "fixed_per_lesson") return gym.fixedLessonFee ?? 0;
  return 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mim = (r: any): IncomeMovement => ({
  id: r.id, studentId: r.student_id ?? undefined, studentName: r.student_name,
  paymentId: r.payment_id ?? undefined, paymentType: r.payment_type as IncomeMovementType,
  paymentAmount: Number(r.payment_amount ?? 0),
  status: (r.status ?? "odendi") as PaymentRecordStatus,
  paymentDate: r.payment_date,
  packageType: r.package_type ?? undefined,
  gymId: r.gym_id ?? undefined, gymName: r.gym_name ?? undefined,
  gymShareAmount: Number(r.gym_share_amount ?? 0),
  trainerNetAmount: Number(r.trainer_net_amount ?? 0),
  note: r.note ?? undefined, createdAt: r.created_at ?? "",
});

/**
 * Bir gelir hareketi kaydı oluşturur. addPayment/renewStudentPackage tarafından
 * çağrılır — öğrencinin gym_id + override bilgisine göre salon payı otomatik
 * hesaplanır. status="odendi" değilse (beklemede/gecikti) salon payı/net
 * kazanç YİNE hesaplanır ama raporlarda sadece "odendi" satırlar toplanır —
 * böylece bekleyen tutarlar Gelir Hareketleri'nde görünür, ciroyu şişirmez.
 * Hata olursa sessizce geçilir (asıl ödeme akışını durdurmaz).
 */
export async function recordIncomeMovement(params: {
  studentId: string; studentName: string; paymentId?: string;
  paymentType: IncomeMovementType; amount: number; date: string;
  status?: PaymentRecordStatus; packageType?: string; note?: string;
}): Promise<void> {
  try {
    const { data: std } = await db().from("students")
      .select("gym_id, gym_share_override_type, gym_share_override_value")
      .eq("id", params.studentId).maybeSingle();

    let gym: Gym | null = null;
    if (std?.gym_id) {
      const { data: g } = await db().from("gyms").select("*").eq("id", std.gym_id).maybeSingle();
      if (g) gym = mg(g);
    }

    const overrideType  = (std?.gym_share_override_type ?? null) as GymShareType | null;
    const overrideValue = std?.gym_share_override_value != null ? Number(std.gym_share_override_value) : null;
    const { gymShare, trainerNet } = computeGymShare(gym, overrideType, overrideValue, params.amount);

    await db().from("income_movements").insert({
      student_id: params.studentId, student_name: params.studentName,
      payment_id: params.paymentId ?? null, payment_type: params.paymentType,
      payment_amount: params.amount, status: params.status ?? "odendi", payment_date: params.date,
      package_type: params.packageType ?? null,
      gym_id: gym?.id ?? null, gym_name: gym?.name ?? null,
      gym_share_amount: gymShare, trainer_net_amount: trainerNet,
      note: params.note ?? null,
    });
  } catch (err) {
    console.warn("[recordIncomeMovement] başarısız (ödeme akışı etkilenmedi):", err);
  }
}

/** Ders tamamlandığında ders-başı salon payını tahakkuk ettirir (0 tutarlı gelir hareketi) */
async function recordLessonGymAccrual(studentId: string, studentName: string, date: string): Promise<void> {
  try {
    const { data: std } = await db().from("students")
      .select("gym_id, gym_share_override_type, gym_share_override_value")
      .eq("id", studentId).maybeSingle();
    if (!std?.gym_id && !std?.gym_share_override_type) return;

    let gym: Gym | null = null;
    if (std?.gym_id) {
      const { data: g } = await db().from("gyms").select("*").eq("id", std.gym_id).maybeSingle();
      if (g) gym = mg(g);
    }

    const overrideType  = (std?.gym_share_override_type ?? null) as GymShareType | null;
    const overrideValue = std?.gym_share_override_value != null ? Number(std.gym_share_override_value) : null;
    const fee = effectiveFixedLessonFee(gym, overrideType, overrideValue);
    if (fee <= 0) return; // ders-başı anlaşma değil → tahakkuk yok

    await db().from("income_movements").insert({
      student_id: studentId, student_name: studentName,
      payment_type: "ders_tamamlama", payment_amount: 0, payment_date: date,
      gym_id: gym?.id ?? null, gym_name: gym?.name ?? null,
      gym_share_amount: fee, trainer_net_amount: -fee,
      note: "Ders tamamlandı — salon payı tahakkuku",
    });
  } catch (err) {
    console.warn("[recordLessonGymAccrual] başarısız (ders tamamlama akışı etkilenmedi):", err);
  }
}

export async function getIncomeMovements(filters?: {
  dateFrom?: string; dateTo?: string; studentId?: string; gymId?: string;
  paymentType?: IncomeMovementType; status?: PaymentRecordStatus;
}): Promise<IncomeMovement[]> {
  let q = db().from("income_movements").select("*").order("payment_date", { ascending: false });
  if (filters?.dateFrom)    q = q.gte("payment_date", filters.dateFrom);
  if (filters?.dateTo)      q = q.lte("payment_date", filters.dateTo);
  if (filters?.studentId)   q = q.eq("student_id", filters.studentId);
  if (filters?.gymId)       q = q.eq("gym_id", filters.gymId);
  if (filters?.paymentType) q = q.eq("payment_type", filters.paymentType);
  if (filters?.status)      q = q.eq("status", filters.status);
  const { data, error } = await q;
  if (error) { if (isSchemaError(error)) return []; fail("getIncomeMovements", error); }
  return (data ?? []).map(mim);
}

export async function updateIncomeMovement(
  id: string,
  updates: Partial<Pick<IncomeMovement, "gymShareAmount" | "trainerNetAmount" | "note">>,
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.gymShareAmount   !== undefined) row.gym_share_amount   = updates.gymShareAmount;
  if (updates.trainerNetAmount !== undefined) row.trainer_net_amount = updates.trainerNetAmount;
  if (updates.note             !== undefined) row.note               = updates.note ?? null;
  const { error } = await db().from("income_movements").update(row).eq("id", id);
  if (error) fail("updateIncomeMovement", error);
}

export async function deleteIncomeMovement(id: string): Promise<void> {
  const { error } = await db().from("income_movements").delete().eq("id", id);
  if (error) fail("deleteIncomeMovement", error);
}

/** Bu ay özet: toplam ciro, salon payı, net kazanç (income_movements üzerinden) */
export async function getFinanceSummary(monthKey?: string): Promise<{
  totalRevenue: number; gymShareTotal: number; netEarnings: number;
}> {
  const ym = monthKey ?? new Date().toISOString().slice(0, 7); // "yyyy-MM"
  const { data, error } = await db().from("income_movements")
    .select("payment_amount, gym_share_amount, trainer_net_amount")
    .eq("status", "odendi") // sadece gerçekten tahsil edilen — bekleyenler ciroyu şişirmesin
    .gte("payment_date", `${ym}-01`).lt("payment_date", `${ym}-32`);
  if (error) { if (isSchemaError(error)) return { totalRevenue: 0, gymShareTotal: 0, netEarnings: 0 }; fail("getFinanceSummary", error); }
  const rows = data ?? [];
  return {
    totalRevenue:  rows.reduce((s, r) => s + Number(r.payment_amount ?? 0), 0),
    gymShareTotal: rows.reduce((s, r) => s + Number(r.gym_share_amount ?? 0), 0),
    netEarnings:   rows.reduce((s, r) => s + Number(r.trainer_net_amount ?? 0), 0),
  };
}

export interface GymReport {
  gym: Gym; totalLessons: number; totalRevenue: number;
  gymShareTotal: number; netEarnings: number;
}

/** Her aktif salon için toplu rapor — Finans Merkezi'nde "Salon Bazlı Rapor" bölümünde kullanılır */
export async function getGymReports(): Promise<GymReport[]> {
  const gyms = await getGyms();
  if (gyms.length === 0) return [];
  const { data, error } = await db().from("income_movements")
    .select("gym_id, payment_type, payment_amount, gym_share_amount, trainer_net_amount")
    .not("gym_id", "is", null)
    .eq("status", "odendi"); // bekleyen ödemeler salon raporuna dahil değil
  if (error) { if (isSchemaError(error)) return []; fail("getGymReports", error); }
  const rows = data ?? [];

  return gyms.map(gym => {
    const gymRows = rows.filter(r => r.gym_id === gym.id);
    return {
      gym,
      totalLessons: gymRows.filter(r => r.payment_type === "ders_tamamlama").length,
      totalRevenue: gymRows.reduce((s, r) => s + Number(r.payment_amount ?? 0), 0),
      gymShareTotal: gymRows.reduce((s, r) => s + Number(r.gym_share_amount ?? 0), 0),
      netEarnings: gymRows.reduce((s, r) => s + Number(r.trainer_net_amount ?? 0), 0),
    };
  });
}

/* ═══════════════════════════════════════════════════════════════
   PAYMENTS
   ═══════════════════════════════════════════════════════════════ */

export async function getPayments(): Promise<Payment[]> {
  const { data, error } = await db().from("payments").select("*").order("paid_at", { ascending: false });
  if (error) fail("getPayments", error);
  return (data ?? []).map(mp);
}

export async function addPayment(
  payment: Omit<Payment, "id">,
  options?: { movementType?: IncomeMovementType; packageType?: string; skipBalanceUpdate?: boolean },
): Promise<Payment> {
  const { data, error } = await db().from("payments").insert({
    student_id: payment.studentId, student_name: payment.studentName,
    amount: payment.amount, paid_at: payment.paidAt, method: payment.method,
    notes: payment.notes, status: payment.status ?? "odendi",
  }).select().single();
  if (error) fail("addPayment", error);
  // Sadece "odendi" ödemelerde öğrenci bakiyesi güncellenir — skipBalanceUpdate
  // ile çağrılırsa (örn. çağıran taraf bakiyeyi ayrıca updateStudent ile zaten
  // ayarladıysa) burada tekrar dokunulmaz, çift sayım olmaz.
  if (!options?.skipBalanceUpdate && (payment.status ?? "odendi") === "odendi") {
    const { data: std } = await db().from("students").select("amount_paid, amount_due").eq("id", payment.studentId).single();
    if (std) {
      const newPaid = Number(std.amount_paid) + payment.amount;
      const newDue  = Math.max(0, Number(std.amount_due) - payment.amount);
      await db().from("students").update({
        amount_paid: newPaid, amount_due: newDue,
        payment_status: newDue === 0 ? "odendi" : newPaid > 0 ? "kismi" : "beklemede",
      }).eq("id", payment.studentId);
    }
  }
  // Finans Merkezi — durum ne olursa olsun (odendi/beklemede/gecikti) gelir
  // hareketi oluşturulur, böylece bekleyen ödemeler de Gelir Hareketleri'nde
  // görünür. Sadece "odendi" satırlar ciro/net kazanç toplamlarına girer.
  await recordIncomeMovement({
    studentId: payment.studentId, studentName: payment.studentName,
    paymentId: data.id, paymentType: options?.movementType ?? "ek_odeme",
    amount: payment.amount, date: payment.paidAt, status: payment.status ?? "odendi",
    packageType: options?.packageType, note: payment.notes,
  });
  return mp(data);
}

export async function updatePayment(
  id: string,
  updates: Partial<Pick<Payment, "amount" | "status" | "method" | "notes" | "paidAt">>,
): Promise<void> {
  const { data: old, error: e0 } = await db().from("payments")
    .select("student_id, amount, status").eq("id", id).single();
  if (e0) fail("updatePayment:get", e0);

  const row: Record<string, unknown> = {};
  if (updates.amount  !== undefined) row.amount   = updates.amount;
  if (updates.status  !== undefined) row.status   = updates.status;
  if (updates.method  !== undefined) row.method   = updates.method;
  if (updates.notes   !== undefined) row.notes    = updates.notes;
  if (updates.paidAt  !== undefined) row.paid_at  = updates.paidAt;

  const { error: e1 } = await db().from("payments").update(row).eq("id", id);
  if (e1) fail("updatePayment:update", e1);

  // Öğrenci bakiyesini güncelle
  if (old) {
    const { data: std } = await db().from("students")
      .select("amount_paid, amount_due").eq("id", old.student_id).single();
    if (std) {
      const oldStatus = old.status ?? "odendi";
      const newStatus = updates.status ?? oldStatus;
      const oldAmt    = Number(old.amount);
      const newAmt    = updates.amount ?? oldAmt;
      let paid = Number(std.amount_paid);
      let due  = Number(std.amount_due);

      // Eski "odendi" katkısını geri al
      if (oldStatus === "odendi") { paid -= oldAmt; due += oldAmt; }
      // Yeni "odendi" katkısını ekle
      if (newStatus === "odendi") { paid += newAmt; due -= newAmt; }
      paid = Math.max(0, paid); due = Math.max(0, due);

      await db().from("students").update({
        amount_paid: paid, amount_due: due,
        payment_status: due === 0 ? "odendi" : paid > 0 ? "kismi" : "beklemede",
      }).eq("id", old.student_id);
    }
  }

  // Bağlı gelir hareketinin durumu/tutarı da senkron kalsın (örn. "beklemede"
  // bir ödeme sonradan "odendi" işaretlenirse Gelir Hareketleri de güncellensin)
  try {
    if (updates.amount !== undefined) {
      // Tutar değiştiyse salon payı/net kazanç da yeniden hesaplanmalı
      const { data: im } = await db().from("income_movements")
        .select("id, student_id, gym_id").eq("payment_id", id).maybeSingle();
      if (im) {
        let gym: Gym | null = null;
        const { data: std } = await db().from("students")
          .select("gym_share_override_type, gym_share_override_value").eq("id", im.student_id).maybeSingle();
        if (im.gym_id) {
          const { data: g } = await db().from("gyms").select("*").eq("id", im.gym_id).maybeSingle();
          if (g) gym = mg(g);
        }
        const overrideType  = (std?.gym_share_override_type ?? null) as GymShareType | null;
        const overrideValue = std?.gym_share_override_value != null ? Number(std.gym_share_override_value) : null;
        const { gymShare, trainerNet } = computeGymShare(gym, overrideType, overrideValue, updates.amount);
        await db().from("income_movements").update({
          payment_amount: updates.amount, gym_share_amount: gymShare, trainer_net_amount: trainerNet,
          ...(updates.status !== undefined ? { status: updates.status } : {}),
          ...(updates.notes  !== undefined ? { note: updates.notes ?? null } : {}),
        }).eq("id", im.id);
      }
    } else if (updates.status !== undefined || updates.notes !== undefined) {
      const row2: Record<string, unknown> = {};
      if (updates.status !== undefined) row2.status = updates.status;
      if (updates.notes  !== undefined) row2.note   = updates.notes ?? null;
      await db().from("income_movements").update(row2).eq("payment_id", id);
    }
  } catch { /* Gelir Hareketleri senkron hatası ödeme akışını durdurmaz */ }
}

export async function deletePayment(id: string): Promise<void> {
  const { data: pay, error: e1 } = await db().from("payments")
    .select("student_id, amount, status").eq("id", id).single();
  if (e1) fail("deletePayment:get", e1);
  // Bağlı gelir hareketi (salon payı dahil) — Finans Merkezi'nde yetim kayıt kalmasın
  await db().from("income_movements").delete().eq("payment_id", id).then(() => {}, () => {});
  const { error: e2 } = await db().from("payments").delete().eq("id", id);
  if (e2) fail("deletePayment:delete", e2);
  // Sadece "odendi" ödemelerde öğrenci bakiyesi düzeltilir
  if (pay && (pay.status ?? "odendi") === "odendi") {
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

/* ═══════════════════════════════════════════════════════════════
   PAKET GEÇMİŞİ & YENİLEME
   ═══════════════════════════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mPkg = (r: any): PackagePurchase => ({
  id:            r.id,
  studentId:     r.student_id,
  packageType:   r.package_type   as PackageType,
  packageName:   r.package_name   ?? "",
  lessonCount:   Number(r.lesson_count  ?? 0),
  listPrice:     Number(r.list_price    ?? 0),
  paidAmount:    Number(r.paid_amount   ?? 0),
  paymentStatus: r.payment_status as PaymentStatus,
  startDate:     r.start_date     ?? "",
  endDate:       r.end_date       ?? "",
  notes:         r.notes          ?? undefined,
  createdAt:     r.created_at     ?? "",
});

/** Öğrencinin paket geçmişini getir */
export async function getStudentPackageHistory(studentId: string): Promise<PackagePurchase[]> {
  const { data, error } = await db()
    .from("student_packages").select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) {
    if (isSchemaError(error)) { console.warn("getStudentPackageHistory: tablo hazır değil"); return []; }
    console.error("getStudentPackageHistory:", error.message);
    return [];
  }
  return (data ?? []).map(mPkg);
}

/**
 * Paket Yenile — öğrenciye yeni paket ekle
 *
 * Ders mantığı:
 *   remaining_lessons += lessonCount   (mevcut dersleri korur)
 *   total_lessons     += lessonCount   (toplam ders geçmişi büyür)
 *   completed_lessons değişmez
 */
export async function renewStudentPackage(params: {
  studentId:     string;
  studentName:   string;
  /** packages tablosundaki gerçek paket id'si — student_packages'a kaydedilir */
  packageId:     string;
  packageName:   string;
  lessonCount:   number;
  listPrice:     number;
  paidAmount:    number;
  paymentStatus: PaymentStatus;
  startDate:     string;
  endDate:       string;
  notes?:        string;
}): Promise<{ newRemaining: number }> {

  // 1. Mevcut öğrenci verisini çek
  const { data: std, error: se } = await db()
    .from("students").select("remaining_lessons, total_lessons, amount_paid, amount_due")
    .eq("id", params.studentId).single();
  if (se) fail("renewStudentPackage:fetch", se);

  const prevRemaining  = Number(std!.remaining_lessons  ?? 0);
  const prevTotal      = Number(std!.total_lessons       ?? 0);
  const prevAmountDue  = Number(std!.amount_due          ?? 0);
  const newRemaining   = prevRemaining + params.lessonCount;
  const newTotal       = prevTotal     + params.lessonCount;

  // 2. Paket geçmişi kaydı — package_type yerine package_name kullan (custom paket desteği)
  const { error: pe } = await db().from("student_packages").insert({
    student_id:     params.studentId,
    package_type:   params.packageId,   // UUID olarak saklanır
    package_name:   params.packageName,
    lesson_count:   params.lessonCount,
    list_price:     params.listPrice,
    paid_amount:    params.paidAmount,
    payment_status: params.paymentStatus,
    start_date:     params.startDate,
    end_date:       params.endDate,
    notes:          params.notes ?? null,
  });
  if (pe) {
    if (isSchemaError(pe)) {
      console.warn("renewStudentPackage: student_packages tablosu hazır değil → supabase-student-packages.sql çalıştırın");
    } else {
      fail("renewStudentPackage:pkg_insert", pe);
    }
  }

  // 3. Öğrenci güncelle — package_type enum güncellenmez (custom paket uyumluluğu için)
  //    NOT: amount_paid burada GÜNCELLENMEZ — tam liste fiyatı borca eklenir,
  //    aşağıdaki addPayment() çağrısı ödenen kısmı borçtan düşüp ödeneni artırır
  //    (iki yerde aynı tutarı eklemek çift sayıma sebep olurdu).
  const { error: ue } = await db().from("students").update({
    remaining_lessons:  newRemaining,
    total_lessons:      newTotal,
    // package_type kasıtlı güncellenmedi: enum kısıtlaması ve custom paket desteği
    amount_due:         prevAmountDue + params.listPrice,
    payment_status:     params.paymentStatus,
    package_start_date: params.startDate,
    package_end_date:   params.endDate,
  }).eq("id", params.studentId);
  if (ue) fail("renewStudentPackage:student_update", ue);

  // 4. Ödeme kaydı oluştur (gelir paneline + Finans Merkezi'ne yansısın) —
  //    addPayment() burada amount_paid/amount_due/payment_status'u doğru
  //    final değerlere indirger (adım 3'te eklenen tam liste fiyatından düşer).
  const movementType = prevTotal === 0 ? "yeni_paket" : "paket_yenileme";
  if (params.paidAmount > 0) {
    try {
      await addPayment({
        studentId:   params.studentId,
        studentName: params.studentName,
        amount:      params.paidAmount,
        paidAt:      params.startDate,
        method:      "paket",
        notes:       `${params.packageName} — ${params.lessonCount} ders`,
        status:      "odendi",
      }, {
        // İlk paket mi yenileme mi — toplam ders geçmişi 0'dan büyüyorsa ilk pakettir
        movementType,
        packageType:  params.packageName,
      });
    } catch (err) {
      console.warn("renewStudentPackage:payment:", err);
    }
  }

  // Kalan borç (listPrice - paidAmount) varsa Finans Merkezi'nde "beklemede"
  // olarak görünsün — bakiye adım 3'te zaten doğru ayarlandı, burada SADECE
  // gelir hareketi kaydı için skipBalanceUpdate kullanılır (çift sayım olmaz).
  const stillDue = params.listPrice - params.paidAmount;
  if (stillDue > 0) {
    try {
      await addPayment({
        studentId:   params.studentId,
        studentName: params.studentName,
        amount:      stillDue,
        paidAt:      params.startDate,
        method:      "paket",
        notes:       "Kalan borç",
        status:      "beklemede",
      }, { movementType, packageType: params.packageName, skipBalanceUpdate: true });
    } catch (err) {
      console.warn("renewStudentPackage:pending:", err);
    }
  }

  return { newRemaining };
}

/* ═══════════════════════════════════════════════════════════════
   HEDİYE DERS (Gift Lesson) — 5000 XP eşiğinde tetiklenir
   ═══════════════════════════════════════════════════════════════ */

import type { GiftLessonRequest, XPAdjustment, KediMission, WaitlistEntry } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGiftReq(r: any): GiftLessonRequest {
  return {
    id:          r.id,
    studentId:   r.student_id,
    studentName: r.student_name ?? "",
    xpAtRequest: r.xp_at_request ?? 0,
    seasonXP:    r.season_xp ?? 0,
    season:      r.season ?? "2026-Q2",
    threshold:   r.threshold ?? 5000,
    status:      r.status ?? "pending",
    approvedAt:  r.approved_at ?? undefined,
    rejectedAt:  r.rejected_at ?? undefined,
    adminNote:   r.admin_note ?? undefined,
    requestedAt: r.requested_at ?? undefined,
    createdAt:   r.created_at ?? "",
  };
}

/**
 * Öğrenci XP eşiğine ulaşınca hediye ders talebi oluştur.
 * Aynı sezonda aynı eşikten sadece 1 kez talep oluşturulur.
 * threshold: 5000 veya 10000
 */
export async function createGiftLessonRequest(
  studentId:   string,
  studentName: string,
  xpAtRequest: number,
  season:      string,
  threshold:   number,
  seasonXP:    number,
): Promise<void> {
  // Bu sezon + bu eşik için zaten pending/approved talep var mı?
  const { data: existing } = await db()
    .from("gift_lesson_requests")
    .select("id, status")
    .eq("student_id", studentId)
    .eq("season", season)
    .eq("threshold", threshold)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existing) return; // Bu eşik bu sezon için zaten talep edilmiş

  const { error } = await db().from("gift_lesson_requests").insert({
    student_id:    studentId,
    student_name:  studentName,
    xp_at_request: xpAtRequest,
    season_xp:     seasonXP,
    season:        season,
    threshold:     threshold,
    status:        "pending",
  });
  if (error) console.error("[createGiftLessonRequest]", error.message);

  // Admin bildirimi
  try {
    await createAdminNotification(
      `🎁 Hediye Ders Talebi`,
      `${studentName} ${season} sezonunda ${threshold.toLocaleString()} XP'ye ulaştı! Hediye ders onayı bekliyor.`,
      "success",
    );
  } catch { /* sessizce geç */ }
}

/** Öğrencinin bir sezon içindeki hediye ders taleplerini döndürür */
export async function getStudentGiftClaimsForSeason(
  studentId: string,
  season:    string,
): Promise<GiftLessonRequest[]> {
  const { data, error } = await db()
    .from("gift_lesson_requests")
    .select("*")
    .eq("student_id", studentId)
    .eq("season", season)
    .in("status", ["pending", "approved"]);
  if (error) { console.error("[getStudentGiftClaimsForSeason]", error.message); return []; }
  return (data ?? []).map(mapGiftReq);
}

/** Admin: belirli sezona ait tüm hediye ders taleplerini getir (durum farketmeksizin) */
export async function getGiftLessonRequestsForSeason(season: string): Promise<GiftLessonRequest[]> {
  const { data, error } = await db()
    .from("gift_lesson_requests")
    .select("*")
    .eq("season", season)
    .order("created_at", { ascending: false });
  if (error) { console.error("[getGiftLessonRequestsForSeason]", error.message); return []; }
  return (data ?? []).map(mapGiftReq);
}

/** Admin: bekleyen hediye ders taleplerini getir */
export async function getPendingGiftLessonRequests(): Promise<GiftLessonRequest[]> {
  const { data, error } = await db()
    .from("gift_lesson_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) { console.error("[getPendingGiftLessonRequests]", error.message); return []; }
  return (data ?? []).map(mapGiftReq);
}

/** Admin: tüm sezonlardaki / tüm durumlardaki hediye ders taleplerini getir */
export async function getAllGiftLessonRequests(): Promise<GiftLessonRequest[]> {
  const { data, error } = await db()
    .from("gift_lesson_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[getAllGiftLessonRequests]", error.message); return []; }
  return (data ?? []).map(mapGiftReq);
}

/** Admin: hediye ders onayla — öğrenciye +1 ders ekle */
export async function approveGiftLessonRequest(
  requestId: string,
  studentId: string,
  threshold: number = 5000,
): Promise<void> {
  // 1. Talebi onayla
  const { error: re } = await db()
    .from("gift_lesson_requests")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", requestId);
  if (re) fail("approveGiftLessonRequest:update", re);

  // 2. Öğrenciye +1 ders ekle
  const { data: student } = await db()
    .from("students")
    .select("remaining_lessons, total_lessons, full_name")
    .eq("id", studentId)
    .single();
  if (!student) return;

  await db().from("students").update({
    remaining_lessons: (student.remaining_lessons ?? 0) + 1,
    total_lessons:     (student.total_lessons ?? 0) + 1,
  }).eq("id", studentId);

  // 3. Öğrenci bildirimi
  try {
    await db().from("notifications").insert({
      student_id: studentId,
      title:      "🎁 Hediye Ders Kazandın!",
      message:    `Tebrikler! ${threshold.toLocaleString()} XP eşiğine ulaştın ve 1 hediye ders kazandın. Ders hakkın hesabına eklendi!`,
      type:       "success",
      is_read:    false,
    });
  } catch { /* sessizce geç */ }
}

/** Admin: hediye ders talebini reddet — admin notu eklenebilir */
export async function rejectGiftLessonRequest(
  requestId: string,
  adminNote: string = "",
): Promise<void> {
  const { error } = await db()
    .from("gift_lesson_requests")
    .update({
      status:      "rejected",
      rejected_at: new Date().toISOString(),
      admin_note:  adminNote.trim() || null,
    })
    .eq("id", requestId);
  if (error) fail("rejectGiftLessonRequest:update", error);
}

/* ═══════════════════════════════════════════════════════════════
   MANUEL XP YÖNETİMİ (xp_adjustments)
   ═══════════════════════════════════════════════════════════════ */

function mapXPAdjustment(r: any): XPAdjustment {
  return {
    id:          r.id,
    studentId:   r.student_id,
    studentName: r.student_name ?? "",
    amount:      r.amount ?? 0,
    reason:      r.reason ?? "Manuel Düzeltme",
    note:        r.note ?? "",
    adminName:   r.admin_name ?? "Admin",
    season:      r.season ?? "",
    createdAt:   r.created_at ?? "",
  };
}

/** Admin: öğrenciye elle XP ekle/düş — kayıt oluşturur ve öğrenciye bildirim gönderir */
export async function createXPAdjustment(
  studentId:   string,
  studentName: string,
  amount:      number,
  reason:      string,
  note:        string,
  adminName:   string,
  season:      string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await db().from("xp_adjustments").insert({
    student_id:   studentId,
    student_name: studentName,
    amount,
    reason,
    note,
    admin_name:   adminName,
    season,
  });
  if (error) {
    console.error("[createXPAdjustment]", error.message, error.code);
    const hint = isSchemaError(error) ? " — Supabase'de SUPABASE_XP_ADJUSTMENTS.sql dosyasını çalıştırın (xp_adjustments tablosu eksik)." : "";
    return { ok: false, error: error.message + hint };
  }

  const isPositive = amount >= 0;
  try {
    await db().from("notifications").insert({
      student_id: studentId,
      title:      isPositive ? `⭐ ${amount.toLocaleString()} XP Kazandın!` : `📉 ${Math.abs(amount).toLocaleString()} XP Düşüldü`,
      message:    `${reason}${note ? ` — ${note}` : ""} sebebiyle ${isPositive ? "+" : ""}${amount.toLocaleString()} XP ${isPositive ? "kazandın" : "düşüldü"}.`,
      type:       isPositive ? "success" : "warning",
      is_read:    false,
    });
  } catch { /* sessizce geç */ }

  return { ok: true };
}

/** Öğrencinin manuel XP geçmişini getir (en yeni → en eski) */
export async function getStudentXPAdjustments(studentId: string): Promise<XPAdjustment[]> {
  const { data, error } = await db()
    .from("xp_adjustments")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[getStudentXPAdjustments]", error.message); return []; }
  return (data ?? []).map(mapXPAdjustment);
}

/** Admin: tüm öğrencilerin manuel XP kayıtlarını getir (toplu hesaplama için) */
export async function getAllXPAdjustments(): Promise<XPAdjustment[]> {
  const { data, error } = await db()
    .from("xp_adjustments")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[getAllXPAdjustments]", error.message); return []; }
  return (data ?? []).map(mapXPAdjustment);
}

/* ════════════════════════════════════════════════════════════════════
   App Settings
   ═══════════════════════════════════════════════════════════════════ */

/** Uygulama ayarı oku */
export async function getAppSetting(key: string): Promise<string | null> {
  const { data, error } = await db()
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) { console.error("[getAppSetting]", error.message); return null; }
  return data?.value ?? null;
}

/** Uygulama ayarı güncelle/oluştur */
export async function setAppSetting(key: string, value: string): Promise<void> {
  const { error } = await db()
    .from("app_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) console.error("[setAppSetting]", error.message);
}

/* ════════════════════════════════════════════════════════════════════
   Profil Fotoğrafı (Supabase Storage)
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Öğrenci profil fotoğrafını Supabase Storage'a yükle ve student kaydını güncelle.
 * @returns Public URL veya null (hata durumunda)
 */
export async function uploadStudentAvatar(
  studentId: string,
  file: Blob,
  contentType: string,
): Promise<string | null> {
  const client = db();
  const path   = `${studentId}/avatar.jpg`;

  // Eski fotoğrafı sil (hata yoksa devam et)
  await client.storage.from("avatars").remove([path]).catch(() => {});

  const { error: upErr } = await client.storage
    .from("avatars")
    .upload(path, file, { contentType, upsert: true });

  if (upErr) { console.error("[uploadStudentAvatar]", upErr.message); return null; }

  const { data } = client.storage.from("avatars").getPublicUrl(path);
  const publicUrl = data.publicUrl + `?v=${Date.now()}`; // cache bust

  // Student tablosuna kaydet
  const { error: dbErr } = await client
    .from("students")
    .update({ avatar_url: publicUrl })
    .eq("id", studentId);
  if (dbErr) console.error("[uploadStudentAvatar] DB update:", dbErr.message);

  return publicUrl;
}

/** Öğrenci profil fotoğrafını sil */
export async function deleteStudentAvatar(studentId: string): Promise<void> {
  const client = db();
  await client.storage.from("avatars").remove([`${studentId}/avatar.jpg`]);
  await client.from("students").update({ avatar_url: null }).eq("id", studentId);
}

/* ════════════════════════════════════════════════════════════════════
   Kedi AI Görev Sistemi
   ═══════════════════════════════════════════════════════════════════ */

const mapKediMission = (r: any): KediMission => ({
  id:          r.id,
  title:       r.title,
  description: r.description ?? undefined,
  icon:        r.icon ?? "🎯",
  xpReward:    r.xp_reward ?? 100,
  targetValue: r.target_value ?? 1,
  studentId:   r.student_id ?? undefined,
  isActive:    r.is_active ?? true,
  createdAt:   r.created_at ?? "",
});

/** Aktif görev tanımlarını getir — studentId verilirse ona + global olanlar */
export async function getKediMissions(studentId?: string): Promise<KediMission[]> {
  const { data, error } = await db()
    .from("kedi_missions")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) { console.error("[getKediMissions]", error.message); return []; }
  return (data ?? [])
    .filter((r: any) => !r.student_id || r.student_id === studentId)
    .map(mapKediMission);
}

/** Yeni özel görev oluştur */
export async function createKediMission(m: {
  title: string; description?: string; icon: string;
  xpReward: number; targetValue: number; studentId?: string;
}): Promise<KediMission | null> {
  const { data, error } = await db().from("kedi_missions").insert({
    title:        m.title,
    description:  m.description ?? null,
    icon:         m.icon,
    xp_reward:    m.xpReward,
    target_value: m.targetValue,
    student_id:   m.studentId ?? null,
  }).select().single();
  if (error) { console.error("[createKediMission]", error.message); return null; }
  return mapKediMission(data);
}

/** Görevi pasife al (silmek yerine deactivate) */
export async function deleteKediMission(id: string): Promise<void> {
  const { error } = await db()
    .from("kedi_missions")
    .update({ is_active: false })
    .eq("id", id);
  if (error) console.error("[deleteKediMission]", error.message);
}

/** Öğrencinin tamamladığı görev anahtarlarını Set olarak döndür */
export async function getStudentMissionCompletions(studentId: string): Promise<Set<string>> {
  const { data, error } = await db()
    .from("kedi_mission_completions")
    .select("mission_key")
    .eq("student_id", studentId);
  if (error) { console.error("[getStudentMissionCompletions]", error.message); return new Set(); }
  return new Set((data ?? []).map((r: any) => r.mission_key as string));
}

/**
 * Görev tamamlama kaydı ekle.
 * Çift eklemeyi engellemek için UPSERT + ignoreDuplicates kullanır.
 * @returns true  → yeni kayıt eklendi (XP & bildirim verilmeli)
 * @returns false → kayıt zaten vardı (XP & bildirim VERME)
 */
export async function recordMissionCompletion(
  studentId: string,
  missionKey: string,
  xpAmount: number,
): Promise<boolean> {
  // ignoreDuplicates: true → çakışırsa satır güncellenmez, data boş döner
  const { data, error } = await db()
    .from("kedi_mission_completions")
    .upsert(
      { student_id: studentId, mission_key: missionKey, xp_amount: xpAmount },
      { onConflict: "student_id,mission_key", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    console.error("[recordMissionCompletion]", error.message);
    return false; // hata durumunda XP verme
  }
  // data.length > 0 → satır yeni eklendi
  // data.length === 0 → çakışma nedeniyle ignore edildi (zaten vardı)
  return Array.isArray(data) && data.length > 0;
}

/* ══════════════════════════════════════════════════════════
   Bekleme Listesi (Waitlist)
   ══════════════════════════════════════════════════════════ */

function mapWaitlist(r: any): WaitlistEntry {
  return {
    id:         r.id,
    studentId:  r.student_id,
    date:       r.date,
    startTime:  r.start_time,
    endTime:    r.end_time,
    lessonType: r.lesson_type ?? "bireysel",
    notified:   r.notified ?? false,
    createdAt:  r.created_at,
  };
}

/** Öğrenciyi bekleme listesine ekle */
export async function joinWaitlist(
  studentId: string,
  date: string,
  startTime: string,
  endTime: string,
  lessonType = "bireysel",
): Promise<WaitlistEntry | null> {
  const { data, error } = await db()
    .from("waitlist")
    .upsert(
      { student_id: studentId, date, start_time: startTime, end_time: endTime, lesson_type: lessonType },
      { onConflict: "student_id,date,start_time" },
    )
    .select()
    .single();
  if (error) { console.error("[joinWaitlist]", error.message); return null; }
  return mapWaitlist(data);
}

/** Öğrenciyi bekleme listesinden çıkar */
export async function leaveWaitlist(
  studentId: string,
  date: string,
  startTime: string,
): Promise<void> {
  const { error } = await db()
    .from("waitlist")
    .delete()
    .eq("student_id", studentId)
    .eq("date", date)
    .eq("start_time", startTime);
  if (error) console.error("[leaveWaitlist]", error.message);
}

/** Belirli bir slot için bekleme listesini getir (admin ve bildirim için) */
export async function getWaitlistForSlot(
  date: string,
  startTime: string,
): Promise<WaitlistEntry[]> {
  const { data, error } = await db()
    .from("waitlist")
    .select("*")
    .eq("date", date)
    .eq("start_time", startTime)
    .order("created_at");
  if (error) { console.error("[getWaitlistForSlot]", error.message); return []; }
  return (data ?? []).map(mapWaitlist);
}

/** Öğrencinin bekleme listesi kayıtlarını getir */
export async function getStudentWaitlist(studentId: string): Promise<WaitlistEntry[]> {
  const { data, error } = await db()
    .from("waitlist")
    .select("*")
    .eq("student_id", studentId)
    .order("date")
    .order("start_time");
  if (error) { console.error("[getStudentWaitlist]", error.message); return []; }
  return (data ?? []).map(mapWaitlist);
}

/** Slot açıldığında bekleme listesindeki öğrencilere bildirim gönder */
export async function notifyWaitlistForSlot(
  date: string,
  startTime: string,
  endTime: string,
): Promise<void> {
  const entries = await getWaitlistForSlot(date, startTime);
  if (entries.length === 0) return;

  await Promise.all(entries.map(e =>
    db().from("notifications").insert({
      student_id: e.studentId,
      title:   "Slot Açıldı! 🎉",
      message: `${date} tarihli ${startTime}-${endTime} saatlik ders slotu müsait hale geldi. Hızlıca randevu alabilirsin!`,
      type:    "success",
      is_read: false,
    }).then(() => {}, () => {}),
  ));

  // Bildirim gönderildi olarak işaretle
  const ids = entries.map(e => e.id);
  await db().from("waitlist").update({ notified: true }).in("id", ids).then(() => {});
}

/* ══════════════════════════════════════════════════════════════════
   ARENA DÜELLO SİSTEMİ
══════════════════════════════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mDuel = (r: any): ArenaDuel => ({
  id:             r.id,
  challengerId:   r.challenger_id,
  challengerName: r.challenger_name,
  opponentId:     r.opponent_id,
  opponentName:   r.opponent_name,
  wagerXP:        Number(r.wager_xp ?? 0),
  rewardXP:       r.reward_xp != null ? Number(r.reward_xp) : null,
  status:         r.status,
  winnerId:       r.winner_id ?? null,
  adminNote:      r.admin_note ?? null,
  createdAt:      r.created_at ?? "",
  acceptedAt:     r.accepted_at ?? null,
  completedAt:    r.completed_at ?? null,
});

/** Bir öğrencinin tüm düellolarını getir (challenger veya opponent) */
export async function getStudentArenaDuels(studentId: string): Promise<ArenaDuel[]> {
  const { data, error } = await db()
    .from("arena_duels")
    .select("*")
    .or(`challenger_id.eq.${studentId},opponent_id.eq.${studentId}`)
    .order("created_at", { ascending: false });
  if (error) { console.error("[getStudentArenaDuels]", error.message); return []; }
  return (data ?? []).map(mDuel);
}

/** Admin: tüm düelloları getir */
export async function getAllArenaDuels(): Promise<ArenaDuel[]> {
  const { data, error } = await db()
    .from("arena_duels")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[getAllArenaDuels]", error.message); return []; }
  return (data ?? []).map(mDuel);
}

/** Düello daveti oluştur (kendi kendine düello açılamaz, XP kontrolü) */
export async function createArenaDuel(
  challengerId:   string,
  challengerName: string,
  opponentId:     string,
  opponentName:   string,
  wagerXP:        number,
): Promise<ArenaDuel> {
  if (challengerId === opponentId) throw new Error("Kendi kendinize düello açamazsınız.");
  if (wagerXP < 10)                throw new Error("Minimum bahis 10 XP'dir.");

  // Aynı çift arasında aktif bekleyen/aktif düello var mı?
  const { data: existing } = await db()
    .from("arena_duels")
    .select("id")
    .in("status", ["pending", "accepted", "active"])
    .or(
      `and(challenger_id.eq.${challengerId},opponent_id.eq.${opponentId}),` +
      `and(challenger_id.eq.${opponentId},opponent_id.eq.${challengerId})`,
    )
    .maybeSingle();
  if (existing) throw new Error("Bu öğrenciyle zaten aktif bir düello var.");

  const { data, error } = await db()
    .from("arena_duels")
    .insert({
      challenger_id:   challengerId,
      challenger_name: challengerName,
      opponent_id:     opponentId,
      opponent_name:   opponentName,
      wager_xp:        wagerXP,
      status:          "pending",
    })
    .select("*")
    .single();
  if (error) fail("createArenaDuel", error);
  return mDuel(data);
}

/** Düello davetini kabul et veya reddet */
export async function respondArenaDuel(
  duelId: string,
  response: "accepted" | "rejected",
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db()
    .from("arena_duels")
    .update({
      status:      response === "accepted" ? "accepted" : "rejected",
      accepted_at: response === "accepted" ? now : null,
    })
    .eq("id", duelId)
    .eq("status", "pending");
  if (error) console.error("[respondArenaDuel]", error.message);
}

/** Admin: Kabul edilmiş düelloyu aktifleştir (accepted → active) */
export async function approveArenaDuel(duelId: string): Promise<void> {
  const { error } = await db()
    .from("arena_duels")
    .update({ status: "active" })
    .eq("id", duelId)
    .eq("status", "accepted");
  if (error) console.error("[approveArenaDuel]", error.message);
}

/** Admin: Düello sonucunu belirle (çift sonuçlandırma DB trigger ile engellenir) */
export async function adminResolveDuel(
  duelId:   string,
  winnerId: string,
  winnerName: string,
  loserName: string,
  loserId:  string,
  rewardXP: number,
  wagerXP:  number,
  season:   string,
): Promise<void> {
  const now = new Date().toISOString();

  // 1) Düelloyu tamamlandı olarak işaretle
  const { error: duelErr } = await db()
    .from("arena_duels")
    .update({
      status:       "completed",
      winner_id:    winnerId,
      reward_xp:    rewardXP,
      completed_at: now,
    })
    .eq("id", duelId)
    .eq("status", "active");

  if (duelErr) { console.error("[adminResolveDuel] duel update:", duelErr.message); return; }

  // 2) Kazanana XP ekle
  await db().from("xp_adjustments").insert({
    student_id:   winnerId,
    student_name: winnerName,
    amount:       rewardXP,
    reason:       "Arena Galibiyeti",
    note:         `Arena düellosu kazanıldı — +${rewardXP} XP ödülü`,
    admin_name:   "ARENA",
    season,
    created_at:   now,
  }).then(() => {}, () => {});

  // 3) Kaybedenden XP düş
  await db().from("xp_adjustments").insert({
    student_id:   loserId,
    student_name: loserName,
    amount:       -wagerXP,
    reason:       "Arena Mağlubiyeti",
    note:         `Arena düellosu kaybedildi — -${wagerXP} XP`,
    admin_name:   "ARENA",
    season,
    created_at:   now,
  }).then(() => {}, () => {});

  // 4) Kazanana bildirim
  await db().from("notifications").insert({
    student_id: winnerId,
    title:      "⚔️ Arena Zaferi! 🏆",
    message:    `Düelloyu kazandın! +${rewardXP} XP hesabına eklendi.`,
    type:       "success",
    is_read:    false,
  }).then(() => {}, () => {});

  // 5) Kaybedene bildirim
  await db().from("notifications").insert({
    student_id: loserId,
    title:      "⚔️ Arena Düellosu Sonucu",
    message:    `Düelloyu kaybettin. -${wagerXP} XP düşüldü. Bir daha dene!`,
    type:       "info",
    is_read:    false,
  }).then(() => {}, () => {});
}
