"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Gerçek mobil bottom-sheet (aşağıdan kayarak açılır) — admin ders detayı
 * VE öğrenci randevu onay/detay akışı AYNI kabuğu kullanır, içerik
 * children ile role'e göre değişir.
 *
 * Yapı (mobil taşma/erişilemeyen buton bug'ı düzeltmesi — Safari/iPhone'a
 * özel kök neden):
 *  - Android'de (Chrome) `position:fixed; inset:0` her zaman GERÇEKTEN
 *    görünen alana eşit render olur. Gerçek iPhone Safari'de İSE eski,
 *    hâlâ kısmen geçerli bir davranış var: `fixed` elemanlar bazen
 *    "layout viewport" (Safari'nin adres çubuğu hep gizliymiş gibi
 *    varsaydığı, GERÇEKTEN görünenden daha uzun sanal alan) baz alınarak
 *    boyutlandırılıyor/konumlandırılıyor — "visual viewport" (gerçekten
 *    görünen, daha kısa alan) değil. Sonuç: backdrop'un kendisi görünenden
 *    daha uzun render oluyor, `items-end` de sheet'i bu daha uzun kutunun
 *    altına hizalıyor — yani sheet (ve footer'daki buton) gerçek ekranın
 *    ALTINDA, görünmez bir bölgede konumlanıyor. Bu Android'de hiç
 *    yaşanmayan, Safari'ye özgü bir davranış — "Android'de düzeldi,
 *    iPhone Safari'de düzelmedi" raporuyla tam örtüşüyor.
 *  - ÇÖZÜM: CSS viewport birimlerine (vh/dvh/%) GÜVENMİYORUZ. Bunun
 *    yerine `window.visualViewport` (gerçekten görünen alanı ms hassasiyetle
 *    veren, tüm modern iOS/Android'de desteklenen API) ile backdrop'un
 *    `top`/`height` değerini JS'te PİKSEL olarak ölçüp inline style'a
 *    yazıyoruz — Safari'nin toolbar'ı açılıp kapandıkça (`resize`/`scroll`
 *    event'leri ile) canlı güncelleniyor. Backdrop artık HER ZAMAN gerçek
 *    görünen alanla birebir aynı; `.appointment-sheet-panel` (globals.css)
 *    içindeki yüzde bazlı max-height de bu doğru kutuya göre çözülüyor.
 *    `visualViewport` yoksa (çok eski tarayıcı) eski `inset:0` davranışına
 *    sessizce geri düşülüyor.
 *  - Başlık/handle sabit (flex-shrink-0), içerik `flex-1 min-h-0 overflow-y-auto`
 *    ile GERÇEKTEN kendi içinde scroll eder (önceki hata: bu satırda
 *    min-h-0 yoktu, flex çocuğu içeriğe göre büyüyüp dış overflow-hidden
 *    tarafından sessizce kırpılıyordu — buton hiç görünmüyordu).
 *  - `footer` verilirse (aksiyon butonları), içerikten AYRI, sheet'in en
 *    altına yapışık sabit bir alanda render edilir — scroll'dan etkilenmez,
 *    safe-area-inset-bottom + 16px min padding ile home indicator'ın
 *    üzerine binmez, içerikten ince bir üst gölge ile ayrılır.
 *  - Sheet açıkken arka sayfa scroll kilitlenir (body overflow hidden).
 */
export default function AppointmentBottomSheet({
  open, onClose, title, subtitle, children, footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Sabit (sticky) alt aksiyon alanı — verilirse scroll edilen içerikten
   * ayrı, her zaman görünür kalır (örn. "Randevuyu Onayla" / "Tamamlandı"). */
  footer?: React.ReactNode;
}) {
  // Gerçekten görünen alanı (Safari'nin "layout viewport"u değil, "visual
  // viewport"u) piksel cinsinden takip ediyoruz — bkz. üstteki açıklama.
  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setViewport({ top: vv.offsetTop, height: vv.height });
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Sadece `overflow:hidden` gerçek iOS Safari'de touch-scroll/rubber-band'i
    // güvenilir şekilde engellemiyor — body'yi scroll konumunda sabitleyip
    // kapanışta geri scroll ediyoruz (standart iOS-safe kilit tekniği).
    const scrollY = window.scrollY;
    const body = document.body.style;
    const prevPosition = body.position, prevTop = body.top, prevWidth = body.width, prevOverflow = body.overflow;
    body.position = "fixed";
    body.top = `-${scrollY}px`;
    body.width = "100%";
    body.overflow = "hidden";
    return () => {
      body.position = prevPosition;
      body.top = prevTop;
      body.width = prevWidth;
      body.overflow = prevOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center"
          style={viewport ? { top: viewport.top, height: viewport.height, bottom: "auto" } : undefined}
          onClick={onClose}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="appointment-sheet-panel glass-strong relative z-10 w-full sm:max-w-md rounded-t-[20px] sm:rounded-[20px] sm:mb-6 overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-px gradient-animated gradient-slow gradient-violet-blue-cyan-pink-orange" />
            {/* sürükleme tutamağı — mobil bottom-sheet imasını güçlendirir */}
            <div className="flex justify-center pt-2.5 sm:hidden flex-shrink-0">
              <div className="w-9 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:pt-5 pb-3 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg text-white tracking-wide truncate" style={{ fontFamily: "var(--font-display)" }}>{title}</h3>
                {subtitle && <p className="text-xs text-white/40 mt-0.5 truncate" style={{ fontFamily: "var(--font-label)" }}>{subtitle}</p>}
              </div>
              <button onClick={onClose} aria-label="Kapat" className="flex-shrink-0 text-white/30 hover:text-white p-2 -m-2 rounded-lg">
                <X size={16} />
              </button>
            </div>

            {/* Scroll edilebilir gövde — flex-1 min-h-0 ZORUNLU: bu olmadan
                flex çocuğu içeriğe göre büyür, kendi overflow-y-auto'su hiç
                devreye girmez ve dış sheet'in overflow-hidden'ı taşan kısmı
                (ör. alt butonu) sessizce kırpar. */}
            <div className="no-scrollbar flex-1 min-h-0 overflow-y-auto px-5 pb-4">
              {children}
            </div>

            {footer && (
              <div className="flex-shrink-0 px-5 pt-3"
                style={{
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.12))",
                  boxShadow: "0 -10px 16px -12px rgba(0,0,0,0.5)",
                  paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
                }}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
