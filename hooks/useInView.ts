"use client";

/**
 * hooks/useInView.ts — IntersectionObserver tabanlı görünürlük tespiti.
 * Kedi Avatar Sistemi'nin en kritik performans kuralı için: avatar SADECE
 * viewport'ta göründüğünde mount/animasyon başlasın, ekran dışında hiçbir
 * render/interval çalışmasın. `once: true` (varsayılan) ile bir kez
 * görünür olduktan sonra gözlemi durdurur (gereksiz sürekli hesaplama yapmaz).
 *
 * ÖNEMLİ (canlı testte bulunan gerçek bug — düzeltildi): `ref` bir CALLBACK
 * ref olarak veriliyor, düz `useRef` DEĞİL. Sebep: çağıran bileşen ref'lenen
 * elemanı `if (loading) return <spinner/>` gibi bir erken dönüşün ARKASINDA
 * koşullu render ediyorsa, düz `useRef` ile effect SADECE bileşenin İLK
 * mount'unda (ref.current hâlâ null iken) çalışır ve bir daha ASLA yeniden
 * tetiklenmez — observer hiçbir zaman gerçek DOM node'una bağlanmaz, `inView`
 * sonsuza dek false kalır. Callback ref ile node gerçekten takıldığında state
 * güncellenir ve effect doğru node ile yeniden çalışır — hangi render
 * sırasında kullanılırsa kullanılsın güvenli.
 */
import { useCallback, useEffect, useState } from "react";

export function useInView<T extends HTMLElement = HTMLDivElement>(opts?: { once?: boolean; rootMargin?: string }) {
  const [node, setNode] = useState<T | null>(null);
  const ref = useCallback((el: T | null) => setNode(el), []);
  // IntersectionObserver desteklenmiyorsa başlangıç durumu doğrudan true —
  // effect içinde setState ile "düzeltmeye" gerek yok (react-hooks/set-state-in-effect).
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");
  const once = opts?.once ?? true;

  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin: opts?.rootMargin ?? "100px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, once, opts?.rootMargin]);

  return { ref, inView };
}
