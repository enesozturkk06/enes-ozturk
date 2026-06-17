/**
 * lib/push.ts — Web Push (PWA) istemci yardımcıları
 * Service worker kaydı, izin isteme, abonelik oluşturma/silme.
 */

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iOS Safari'de push sadece "Ana Ekrana Ekle" ile PWA modunda çalışır */
export function isIOSStandaloneRequired(): boolean {
  if (typeof window === "undefined") return false;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIOS && !isStandalone;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("[push] Service worker kayıt hatası:", err);
    return null;
  }
}

export type PushSubscribeResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "ios-standalone" | "denied" | "error"; message: string };

export async function subscribeToPush(opts: {
  role: "student" | "admin";
  studentId?: string;
}): Promise<PushSubscribeResult> {
  if (isIOSStandaloneRequired()) {
    return {
      ok: false,
      reason: "ios-standalone",
      message: "Bildirim için uygulamayı ana ekrana ekleyin (Paylaş → Ana Ekrana Ekle), sonra tekrar açıp dene.",
    };
  }
  if (!isPushSupported()) {
    return { ok: false, reason: "unsupported", message: "Bu tarayıcı push bildirimlerini desteklemiyor." };
  }

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) {
    return { ok: false, reason: "error", message: "Sunucu yapılandırması eksik (VAPID anahtarı yok)." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "denied", message: "Bildirim izni verilmedi." };
  }

  const reg = await registerServiceWorker();
  if (!reg) return { ok: false, reason: "error", message: "Service worker kaydedilemedi." };

  try {
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
    }

    const json = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: opts.role,
        studentId: opts.studentId ?? null,
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    return { ok: true };
  } catch (err) {
    console.error("[push] subscribe hatası:", err);
    return { ok: false, reason: "error", message: "Abonelik kaydedilemedi, tekrar dener misin?" };
  }
}

export async function getPushPermissionState(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
  } catch (err) {
    console.error("[push] unsubscribe hatası:", err);
  }
}
