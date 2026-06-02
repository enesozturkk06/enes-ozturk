"use client";
import type { Student, AuthState } from "./types";
import { MOCK_STUDENTS } from "./mock-data";
import { supabase, isSupabaseConfigured } from "./supabase";

const STUDENT_KEY = "eo_student";
const ADMIN_KEY   = "eo_admin";

const ADMIN_CODE = (process.env.NEXT_PUBLIC_ADMIN_CODE || "enes2026").toLowerCase();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapStudent(row: any): Student {
  return {
    id:               row.id,
    code:             row.code,
    fullName:         row.full_name,
    phone:            row.phone,
    email:            row.email ?? undefined,
    level:            row.level,
    packageType:      row.package_type,
    totalLessons:     row.total_lessons ?? 0,
    remainingLessons: row.remaining_lessons ?? 0,
    completedLessons: row.completed_lessons ?? 0,
    paymentStatus:    row.payment_status,
    amountPaid:       Number(row.amount_paid ?? 0),
    amountDue:        Number(row.amount_due ?? 0),
    packageStartDate: row.package_start_date ?? "",
    packageEndDate:   row.package_end_date ?? "",
    notes:            row.notes ?? undefined,
    isActive:         row.is_active ?? true,
    weight:           row.weight ?? undefined,
    age:              row.age ?? undefined,
    createdAt:        row.created_at ?? "",
  };
}

export async function loginStudent(code: string): Promise<Student | null> {
  const upper = code.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("code", upper)
      .eq("is_active", true)
      .single();
    if (error) {
      console.log("[loginStudent] Supabase hatası:", error.message);
      return null;
    }
    return data ? mapStudent(data) : null;
  }

  return MOCK_STUDENTS.find(s => s.code === upper && s.isActive) ?? null;
}

export function loginAdmin(code: string): boolean {
  return code.trim().toLowerCase() === ADMIN_CODE;
}

export function saveStudentSession(student: Student): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
}

export function saveAdminSession(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_KEY, "true");
}

export function getSession(): AuthState {
  if (typeof window === "undefined") return { role: null, student: null, isAdmin: false };
  const adminFlag = localStorage.getItem(ADMIN_KEY);
  if (adminFlag === "true") return { role: "admin", student: null, isAdmin: true };
  const raw = localStorage.getItem(STUDENT_KEY);
  if (raw) {
    try {
      const student = JSON.parse(raw) as Student;
      return { role: "student", student, isAdmin: false };
    } catch {
      return { role: null, student: null, isAdmin: false };
    }
  }
  return { role: null, student: null, isAdmin: false };
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STUDENT_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function refreshStudent(updated: Student): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STUDENT_KEY, JSON.stringify(updated));
}
