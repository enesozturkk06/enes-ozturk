"use client";

export interface LessonPackage {
  id: string;
  name: string;
  lessonCount: number;
  price: number;
  durationDays: number;
  description: string;
  isActive: boolean;
  highlight?: boolean; // Öne çıkan paket
}

const KEY = "eo_packages_v2";

const DEFAULTS: LessonPackage[] = [
  {
    id: "pkg-a",
    name: "Başlangıç",
    lessonCount: 8,
    price: 1490,
    durationDays: 45,
    description: "Temel teknikler, duruş ve kondisyon",
    isActive: true,
    highlight: false,
  },
  {
    id: "pkg-b",
    name: "Gelişim",
    lessonCount: 10,
    price: 1790,
    durationDays: 60,
    description: "Kombine çalışmalar, serbest çalışma girişi",
    isActive: true,
    highlight: true,
  },
  {
    id: "pkg-c",
    name: "Şampiyon",
    lessonCount: 12,
    price: 2190,
    durationDays: 75,
    description: "İleri seviye teknik, müsabaka hazırlığı",
    isActive: true,
    highlight: false,
  },
];

export function getPackages(): LessonPackage[] {
  if (typeof window === "undefined") return DEFAULTS;
  const raw = localStorage.getItem(KEY);
  if (!raw) return DEFAULTS;
  try {
    return JSON.parse(raw) as LessonPackage[];
  } catch {
    return DEFAULTS;
  }
}

export function savePackages(packages: LessonPackage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(packages));
}
