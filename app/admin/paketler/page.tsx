"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getPackages, createPackage, updatePackage, deletePackage, type LessonPackage } from "@/lib/packages";
import { Search, X as ClearIcon, Plus, X, Check, Package, Layers, CheckCircle2, XCircle, Star as StarIcon, Wallet, Trash2 } from "lucide-react";
import PaketStatCard from "@/app/components/paketler/PaketStatCard";
import PackageCard from "@/app/components/paketler/PackageCard";
import PackageSkeleton from "@/app/components/paketler/PackageSkeleton";

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

const FILTERS: [string, string][] = [
  ["all", "Tümü"], ["active", "Aktif"], ["inactive", "Pasif"], ["highlight", "Popüler"],
];

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
      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-label)" }}>
        {label}{required && <span style={{ color: "var(--color-error)" }} className="ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="glass w-full text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none transition-colors duration-200 rounded-lg"
        style={{ fontFamily: "var(--font-label)" }}
      />
    </div>
  );
}

/* ── Ana sayfa ───────────────────────────────────────────────────── */
export default function PaketlerPage() {
  const [packages, setPackages] = useState<LessonPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<"none" | "add" | "edit">("none");
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  /* Form alanları — bağımsız state'ler, React re-render'da bozulmuyor */
  const [name, setName] = useState("");
  const [lessonCount, setLessonCount] = useState("8");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("45");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    getPackages().then(pkgs => { setPackages(pkgs); setLoading(false); });
  }, []);

  const flash = () => { setSaved(true); setTimeout(() => setSaved(false), 1800); };

  const reload = () => getPackages().then(setPackages);

  /* ── Form temizle ─────────────────────────────────────────────── */
  const resetForm = () => {
    setName(""); setLessonCount("8"); setPrice(""); setDurationDays("45");
    setDescription(""); setIsActive(true); setHighlight(false);
  };

  const openAdd = () => { resetForm(); setPanel("add"); };

  const openEdit = (pkg: LessonPackage) => {
    setName(pkg.name); setLessonCount(String(pkg.lessonCount));
    setPrice(String(pkg.price)); setDurationDays(String(pkg.durationDays));
    setDescription(pkg.description); setIsActive(pkg.isActive); setHighlight(!!pkg.highlight);
    setEditId(pkg.id); setPanel("edit");
  };

  /* ── Ekle ────────────────────────────────────────────────────── */
  const handleAdd = async () => {
    if (!name.trim() || !price) return;
    await createPackage({
      name: name.trim(),
      lessonCount: Number(lessonCount) || 8,
      price: Number(price),
      durationDays: Number(durationDays) || 45,
      description: description.trim(),
      isActive,
      highlight,
    });
    await reload();
    setPanel("none");
    flash();
  };

  /* ── Güncelle ────────────────────────────────────────────────── */
  const handleEdit = async () => {
    if (!editId) return;
    await updatePackage(editId, {
      name: name.trim(),
      lessonCount: Number(lessonCount) || 8,
      price: Number(price),
      durationDays: Number(durationDays) || 45,
      description: description.trim(),
      isActive,
      highlight,
    });
    await reload();
    setPanel("none");
    setEditId(null);
    flash();
  };

  /* ── Sil ─────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePackage(deleteId);
    await reload();
    setDeleteId(null);
    flash();
  };

  /* ── Aktif aç/kapat ──────────────────────────────────────────── */
  const toggleActive = async (id: string) => {
    const pkg = packages.find(p => p.id === id);
    if (!pkg) return;
    await updatePackage(id, { isActive: !pkg.isActive });
    await reload();
    flash();
  };

  /* ── Öne çıkar ───────────────────────────────────────────────── */
  const toggleHighlight = async (id: string) => {
    const pkg = packages.find(p => p.id === id);
    if (!pkg) return;
    // Diğerlerinin highlight'ını kapat, bunu toggle et
    for (const p of packages) {
      if (p.id === id) await updatePackage(id, { highlight: !pkg.highlight });
      else if (p.highlight) await updatePackage(p.id, { highlight: false });
    }
    await reload();
    flash();
  };

  const panelOpen = panel !== "none";
  const canSubmit = name.trim() !== "" && Number(price) > 0;

  /* ── Türetilmiş veriler — salt-okunur, sadece packages'tan (yeni fetch yok) ── */
  const stats = useMemo(() => {
    const active = packages.filter(p => p.isActive);
    const inactive = packages.filter(p => !p.isActive);
    const highlighted = packages.filter(p => p.highlight);
    const avgPrice = packages.length > 0 ? Math.round(packages.reduce((s, p) => s + p.price, 0) / packages.length) : 0;
    return { total: packages.length, active: active.length, inactive: inactive.length, highlighted: highlighted.length, avgPrice };
  }, [packages]);

  const maxLessonCount = useMemo(
    () => packages.reduce((m, p) => Math.max(m, p.lessonCount), 0),
    [packages],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return packages.filter(p => {
      const matchesSearch = !q || p.name.toLocaleLowerCase("tr-TR").includes(q) || p.description.toLocaleLowerCase("tr-TR").includes(q);
      const matchesFilter = filter === "all" ? true
        : filter === "active"    ? p.isActive
        : filter === "inactive"  ? !p.isActive
        : filter === "highlight" ? !!p.highlight : true;
      return matchesSearch && matchesFilter;
    });
  }, [packages, search, filter]);

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="relative overflow-hidden">
      {/* Dashboard arka planı — hafif hareketli ışık efekti, dekoratif */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="animate-float-slow absolute rounded-full"
          style={{ width: 380, height: 380, top: -120, right: -100, background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent 70%)", filter: "blur(60px)" }} />
        <div className="animate-float-medium absolute rounded-full"
          style={{ width: 320, height: 320, bottom: -100, left: -120, background: "radial-gradient(circle, rgba(236,72,153,0.06), transparent 70%)", filter: "blur(60px)" }} />
      </div>

    <motion.div variants={stagger} initial="initial" animate="animate" className="relative max-w-5xl mx-auto space-y-6">

      {/* Hero */}
      <motion.div variants={fadeUp} className="glass-strong relative overflow-hidden rounded-3xl">
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl text-white tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                DERS PAKETLERİ
              </h1>
              <p className="text-xs sm:text-sm text-white/40 mt-1" style={{ fontFamily: "var(--font-label)" }}>
                Paket kataloğunu yönetin — sitede aktif olanlar görünür
              </p>
            </div>
            <div className="flex items-center gap-3">
              <AnimatePresence>
                {saved && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-success)", fontFamily: "var(--font-label)" }}>
                    <Check size={13} /> Kaydedildi
                  </motion.div>
                )}
              </AnimatePresence>
              <button onClick={openAdd}
                className="gradient-animated gradient-slow gradient-violet-pink-orange flex items-center gap-2 text-white text-xs font-semibold tracking-widest uppercase px-5 py-3 rounded-xl transition-transform hover:scale-105 active:scale-95">
                <Plus size={14} />Yeni Paket
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mt-6">
            <PaketStatCard label="Toplam Paket" value={stats.total} icon={<Layers size={16} />} color="#A78BFA" />
            <PaketStatCard label="Aktif Paket" value={stats.active} icon={<CheckCircle2 size={16} />} color="var(--color-success)" />
            <PaketStatCard label="Pasif Paket" value={stats.inactive} icon={<XCircle size={16} />} color="rgba(255,255,255,0.5)" />
            <PaketStatCard label="Popüler Paket" value={stats.highlighted} icon={<StarIcon size={16} />} color="var(--color-achievement)" />
            <PaketStatCard label="Ortalama Fiyat" value={stats.avgPrice} prefix="₺" icon={<Wallet size={16} />} color="#60A5FA" />
          </div>
        </div>
      </motion.div>

      {/* Arama + Filtre */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
        <div className="glass relative flex-1 rounded-xl overflow-hidden transition-shadow focus-within:shadow-[0_0_0_2px_rgba(139,92,246,0.4)]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Paket adı veya açıklama ara..."
            className="w-full bg-transparent text-white placeholder-white/25 pl-10 pr-9 py-3 text-sm outline-none"
            style={{ fontFamily: "var(--font-label)" }} />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
              aria-label="Temizle">
              <ClearIcon size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3.5 py-2.5 text-xs tracking-wider rounded-xl transition-all whitespace-nowrap ${
                filter === v ? "gradient-animated gradient-violet-pink-orange text-white" : "glass text-white/40 hover:text-white/70"
              }`}
              style={{ fontFamily: "var(--font-label)" }}>
              {l}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Paket ekleme / düzenleme formu (inline panel) ─────────── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative overflow-hidden rounded-2xl"
          >
            <div className="absolute top-0 left-0 right-0 h-px gradient-animated gradient-slow gradient-violet-pink-orange" />

            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
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
              <div className="glass flex flex-wrap items-center gap-6 mb-5 p-3 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setIsActive(v => !v)}
                    className="w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0"
                    style={{ background: isActive ? "var(--color-success)" : "rgba(255,255,255,0.1)" }}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isActive ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <span className="text-xs text-white/50" style={{ fontFamily: "var(--font-label)" }}>
                    Sitede Göster {isActive ? <span style={{ color: "var(--color-success)" }}>(Aktif)</span> : <span className="text-white/25">(Pasif)</span>}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => setHighlight(v => !v)}
                    className="w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0"
                    style={{ background: highlight ? "var(--color-achievement)" : "rgba(255,255,255,0.1)" }}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${highlight ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                  <span className="text-xs text-white/50" style={{ fontFamily: "var(--font-label)" }}>
                    Öne Çıkar {highlight ? <span style={{ color: "var(--color-achievement)" }}>(Popüler etiketi)</span> : ""}
                  </span>
                </label>
              </div>

              {/* Butonlar */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setPanel("none"); setEditId(null); }}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white hover:border-white/20 text-xs font-semibold tracking-widest uppercase py-3 rounded-xl transition-all duration-200"
                  style={{ fontFamily: "var(--font-label)" }}
                >
                  Vazgeç
                </button>
                <button
                  onClick={panel === "add" ? handleAdd : handleEdit}
                  disabled={!canSubmit}
                  className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold tracking-widest uppercase py-3 rounded-xl transition-transform hover:scale-[1.01] active:scale-95"
                  style={{ fontFamily: "var(--font-label)" }}
                >
                  {panel === "add" ? "Paketi Ekle" : "Değişiklikleri Kaydet"}
                </button>
              </div>

              {!canSubmit && (name || price) && (
                <p className="text-xs mt-2 text-center" style={{ color: "var(--color-error)", fontFamily: "var(--font-label)" }}>
                  Paket adı ve fiyat zorunludur.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Paket listesi ──────────────────────────────────────────── */}
      {loading ? (
        <PackageSkeleton />
      ) : filtered.length === 0 ? (
        <motion.div variants={fadeUp} className="glass text-center py-20 rounded-2xl">
          <Package size={40} className="text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm mb-2" style={{ fontFamily: "var(--font-label)" }}>
            {packages.length === 0 ? "Henüz paket yok" : "Aramanıza uyan paket yok"}
          </p>
          {packages.length === 0 && (
            <button onClick={openAdd}
              className="text-xs tracking-widest uppercase transition-colors"
              style={{ color: "#A78BFA", fontFamily: "var(--font-label)" }}>
              + İlk paketi ekle
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((pkg, i) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                maxLessonCount={maxLessonCount}
                isEditing={editId === pkg.id && panel === "edit"}
                index={i}
                onToggleHighlight={toggleHighlight}
                onToggleActive={toggleActive}
                onEdit={openEdit}
                onDeleteRequest={setDeleteId}
              />
            ))}
          </AnimatePresence>
        </motion.div>
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
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} />
            <motion.div
              initial={{ scale: 0.94, y: 16, filter: "blur(6px)" }}
              animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
              exit={{ scale: 0.95, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-sm rounded-2xl overflow-hidden p-6"
              style={{ borderColor: "rgba(239,68,68,0.3)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg,transparent,var(--color-error),transparent)" }} />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <Trash2 size={18} style={{ color: "var(--color-error)" }} />
                </div>
                <div>
                  <h3 className="text-lg text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
                    PAKETİ SİL
                  </h3>
                  <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-label)" }}>
                    {packages.find(p => p.id === deleteId)?.name}
                  </p>
                </div>
              </div>

              <p className="text-sm text-white/50 mb-5" style={{ fontFamily: "var(--font-label)" }}>
                Bu paket kalıcı olarak silinecek. Mevcut öğrenci kayıtları etkilenmez.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-lg transition-all"
                  style={{ fontFamily: "var(--font-label)" }}
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 text-white text-xs font-semibold tracking-widest uppercase py-2.5 rounded-lg transition-transform hover:scale-[1.01] active:scale-95"
                  style={{ background: "var(--color-error)", fontFamily: "var(--font-label)" }}
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
}
