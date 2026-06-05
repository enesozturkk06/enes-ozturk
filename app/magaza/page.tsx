"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getProducts, CATEGORIES, type Product, type ProductCategory } from "@/lib/products";
import { TRAINER_WHATSAPP } from "@/lib/constants";
import Link from "next/link";
import { ShoppingBag, MessageCircle, ArrowLeft, Search, X } from "lucide-react";

const V = "#8B5CF6";

function waLink(productName: string) {
  const msg = `Merhaba Enes Hocam, mağazadaki ${productName} ürünü hakkında bilgi almak istiyorum.`;
  return `https://wa.me/${TRAINER_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

/* ─── Ürün kartı ─────────────────────────────────────────────── */
function ProductCard({ product, index }: { product: Product; index: number }) {
  const cat = CATEGORIES[product.category];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.28 }}
      className="bg-carbon border flex flex-col overflow-hidden group"
      style={{ borderColor: "rgba(139,92,246,0.12)" }}
    >
      {/* Görsel */}
      <div className="relative h-44 flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(139,92,246,0.04)", borderBottom: "1px solid rgba(139,92,246,0.1)" }}>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <motion.span className="text-6xl select-none" whileHover={{ scale: 1.1 }} transition={{ duration: 0.2 }}>
            {cat.icon}
          </motion.span>
        )}

        {/* Durum */}
        <div className="absolute top-2.5 left-2.5">
          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase"
            style={{
              background: product.status === "coming_soon" ? "rgba(217,119,6,0.85)" : "rgba(34,197,94,0.85)",
              color: "#fff",
              fontFamily: "var(--font-barlow-condensed)",
            }}>
            {product.status === "coming_soon" ? "✦ Yakında" : "● Satışta"}
          </span>
        </div>

        {/* Kategori rozeti */}
        <div className="absolute bottom-2.5 right-2.5">
          <span className="text-[9px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-barlow-condensed)" }}>
            {cat.icon} {cat.label}
          </span>
        </div>
      </div>

      {/* İçerik */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-white leading-tight" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          {product.name}
        </h3>

        {product.description && (
          <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-barlow-condensed)" }}>
            {product.description}
          </p>
        )}

        {/* Fiyat */}
        <div className="mt-auto pt-2">
          {product.price ? (
            <p className="text-xl font-bold" style={{ color: "#D946EF", fontFamily: "var(--font-bebas)", letterSpacing: "0.05em" }}>
              ₺{product.price.toLocaleString("tr-TR")}
            </p>
          ) : (
            <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
              Fiyat için iletişime geçiniz
            </p>
          )}
        </div>
      </div>

      {/* WhatsApp Sipariş */}
      <a href={waLink(product.name)} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-3 text-xs font-semibold tracking-widest uppercase transition-all border-t"
        style={{
          borderColor: "rgba(139,92,246,0.12)",
          color: product.status === "coming_soon" ? "rgba(255,255,255,0.25)" : "#fff",
          background: product.status === "coming_soon" ? "rgba(255,255,255,0.03)" : "rgba(34,197,94,0.12)",
          fontFamily: "var(--font-barlow-condensed)",
          pointerEvents: product.status === "coming_soon" ? "none" : "auto",
        }}
        onMouseEnter={e => {
          if (product.status !== "coming_soon") (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.2)";
        }}
        onMouseLeave={e => {
          if (product.status !== "coming_soon") (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.12)";
        }}
      >
        <MessageCircle size={13} />
        {product.status === "coming_soon" ? "Yakında" : "WhatsApp ile Sipariş Ver"}
      </a>
    </motion.div>
  );
}

/* ─── Ana sayfa ──────────────────────────────────────────────── */
export default function MagazaPage() {
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeCat, setActiveCat] = useState<"all" | ProductCategory>("all");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    getProducts(true).then(p => { setProducts(p); setLoading(false); });
  }, []);

  const catList = Object.entries(CATEGORIES) as [ProductCategory, { label: string; icon: string }][];

  const filtered = useMemo(() => {
    let list = products;
    if (activeCat !== "all") list = list.filter(p => p.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        CATEGORIES[p.category].label.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCat, search]);

  const catsWithProducts = catList.filter(([k]) => products.some(p => p.category === k));

  return (
    <div className="min-h-screen bg-obsidian">
      {/* BG */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      <div className="fixed top-0 right-0 w-[600px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(139,92,246,0.06) 0%,transparent 65%)", filter: "blur(100px)" }} />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b"
        style={{ background: "rgba(9,9,11,0.97)", borderColor: "rgba(139,92,246,0.12)", backdropFilter: "blur(16px)", paddingTop: "env(safe-area-inset-top,0px)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 transition-colors"
              style={{ color: "rgba(255,255,255,0.3)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#8B5CF6")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
              <ArrowLeft size={14} />
            </Link>
            <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} style={{ color: V }} />
              <span className="text-white font-display tracking-wider" style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}>
                ENES ÖZTÜRK — MAĞAZA
              </span>
            </div>
          </div>

          <a href={`https://wa.me/${TRAINER_WHATSAPP}`} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs transition-all"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontFamily: "var(--font-barlow-condensed)", letterSpacing: "0.06em" }}>
            <MessageCircle size={11} /> WhatsApp İletişim
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl text-white mb-2" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.08em" }}>
            ÖZEL EKİPMANLAR
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
            Antrenör Enes Öztürk tarafından seçilmiş, kaliteli boks ve kickboks ekipmanları
          </p>
        </div>

        {/* Arama */}
        <div className="relative mb-6 max-w-md mx-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.2)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ürün ara..."
            className="w-full pl-9 pr-9 py-2.5 text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.15)", color: "#fff", fontFamily: "var(--font-barlow-condensed)" }}
            onFocus={e => (e.target.style.borderColor = "rgba(139,92,246,0.4)")}
            onBlur={e => (e.target.style.borderColor = "rgba(139,92,246,0.15)")} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.2)" }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Kategori filtreleri */}
        {!loading && catsWithProducts.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center mb-8">
            <button onClick={() => setActiveCat("all")}
              className="px-4 py-1.5 text-xs border transition-all"
              style={{ fontFamily: "var(--font-barlow-condensed)", borderColor: activeCat === "all" ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)", background: activeCat === "all" ? "rgba(139,92,246,0.12)" : "transparent", color: activeCat === "all" ? "#8B5CF6" : "rgba(255,255,255,0.4)" }}>
              Tümü
            </button>
            {catsWithProducts.map(([key, meta]) => (
              <button key={key} onClick={() => setActiveCat(key)}
                className="px-4 py-1.5 text-xs border transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)", borderColor: activeCat === key ? "rgba(139,92,246,0.5)" : "rgba(255,255,255,0.08)", background: activeCat === key ? "rgba(139,92,246,0.12)" : "transparent", color: activeCat === key ? "#8B5CF6" : "rgba(255,255,255,0.4)" }}>
                {meta.icon} {meta.label}
              </button>
            ))}
          </div>
        )}

        {/* Ürünler */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(139,92,246,0.5)", borderTopColor: "transparent" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <ShoppingBag size={36} style={{ color: "rgba(139,92,246,0.25)" }} />
            <div>
              <p className="text-white text-base" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {search ? `"${search}" için sonuç bulunamadı` : "Henüz ürün eklenmemiş"}
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-barlow-condensed)" }}>
                WhatsApp'tan iletişime geçebilirsiniz.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeCat + search}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Alt WhatsApp CTA */}
        {!loading && filtered.length > 0 && (
          <div className="mt-12 text-center">
            <a href={`https://wa.me/${TRAINER_WHATSAPP}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 text-white text-sm font-semibold tracking-widest uppercase transition-all"
              style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", fontFamily: "var(--font-barlow-condensed)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.25)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.15)"}>
              <MessageCircle size={16} />
              Ürünler Hakkında Bilgi Al
            </a>
            <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
              Özel indirimler ve toplu sipariş için WhatsApp&apos;tan ulaşın
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
