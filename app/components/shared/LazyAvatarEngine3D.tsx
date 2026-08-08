"use client";

/**
 * LazyAvatarEngine3D.tsx — AvatarEngine3D'nin PERFORMANS SARMALAYICISI.
 * LazyStudentAvatar.tsx (2D) İLE BİREBİR AYNI 5 katman — performans sözleşmesi
 * render teknolojisinden bağımsız olmalı. Sayfalar AvatarEngine3D'yi
 * DOĞRUDAN import ETMEMELİ, her zaman bunu kullanmalı.
 */
import { useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { useInView } from "@/hooks/useInView";
import { useDocumentVisible } from "@/hooks/useDocumentVisible";
import { useAdaptiveQuality } from "@/hooks/useAdaptiveQuality";
import type { AvatarEngine3DProps } from "./AvatarEngine3D";

const AvatarEngine3DImpl = dynamic(() => import("./AvatarEngine3D"), { ssr: false, loading: () => null });

function useLowEndDevice(): boolean {
  const [lowEnd] = useState(() => {
    if (typeof navigator === "undefined") return false;
    const cores = (navigator as Navigator & { hardwareConcurrency?: number }).hardwareConcurrency;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    return (typeof cores === "number" && cores <= 4) || (typeof mem === "number" && mem <= 4);
  });
  return lowEnd;
}

export default function LazyAvatarEngine3D(
  props: Omit<AvatarEngine3DProps, "animate"> & { width?: number | string; height?: number | string },
) {
  const { ref, inView } = useInView<HTMLDivElement>({ once: false, rootMargin: "150px" });
  const reduced = useReducedMotion();
  const lowEnd = useLowEndDevice();
  const documentVisible = useDocumentVisible();
  const width = props.width ?? "100%";
  const height = props.height ?? 400;

  const animate = inView && documentVisible && !reduced && !lowEnd;
  const liveQuality = useAdaptiveQuality(animate);
  // Zayıf donanım sezgiseli PROAKTİF olarak "reduced"a düşürür (canlı FPS
  // ölçümünü beklemeden) — canlı ölçüm ise SONRADAN gerçekten yavaşlarsa
  // (ör. arka planda başka sekmeler açıkken) devreye giriyor. Ölçülen en
  // büyük performans kaldıracı bu (dpr 2→1, ~4 kat piksel maliyeti farkı).
  const quality = lowEnd ? "reduced" : liveQuality;

  return (
    <div ref={ref} style={{ width, height }}>
      {inView && <AvatarEngine3DImpl {...props} animate={animate} quality={quality} />}
    </div>
  );
}
