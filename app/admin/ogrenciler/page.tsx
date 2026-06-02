"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStudents, createStudent, updateStudent, deleteStudent } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Student } from "@/lib/types";
import { PAYMENT_LABELS, LEVEL_LABELS } from "@/lib/constants";
import { Search, Plus, Edit, Trash2, Phone, User, QrCode, X, AlertTriangle, CheckCircle } from "lucide-react";

/* ── Kod üreteci ─────────────────────────────────────────────────────── */
function genCode(students: Student[]): string {
  const nums = students.map(s => parseInt(s.code.replace(/\D/g, ""))).filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `ENES${String(next).padStart(3, "0")}`;
}

/* ── Küçük input bileşeni ─────────────────────────────────────────────── */
function F({ label, value, onChange, type = "text", placeholder, col2 }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; col2?: boolean;
}) {
  return (
    <div className={col2 ? "sm:col-span-2" : ""}>
      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
        style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none transition-colors"
        style={{ fontFamily: "var(--font-inter)" }} />
    </div>
  );
}

function Sel({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
        style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white px-3 py-2.5 text-sm outline-none transition-colors appearance-none"
        style={{ fontFamily: "var(--font-inter)" }}>
        {options.map(o => <option key={o.value} value={o.value} className="bg-carbon">{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── Ana bileşen ─────────────────────────────────────────────────────── */
export default function OgrencilerPage() {
  const [students, setStudents]   = useState<Student[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [error, setError]         = useState<string | null>(null);

  /* Ekle paneli */
  const [addOpen, setAddOpen]     = useState(false);
  const [aName, setAName]         = useState("");
  const [aPhone, setAPhone]       = useState("");
  const [aEmail, setAEmail]       = useState("");
  const [aLevel, setALevel]       = useState("baslangic");
  const [aTotalLessons, setATL]   = useState("8");
  const [aAmountPaid, setAAP]     = useState("");
  const [aAmountDue, setAAD]      = useState("");
  const [aPayStatus, setAPayStatus] = useState("beklemede");
  const [aNotes, setANotes]       = useState("");
  const [aSaving, setASaving]     = useState(false);

  /* Düzenle paneli */
  const [editSt, setEditSt]       = useState<Student | null>(null);
  const [eName, setEName]         = useState("");
  const [ePhone, setEPhone]       = useState("");
  const [eLevel, setELevel]       = useState("baslangic");
  const [eRL, setERL]             = useState("");
  const [eTL, setETL]             = useState("");
  const [eAP, setEAP]             = useState("");
  const [eAD, setEAD]             = useState("");
  const [ePS, setEPS]             = useState("beklemede");
  const [eNotes, setENotes]       = useState("");
  const [eSaving, setESaving]     = useState(false);

  /* Sil */
  const [delSt, setDelSt]         = useState<Student | null>(null);
  const [delSaving, setDelSaving] = useState(false);

  /* QR */
  const [qrSt, setQrSt]          = useState<Student | null>(null);

  /* ── Yükle ─────────────────────────────────────────────────────── */
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStudents();
      setStudents(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error("reload hatası:", msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /* ── Filtre ─────────────────────────────────────────────────────── */
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const match = s.fullName.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.phone.includes(q);
    const filt = filter === "all" ? true
      : filter === "active"   ? s.isActive
      : filter === "payment"  ? s.paymentStatus !== "odendi"
      : filter === "low"      ? s.remainingLessons <= 2 : true;
    return match && filt;
  });

  /* ── Ekle ───────────────────────────────────────────────────────── */
  const openAdd = () => {
    setAName(""); setAPhone(""); setAEmail(""); setALevel("baslangic");
    setATL("8"); setAAP(""); setAAD(""); setAPayStatus("beklemede"); setANotes("");
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!aName.trim() || !aPhone.trim()) {
      alert("Ad Soyad ve Telefon zorunludur.");
      return;
    }
    setASaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await createStudent({
        code:             genCode(students),
        fullName:         aName.trim(),
        phone:            aPhone.trim(),
        email:            aEmail.trim() || undefined,
        level:            aLevel as Student["level"],
        packageType:      "sampiyon",
        totalLessons:     Number(aTotalLessons) || 8,
        remainingLessons: Number(aTotalLessons) || 8,
        completedLessons: 0,
        paymentStatus:    aPayStatus as Student["paymentStatus"],
        amountPaid:       Number(aAmountPaid) || 0,
        amountDue:        Number(aAmountDue) || 0,
        packageStartDate: today,
        packageEndDate:   today,
        notes:            aNotes.trim() || undefined,
        isActive:         true,
      });
      await reload();      // ← Supabase'den taze veri çek
      setAddOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Öğrenci eklenemedi:\n" + msg);
    } finally {
      setASaving(false);
    }
  };

  /* ── Düzenle ─────────────────────────────────────────────────────── */
  const openEdit = (s: Student) => {
    setEName(s.fullName); setEPhone(s.phone); setELevel(s.level);
    setERL(String(s.remainingLessons)); setETL(String(s.totalLessons));
    setEAP(String(s.amountPaid)); setEAD(String(s.amountDue));
    setEPS(s.paymentStatus); setENotes(s.notes ?? "");
    setEditSt(s);
  };

  const handleEdit = async () => {
    if (!editSt) return;
    setESaving(true);
    try {
      await updateStudent(editSt.id, {
        fullName:         eName.trim(),
        phone:            ePhone.trim(),
        level:            eLevel as Student["level"],
        remainingLessons: Number(eRL),
        totalLessons:     Number(eTL),
        amountPaid:       Number(eAP),
        amountDue:        Number(eAD),
        paymentStatus:    ePS as Student["paymentStatus"],
        notes:            eNotes.trim() || undefined,
      });
      await reload();      // ← Supabase'den taze veri çek
      setEditSt(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Güncelleme başarısız:\n" + msg);
    } finally {
      setESaving(false);
    }
  };

  /* ── Sil ─────────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!delSt) return;
    setDelSaving(true);
    try {
      await deleteStudent(delSt.id);
      await reload();      // ← Supabase'den taze veri çek
      setDelSt(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Silme başarısız:\n" + msg);
    } finally {
      setDelSaving(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Admin</span>
          </div>
          <h1 className="text-3xl font-display text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>ÖĞRENCİ YÖNETİMİ</h1>
          <p className="text-white/35 text-sm mt-0.5" style={{ fontFamily: "var(--font-inter)" }}>
            {loading ? "Yükleniyor..." : `${students.length} toplam öğrenci`}
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          <Plus size={14} />Yeni Öğrenci
        </button>
      </div>

      {/* Supabase bağlantı durumu */}
      {!isSupabaseConfigured ? (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm text-yellow-400 font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              ⚠️ Supabase bağlı değil — veriler kalıcı olmaz!
            </div>
            <div className="text-xs text-yellow-400/60 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              .env.local dosyasını doldurun ve npm run dev&apos;i yeniden başlatın.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/8 border border-green-500/20">
          <CheckCircle size={14} className="text-green-400" />
          <span className="text-xs text-green-400 tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Supabase bağlı — tüm veriler kalıcı olarak kaydedilir
          </span>
        </div>
      )}

      {/* Genel hata */}
      {error && (
        <div className="p-3 bg-crimson/10 border border-crimson/30 text-xs text-crimson" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
          ⛔ {error}
        </div>
      )}

      {/* ── YENİ ÖĞRENCİ FORMU ────────────────────────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-carbon border border-crimson/30 relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>YENİ ÖĞRENCİ EKLE</h2>
                <button onClick={() => setAddOpen(false)} className="text-white/25 hover:text-white transition-colors"><X size={18} /></button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <F label="Ad Soyad *" value={aName} onChange={setAName} placeholder="Ahmet Yılmaz" col2 />
                <F label="Telefon *" value={aPhone} onChange={setAPhone} placeholder="05XX XXX XX XX" />
                <F label="E-posta" value={aEmail} onChange={setAEmail} placeholder="ornek@email.com" />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <Sel label="Seviye" value={aLevel} onChange={setALevel} options={[
                  { value: "baslangic", label: "Başlangıç" },
                  { value: "orta", label: "Orta Seviye" },
                  { value: "ileri", label: "İleri Seviye" },
                ]} />
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Toplam Ders *</label>
                  <input type="number" min="1" value={aTotalLessons} onChange={e => setATL(e.target.value)}
                    className="w-full bg-steel/60 border-2 border-gold/30 focus:border-gold text-gold-bright px-3 py-2.5 text-lg outline-none"
                    style={{ fontFamily: "var(--font-bebas)" }} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödenen (₺)</label>
                  <input type="number" min="0" value={aAmountPaid} onChange={e => setAAP(e.target.value)} placeholder="0"
                    className="w-full bg-steel/60 border-2 border-green-500/25 focus:border-green-500/60 text-green-400 px-3 py-2.5 text-lg outline-none"
                    style={{ fontFamily: "var(--font-bebas)" }} />
                </div>
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kalan Borç (₺)</label>
                  <input type="number" min="0" value={aAmountDue} onChange={e => setAAD(e.target.value)} placeholder="0"
                    className="w-full bg-steel/60 border-2 border-crimson/25 focus:border-crimson/60 text-crimson px-3 py-2.5 text-lg outline-none"
                    style={{ fontFamily: "var(--font-bebas)" }} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <Sel label="Ödeme Durumu" value={aPayStatus} onChange={setAPayStatus} options={[
                  { value: "beklemede", label: "Beklemede" },
                  { value: "kismi", label: "Kısmi Ödeme" },
                  { value: "odendi", label: "Ödendi" },
                ]} />
                <F label="Not (isteğe bağlı)" value={aNotes} onChange={setANotes} placeholder="Öğrenci hakkında not..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setAddOpen(false)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Vazgeç</button>
                <button onClick={handleAdd} disabled={!aName.trim() || !aPhone.trim() || aSaving}
                  className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {aSaving ? "Kaydediliyor..." : "Öğrenci Ekle"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arama + filtre */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Ad, kod veya telefon..."
            className="w-full bg-carbon border border-white/10 text-white placeholder-white/20 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-crimson/50 transition-all"
            style={{ fontFamily: "var(--font-inter)" }} />
        </div>
        <div className="flex gap-1.5">
          {[["all","Tümü"],["active","Aktif"],["payment","Ödeme Bekl."],["low","Ders Az"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-2 text-xs tracking-wider transition-all border ${filter === v ? "bg-crimson border-crimson text-white" : "border-white/10 text-white/35 hover:border-white/20"}`}
              style={{ fontFamily: "var(--font-barlow-condensed)" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-carbon border border-white/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-steel/30">
                {["Öğrenci","Kod","Kalan / Toplam","Ödenen","Borç","Ödeme","İşlem"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-white/30 tracking-widest uppercase whitespace-nowrap"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-white/30 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yükleniyor...</td></tr>
              ) : (
                <AnimatePresence>
                  {filtered.map((s, i) => (
                    <motion.tr key={s.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className={`border-b border-white/5 hover:bg-steel/15 transition-colors ${editSt?.id === s.id ? "bg-crimson/5" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-crimson/10 border border-crimson/20 flex items-center justify-center text-xs text-crimson font-display flex-shrink-0" style={{ fontFamily: "var(--font-bebas)" }}>
                            {s.fullName.split(" ").map(n => n[0]).join("").slice(0,2)}
                          </div>
                          <div>
                            <div className="text-sm text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.fullName}</div>
                            <div className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-sm text-gold font-mono tracking-wider">{s.code}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-lg font-display ${s.remainingLessons <= 2 ? "text-crimson" : "text-white"}`} style={{ fontFamily: "var(--font-bebas)" }}>{s.remainingLessons}</span>
                        <span className="text-sm text-white/25 font-display" style={{ fontFamily: "var(--font-bebas)" }}>/{s.totalLessons}</span>
                      </td>
                      <td className="px-4 py-3"><span className="text-sm text-green-400 font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.amountPaid > 0 ? `₺${s.amountPaid.toLocaleString("tr-TR")}` : "—"}</span></td>
                      <td className="px-4 py-3"><span className={`text-sm font-semibold ${s.amountDue > 0 ? "text-crimson" : "text-white/25"}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.amountDue > 0 ? `₺${s.amountDue.toLocaleString("tr-TR")}` : "✓"}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 border ${s.paymentStatus === "odendi" ? "border-green-500/20 bg-green-500/8 text-green-400" : s.paymentStatus === "kismi" ? "border-gold/20 bg-gold/8 text-gold" : "border-crimson/20 bg-crimson/8 text-crimson"}`}
                          style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                          {PAYMENT_LABELS[s.paymentStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => setQrSt(s)} className="p-1.5 text-white/25 hover:text-gold transition-colors" title="QR"><QrCode size={13} /></button>
                          <a href={`https://wa.me/90${s.phone.replace(/\D/g,"").slice(-10)}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-white/25 hover:text-green-400 transition-colors" title="WhatsApp"><Phone size={13} /></a>
                          <button onClick={() => openEdit(s)} className="p-1.5 text-white/25 hover:text-gold transition-colors" title="Düzenle"><Edit size={13} /></button>
                          <button onClick={() => setDelSt(s)} className="p-1.5 text-white/25 hover:text-crimson transition-colors" title="Sil"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12"><User size={28} className="text-white/10 mx-auto mb-2" /><p className="text-white/20 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Öğrenci bulunamadı</p></div>
          )}
        </div>
      </div>

      {/* ── DÜZENLEME MODAL ───────────────────────────────────────── */}
      {editSt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditSt(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-2xl bg-carbon border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson font-display text-sm" style={{ fontFamily: "var(--font-bebas)" }}>
                  {editSt.fullName.split(" ").map(n => n[0]).join("").slice(0,2)}
                </div>
                <div>
                  <div className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>{editSt.fullName}</div>
                  <div className="text-xs text-gold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{editSt.code}</div>
                </div>
                <button onClick={() => setEditSt(null)} className="ml-auto text-white/25 hover:text-white"><X size={18} /></button>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <F label="Ad Soyad" value={eName} onChange={setEName} />
                <F label="Telefon" value={ePhone} onChange={setEPhone} />
              </div>
              <Sel label="Seviye" value={eLevel} onChange={setELevel} options={[
                { value: "baslangic", label: "Başlangıç" },
                { value: "orta", label: "Orta Seviye" },
                { value: "ileri", label: "İleri Seviye" },
              ]} />

              <div className="mt-4 p-4 bg-steel/30 border border-gold/15 space-y-3">
                <div className="text-xs text-gold tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ders Bilgileri</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kalan Ders *</label>
                    <input type="number" min="0" value={eRL} onChange={e => setERL(e.target.value)}
                      className="w-full bg-carbon border-2 border-gold/40 focus:border-gold text-gold-bright px-3 py-3 text-lg outline-none font-display tracking-wider"
                      style={{ fontFamily: "var(--font-bebas)" }} />
                    <p className="text-xs text-white/20 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Mevcut: {editSt.remainingLessons}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Toplam Ders</label>
                    <input type="number" min="0" value={eTL} onChange={e => setETL(e.target.value)}
                      className="w-full bg-carbon border-2 border-white/15 focus:border-white/30 text-white px-3 py-3 text-lg outline-none font-display tracking-wider"
                      style={{ fontFamily: "var(--font-bebas)" }} />
                    <p className="text-xs text-white/20 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Mevcut: {editSt.totalLessons}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 p-4 bg-steel/30 border border-crimson/10 space-y-3">
                <div className="text-xs text-crimson tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödeme Bilgileri</div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödenen (₺)</label>
                    <input type="number" min="0" value={eAP} onChange={e => setEAP(e.target.value)}
                      className="w-full bg-carbon border-2 border-green-500/30 text-green-400 px-3 py-3 text-lg outline-none font-display tracking-wider"
                      style={{ fontFamily: "var(--font-bebas)" }} />
                    <p className="text-xs text-white/20 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Mevcut: ₺{editSt.amountPaid.toLocaleString("tr-TR")}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kalan Borç (₺)</label>
                    <input type="number" min="0" value={eAD} onChange={e => setEAD(e.target.value)}
                      className="w-full bg-carbon border-2 border-crimson/25 text-crimson px-3 py-3 text-lg outline-none font-display tracking-wider"
                      style={{ fontFamily: "var(--font-bebas)" }} />
                    <p className="text-xs text-white/20 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Mevcut: ₺{editSt.amountDue.toLocaleString("tr-TR")}</p>
                  </div>
                  <Sel label="Ödeme Durumu" value={ePS} onChange={setEPS} options={[
                    { value: "beklemede", label: "Beklemede" },
                    { value: "kismi", label: "Kısmi Ödeme" },
                    { value: "odendi", label: "Ödendi" },
                  ]} />
                </div>
              </div>

              <div className="mt-3"><F label="Not (isteğe bağlı)" value={eNotes} onChange={setENotes} placeholder="Öğrenci hakkında not..." /></div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setEditSt(null)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Vazgeç</button>
                <button onClick={handleEdit} disabled={eSaving}
                  className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {eSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── SİLME ONAYI ─────────────────────────────────────────────── */}
      {delSt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDelSt(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-sm bg-carbon border border-white/10 p-6"
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
            <h3 className="text-xl font-display text-white tracking-wider mb-2" style={{ fontFamily: "var(--font-bebas)" }}>ÖĞRENCİYİ SİL</h3>
            <p className="text-sm text-white/50 mb-5" style={{ fontFamily: "var(--font-inter)" }}>
              <strong>{delSt.fullName}</strong> ({delSt.code}) ve tüm verileri Supabase&apos;den kalıcı olarak silinecek.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDelSt(null)}
                className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>Vazgeç</button>
              <button onClick={handleDelete} disabled={delSaving}
                className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {delSaving ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── QR MODAL ──────────────────────────────────────────────── */}
      {qrSt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setQrSt(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-xs bg-carbon border border-gold/20 p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-6xl font-display text-gold-bright mb-3" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.2em" }}>{qrSt.code}</div>
            <div className="text-white font-semibold mb-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{qrSt.fullName}</div>
            <p className="text-xs text-white/25 mt-2" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Bu kodu öğrenciye verin. /giris sayfasında kullanacaklar.
            </p>
            <button onClick={() => setQrSt(null)} className="mt-4 text-xs text-white/30 hover:text-white tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}
