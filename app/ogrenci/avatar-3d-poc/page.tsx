"use client";

/**
 * /ogrenci/avatar-3d-poc — Kedi Life v2 Proof of Concept.
 *
 * GEÇİCİ doğrulama sayfası. Amaç: React Three Fiber + GLB + Draco + animasyon
 * crossfade + kamera + ışık borusunun GERÇEKTEN performanslı çalıştığını
 * kanıtlamak (kullanıcının açık isteği — bkz. plan). Yüz/kas/kumaş/Dijital
 * Salon 3D ortamı bu POC'ta YOK — bkz. plan "Kapsam dışı" bölümü.
 *
 * Karakter TAMAMEN GEÇİCİ. Bu sayfa `getActiveCharacterPack()` üzerinden
 * okur — belirli bir pack'i (MIXAMO_DEV_PACK vb.) DOĞRUDAN import ETMEZ.
 * Yeni bir Character Pack aktif edildiğinde (lib/avatarPack.ts'teki
 * ACTIVE_CHARACTER_PACK_ID tek satırı değiştirilerek) bu sayfa HİÇ
 * değişmeden yeni karakteri gösterir.
 */
import { useEffect, useRef, useState } from "react";
import { PageHeader, Card } from "@/app/components/ui";
import LazyAvatarEngine3D from "@/app/components/shared/LazyAvatarEngine3D";
import { getActiveCharacterPack } from "@/lib/avatarPack";
import type { AvatarActivity, AvatarAction, AvatarExpression } from "@/lib/types";

// Sayfa kasıtlı olarak pack-agnostic: TÜM AvatarActivity/AvatarAction/
// AvatarExpression değerleri listelenir, aktif pack'in desteklemediği bir
// tanesi Engine'de sessizce atlanır (crash yok) — bu davranışın kendisi de
// doğrulanmış oluyor.
const ACTIVITY_OPTS: { id: AvatarActivity; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "guard", label: "Guard" },
  { id: "shadowbox", label: "Shadow Box" },
  { id: "jumprope", label: "Jump Rope" },
  { id: "bagwork", label: "Bag Work" },
  { id: "stretch", label: "Stretch" },
  { id: "drink", label: "Drink Water" },
  { id: "phone", label: "Check Phone" },
];
const ACTION_OPTS: { id: AvatarAction; label: string }[] = [
  { id: "jab", label: "Jab" },
  { id: "cross", label: "Cross" },
  { id: "hook", label: "Hook" },
  { id: "uppercut", label: "Uppercut" },
  { id: "lowKick", label: "Low Kick" },
  { id: "highKick", label: "High Kick" },
  { id: "frontKick", label: "Front Kick" },
  { id: "knee", label: "Knee" },
  { id: "slip", label: "Slip" },
  { id: "duck", label: "Duck" },
  { id: "victory", label: "Victory" },
  { id: "defeat", label: "Defeat" },
  { id: "celebration", label: "Celebration" },
];
const EXPRESSION_OPTS: { id: AvatarExpression; label: string }[] = [
  { id: "greet", label: "Greet" },
  { id: "happy", label: "Happy" },
  { id: "proud", label: "Proud" },
  { id: "sad", label: "Sad" },
  { id: "focus", label: "Focus" },
  { id: "tired", label: "Tired" },
  { id: "thinking", label: "Thinking" },
  { id: "talking", label: "Talking" },
];

function FpsOverlay() {
  const [fps, setFps] = useState(0);
  const framesRef = useRef<number[]>([]);

  useEffect(() => {
    let rafId: number;
    const loop = (t: number) => {
      const frames = framesRef.current;
      frames.push(t);
      while (frames.length > 0 && t - frames[0] > 1000) frames.shift();
      if (frames.length >= 2) setFps(Math.round((frames.length - 1) / ((t - frames[0]) / 1000)));
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg glass text-xs font-mono"
      style={{ color: fps >= 50 ? "#4ADE80" : fps >= 30 ? "#FBBF24" : "#EF4444" }}>
      {fps} FPS
    </div>
  );
}

export default function Avatar3DPocPage() {
  const [activity, setActivity] = useState<AvatarActivity>("idle");
  const [action, setAction] = useState<AvatarAction | null>(null);
  const [expression, setExpression] = useState<AvatarExpression | null>(null);
  const [testCosmetics, setTestCosmetics] = useState(false);
  const pack = getActiveCharacterPack();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28">
      <PageHeader title="Kedi Life v2 — 3D POC" subtitle="Geçici karakter, gerçek performans testi" accent="Geliştirme" />

      <Card className="p-4">
        <p className="text-xs text-white/40 mb-3" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          Aktif paket: <span className="text-white/70">{pack.label}</span> ({pack.stage}) — bu karakter TAMAMEN GEÇİCİ. Amaç: render/animasyon/kamera/ışık borusunun performansını kanıtlamak.
          {(action || expression) && (
            <span className="ml-2 text-gold">— oynuyor: {action ?? expression}</span>
          )}
        </p>
        <div className="relative rounded-2xl overflow-hidden" style={{ background: "#0a0a0c" }}>
          <LazyAvatarEngine3D
            pack={pack}
            activity={activity}
            action={action}
            onActionEnd={() => setAction(null)}
            expression={expression}
            onExpressionEnd={() => setExpression(null)}
            testCosmetics={testCosmetics}
            height={420}
          />
          <FpsOverlay />
        </div>

        <p className="text-[10px] text-white/30 mt-4 mb-1 uppercase tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Cosmetic System V1 — attachment mekanizması testi (primitive placeholder mesh&apos;ler)</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => setTestCosmetics(v => !v)}
            className={`px-3 py-2 rounded-lg text-xs transition-all ${
              testCosmetics ? "ring-2 ring-gold text-white" : "ring-1 ring-white/10 text-white/60 hover:ring-white/25"
            }`}
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            {testCosmetics ? "Test Kozmetikleri: AÇIK" : "Test Kozmetikleri: KAPALI"} (gloves/shoes/helmet)
          </button>
        </div>

        <p className="text-[10px] text-white/30 mt-4 mb-1 uppercase tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Activity (döngü)</p>
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_OPTS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setActivity(opt.id)}
              className={`px-3 py-2 rounded-lg text-xs transition-all ${
                activity === opt.id ? "ring-2 ring-gold text-white" : "ring-1 ring-white/10 text-white/60 hover:ring-white/25"
              }`}
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-white/30 mt-4 mb-1 uppercase tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Action (tek seferlik — bitince activity&apos;ye döner)</p>
        <div className="flex flex-wrap gap-2">
          {ACTION_OPTS.map(opt => (
            <button
              key={opt.id}
              disabled={!!action}
              onClick={() => setAction(opt.id)}
              className={`px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-40 ${
                action === opt.id ? "ring-2 ring-crimson text-white" : "ring-1 ring-white/10 text-white/60 hover:ring-white/25"
              }`}
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-white/30 mt-4 mb-1 uppercase tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Expression (tek seferlik — bitince activity&apos;ye döner)</p>
        <div className="flex flex-wrap gap-2">
          {EXPRESSION_OPTS.map(opt => (
            <button
              key={opt.id}
              disabled={!!expression}
              onClick={() => setExpression(opt.id)}
              className={`px-3 py-2 rounded-lg text-xs transition-all disabled:opacity-40 ${
                expression === opt.id ? "ring-2 ring-purple-400 text-white" : "ring-1 ring-white/10 text-white/60 hover:ring-white/25"
              }`}
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
