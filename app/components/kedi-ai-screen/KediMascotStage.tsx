"use client";

/**
 * KediMascotStage.tsx — Kedi AI'nin merkezi karakter sahnesi
 * (app/ogrenci/kedi-ai/page.tsx içinde kullanılır).
 *
 * VARLIK DURUMU: KEDI_MASCOT_PACK.model henüz PENDING_ARTIST_DELIVERY
 * (bkz. lib/avatarPack.ts) — bu yüzden `isCharacterPackReady` false döndüğü
 * sürece burada GERÇEK 3D motor (LazyAvatarEngine3D) HİÇ MOUNT EDİLMEZ
 * (mount edilseydi useGLTF olmayan bir URL'e 404 atıp Suspense sınırının
 * dışında bir hataya yol açardı). Onun yerine mevcut, zaten test edilmiş 2D
 * KediAvatar maskotu (app/components/shared/KediAvatar.tsx) büyütülerek
 * "yaşayan karakter" hissi verilir — 2D'yi 3D gibi GÖSTERMEYE ÇALIŞMAZ
 * (ör. yüklenen PNG doku olarak yapıştırılmaz), dürüstçe bir "3D karakter
 * yakında" premium bekleme sahnesidir.
 *
 * Gerçek GLB geldiğinde (bkz. lib/avatarPack.ts KEDI_MASCOT_PACK yorumu):
 * SADECE metadata.artist PENDING'den çıkar, bu component otomatik olarak
 * LazyAvatarEngine3D dalına geçer — burada satır değişikliği gerekmez.
 *
 * Performans: yeni WebGL/Canvas/particle-engine/rAF YOK. Tüm glow/pulse
 * halkaları CSS transform+opacity (framer-motion), mevcut animate-float-*
 * keyframe'leri reuse edilir.
 */
import { motion, AnimatePresence } from "framer-motion";
import KediAvatar from "@/app/components/shared/KediAvatar";
import LazyAvatarEngine3D from "@/app/components/shared/LazyAvatarEngine3D";
import { KEDI_MASCOT_PACK, isCharacterPackReady } from "@/lib/avatarPack";
import type { KediMascotState } from "@/lib/kediMascotState";

const ACTIVITY_TO_2D_STATE = {
  idle: "idle", listening: "listening", thinking: "thinking", speaking: "speaking",
} as const;

const ACTION_RING_COLOR: Record<"success" | "levelUp", string> = {
  success: "rgba(245,158,11,0.55)",
  levelUp: "rgba(56,189,248,0.6)",
};

export default function KediMascotStage({ state, caption }: { state: KediMascotState; caption?: string | null }) {
  const ready = isCharacterPackReady(KEDI_MASCOT_PACK);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full" style={{ minHeight: 0 }}>
      {/* Arka plan halka/holografik dekor — sadece CSS, düşük opacity */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          className="rounded-full"
          style={{
            width: "min(62vw, 340px)", height: "min(62vw, 340px)",
            border: "1px solid rgba(56,189,248,0.14)",
            boxShadow: "0 0 60px -10px rgba(56,189,248,0.12), inset 0 0 60px -20px rgba(245,158,11,0.10)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{ width: "min(48vw, 260px)", height: "min(48vw, 260px)", border: "1px dashed rgba(245,158,11,0.12)" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Karakter alanı */}
      <div className="relative z-10 flex items-center justify-center" style={{ width: "min(56vw, 300px)", height: "min(56vw, 300px)" }}>
        {ready ? (
          <LazyAvatarEngine3D
            pack={KEDI_MASCOT_PACK}
            activity={state.activity}
            action={state.action}
            lockCamera
            width="100%"
            height="100%"
          />
        ) : (
          <div className="relative flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <KediAvatar size={168} state={ACTIVITY_TO_2D_STATE[state.activity]} glow />
              <AnimatePresence>
                {state.action && (
                  <motion.div
                    key={state.action}
                    aria-hidden
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ boxShadow: `0 0 0 2px ${ACTION_RING_COLOR[state.action]}` }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: [0.9, 0], scale: [0.9, 1.9] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>
            </div>
            <div className="text-center px-4">
              <div className="text-[10px] tracking-[0.3em] uppercase" style={{ color: "rgba(56,189,248,0.55)", fontFamily: "var(--font-label)" }}>
                3D Karakter Yakında
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-label)" }}>
                Panter maskotu üretim aşamasında
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Konuşma balonu / son cevap alt yazısı */}
      <AnimatePresence mode="wait">
        {caption && (
          <motion.div
            key={caption}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="relative z-10 mt-3 max-w-[90%] text-center px-4 py-2 rounded-xl kedi-msg-ai-glass"
            style={{ fontFamily: "var(--font-label)", color: "rgba(255,255,255,0.85)", fontSize: 13 }}
          >
            {caption}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
