"use client";

/**
 * LazyStudentAvatar.tsx — StudentAvatar'ın PERFORMANS SARMALAYICISI.
 * Ana sayfalar StudentAvatar'ı DOĞRUDAN import ETMEMELİ — her zaman bunu
 * kullanmalı. Beş katmanlı koruma (Kedi Life ile genişletildi):
 * 1. `next/dynamic({ ssr:false })` — kod ana bundle'a dahil olmaz, ayrı chunk.
 * 2. `useInView` — sadece viewport'ta görünürken mount edilir/animasyon çalışır.
 * 3. `useReducedMotion` + basit zayıf-donanım sezgiseli — döngü animasyonları
 *    bu durumlarda tamamen kapatılır, statik render kalır.
 * 4. `useDocumentVisible` — sekme arka plandayken (başka sekme/uygulama)
 *    TÜM animasyonlar durur, gereksiz CPU/pil tüketimi olmaz.
 * 5. `useAdaptiveQuality` — canlı FPS ölçümü düşükse (varsayılan <50) ikincil
 *    animasyonlar (nefes, aura) otomatik kapanır, sadece ana aktivite pozu kalır.
 */
import { useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { useAdaptiveQuality } from "@/hooks/useAdaptiveQuality";
import type { StudentAvatarProps } from "./StudentAvatar";

const StudentAvatarImpl = dynamic(() => import("./StudentAvatar"), { ssr: false, loading: () => null });

/** navigator.hardwareConcurrency/deviceMemory her tarayıcıda YOK — desteklenmiyorsa
 * "güçlü donanım" varsayılır (asla hata vermez, sadece iyileştirme). `navigator`
 * client component'te ilk render'da zaten senkron erişilebilir — effect'e gerek yok. */
function useLowEndDevice(): boolean {
  const [lowEnd] = useState(() => {
    if (typeof navigator === "undefined") return false;
    const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return (typeof cores === "number" && cores <= 4) || (typeof mem === "number" && mem <= 4);
  });
  return lowEnd;
}

export default function LazyStudentAvatar(props: Omit<StudentAvatarProps, "animate" | "quality">) {
  const { ref, inView } = useInView<HTMLDivElement>({ once: false, rootMargin: "150px" });
  const reduced = useReducedMotion();
  const lowEnd = useLowEndDevice();
  const documentVisible = useDocumentVisible();
  const size = props.size ?? 120;

  const animate = inView && documentVisible && !reduced && !lowEnd;
  const quality = useAdaptiveQuality(animate);

  return (
    <div ref={ref} style={{ width: size, height: size * 1.35 }}>
      {inView && <StudentAvatarImpl {...props} animate={animate} quality={quality} />}
    </div>
  );
}
