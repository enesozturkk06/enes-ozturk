"use client";
import type { Student, AuthState, SalonOwner } from "./types";
import { MOCK_STUDENTS } from "./mock-data";
import { supabase, isSupabaseConfigured } from "./supabase";

const STUDENT_KEY     = "eo_student";
const ADMIN_KEY       = "eo_admin";
const SALON_OWNER_KEY = "eo_salon_owner";

const ADMIN_CODE = (process.env.NEXT_PUBLIC_ADMIN_CODE || "enes2026").toLowerCase();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStudent(row: any): Student {
  return {
    id: row.id, code: row.code, fullName: row.full_name, phone: row.phone,
    email: row.email ?? undefined, level: row.level, packageType: row.package_type,
    totalLessons: row.total_lessons ?? 0, remainingLessons: row.remaining_lessons ?? 0,
    completedLessons: row.completed_lessons ?? 0, paymentStatus: row.payment_status,
    amountPaid: Number(row.amount_paid ?? 0), amountDue: Number(row.amount_due ?? 0),
    packageStartDate: row.package_start_date ?? "", packageEndDate: row.package_end_date ?? "",
    notes: row.notes ?? undefined, isActive: row.is_active ?? true,
    weight: row.weight ?? undefined, age: row.age ?? undefined, createdAt: row.created_at ?? "",
    avatarUrl: row.avatar_url ?? undefined,
    rulesAccepted: row.rules_accepted ?? false,
    kediIntroSeen: row.kedi_intro_seen ?? false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSalonOwner(row: any): SalonOwner {
  return {
    id: row.id, name: row.name, accessCode: row.access_code,
    isActive: row.is_active ?? true, notes: row.notes ?? undefined,
    createdAt: row.created_at ?? "",
  };
}

/* ── Student ─────────────────────────────────────────────────── */
export type LoginStudentResult =
  | { status: "ok"; student: Student }
  | { status: "invalid-code" }
  | { status: "network-error" };

const LOGIN_STUDENT_TIMEOUT_MS = 10000;

/**
 * "Kod gerçekten yanlış" (PostgREST'in .single() ile sıfır satır dönmesi,
 * PGRST116) ile "istek ağ/timeout/sunucu hatasıyla başarısız oldu" birbirinden
 * AYRI ele alınır — öncesinde ikisi de "Geçersiz giriş kodu" olarak
 * gösteriliyordu; geçerli kodu olan ama o an bağlantı sorunu yaşayan bir
 * öğrenci, kodunun yanlış olduğunu sanıp antrenörüne gereksiz yere
 * ulaşıyordu. Geçici hatalarda bir kez daha denenir.
 */
export async function loginStudent(code: string): Promise<LoginStudentResult> {
  const upper = code.trim().toUpperCase();
  if (!isSupabaseConfigured || !supabase) {
    const found = MOCK_STUDENTS.find(s => s.code === upper && s.isActive);
    return found ? { status: "ok", student: found } : { status: "invalid-code" };
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const queryPromise = supabase
        .from("students").select("*").eq("code", upper).eq("is_active", true).single();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("LOGIN_STUDENT_TIMEOUT")), LOGIN_STUDENT_TIMEOUT_MS)
      );
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      if (error) {
        if (error.code === "PGRST116") return { status: "invalid-code" };
        console.log(`[loginStudent] İstek başarısız (deneme ${attempt}/2):`, error.message);
      } else {
        return data ? { status: "ok", student: mapStudent(data) } : { status: "invalid-code" };
      }
    } catch (e) {
      console.log(`[loginStudent] İstek istisna fırlattı (deneme ${attempt}/2):`, e instanceof Error ? e.message : e);
    }
    if (attempt === 1) await new Promise(r => setTimeout(r, 1200));
  }
  return { status: "network-error" };
}

export function saveStudentSession(student: Student): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
}

/* ── Admin ───────────────────────────────────────────────────── */
export function loginAdmin(code: string): boolean {
  return code.trim().toLowerCase() === ADMIN_CODE;
}

export function saveAdminSession(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_KEY, "true");
}

/* ── Salon Sahibi ────────────────────────────────────────────── */
export type LoginSalonOwnerResult =
  | { status: "ok"; owner: SalonOwner }
  | { status: "invalid-code" }
  | { status: "network-error" };

const LOGIN_SALON_OWNER_TIMEOUT_MS = 10000;

/**
 * Şema hatası (tablo henüz yok) ve "kod gerçekten yanlış" durumları hâlâ
 * "invalid-code" sayılır (davranış değişmedi). Ağ/timeout hatası AYRI ele
 * alınır — bkz. loginStudent'taki aynı düzeltmenin gerekçesi.
 */
export async function loginSalonOwner(code: string): Promise<LoginSalonOwnerResult> {
  const upper = code.trim().toUpperCase();
  if (!isSupabaseConfigured || !supabase) return { status: "invalid-code" };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const queryPromise = supabase
        .from("salon_owners").select("*")
        .eq("access_code", upper).eq("is_active", true).maybeSingle();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("LOGIN_SALON_OWNER_TIMEOUT")), LOGIN_SALON_OWNER_TIMEOUT_MS)
      );
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);
      if (error) {
        // Tablo yoksa (şema henüz kurulmamış) invalid-code say — bu bir ağ
        // sorunu değil, kalıcı bir yapılandırma eksikliği.
        if (error.message.includes("schema cache") || error.message.includes("table")) {
          console.warn("[loginSalonOwner] salon_owners tablosu hazır değil:", error.message);
          return { status: "invalid-code" };
        }
        console.log(`[loginSalonOwner] İstek başarısız (deneme ${attempt}/2):`, error.message);
      } else {
        return data ? { status: "ok", owner: mapSalonOwner(data) } : { status: "invalid-code" };
      }
    } catch (e) {
      console.log(`[loginSalonOwner] İstek istisna fırlattı (deneme ${attempt}/2):`, e instanceof Error ? e.message : e);
    }
    if (attempt === 1) await new Promise(r => setTimeout(r, 1200));
  }
  return { status: "network-error" };
}

export function saveSalonOwnerSession(owner: SalonOwner): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SALON_OWNER_KEY, JSON.stringify(owner));
}

/* ── Session okuma ───────────────────────────────────────────── */
export function getSession(): AuthState {
  if (typeof window === "undefined") {
    return { role: null, student: null, isAdmin: false, salonOwner: null };
  }

  const adminFlag = localStorage.getItem(ADMIN_KEY);
  if (adminFlag === "true") {
    return { role: "admin", student: null, isAdmin: true, salonOwner: null };
  }

  const salonRaw = localStorage.getItem(SALON_OWNER_KEY);
  if (salonRaw) {
    try {
      const salonOwner = JSON.parse(salonRaw) as SalonOwner;
      return { role: "salon_owner", student: null, isAdmin: false, salonOwner };
    } catch { /* ignore */ }
  }

  const raw = localStorage.getItem(STUDENT_KEY);
  if (raw) {
    try {
      const student = JSON.parse(raw) as Student;
      // Mock ID kontrolü: Supabase UUID formatı değilse session'ı temizle
      // UUID formatı: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const isRealUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(student.id);
      if (!isRealUUID) {
        console.warn("[getSession] Mock/geçersiz student ID temizleniyor:", student.id);
        localStorage.removeItem(STUDENT_KEY);
        return { role: null, student: null, isAdmin: false, salonOwner: null };
      }
      return { role: "student", student, isAdmin: false, salonOwner: null };
    } catch { /* ignore */ }
  }

  return { role: null, student: null, isAdmin: false, salonOwner: null };
}

export type VerifyStudentResult =
  | { status: "ok"; student: Student }
  | { status: "not-found" }
  | { status: "network-error" };

const VERIFY_STUDENT_TIMEOUT_MS = 10000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryStudentOnce(studentId: string): Promise<{ data: any; error: any }> {
  const queryPromise = supabase!
    .from("students").select("*").eq("id", studentId).eq("is_active", true).maybeSingle();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("VERIFY_STUDENT_TIMEOUT")), VERIFY_STUDENT_TIMEOUT_MS)
  );
  return Promise.race([queryPromise, timeoutPromise]);
}

/**
 * Öğrencinin Supabase'deki gerçek verisini çek ve localStorage'ı güncelle.
 * Sayfa yüklenince çağrılır — eski/mock session'ları temizler.
 *
 * ÖNEMLİ: "istek başarısız oldu" (ağ kopukluğu/timeout/geçici sunucu hatası)
 * ile "istek başarılı oldu ama öğrenci gerçekten yok" (silinmiş/pasif)
 * birbirinden AYRI ele alınır. Öncesinde ikisi de aynı şekilde "bulunamadı"
 * sayılıp kullanıcı anında oturumdan atılıyordu — bir an için internet
 * kesintisi yaşayan (ama hesabı tamamen geçerli olan) kullanıcılar, uygulamayı
 * her açtıklarında rastgele login ekranına düşüyordu. Artık sadece Supabase'in
 * GERÇEKTEN boş sonuç döndürdüğü (error yok, data yok) durumda oturum
 * temizleniyor; ağ/timeout hatalarında mevcut (önbellekteki) oturum korunuyor.
 * Geçici hatalarda bir kez daha denenir (kısa gecikmeyle) — kalıcı ağ
 * sorunlarında sonsuz denemeye girmeden mevcut oturumla devam edilir.
 */
export async function verifyAndRefreshStudent(student: Student): Promise<VerifyStudentResult> {
  if (!isSupabaseConfigured || !supabase) return { status: "ok", student };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const { data, error } = await queryStudentOnce(student.id);
      if (error) {
        console.warn(`[verifyAndRefreshStudent] Doğrulama isteği başarısız (deneme ${attempt}/2), session korunuyor:`, error.message ?? error);
      } else if (!data) {
        // İstek BAŞARILI oldu ve sonuç gerçekten boş — öğrenci silinmiş/pasif.
        console.warn("[verifyAndRefreshStudent] Öğrenci Supabase'de bulunamadı, session temizleniyor:", student.id);
        localStorage.removeItem(STUDENT_KEY);
        return { status: "not-found" };
      } else {
        const fresh = mapStudent(data);
        saveStudentSession(fresh);
        return { status: "ok", student: fresh };
      }
    } catch (e) {
      // Timeout veya network exception (fetch failed, abort, DNS, vs.)
      console.warn(`[verifyAndRefreshStudent] Doğrulama isteği istisna fırlattı (deneme ${attempt}/2), session korunuyor:`, e instanceof Error ? e.message : e);
    }
    if (attempt === 1) await new Promise(r => setTimeout(r, 1200));
  }
  return { status: "network-error" };
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STUDENT_KEY);
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(SALON_OWNER_KEY);
}

export function refreshStudent(updated: Student): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STUDENT_KEY, JSON.stringify(updated));
}
