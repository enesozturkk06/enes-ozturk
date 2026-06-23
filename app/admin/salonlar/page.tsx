"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getGyms, createGym, updateGym, deleteGym } from "@/lib/db";
import type { Gym, GymShareType } from "@/lib/types";
import { Building2, Edit2, Trash2, Plus, X, Check, EyeOff, Eye } from "lucide-react";
import { useToast } from "@/app/components/shared/Toast";

const EMPTY = {
  name: "", shareType: "no_share" as GymShareType,
  fixedLessonFee: "", gymPercentage: "", notes: "",
};

const SHARE_TYPE_OPTIONS: { value: GymShareType; label: string; desc: string }[] = [
  { value: "fixed_per_lesson", label: "Ders Başı Sabit Ücret", desc: "Her tamamlanan ders için sabit tutar salona ödenir (ödeme anında değil, ders tamamlanınca tahakkuk eder)" },
  { value: "percentage",       label: "Yüzdelik Paylaşım",      desc: "Ödeme alınır alınmaz salon yüzdesi anında hesaplanır (50/50, 60/40 vb.)" },
  { value: "no_share",         label: "Salon Payı Yok",         desc: "Tamamen kendi öğrencin — hiçbir pay düşülmez" },
];

function Field({
  label, value, onChange, type = "text", placeholder, required, suffix,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
        {label}{required && <span className="text-crimson ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-carbon border border-white/10 focus:border-crimson/60 text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none transition-colors duration-200"
          style={{ fontFamily: "var(--font-inter)" }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function shareTypeBadge(gym: Gym) {
  if (gym.shareType === "fixed_per_lesson") return { label: `Ders başı ₺${gym.fixedLessonFee ?? 0}`, color: "#A855F7", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" };
  if (gym.shareType === "percentage")       return { label: `Salon %${gym.gymPercentage ?? 0}`, color: "#D946EF", bg: "rgba(217,70,239,0.1)", border: "rgba(217,70,239,0.25)" };
  return { label: "Salon payı yok", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" };
}

export default function SalonlarPage() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [panel, setPanel] = useState<"none" | "add" | "edit">("none");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState(EMPTY.name);
  const [shareType, setShareType] = useState<GymShareType>(EMPTY.shareType);
  const [fixedLessonFee, setFixedLessonFee] = useState(EMPTY.fixedLessonFee);
  const [gymPercentage, setGymPercentage] = useState(EMPTY.gymPercentage);
  const [notes, setNotes] = useState(EMPTY.notes);

  const reload = () => getGyms().then(setGyms);
  useEffect(() => { reload(); }, []);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };

  const resetForm = () => {
    setName(EMPTY.name); setShareType(EMPTY.shareType);
    setFixedLessonFee(EMPTY.fixedLessonFee); setGymPercentage(EMPTY.gymPercentage); setNotes(EMPTY.notes);
  };

  const openAdd = () => { resetForm(); setPanel("add"); };

  const openEdit = (gym: Gym) => {
    setName(gym.name); setShareType(gym.shareType);
    setFixedLessonFee(gym.fixedLessonFee != null ? String(gym.fixedLessonFee) : "");
    setGymPercentage(gym.gymPercentage != null ? String(gym.gymPercentage) : "");
    setNotes(gym.notes ?? "");
    setEditId(gym.id); setPanel("edit");
  };

  const buildPayload = () => ({
    name: name.trim(),
    shareType,
    fixedLessonFee: shareType === "fixed_per_lesson" ? Number(fixedLessonFee) || 0 : undefined,
    gymPercentage:  shareType === "percentage" ? Number(gymPercentage) || 0 : undefined,
    trainerPercentage: shareType === "percentage" ? 100 - (Number(gymPercentage) || 0) : undefined,
    notes: notes.trim() || undefined,
    isActive: true,
  });

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await createGym(buildPayload());
      await reload();
      setPanel("none");
      flash();
    } catch (err) {
      toast("Salon eklenemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const handleEdit = async () => {
    if (!editId) return;
    try {
      await updateGym(editId, buildPayload());
      await reload();
      setPanel("none");
      setEditId(null);
      flash();
    } catch (err) {
      toast("Güncellenemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteGym(deleteId);
      await reload();
      setDeleteId(null);
      flash();
    } catch (err) {
      toast("Pasifleştirilemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const toggleActive = async (gym: Gym) => {
    try {
      await updateGym(gym.id, { isActive: !gym.isActive });
      await reload();
      flash();
    } catch (err) {
      toast("Güncellenemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const panelOpen = panel !== "none";
  const canSubmit = name.trim() !== "" &&
    (shareType !== "fixed_per_lesson" || Number(fixedLessonFee) > 0) &&
    (shareType !== "percentage" || (Number(gymPercentage) > 0 && Number(gymPercentage) <= 100));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Admin</span>
          </div>
          <h1 className="text-3xl font-display text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>
            SALONLAR
          </h1>
          <p className="text-white/35 text-sm mt-0.5" style={{ fontFamily: "var(--font-inter)" }}>
            Gelir paylaşımlı çalıştığın salonlar — öğrencileri buradan bir salona atarsın
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-green-400 text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                <Check size={13} /> Kaydedildi
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all duration-200 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            <Plus size={14} /> Yeni Salon
          </button>
        </div>
      </div>

      {/* Ekleme/düzenleme paneli */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }} className="mb-6 bg-carbon border border-crimson/25 relative"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                  {panel === "add" ? "YENİ SALON EKLE" : "SALONU DÜZENLE"}
                </h2>
                <button onClick={() => { setPanel("none"); setEditId(null); }} className="text-white/25 hover:text-white transition-colors p-1">
                  <X size={18} />
                </button>
              </div>

              <div className="mb-4">
                <Field label="Salon Adı" value={name} onChange={setName} placeholder="örn: Elit Spor, Demirhan..." required />
              </div>

              {/* Anlaşma tipi seçimi */}
              <div className="mb-4">
                <label className="block text-xs text-white/40 tracking-widest uppercase mb-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Anlaşma Tipi<span className="text-crimson ml-0.5">*</span>
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {SHARE_TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setShareType(opt.value)}
                      className={`text-left p-3 border transition-all duration-200 ${shareType === opt.value ? "border-crimson bg-crimson/8" : "border-white/10 hover:border-white/20"}`}
                    >
                      <div className="text-sm text-white font-semibold mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{opt.label}</div>
                      <div className="text-xs text-white/35" style={{ fontFamily: "var(--font-inter)" }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Koşullu alanlar */}
              {shareType === "fixed_per_lesson" && (
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <Field label="Ders Başı Ücret" value={fixedLessonFee} onChange={setFixedLessonFee} type="number" placeholder="300" suffix="₺" required />
                </div>
              )}
              {shareType === "percentage" && (
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <Field label="Salon Yüzdesi" value={gymPercentage} onChange={setGymPercentage} type="number" placeholder="40" suffix="%" required />
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      Senin Yüzden
                    </label>
                    <div className="bg-steel/30 border border-white/10 text-green-400 px-3 py-2.5 text-sm" style={{ fontFamily: "var(--font-inter)" }}>
                      %{Math.max(0, 100 - (Number(gymPercentage) || 0))}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-5">
                <Field label="Not (isteğe bağlı)" value={notes} onChange={setNotes} placeholder="Anlaşma detayları..." />
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setPanel("none"); setEditId(null); }}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white hover:border-white/20 text-xs font-semibold tracking-widest uppercase py-3 transition-all duration-200"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Vazgeç
                </button>
                <button onClick={panel === "add" ? handleAdd : handleEdit} disabled={!canSubmit}
                  className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all duration-200 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {panel === "add" ? "Salonu Ekle" : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Salon listesi */}
      {gyms.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10">
          <Building2 size={40} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm mb-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Henüz salon yok</p>
          <button onClick={openAdd} className="text-xs text-crimson/60 hover:text-crimson tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            + İlk salonu ekle
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {gyms.map((gym, i) => {
              const badge = shareTypeBadge(gym);
              return (
                <motion.div
                  key={gym.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  className={`relative bg-carbon border flex flex-col transition-all duration-200 ${
                    editId === gym.id && panel === "edit" ? "border-crimson/50 shadow-[0_0_20px_rgba(220,38,38,0.1)]" : "border-white/6 hover:border-white/12"
                  } ${!gym.isActive ? "opacity-45" : ""}`}
                >
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-xl font-display text-white tracking-wider leading-tight" style={{ fontFamily: "var(--font-bebas)" }}>
                        {gym.name}
                      </h3>
                      {!gym.isActive && (
                        <span className="text-xs px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/25 flex-shrink-0" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                          Pasif
                        </span>
                      )}
                    </div>
                    <span className="inline-block text-xs px-2 py-1" style={{ background: badge.bg, border: `1px solid ${badge.border}`, color: badge.color, fontFamily: "var(--font-barlow-condensed)" }}>
                      {badge.label}
                    </span>
                    {gym.notes && (
                      <p className="text-xs text-white/35 leading-relaxed mt-3" style={{ fontFamily: "var(--font-inter)" }}>{gym.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 px-4 py-2.5 border-t border-white/5 bg-steel/20">
                    <button onClick={() => toggleActive(gym)} title={gym.isActive ? "Pasifleştir" : "Aktifleştir"}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-white/20 hover:text-white/60 transition-colors rounded" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      {gym.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    <div className="flex-1" />
                    <button onClick={() => openEdit(gym)}
                      className="flex items-center gap-1 px-3 py-1 text-xs text-white/30 hover:text-gold border border-transparent hover:border-gold/20 transition-all rounded" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      <Edit2 size={12} /> Düzenle
                    </button>
                    <button onClick={() => setDeleteId(gym.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-white/20 hover:text-crimson transition-colors rounded" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Pasifleştirme onayı */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-carbon border border-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-crimson/10 border border-crimson/20 flex items-center justify-center">
                  <Trash2 size={18} className="text-crimson" />
                </div>
                <div>
                  <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>SALONU PASİFLEŞTİR</h3>
                  <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{gyms.find(g => g.id === deleteId)?.name}</p>
                </div>
              </div>
              <p className="text-sm text-white/50 mb-5" style={{ fontFamily: "var(--font-inter)" }}>
                Salon listede pasif görünecek, yeni öğrenci atanamaz. Geçmiş gelir hareketleri ve raporlar bozulmaz.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Vazgeç
                </button>
                <button onClick={handleDelete} className="flex-1 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Evet, Pasifleştir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
