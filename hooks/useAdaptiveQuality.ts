"use client";

/**
 * hooks/useAdaptiveQuality.ts — hafif, rAF tabanlı canlı FPS örnekleyici.
 * Kedi Life kuralı: FPS ölçülen ~1sn'lik pencerede eşiğin (varsayılan 50)
 * altına düşerse ikincil animasyonlar (nefes döngüsü, aura pulse gibi asıl
 * aktivite pozunu etkilemeyen katmanlar) kapatılsın — 3D bağlamdaki
 * "gölge/efektleri kapat" kuralının 2D SVG karşılığı.
 *
 * `enabled=false` iken rAF döngüsü HİÇ BAŞLAMAZ — avatar zaten görünmüyor/
 * animasyon kapalıyken gereksiz yere FPS ölçüp CPU harcamak istemiyoruz.
 */
import { useEffect, useRef, useState } from "react";

export function useAdaptiveQuality(enabled: boolean, opts?: { threshold?: number; sampleWindowMs?: number }): "full" | "reduced" {
  const [quality, setQuality] = useState<"full" | "reduced">("full");
  const framesRef = useRef<number[]>([]);
  const threshold = opts?.threshold ?? 50;
  const windowMs = opts?.sampleWindowMs ?? 1000;

  useEffect(() => {
    if (!enabled || typeof requestAnimationFrame === "undefined") return;
    let rafId: number;
    framesRef.current = [];

    const loop = (time: number) => {
      const frames = framesRef.current;
      frames.push(time);
      while (frames.length > 0 && time - frames[0] > windowMs) frames.shift();
      if (frames.length >= 10) {
        const fps = (frames.length - 1) / ((time - frames[0]) / 1000);
        setQuality(prev => {
          const next = fps < threshold ? "reduced" : "full";
          return next === prev ? prev : next;
        });
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [enabled, threshold, windowMs]);

  return enabled ? quality : "full";
}
