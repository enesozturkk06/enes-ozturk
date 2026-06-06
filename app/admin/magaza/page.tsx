"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProducts, createProduct, updateProduct, deleteProduct,
  CATEGORIES, type Product, type ProductCategory, type ProductStatus,
} from "@/lib/products";
import { useToast } from "@/app/components/shared/Toast";
import { PageHeader } from "@/app/components/ui";
import { Plus, Edit2, Trash2, X, Eye, EyeOff, RefreshCw, ShoppingBag, AlertTriangle, ExternalLink } from "lucide-react";

/* ─── Form state helper ──────────────────────────────────────── */
const EMPTY_FORM = {
  name: "", category: "eldiven" as ProductCategory, description: "",
  price: "", imageUrl: "", status: "active" as ProductStatus, isActive: true,
};

/* ─── Input bileşeni ─────────────────────────────────────────── */
function F({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-carbon border border-white/10 focus:border-violet/50 text-white placeholder-white/15 px-3 py-2.5 text-sm outline-none transition-colors"
        style={{ fontFamily:"var(--font-inter)" }} />
    </div>
  );
}

/* ─── Ana sayfa ──────────────────────────────────────────────── */
export default function MagazaAdminPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [panelMode, setPanelMode] = useState<"none"|"add"|"edit">("none");
  const [editId, setEditId]       = useState<string|null>(null);
  const [deleteId, setDeleteId]   = useState<string|null>(null);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [filterCat, setFilterCat] = useState<"all"|ProductCategory>("all");
  const { toast } = useToast();

  const reload = useCallback(async () => {
    setLoading(true);
    setProducts(await getProducts());
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const setF = (key: keyof typeof EMPTY_FORM) => (v: string | boolean) =>
    setForm(f => ({ ...f, [key]: v }));

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setPanelMode("add");
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name, category: p.category, description: p.description,
      price: p.price != null ? String(p.price) : "",
      imageUrl: p.imageUrl ?? "", status: p.status, isActive: p.isActive,
    });
    setEditId(p.id);
    setPanelMode("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast("Ürün adı zorunlu", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        category:    form.category,
        description: form.description.trim(),
        price:       form.price ? Number(form.price) : undefined,
        imageUrl:    form.imageUrl.trim() || undefined,
        status:      form.status,
        isActive:    form.isActive,
        sortOrder:   0,
      };
      if (panelMode === "add") {
        await createProduct(payload);
        toast("Ürün eklendi", "success");
      } else if (editId) {
        await updateProduct(editId, payload);
        toast("Ürün güncellendi", "success");
      }
      await reload();
      setPanelMode("none");
    } catch (err: unknown) {
      toast("Hata: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteProduct(deleteId);
      toast("Ürün silindi", "success");
      await reload();
    } catch (err: unknown) {
      toast("Silinemedi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally { setSaving(false); setDeleteId(null); }
  };

  const toggleActive = async (p: Product) => {
    await updateProduct(p.id, { isActive: !p.isActive });
    await reload();
  };

  const catList = Object.entries(CATEGORIES) as [ProductCategory, { label: string; icon: string }][];
  const displayed = filterCat === "all" ? products : products.filter(p => p.category === filterCat);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Online Mağaza" subtitle={`${products.length} ürün · ${products.filter(p=>p.isActive).length} satışta`} accent="Admin" />
        <div className="flex items-center gap-2">
          <button onClick={() => reload()} className="p-2 border transition-colors"
            style={{ borderColor:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)" }}>
            <RefreshCw size={14}/>
          </button>
          <a href="/magaza" target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 text-xs border transition-colors"
            style={{ borderColor:"rgba(139,92,246,0.25)", color:"rgba(139,92,246,0.7)", fontFamily:"var(--font-barlow-condensed)" }}>
            <ExternalLink size={12}/> Mağazayı Gör
          </a>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 text-xs text-white transition-all"
            style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", fontFamily:"var(--font-barlow-condensed)", boxShadow:"0 0 16px rgba(139,92,246,0.3)" }}>
            <Plus size={14}/> Ürün Ekle
          </button>
        </div>
      </div>

      {/* Kategori filtresi */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat("all")}
          className="px-3 py-1 text-xs border transition-all"
          style={{ fontFamily:"var(--font-barlow-condensed)", borderColor: filterCat==="all"?"rgba(139,92,246,0.5)":"rgba(255,255,255,0.08)", background: filterCat==="all"?"rgba(139,92,246,0.1)":"transparent", color: filterCat==="all"?"#8B5CF6":"rgba(255,255,255,0.3)" }}>
          Tümü ({products.length})
        </button>
        {catList.map(([key, meta]) => {
          const cnt = products.filter(p => p.category === key).length;
          if (cnt === 0) return null;
          return (
            <button key={key} onClick={() => setFilterCat(key)}
              className="px-3 py-1 text-xs border transition-all"
              style={{ fontFamily:"var(--font-barlow-condensed)", borderColor: filterCat===key?"rgba(139,92,246,0.5)":"rgba(255,255,255,0.08)", background: filterCat===key?"rgba(139,92,246,0.1)":"transparent", color: filterCat===key?"#8B5CF6":"rgba(255,255,255,0.3)" }}>
              {meta.icon} {meta.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Ürün grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"rgba(139,92,246,0.5)", borderTopColor:"transparent" }} />
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-4">
          <ShoppingBag size={32} style={{ color:"rgba(139,92,246,0.3)" }}/>
          <p className="text-sm" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"var(--font-barlow-condensed)" }}>
            {filterCat === "all" ? "Henüz ürün yok. Ürün Ekle butonunu kullanın." : "Bu kategoride ürün yok."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {displayed.map((p, i) => {
              const cat = CATEGORIES[p.category];
              return (
                <motion.div key={p.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.04 }}
                  className="bg-carbon border overflow-hidden flex flex-col"
                  style={{ borderColor: p.isActive ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.06)", opacity: p.isActive ? 1 : 0.5 }}>

                  {/* Görsel veya ikon */}
                  <div className="relative h-32 flex items-center justify-center"
                    style={{ background:"rgba(139,92,246,0.05)", borderBottom:"1px solid rgba(139,92,246,0.1)" }}>
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl select-none">{cat.icon}</span>
                    )}
                    {/* Durum rozeti */}
                    <span className="absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-full"
                      style={{
                        background: p.status==="coming_soon" ? "rgba(217,119,6,0.15)" : "rgba(34,197,94,0.12)",
                        color:      p.status==="coming_soon" ? "#d97706" : "#22c55e",
                        border: p.status==="coming_soon" ? "1px solid rgba(217,119,6,0.25)" : "1px solid rgba(34,197,94,0.2)",
                        fontFamily:"var(--font-barlow-condensed)",
                      }}>
                      {p.status==="coming_soon" ? "Yakında" : "Satışta"}
                    </span>
                  </div>

                  {/* İçerik */}
                  <div className="p-3 flex-1 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ color:"rgba(139,92,246,0.6)", fontFamily:"var(--font-barlow-condensed)" }}>{cat.icon} {cat.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-tight" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{p.name}</p>
                    {p.description && (
                      <p className="text-xs line-clamp-2" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>{p.description}</p>
                    )}
                    <p className="text-sm font-bold mt-auto pt-1"
                      style={{ color: p.price ? "#D946EF" : "rgba(255,255,255,0.25)", fontFamily:"var(--font-bebas)", letterSpacing:"0.05em" }}>
                      {p.price ? `₺${p.price.toLocaleString("tr-TR")}` : "Fiyat için iletişime geçiniz"}
                    </p>
                  </div>

                  {/* Admin aksiyonlar */}
                  <div className="flex border-t" style={{ borderColor:"rgba(255,255,255,0.06)" }}>
                    <button onClick={() => openEdit(p)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors"
                      style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}
                      onMouseEnter={e=>(e.currentTarget.style.color="#8B5CF6")}
                      onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}>
                      <Edit2 size={11}/> Düzenle
                    </button>
                    <button onClick={() => toggleActive(p)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors border-x"
                      style={{ color:p.isActive?"rgba(255,255,255,0.3)":"#22c55e", borderColor:"rgba(255,255,255,0.06)", fontFamily:"var(--font-barlow-condensed)" }}>
                      {p.isActive ? <><EyeOff size={11}/> Gizle</> : <><Eye size={11}/> Göster</>}
                    </button>
                    <button onClick={() => setDeleteId(p.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-xs transition-colors"
                      style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}
                      onMouseEnter={e=>(e.currentTarget.style.color="#ef4444")}
                      onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,0.3)")}>
                      <Trash2 size={11}/> Sil
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ══ Ekle / Düzenle Modalı ══ */}
      <AnimatePresence>
        {panelMode !== "none" && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={() => setPanelMode("none")}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ y:40, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:40, opacity:0 }}
              className="relative z-10 w-full sm:max-w-lg bg-carbon border border-white/10 flex flex-col"
              style={{ borderRadius:"16px 16px 0 0", maxHeight:"92dvh" }}
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex-shrink-0 relative">
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background:"linear-gradient(90deg,transparent,#8B5CF6,#D946EF,transparent)" }} />
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/6">
                  <h3 className="text-lg text-white tracking-wider" style={{ fontFamily:"var(--font-bebas)" }}>
                    {panelMode === "add" ? "Yeni Ürün Ekle" : "Ürünü Düzenle"}
                  </h3>
                  <button onClick={() => setPanelMode("none")}
                    className="w-9 h-9 flex items-center justify-center rounded-full"
                    style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)" }}>
                    <X size={16}/>
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4"
                style={{ WebkitOverflowScrolling:"touch" }}>

                <F label="Ürün Adı *" value={form.name} onChange={setF("name")} placeholder="Örn: Muay Thai Eldiveni" />

                {/* Kategori */}
                <div>
                  <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Kategori</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {catList.map(([key, meta]) => (
                      <button key={key} type="button" onClick={() => setF("category")(key)}
                        className="flex items-center gap-1.5 px-2 py-2 text-left transition-all text-xs"
                        style={{
                          background: form.category===key ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                          border: form.category===key ? "1px solid rgba(139,92,246,0.45)" : "1px solid rgba(255,255,255,0.07)",
                          color: form.category===key ? "#fff" : "rgba(255,255,255,0.4)",
                          fontFamily:"var(--font-barlow-condensed)",
                        }}>
                        <span>{meta.icon}</span> <span className="truncate">{meta.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Açıklama</label>
                  <textarea value={form.description} onChange={e => setF("description")(e.target.value)}
                    placeholder="Ürün hakkında kısa açıklama..."
                    rows={3}
                    className="w-full bg-carbon border border-white/10 focus:border-violet/50 text-white placeholder-white/15 px-3 py-2.5 text-sm outline-none transition-colors resize-none"
                    style={{ fontFamily:"var(--font-inter)" }} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <F label="Fiyat ₺ (opsiyonel)" value={form.price} onChange={setF("price")} type="number" placeholder="Boş = iletişime geçiniz" />
                  <div>
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Durum</label>
                    <select value={form.status} onChange={e => setF("status")(e.target.value)}
                      className="w-full bg-carbon border border-white/10 focus:border-violet/50 text-white px-3 py-2.5 text-sm outline-none appearance-none"
                      style={{ fontFamily:"var(--font-inter)" }}>
                      <option value="active" className="bg-carbon">Satışta</option>
                      <option value="coming_soon" className="bg-carbon">Yakında</option>
                    </select>
                  </div>
                </div>

                <F label="Görsel URL (opsiyonel)" value={form.imageUrl} onChange={setF("imageUrl")} placeholder="https://..." />

                {/* Aktif toggle */}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setF("isActive")(!form.isActive)}
                    className="w-10 h-5 rounded-full transition-colors flex-shrink-0"
                    style={{ background: form.isActive ? "#8B5CF6" : "rgba(255,255,255,0.1)" }}>
                    <div className="w-4 h-4 bg-white rounded-full transition-transform"
                      style={{ transform: form.isActive ? "translateX(22px)" : "translateX(2px)", marginTop:2 }} />
                  </button>
                  <span className="text-xs" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-barlow-condensed)" }}>
                    {form.isActive ? "Mağazada görünür" : "Mağazada gizli"}
                  </span>
                </div>

                <div className="h-2" />
              </div>

              {/* Footer */}
              <div className="flex-shrink-0 flex gap-3 px-5 py-4 border-t border-white/6" style={{ background:"rgba(24,24,27,0.98)" }}>
                <button onClick={() => setPanelMode("none")}
                  className="flex-1 py-3 text-xs font-semibold tracking-widest uppercase border border-white/10 text-white/40 transition-all"
                  style={{ fontFamily:"var(--font-barlow-condensed)" }}>Vazgeç</button>
                <button onClick={handleSave} disabled={saving || !form.name.trim()}
                  className="flex-1 py-3 text-xs font-semibold tracking-widest uppercase text-white transition-all disabled:opacity-40"
                  style={{ background:"linear-gradient(135deg,#8B5CF6,#A855F7)", fontFamily:"var(--font-barlow-condensed)" }}>
                  {saving ? "Kaydediliyor..." : panelMode === "add" ? "Ürünü Ekle" : "Güncelle"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Sil Onayı ══ */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}>
            <motion.div initial={{ scale:0.93, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.93, opacity:0 }}
              className="w-full max-w-xs bg-carbon border p-6 space-y-4" style={{ borderColor:"rgba(220,38,38,0.3)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background:"rgba(220,38,38,0.1)", border:"1px solid rgba(220,38,38,0.25)" }}>
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Ürünü Sil</p>
                  <p className="text-xs text-white/30" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Bu işlem geri alınamaz.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 py-2.5 text-xs border border-white/10 text-white/40 transition-all"
                  style={{ fontFamily:"var(--font-barlow-condensed)" }}>İptal</button>
                <button onClick={handleDelete} disabled={saving}
                  className="flex-1 py-2.5 text-xs text-white disabled:opacity-50"
                  style={{ background:"rgba(220,38,38,0.7)", fontFamily:"var(--font-barlow-condensed)" }}>
                  {saving ? "Siliniyor..." : "Sil"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
