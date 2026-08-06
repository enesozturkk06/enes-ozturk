"use client";

/**
 * hooks/useDocumentVisible.ts — Page Visibility API sarmalayıcı.
 * Kedi Life'ın performans kuralı: sekme arka plana geçtiğinde (kullanıcı
 * başka bir sekmeye/uygulamaya geçtiğinde) TÜM avatar animasyonları ve
 * Dijital Salon'un aktivite zamanlayıcısı durmalı — gereksiz CPU/GPU
 * kullanımı ve pil tüketimi olmasın.
 */
import { useEffect, useState } from "react";

export function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(() =>
    typeof document === "undefined" ? true : document.visibilityState === "visible");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return visible;
}
