"use client";

/**
 * KediIntroModal — Kedi AI Ultra'yı tanıtan TEK SEFERLİK karşılama ekranı.
 * Hesap bazlı (cihaz değil): öğrenci tarafında students.kedi_intro_seen
 * kolonunda (rules_accepted ile AYNI desen), admin tarafında (ayrı bir
 * admin-kullanıcı tablosu olmadığı için) mevcut app_settings tablosundaki
 * 'kedi_intro_seen_admin' anahtarında saklanır. "Başlayalım" butonuna
 * basılınca kaydedilir ve bir daha ASLA gösterilmez.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/app/providers";
import { updateStudent, getAppSetting, setAppSetting } from "@/lib/db";
import {
  Sparkles, Brain, Bell, Utensils, LayoutDashboard,
  Camera, Video, Mic, Cat,
} from "lucide-react";

const FEATURES = [
  { icon: Sparkles, title: "Kedi AI Ultra", desc: "Gerçek yapay zeka ile konuşan, karakterli ve duygusal bir antrenör asistanı." },
  { icon: Brain, title: "Hafıza Sistemi", desc: "Kedi seninle yaptığı konuşmaları hatırlar — hedeflerini, tercihlerini, geçmişini unutmaz." },
  { icon: Bell, title: "Akıllı Günlük Özet", desc: "Giriş yaptığında önemli fırsat ve riskleri kendiliğinden, gerektiğinde sana söyler." },
  { icon: Utensils, title: "Beslenme ve Antrenman AI", desc: "Sana özel, spora göre hazırlanmış haftalık antrenman ve beslenme programı." },
  { icon: LayoutDashboard, title: "Koç Merkezi", desc: "Antrenörün, yapay zeka ile senin için program oluşturup onayladığı özel panel." },
  { icon: Camera, title: "Vision Fotoğraf Analizi", desc: "Duruş fotoğrafını yükle, gard ve tekniğini yapay zeka değerlendirsin." },
  { icon: Video, title: "Vision Video Analizi", desc: "Antrenman videonu kare kare inceleyip tekniklerini puanlar." },
  { icon: Mic, title: "Sesli Asistan", desc: "Kedi ile sesli konuş, cevabını da sesli dinle." },
  { icon: Cat, title: "Premium Avatar", desc: "Nefes alan, göz kırpan, seninle birlikte yaşayan bir kedi karakteri." },
] as const;

export default function KediIntroModal({ actorType }: { actorType: "student" | "admin" }) {
  const { student, setStudent, isAdmin } = useAuth();
  // Admin tarafı: app_settings'ten asenkron okunması gerekiyor (reaktif bir
  // context değeri yok), bu yüzden yerel state + effect GEREKLİ — ama setState
  // hep async .then() callback'i içinde çağrılıyor (React'ın önerdiği desen).
  const [adminReady, setAdminReady] = useState(false);
  const [adminShow, setAdminShow] = useState(false);
  const [saving, setSaving] = useState(false);
  // updateStudent başarısız olursa (ağ hatası vb.) kullanıcıyı ekranda
  // kilitli tutmamak için yerel bir "zorla kapat" bayrağı — bir sonraki
  // girişte kediIntroSeen hâlâ false olduğu için tekrar denenir.
  const [dismissedLocally, setDismissedLocally] = useState(false);

  useEffect(() => {
    if (actorType !== "admin" || !isAdmin) return;
    let cancelled = false;
    getAppSetting("kedi_intro_seen_admin").then(v => {
      if (cancelled) return;
      setAdminShow(v !== "true");
      setAdminReady(true);
    });
    return () => { cancelled = true; };
  }, [actorType, isAdmin]);

  // Öğrenci tarafı: student objesi zaten reaktif (useAuth context'i) —
  // ayrı bir effect/state'e gerek yok, doğrudan türetiliyor. "Başlayalım"
  // sonrası setStudent({...kediIntroSeen:true}) çağrıldığında bu otomatik
  // olarak false'a düşer, ekran kendiliğinden kapanır.
  const showStudent = actorType === "student" && !!student && !student.kediIntroSeen && !dismissedLocally;
  const show = actorType === "student" ? showStudent : (adminReady && adminShow);

  const handleStart = async () => {
    setSaving(true);
    try {
      if (actorType === "student" && student) {
        const updated = await updateStudent(student.id, { kediIntroSeen: true });
        setStudent(updated);
      } else {
        await setAppSetting("kedi_intro_seen_admin", "true");
        setAdminShow(false);
      }
    } catch {
      // Kaydetme başarısız olsa bile kullanıcıyı ekranda kilitli tutma —
      // bir sonraki girişte tekrar denenir, en kötü ihtimalle bir kez daha görünür.
      if (actorType === "admin") setAdminShow(false);
      else setDismissedLocally(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          style={{ background: "rgba(5,5,8,0.88)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl my-8 rounded-3xl overflow-hidden"
            style={{
              background: "linear-gradient(165deg, #0B0B0F 0%, #131114 55%, #0B0B0F 100%)",
              border: "1px solid rgba(245,158,11,0.18)",
              boxShadow: "0 0 0 1px rgba(220,38,38,0.08), 0 30px 80px rgba(0,0,0,0.6), 0 0 100px rgba(245,158,11,0.06)",
            }}
          >
            {/* Sinematik glow patlaması */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.5, 0.25], scale: [0.5, 1.4, 1.2] }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(245,158,11,0.35), rgba(220,38,38,0.12) 45%, transparent 70%)" }}
            />

            <div className="relative p-6 sm:p-10 text-center">
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.85 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-5xl sm:text-6xl mb-3"
              >
                🐈
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
                className="text-2xl sm:text-4xl tracking-wide mb-2"
                style={{
                  fontFamily: "var(--font-bebas)",
                  backgroundImage: "linear-gradient(120deg, #FCD34D, #F59E0B, #DC2626)",
                  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                }}
              >
                Kedi AI&apos;ye Hoş Geldiniz
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="text-sm sm:text-base text-white/50 mb-8 max-w-md mx-auto"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                Enes Öztürk uygulaması artık yeni nesil <span className="text-gold-bright">Kedi AI Ultra</span> ile güçlendirildi.
              </motion.p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-9 text-left">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.05, duration: 0.4 }}
                    className="glass rounded-xl p-3.5"
                  >
                    <f.icon size={18} className="text-gold-bright mb-2" />
                    <p className="text-white text-xs font-semibold mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{f.title}</p>
                    <p className="text-white/40 text-[11px] leading-snug">{f.desc}</p>
                  </motion.div>
                ))}
              </div>

              <motion.button
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + FEATURES.length * 0.05 + 0.1, duration: 0.4 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStart}
                disabled={saving}
                className="w-full sm:w-auto sm:px-16 py-4 rounded-xl text-obsidian font-bold text-base tracking-[0.15em] uppercase disabled:opacity-60"
                style={{
                  fontFamily: "var(--font-label)",
                  backgroundImage: "linear-gradient(120deg, #FCD34D, #F59E0B, #DC2626)",
                  boxShadow: "0 8px 30px rgba(245,158,11,0.35)",
                }}
              >
                {saving ? "Kaydediliyor…" : "Başlayalım"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
