"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getProducts, CATEGORIES, type Product } from "@/lib/products";
import { TRAINER_WHATSAPP } from "@/lib/constants";
import { ShoppingBag, MessageCircle, ArrowRight } from "lucide-react";

function waLink(name: string) {
  const msg = `Merhaba Enes Hocam, mağazadaki ${name} ürünü hakkında bilgi almak istiyorum.`;
  return `https://wa.me/${TRAINER_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

function ProductCard({ p, i }: { p: Product; i: number }) {
  const cat = CATEGORIES[p.category];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.07, duration: 0.4 }}
      className="flex flex-col overflow-hidden group"
      style={{ background: "rgba(15,15,22,0.9)", border: "1px solid rgba(139,92,246,0.12)" }}
    >
      {/* Görsel / ikon */}
      <div className="relative h-40 flex items-center justify-center overflow-hidden"
        style={{ background: "rgba(139,92,246,0.04)", borderBottom: "1px solid rgba(139,92,246,0.08)" }}>
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="text-5xl select-none transition-transform duration-300 group-hover:scale-110">
            {cat.icon}
          </span>
        )}
        {p.status === "coming_soon" && (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(9,9,11,0.55)" }}>
            <span className="text-xs font-semibold tracking-widest uppercase px-3 py-1"
              style={{ background: "rgba(217,119,6,0.8)", color: "#fff", fontFamily: "var(--font-barlow-condensed)" }}>
              Yakında
            </span>
          </div>
        )}
      </div>

      {/* Bilgi */}
      <div className="p-4 flex-1 flex flex-col gap-1.5">
        <span className="text-[10px] tracking-widest uppercase"
          style={{ color: "rgba(139,92,246,0.6)", fontFamily: "var(--font-barlow-condensed)" }}>
          {cat.icon} {cat.label}
        </span>
        <h3 className="text-sm font-semibold text-white leading-snug"
          style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          {p.name}
        </h3>
        {p.description && (
          <p className="text-xs line-clamp-2" style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
            {p.description}
          </p>
        )}
        <div className="mt-auto pt-1">
          {p.price ? (
            <span className="text-lg font-bold" style={{ color: "#D946EF", fontFamily: "var(--font-bebas)", letterSpacing: "0.05em" }}>
              ₺{p.price.toLocaleString("tr-TR")}
            </span>
          ) : (
            <span className="text-xs italic" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
              Fiyat için iletişime geçiniz
            </span>
          )}
        </div>
      </div>

      {/* WhatsApp */}
      <a
        href={p.status === "active" ? waLink(p.name) : undefined}
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold tracking-widest uppercase border-t transition-all"
        style={{
          borderColor: "rgba(139,92,246,0.1)",
          color: p.status === "coming_soon" ? "rgba(255,255,255,0.2)" : "#22c55e",
          background: p.status === "coming_soon" ? "transparent" : "rgba(34,197,94,0.06)",
          fontFamily: "var(--font-barlow-condensed)",
          pointerEvents: p.status === "coming_soon" ? "none" : "auto",
        }}
        onMouseEnter={e => { if (p.status === "active") (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.14)"; }}
        onMouseLeave={e => { if (p.status === "active") (e.currentTarget as HTMLElement).style.background = "rgba(34,197,94,0.06)"; }}
      >
        <MessageCircle size={11} />
        {p.status === "coming_soon" ? "Yakında" : "WhatsApp ile Bilgi Al"}
      </a>
    </motion.div>
  );
}

export default function StoreFeatured() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getProducts(true).then(list => {
      setProducts(list.slice(0, 8)); // Landing'de maks 8 ürün
      setLoading(false);
    });
  }, []);

  // Ürün yoksa bölümü render etme
  if (!loading && products.length === 0) return null;

  return (
    <section id="magaza" className="relative py-24 overflow-hidden">
      {/* BG aksanı */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(139,92,246,0.04) 0%, transparent 70%)" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Başlık */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          {/* Üst aksan */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="h-px w-12" style={{ background: "linear-gradient(to right,transparent,#8B5CF6)" }} />
            <ShoppingBag size={14} style={{ color: "#8B5CF6" }} />
            <span className="text-xs tracking-[0.4em] uppercase" style={{ color: "#8B5CF6", fontFamily: "var(--font-barlow-condensed)" }}>
              Online Mağaza
            </span>
            <ShoppingBag size={14} style={{ color: "#8B5CF6" }} />
            <span className="h-px w-12" style={{ background: "linear-gradient(to left,transparent,#8B5CF6)" }} />
          </div>

          <h2 className="text-4xl sm:text-5xl text-white mb-4"
            style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.08em" }}>
            SPOR MALZEMELERİ<br/>
            <span style={{ background: "linear-gradient(90deg,#8B5CF6,#D946EF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              MAĞAZASI
            </span>
          </h2>

          <p className="max-w-xl mx-auto text-sm leading-relaxed"
            style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
            Kickboks ve boks antrenmanlarınız için profesyonel ekipmanlar.
            WhatsApp üzerinden sipariş verin.
          </p>
        </motion.div>

        {/* Ürünler */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "rgba(139,92,246,0.5)", borderTopColor: "transparent" }} />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {products.map((p, i) => <ProductCard key={p.id} p={p} i={i} />)}
          </div>
        )}

        {/* Tüm mağaza CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-center"
        >
          <Link href="/magaza"
            className="inline-flex items-center gap-2.5 px-8 py-4 text-white text-sm font-semibold tracking-widest uppercase transition-all"
            style={{
              background: "linear-gradient(135deg,#8B5CF6,#A855F7)",
              fontFamily: "var(--font-barlow-condensed)",
              boxShadow: "0 0 24px rgba(139,92,246,0.3)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(139,92,246,0.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(139,92,246,0.3)"; }}>
            <ShoppingBag size={15} />
            Tüm Ürünleri Gör
            <ArrowRight size={15} />
          </Link>
          <p className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-barlow-condensed)" }}>
            Toplu sipariş ve özel fiyat için WhatsApp&apos;tan iletişime geçin
          </p>
        </motion.div>
      </div>
    </section>
  );
}
