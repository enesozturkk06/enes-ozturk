"use client";
import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import {
  subscribeToPush, getPushPermissionState, isPushSupported, isIOSStandaloneRequired,
} from "@/lib/push";

interface Props {
  role: "student" | "admin";
  studentId?: string;
  className?: string;
}

type ButtonState = "idle" | "loading" | "granted" | "denied" | "unsupported" | "ios";

export default function PushNotificationButton({ role, studentId, className }: Props) {
  const [state, setState] = useState<ButtonState>("idle");
  const [msg, setMsg]      = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (isIOSStandaloneRequired()) { setState("ios"); return; }
      if (!isPushSupported())        { setState("unsupported"); return; }
      const perm = await getPushPermissionState();
      if (perm === "granted") setState("granted");
      else if (perm === "denied") setState("denied");
      else setState("idle");
    })();
  }, []);

  const handleClick = async () => {
    if (state === "ios") {
      setMsg("Bildirim için uygulamayı ana ekrana ekleyin (Paylaş → Ana Ekrana Ekle), sonra tekrar açıp dene.");
      return;
    }
    if (state === "unsupported") {
      setMsg("Bu tarayıcı push bildirimlerini desteklemiyor.");
      return;
    }
    if (state === "denied") {
      setMsg("Bildirim izni tarayıcı ayarlarından engellenmiş. Site ayarlarından izni açman gerekiyor.");
      return;
    }
    setState("loading");
    const res = await subscribeToPush({ role, studentId });
    if (res.ok) {
      setState("granted");
      setMsg("Bildirimler açıldı! 🎉");
    } else {
      setState(res.reason === "denied" ? "denied" : "idle");
      setMsg(res.message);
    }
    setTimeout(() => setMsg(null), 5000);
  };

  if (state === "granted") {
    return (
      <div className={`inline-flex items-center gap-1.5 text-xs ${className ?? ""}`}
        style={{ color: "#4ADE80", fontFamily: "var(--font-barlow-condensed)" }}>
        <BellRing size={14} /> Bildirimler açık
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="flex items-center gap-2 text-xs px-3 py-2 transition-all duration-200"
        style={{
          background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.3)",
          color: "#C4B5FD",
          borderRadius: 8,
          fontFamily: "var(--font-barlow-condensed)",
        }}
      >
        {state === "loading" ? <BellRing size={14} className="animate-pulse" /> : <Bell size={14} />}
        Bildirimleri Aç
      </button>
      {msg && (
        <p className="text-[11px] mt-1.5 max-w-xs" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-barlow-condensed)" }}>
          {msg}
        </p>
      )}
    </div>
  );
}
