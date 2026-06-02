"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPackages, savePackages, type LessonPackage } from "@/lib/packages";
import { Star, Eye, EyeOff, Edit2, Trash2, Plus, X, Check, Package } from "lucide-react";

/* ── Boş form ─────────────────────────────────────────────────────── */
const EMPTY: Omit<LessonPackage, "id"> = {
  name: "",
  lessonCount: 8,
  price: 0,
  durationDays: 45,
  description: "",
  isActive: true,
  highlight: false,
};

/* ── Input bileşeni (standalone, closure yok) ────────────────────── */
function Field({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
        {label}{required && <span className="text-crimson ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-carbon border border-white/10 focus:border-crimson/60 text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none transition-colors duration-200"
        style={{ fontFamily: "var(--font-inter)" }}
      />
    </div>
  );
}

/* ── Ana sayfa ───────────────────────────────────────────────────── */
export default function PaketlerPage() {
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const [panel, setPanel] = useState<"none" | "add" | "edit">("none");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  /* Form alanları — bağımsız state'ler, React re-render'da bozulmuyor */
  const [name, setName] = useState("");
  const [lessonCount, setLessonCount] = useState("8");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("45");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    setPackages(getPackages());
  }, []);

  /* ── Kaydet ───────────────────────────────────────────────────── */
  const persist = (pkgs: LessonPackage[]) => {
    setPackages(pkgs);
    savePackages(pkgs);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  /* ── Form temizle ─────────────────────────────────────────────── */
  const resetForm = () => {
    setName(""); setLessonCount("8"); setPrice(""); setDurationDays("45");
    setDescription(""); setIsActive(true); setHighlight(false);
  };

  /* ── Yeni paket ekle formu aç ─────────────────────────────────── */
  const openAdd = () => { resetForm(); setPanel("add"); };

  /* ── Düzenleme formu aç ───────────────────────────────────────── */
  const openEdit = (pkg: LessonPackage) => {
    setName(pkg.name);
    setLessonCount(String(pkg.lessonCount));
    setPrice(String(pkg.price));
    setDurationDays(String(pkg.durationDays));
    setDescription(pkg.description);
    setIsActive(pkg.isActive);
    setHighlight(!!pkg.highlight);
    setEditId(pkg.id);
    setPanel("edit");
  };

  /* ── Ekle ────────────────────────────────────────────────────── */
  const handleAdd = () => {
    if (!name.trim() || !price) return;
    const newPkg: LessonPackage = {
      id: `pkg-${Date.now()}`,
      name: name.trim(),
      lessonCount: Number(lessonCount) || 8,
      price: Number(price),
      durationDays: Number(durationDays) || 45,
      description: description.trim(),
      isActive,
      highlight,
    };
    persist([...packages, newPkg]);
    setPanel("none");
  };

  /* ── Güncelle ────────────────────────────────────────────────── */
  const handleEdit = () => {
    if (!editId) return;
    persist(packages.map(p =>
      p.id === editId
        ? {
            ...p,
            name: name.trim(),
            lessonCount: Number(lessonCount) || 8,
            price: Number(price),
            durationDays: Number(durationDays) || 45,
            description: description.trim(),
            isActive,
            highlight,
          }
        : p
    ));
    setPanel("none");
    setEditId(null);
  };

  /* ── Sil ─────────────────────────────────────────────────────── */
  const handleDelete = () => {
    if (!deleteId) return;
    persist(packages.filter(p => p.id !== deleteId));
    setDeleteId(null);
  };

  /* ── Aktif aç/kapat ──────────────────────────────────────────── */
  const toggleActive = (id: string) =>
    persist(packages.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));

  /* ── Öne çıkar ───────────────────────────────────────────────── */
  const toggleHighlight = (id: string) =>
    persist(packages.map(p => ({ ...p, highlight: p.id === id ? !p.highlight : false })));

  const panelOpen = panel !== "none";
  const canSubmit = name.trim() !== "" && Number(price) > 0;

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Admin</span>
          </div>
          <h1 className="text-3xl font-display text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>
            DERS PAKETLERİ
          </h1>
          <p className="text-white/35 text-sm mt-0.5" style={{ fontFamily: "var(--font-inter)" }}>
            {packages.length} paket — sitede aktif olanlar görünür
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Kaydedildi göstergesi */}
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-green-400 text-xs"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                <Check size={13} />
                Kaydedildi
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all duration-200 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            <Plus size={14} />
            Yeni Paket
          </button>
        </div>
      </div>

      {/* ── Paket ekleme / düzenleme formu (inline panel) ─────────── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="mb-6 bg-carbon border border-crimson/25 relative"
          >
            {/* Üst kırmızı çizgi */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />

            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                  {panel === "add" ? "YENİ PAKET EKLE" : "PAKETİ DÜZENLE"}
                </h2>
                <button
                  onClick={() => { setPanel("none"); setEditId(null); }}
                  className="text-white/25 hover:text-white transition-colors p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form alanları */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="sm:col-span-2">
                  <Field
                    label="Paket Adı"
                    value={name}
                    onChange={setName}
                    placeholder="örn: Başlangıç, 8'li Paket..."
                    required
                  />
                </div>
                <Field
                  label="Ders Sayısı"
                  value={lessonCount}
                  onChange={setLessonCount}
                  type="number"
                  placeholder="8"
                  required
                />
                <Field
                  label="Fiyat (₺)"
                  value={price}
                  onChange={setPrice}
                  type="number"
                  placeholder="1490"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <Field
                  label="Geçerlilik Süresi (gün)"
                  value={durationDays}
                  onChange={setDurationDays}
                  type="number"
                  placeholder="45"
                />
                <Field
                  label="Açıklama (isteğe bağlı)"
                  value={description}
                  onChange={setDescription}
                  placeholder="Kısa paket açıklaması..."
                />
              </div>

              {/* Seçenekler */}
              <div className="flex flex-wrap items-center gap-6 mb-5 p-3 bg-steel/30 border border-white/5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setIsActive(v => !v)}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0 ${isActive ? "bg-crimson" : "bg-iron"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isActive ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <span className="text-xs text-white/50" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Sitede Göster {isActive ? <span className="text-green-400">(Aktif)</span> : <span className="text-white/25">(Pasif)</span>}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setHighlight(v => !v)}
                    className={`w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0 ${highlight ? "bg-gold" : "bg-iron"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${highlight ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <span className="text-xs text-white/50" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Öne Çıkar {highlight ? <span className="text-gold">(Popüler etiketi)</span> : ""}
                  </span>
                </label>
              </div>

              {/* Butonlar */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setPanel("none"); setEditId(null); }}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white hover:border-white/20 text-xs font-semibold tracking-widest uppercase py-3 transition-all duration-200"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  Vazgeç
                </button>
                <button
                  onClick={panel === "add" ? handleAdd : handleEdit}
                  disabled={!canSubmit}
                  className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all duration-200 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {panel === "add" ? "Paketi Ekle" : "Değişiklikleri Kaydet"}
                </button>
              </div>

              {!canSubmit && (name || price) && (
                <p className="text-xs text-crimson/60 mt-2 text-center" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Paket adı ve fiyat zorunludur.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Paket listesi ──────────────────────────────────────────── */}
      {packages.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10">
          <Package size={40} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm mb-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Henüz paket yok
          </p>
          <button
            onClick={openAdd}
            className="text-xs text-crimson/60 hover:text-crimson tracking-widest uppercase transition-colors"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}
          >
            + İlk paketi ekle
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {packages.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className={`relative bg-carbon border flex flex-col transition-all duration-200 ${
                  editId === pkg.id && panel === "edit"
                    ? "border-crimson/50 shadow-[0_0_20px_rgba(220,38,38,0.1)]"
                    : pkg.highlight
                    ? "border-crimson/20"
                    : "border-white/6 hover:border-white/12"
                } ${!pkg.isActive ? "opacity-45" : ""}`}
              >
                {/* Üst çizgi */}
                {pkg.highlight && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
                )}

                <div className="p-5 flex-1">
                  {/* Başlık satırı */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-xl font-display text-white tracking-wider leading-tight" style={{ fontFamily: "var(--font-bebas)" }}>
                        {pkg.name}
                      </h3>
                      <div className="text-xs text-white/25 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {pkg.durationDays} gün geçerli
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {pkg.highlight && (
                        <span className="text-xs px-1.5 py-0.5 bg-crimson/10 border border-crimson/20 text-crimson" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                          Popüler
                        </span>
                      )}
                      {!pkg.isActive && (
                        <span className="text-xs px-1.5 py-0.5 bg-white/5 border border-white/10 text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                          Pasif
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ders + Fiyat */}
                  <div className="flex items-end gap-3 mb-3">
                    <div>
                      <span className="text-4xl font-display text-gold-bright leading-none" style={{ fontFamily: "var(--font-bebas)" }}>
                        {pkg.lessonCount}
                      </span>
                      <span className="text-xs text-white/25 ml-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        ders · 50 dk
                      </span>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-display text-crimson leading-none" style={{ fontFamily: "var(--font-bebas)" }}>
                        ₺{pkg.price.toLocaleString("tr-TR")}
                      </div>
                      <div className="text-xs text-white/20" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        ₺{Math.round(pkg.price / pkg.lessonCount).toLocaleString("tr-TR")} / ders
                      </div>
                    </div>
                  </div>

                  {pkg.description && (
                    <p className="text-xs text-white/35 leading-relaxed" style={{ fontFamily: "var(--font-inter)" }}>
                      {pkg.description}
                    </p>
                  )}
                </div>

                {/* Alt işlem çubuğu */}
                <div className="flex items-center gap-0.5 px-4 py-2.5 border-t border-white/5 bg-steel/20">
                  <button
                    onClick={() => toggleHighlight(pkg.id)}
                    title={pkg.highlight ? "Öne çıkarı kaldır" : "Öne çıkar"}
                    className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${pkg.highlight ? "text-gold" : "text-white/20 hover:text-gold/60"}`}
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    <Star size={13} fill={pkg.highlight ? "currentColor" : "none"} />
                  </button>

                  <button
                    onClick={() => toggleActive(pkg.id)}
                    title={pkg.isActive ? "Gizle" : "Göster"}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-white/20 hover:text-white/60 transition-colors rounded"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    {pkg.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>

                  <div className="flex-1" />

                  <button
                    onClick={() => openEdit(pkg)}
                    className="flex items-center gap-1 px-3 py-1 text-xs text-white/30 hover:text-gold border border-transparent hover:border-gold/20 transition-all rounded"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    <Edit2 size={12} />
                    Düzenle
                  </button>

                  <button
                    onClick={() => setDeleteId(pkg.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-white/20 hover:text-crimson transition-colors rounded"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Silme onayı ───────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteId(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-carbon border border-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-crimson/10 border border-crimson/20 flex items-center justify-center">
                  <Trash2 size={18} className="text-crimson" />
                </div>
                <div>
                  <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                    PAKETİ SİL
                  </h3>
                  <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    {packages.find(p => p.id === deleteId)?.name}
                  </p>
                </div>
              </div>

              <p className="text-sm text-white/50 mb-5" style={{ fontFamily: "var(--font-inter)" }}>
                Bu paket kalıcı olarak silinecek. Mevcut öğrenci kayıtları etkilenmez.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
