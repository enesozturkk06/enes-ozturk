"use client";
import type { Student, AuthState } from "./types";
import { MOCK_STUDENTS } from "./mock-data";
import { supabase, isSupabaseConfigured } from "./supabase";

const STUDENT_KEY = "eo_student";
const ADMIN_KEY = "eo_admin";

// Env var yoksa enes2026 — büyük/küçük harf duyarsız karşılaştırma yapılır
const ADMIN_CODE = (process.env.NEXT_PUBLIC_ADMIN_CODE || "enes2026").toLowerCase();

export async function loginStudent(code: string): Promise<Student | null> {
  const upper = code.trim().toUpperCase();
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("code", upper)
      .eq("is_active", true)
      .single();
    return data || null;
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
