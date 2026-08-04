"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, CheckCircle, X, Smartphone, Share } from "lucide-react";
import Logo from "@/app/components/shared/Logo";

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
      <div className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
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
          className="gradient-animated gradient-slow gradient-violet-pink-orange group inline-flex items-center gap-2.5 text-white font-semibold tracking-widest uppercase px-8 py-4 text-sm rounded-xl transition-transform duration-300 disabled:opacity-50"
          style={{ fontFamily: "var(--font-label)" }}
        >
          {installing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download size={16} />
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
        initial={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, delay: 0.4, ease: [0.22, 1, 0.36, 1] } }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        disabled={installing}
        className="glass-strong relative w-full flex items-center gap-3 p-3 rounded-xl overflow-hidden group disabled:opacity-50 transition-shadow duration-300"
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 gradient-animated gradient-slow gradient-violet-pink-orange" />
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
          {installing ? (
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#A78BFA", borderTopColor: "transparent" }} />
          ) : (
            <Smartphone size={15} style={{ color: "#A78BFA" }} />
          )}
        </div>
        <div className="text-left min-w-0">
          <div className="text-xs font-semibold text-white/80 tracking-wider" style={{ fontFamily: "var(--font-label)" }}>
            {installing ? "Yükleniyor..." : "Uygulamayı Yükle"}
          </div>
          <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-label)" }}>
            {platform === "ios" ? "Ana ekrana ekle — ücretsiz" : "Android uygulaması — ücretsiz"}
          </div>
        </div>
        <Download size={13} className="ml-auto flex-shrink-0" style={{ color: "rgba(167,139,250,0.5)" }} />
      </motion.button>

      <IOSModal open={iosModal} onClose={() => setIosModal(false)} />
    </>
  );
}

/* ── iOS Talimat Modali ──────────────────────────────────────── */
const IOS_STEPS = [
  { icon: Share, iconColor: "#60A5FA", numColor: "#A78BFA", title: "Paylaş butonuna bas", desc: "Safari'nin alt kısmındaki kare + ok ikonuna dokun" },
  { icon: null, symbol: "⊞", iconColor: "#60A5FA", numColor: "#A78BFA", title: "“Ana Ekrana Ekle” seç", desc: "Açılan menüde aşağı kaydırarak “Ana Ekrana Ekle” seçeneğini bul" },
  { icon: CheckCircle, iconColor: "var(--color-success)", numColor: "var(--color-success)", title: "“Ekle” butonuna bas", desc: "Uygulama ana ekranınıza eklendi!" },
] as const;

function IOSModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeIn" } }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

          <motion.div
            initial={{ y: 60, scale: 0.94, filter: "blur(6px)" }}
            animate={{ y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 300, damping: 28 } }}
            exit={{ y: 30, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.2, ease: "easeIn" } }}
            className="relative z-10 w-full max-w-sm gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet rounded-t-2xl sm:rounded-2xl p-[1px] overflow-hidden"
          >
            <div className="glass-strong relative rounded-t-2xl sm:rounded-2xl">
              {/* Başlık */}
              <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
                <div className="flex items-center gap-3">
                  <Logo size={36} />
                  <div>
                    <div className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-label)" }}>Uygulamayı Yükle</div>
                    <div className="text-xs text-white/35" style={{ fontFamily: "var(--font-label)" }}>iPhone / iPad</div>
                  </div>
                </div>
                <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>

              {/* Talimatlar */}
              <div className="p-5 space-y-3">
                <p className="text-xs text-white/45 text-center" style={{ fontFamily: "var(--font-label)" }}>
                  Bu siteyi ana ekranınıza uygulama olarak ekleyebilirsiniz. Safari&apos;yi kullanın:
                </p>

                {IOS_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={i} className="glass flex items-start gap-4 p-3 rounded-xl">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                        style={{ background: `${step.numColor}1f`, border: `1px solid ${step.numColor}40`, color: step.numColor, fontFamily: "var(--font-display)" }}>
                        {i + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          {Icon ? <Icon size={14} style={{ color: step.iconColor }} className="flex-shrink-0" /> : <span className="text-sm" style={{ color: step.iconColor }}>{step.symbol}</span>}
                          <span className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-label)" }}>{step.title}</span>
                        </div>
                        <p className="text-xs text-white/40" style={{ fontFamily: "var(--font-label)" }}>{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 pb-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}>
                <button
                  onClick={onClose}
                  className="gradient-animated gradient-slow gradient-violet-pink-orange w-full py-3 text-white text-xs font-semibold tracking-widest uppercase rounded-xl transition-transform hover:scale-[1.02]"
                  style={{ fontFamily: "var(--font-label)" }}
                >
                  Anladım
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
