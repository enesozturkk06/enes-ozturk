"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCircle, X, Smartphone, Share } from "lucide-react";

type Platform = "android" | "ios" | "desktop" | "unknown";
type InstallState = "hidden" | "available" | "installed" | "ios-prompt";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}

interface Props {
  variant?: "hero" | "compact" | "login";
}

export default function PWAInstallButton({ variant = "compact" }: Props) {
  const [state, setState]     = useState<InstallState>("hidden");
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallEvent | null>(null);
  const [iosModal, setIosModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    // Zaten kuruluysa gösterme
    if (isStandaloneMode()) {
      setState("installed");
      return;
    }

    // iOS Safari için her zaman göster (beforeinstallprompt yok)
    if (p === "ios") {
      setState("available");
      return;
    }

    // Android/Desktop — beforeinstallprompt olayını bekle
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallEvent);
      setState("available");
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Uygulama kurulunca state güncelle
    window.addEventListener("appinstalled", () => {
      setState("installed");
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (platform === "ios") {
      setIosModal(true);
      return;
    }
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setState("installed");
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  };

  // Masaüstünde veya state hidden ise hiçbir şey gösterme
  if (state === "hidden") return null;
  if (platform === "desktop" && state !== "installed") return null;

  /* ── Kurulu durumu ─────────────────────────────────────────── */
  if (state === "installed") {
    if (variant === "login") return null; // login sayfasında kuruluysa tamamen gizle
    return (
      <div className="inline-flex items-center gap-2 text-xs text-green-400/70" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
        <CheckCircle size={14} />
        Uygulama Yüklü
      </div>
    );
  }

  /* ── Hero varyantı (büyük buton) ───────────────────────────── */
  if (variant === "hero") {
    return (
      <>
        <motion.button
          onClick={handleInstall}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={installing}
          className="group inline-flex items-center gap-2.5 border border-crimson/40 hover:border-crimson text-white/70 hover:text-white font-semibold tracking-widest uppercase px-8 py-4 text-sm transition-all duration-300 hover:bg-crimson/8 disabled:opacity-50"
          style={{ fontFamily: "var(--font-barlow-condensed)" }}
        >
          {installing ? (
            <div className="w-4 h-4 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={16} className="text-crimson" />
          )}
          {installing ? "Yükleniyor..." : "Uygulamayı Yükle"}
        </motion.button>

        <IOSModal open={iosModal} onClose={() => setIosModal(false)} />
      </>
    );
  }

  /* ── Login / Compact varyantı (küçük kart) ─────────────────── */
  return (
    <>
      <motion.button
        onClick={handleInstall}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        disabled={installing}
        className="w-full flex items-center gap-3 p-3 bg-crimson/6 border border-crimson/20 hover:border-crimson/40 hover:bg-crimson/10 transition-all duration-300 group disabled:opacity-50"
      >
        <div className="w-8 h-8 bg-crimson/15 border border-crimson/30 flex items-center justify-center flex-shrink-0 group-hover:bg-crimson/25 transition-colors">
          {installing ? (
            <div className="w-4 h-4 border-2 border-crimson border-t-transparent rounded-full animate-spin" />
          ) : (
            <Smartphone size={15} className="text-crimson" />
          )}
        </div>
        <div className="text-left min-w-0">
          <div className="text-xs font-semibold text-white/80 tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {installing ? "Yükleniyor..." : "Uygulamayı Yükle"}
          </div>
          <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {platform === "ios" ? "Ana ekrana ekle — ücretsiz" : "Android uygulaması — ücretsiz"}
          </div>
        </div>
        <Download size={13} className="text-crimson/50 ml-auto flex-shrink-0" />
      </motion.button>

      <IOSModal open={iosModal} onClose={() => setIosModal(false)} />
    </>
  );
}

/* ── iOS Talimat Modali ──────────────────────────────────────── */
function IOSModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="relative z-10 w-full max-w-sm bg-carbon border border-white/10 shadow-[0_-10px_60px_rgba(0,0,0,0.5)]"
          >
            {/* Üst çizgi */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-crimson to-transparent" />

            {/* Başlık */}
            <div className="flex items-center justify-between p-5 border-b border-white/6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-crimson/10 border border-crimson/20 flex items-center justify-center">
                  <svg viewBox="0 0 44 44" fill="none" className="w-5 h-5">
                    <polygon points="22,2 42,12 42,32 22,42 2,32 2,12" stroke="#dc2626" strokeWidth="2" fill="rgba(220,38,38,0.1)" />
                    <text x="22" y="28" textAnchor="middle" fill="#dc2626" fontSize="13" fontFamily="var(--font-bebas)">EÖ</text>
                  </svg>
                </div>
                <div>
                  <div className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Uygulamayı Yükle</div>
                  <div className="text-xs text-white/35" style={{ fontFamily: "var(--font-barlow-condensed)" }}>iPhone / iPad</div>
                </div>
              </div>
              <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            {/* Talimatlar */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-white/45 text-center" style={{ fontFamily: "var(--font-inter)" }}>
                Bu siteyi ana ekranınıza uygulama olarak ekleyebilirsiniz. Safari&apos;yi kullanın:
              </p>

              {/* Adım 1 */}
              <div className="flex items-start gap-4 p-3 bg-steel/30 border border-white/5">
                <div className="w-8 h-8 bg-crimson/10 border border-crimson/20 flex items-center justify-center flex-shrink-0 text-crimson font-display text-sm" style={{ fontFamily: "var(--font-bebas)" }}>1</div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Share size={14} className="text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      Paylaş butonuna bas
                    </span>
                  </div>
                  <p className="text-xs text-white/40" style={{ fontFamily: "var(--font-inter)" }}>
                    Safari&apos;nin alt kısmındaki kare + ok ikonuna dokun
                  </p>
                </div>
              </div>

              {/* Adım 2 */}
              <div className="flex items-start gap-4 p-3 bg-steel/30 border border-white/5">
                <div className="w-8 h-8 bg-crimson/10 border border-crimson/20 flex items-center justify-center flex-shrink-0 text-crimson font-display text-sm" style={{ fontFamily: "var(--font-bebas)" }}>2</div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-blue-400 text-sm">⊞</span>
                    <span className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      &quot;Ana Ekrana Ekle&quot; seç
                    </span>
                  </div>
                  <p className="text-xs text-white/40" style={{ fontFamily: "var(--font-inter)" }}>
                    Açılan menüde aşağı kaydırarak &ldquo;Ana Ekrana Ekle&rdquo; seçeneğini bul
                  </p>
                </div>
              </div>

              {/* Adım 3 */}
              <div className="flex items-start gap-4 p-3 bg-steel/30 border border-white/5">
                <div className="w-8 h-8 bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0 text-green-400 font-display text-sm" style={{ fontFamily: "var(--font-bebas)" }}>3</div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                    <span className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      &quot;Ekle&quot; butonuna bas
                    </span>
                  </div>
                  <p className="text-xs text-white/40" style={{ fontFamily: "var(--font-inter)" }}>
                    Uygulama ana ekranınıza eklendi!
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={onClose}
                className="w-full py-3 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                Anladım
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
