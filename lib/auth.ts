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
export async function loginStudent(code: string): Promise<Student | null> {
  const upper = code.trim().toUpperCase();
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("students").select("*").eq("code", upper).eq("is_active", true).single();
    if (error) { console.log("[loginStudent]", error.message); return null; }
    return data ? mapStudent(data) : null;
  }
  return MOCK_STUDENTS.find(s => s.code === upper && s.isActive) ?? null;
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
export async function loginSalonOwner(code: string): Promise<SalonOwner | null> {
  const upper = code.trim().toUpperCase();
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("salon_owners").select("*")
      .eq("access_code", upper).eq("is_active", true).maybeSingle();
    if (error) {
      // Tablo yoksa null döndür
      if (error.message.includes("schema cache") || error.message.includes("table")) {
        console.warn("[loginSalonOwner] salon_owners tablosu hazır değil:", error.message);
        return null;
      }
      console.log("[loginSalonOwner]", error.message);
      return null;
    }
    return data ? mapSalonOwner(data) : null;
  }
  return null;
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
      return { role: "student", student, isAdmin: false, salonOwner: null };
    } catch { /* ignore */ }
  }

  return { role: null, student: null, isAdmin: false, salonOwner: null };
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
