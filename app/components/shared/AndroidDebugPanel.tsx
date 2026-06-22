"use client";
import { useEffect, useState } from "react";

/**
 * Android scroll-glitch tanı paneli — SADECE manuel etkinleştirildiğinde görünür.
 * Etkinleştirme: URL'e ?debug=1 ekle (örn: /ogrenci?debug=1). Bir kez açıldıktan
 * sonra localStorage'da kalır, sayfa/route değiştirince kaybolmaz.
 * Normal kullanıcılar bunu asla görmez — hiçbir görsel/performans etkisi yok.
 */

const STORAGE_KEY      = "android_debug_enabled";
const SAFE_CLASS        = "dbg-safe-mode";
const SAFE_OVERRIDE_KEY = "android_safe_mode_override"; // "1" | "0" | yok (=otomatik)

const TOGGLES = [
  { id: "dbg-no-anim",     label: "Tüm animasyonlar/transition kapalı" },
  { id: "dbg-no-blur",     label: "Blur / backdrop-filter kapalı" },
  { id: "dbg-no-pseudo",   label: "::before / ::after katmanları kapalı" },
  { id: "dbg-no-motion",   label: "Framer Motion transform/opacity kapalı" },
  { id: "dbg-no-glow",     label: "Neon glow (box/text-shadow) kapalı" },
  { id: "dbg-no-floating", label: "Kedi AI + WhatsApp butonları kapalı" },
] as const;

type ToggleId = typeof TOGGLES[number]["id"];

function isAndroidUA(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export default function AndroidDebugPanel() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const [safeAuto, setSafeAuto] = useState(false); // otomatik mi yoksa manuel mi açıldı

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    // ── Debug paneli görünürlüğü ──────────────────────────────
    if (params.get("debug") === "1") localStorage.setItem(STORAGE_KEY, "1");
    if (params.get("debug") === "0") {
      localStorage.removeItem(STORAGE_KEY);
      TOGGLES.forEach(t => document.documentElement.classList.remove(t.id));
    }
    setVisible(localStorage.getItem(STORAGE_KEY) === "1");

    // ── Önceki oturumdan kalan anahtar durumlarını geri yükle ──
    const restored: Record<string, boolean> = {};
    TOGGLES.forEach(t => {
      const on = localStorage.getItem(t.id) === "1";
      restored[t.id] = on;
      document.documentElement.classList.toggle(t.id, on);
    });
    setActive(restored);

    // ── SAFE MODE: ?safe=1 / ?safe=0 manuel override ──────────
    // NOT: Android'de henüz doğrulanmamış bir efekt setini canlıda TÜM
    // kullanıcılara otomatik uygulamak riskli (yanlışsa herkesin deneyimini
    // gereksiz bozar). Bu yüzden otomatik Android algılaması SADECE debug
    // paneli açıkken (?debug=1 ile test session'ı başlatılmışsa) devreye
    // girer — normal ziyaretçiler hiçbir şekilde etkilenmez. Doğrulandıktan
    // sonra istersen bunu kalıcı/herkese-otomatik yapacak şekilde genişletirim.
    if (params.get("safe") === "1") localStorage.setItem(SAFE_OVERRIDE_KEY, "1");
    if (params.get("safe") === "0") localStorage.setItem(SAFE_OVERRIDE_KEY, "0");

    const debugSessionActive = localStorage.getItem(STORAGE_KEY) === "1";
    const override = localStorage.getItem(SAFE_OVERRIDE_KEY);
    const autoCandidate = debugSessionActive && isAndroidUA();
    const shouldEnable = override === "1" ? true : override === "0" ? false : autoCandidate;
    setSafeAuto(override === null && autoCandidate);
    setSafeMode(shouldEnable);
    document.documentElement.classList.toggle(SAFE_CLASS, shouldEnable);
  }, []);

  const toggleSafeMode = () => {
    const next = !safeMode;
    localStorage.setItem(SAFE_OVERRIDE_KEY, next ? "1" : "0");
    document.documentElement.classList.toggle(SAFE_CLASS, next);
    setSafeMode(next);
    setSafeAuto(false);
  };

  const toggle = (id: ToggleId) => {
    const next = !active[id];
    document.documentElement.classList.toggle(id, next);
    if (next) localStorage.setItem(id, "1");
    else localStorage.removeItem(id);
    setActive(prev => ({ ...prev, [id]: next }));
  };

  const resetAll = () => {
    TOGGLES.forEach(t => {
      document.documentElement.classList.remove(t.id);
      localStorage.removeItem(t.id);
    });
    setActive({});
  };

  const closeDebug = () => {
    resetAll();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SAFE_OVERRIDE_KEY);
    document.documentElement.classList.remove(SAFE_CLASS);
    setSafeMode(false);
    setVisible(false);
  };

  return (
    <>
      {/* SAFE MODE rozeti — debug paneli kapalı olsa bile (sadece ?safe=1
          ile açılmış olsa da) her zaman görünür, böylece "siyah ekran mı
          yoksa gerçekten Safe Mode mu" karışıklığı olmaz. */}
      {safeMode && (
        <div
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 999998,
            background: "#0f0",
            color: "#000",
            fontFamily: "monospace",
            fontSize: 11,
            fontWeight: "bold",
            padding: "4px 12px",
            borderRadius: 6,
            letterSpacing: "0.05em",
            pointerEvents: "none",
          }}
        >
          🟢 SAFE MODE AKTİF
        </div>
      )}

      {visible && (
        <div
          style={{
            position: "fixed",
            top: "env(safe-area-inset-top, 0px)",
            left: 8,
            zIndex: 999999,
            width: collapsed ? "auto" : 260,
            background: "#000",
            border: "2px solid #0f0",
            borderRadius: 8,
            padding: collapsed ? "6px 10px" : "10px",
            fontFamily: "monospace",
            fontSize: 11,
            color: "#0f0",
            boxShadow: "0 0 0 1px #000",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: collapsed ? 0 : 8 }}>
            <strong style={{ cursor: "pointer" }} onClick={() => setCollapsed(c => !c)}>
              🐞 ANDROID DEBUG {collapsed ? "▼" : "▲"}
            </strong>
            {!collapsed && (
              <button onClick={closeDebug} style={{ color: "#f55", background: "none", border: "none", fontSize: 14, cursor: "pointer" }}>
                ✕
              </button>
            )}
          </div>

          {!collapsed && (
            <>
              {/* Safe Mode — ayrı ve baskın anahtar */}
              <label
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 4px",
                  marginBottom: 6, cursor: "pointer", background: safeMode ? "rgba(0,255,0,0.12)" : "transparent",
                  border: "1px solid #0f0", borderRadius: 4,
                }}
              >
                <input type="checkbox" checked={safeMode} onChange={toggleSafeMode} style={{ width: 14, height: 14, flexShrink: 0 }} />
                <span style={{ fontWeight: "bold" }}>
                  SAFE MODE {safeAuto ? "(otomatik — Android algılandı)" : safeMode ? "(manuel açık)" : "(manuel kapalı)"}
                </span>
              </label>

              {TOGGLES.map(t => (
                <label key={t.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!active[t.id]}
                    onChange={() => toggle(t.id)}
                    style={{ width: 14, height: 14, flexShrink: 0 }}
                  />
                  <span>{t.label}</span>
                </label>
              ))}
              <button
                onClick={resetAll}
                style={{
                  marginTop: 6, width: "100%", padding: "6px 0",
                  background: "#0f0", color: "#000", border: "none",
                  borderRadius: 4, fontWeight: "bold", cursor: "pointer",
                }}
              >
                SIFIRLA
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
