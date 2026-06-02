"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStudents, createStudent, updateStudent, deleteStudent } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { Student } from "@/lib/types";
import { Badge, PageHeader, Modal } from "@/app/components/ui";
import { PAYMENT_LABELS, LEVEL_LABELS } from "@/lib/constants";
import { Search, Plus, Edit, Trash2, Phone, User, QrCode, X, Check, AlertTriangle } from "lucide-react";

/* ─── Sabitler ───────────────────────────────────────────────────────── */
function genCode(students: Student[]) {
  const nums = students.map(s => parseInt(s.code.replace("ENES", ""))).filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `ENES${String(next).padStart(3, "0")}`;
}

/* ─── Küçük input ────────────────────────────────────────────────────── */
function F({
  label, value, onChange, type = "text", placeholder, span,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; span?: boolean;
}) {
  return (
    <div className={span ? "sm:col-span-2" : ""}>
      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
        style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none transition-colors"
        style={{ fontFamily: "var(--font-inter)" }}
      />
    </div>
  );
}

function Sel({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
        style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white px-3 py-2.5 text-sm outline-none transition-colors appearance-none"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-carbon">{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ─── Ana bileşen ────────────────────────────────────────────────────── */
export default function OgrencilerPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  /* Ekle paneli */
  const [addOpen, setAddOpen] = useState(false);
  const [aName, setAName] = useState("");
  const [aPhone, setAPhone] = useState("");
  const [aEmail, setAEmail] = useState("");
  const [aLevel, setALevel] = useState("baslangic");
  const [aTotalLessons, setATotalLessons] = useState("8");    // ← kullanıcı girer
  const [aAmountPaid, setAAmountPaid] = useState("");         // ← kullanıcı girer
  const [aAmountDue, setAAmountDue] = useState("");           // ← kullanıcı girer
  const [aPayStatus, setAPayStatus] = useState("beklemede");
  const [aNotes, setANotes] = useState("");
  const [aSaving, setASaving] = useState(false);

  /* Düzenle paneli */
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [eName, setEName] = useState("");
  const [ePhone, setEPhone] = useState("");
  const [eLevel, setELevel] = useState("baslangic");
  const [eRemainingLessons, setERemainingLessons] = useState(""); // ← kullanıcı girer
  const [eTotalLessons, setETotalLessons] = useState("");         // ← kullanıcı girer
  const [eAmountPaid, setEAmountPaid] = useState("");             // ← kullanıcı girer
  const [eAmountDue, setEAmountDue] = useState("");               // ← kullanıcı girer
  const [ePayStatus, setEPayStatus] = useState("beklemede");
  const [eNotes, setENotes] = useState("");
  const [eSaving, setESaving] = useState(false);

  /* Diğer modaller */
  const [deleteStudent_, setDeleteStudent] = useState<Student | null>(null);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);

  useEffect(() => { getStudents().then(setStudents); }, []);

  /* ─── Filtre ─────────────────────────────────────────────────── */
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchQ = s.fullName.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.phone.includes(q);
    const matchF = filter === "all" ? true
      : filter === "active" ? s.isActive
      : filter === "payment" ? s.paymentStatus !== "odendi"
      : filter === "low" ? s.remainingLessons <= 2 : true;
    return matchQ && matchF;
  });

  /* ─── Ekle ───────────────────────────────────────────────────── */
  const openAdd = () => {
    setAName(""); setAPhone(""); setAEmail(""); setALevel("baslangic");
    setATotalLessons("8"); setAAmountPaid(""); setAAmountDue(""); setAPayStatus("beklemede"); setANotes("");
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!aName.trim() || !aPhone.trim()) return;
    setASaving(true);
    const today = new Date().toISOString().split("T")[0];
    const total = Number(aTotalLessons) || 8;
    const paid = Number(aAmountPaid) || 0;
    const due = Number(aAmountDue) || 0;
    const code = genCode(students);

    console.log("📤 Öğrenci ekleniyor:", { code, fullName: aName.trim(), isSupabaseConfigured });

    const result = await createStudent({
      code,
      fullName: aName.trim(),
      phone: aPhone.trim(),
      email: aEmail.trim(),
      level: aLevel as Student["level"],
      packageType: "sampiyon",
      totalLessons: total,
      remainingLessons: total,
      completedLessons: 0,
      paymentStatus: aPayStatus as Student["paymentStatus"],
      amountPaid: paid,
      amountDue: due,
      packageStartDate: today,
      packageEndDate: today,
      notes: aNotes.trim(),
      isActive: true,
    });

    if (result) {
      console.log("✅ Öğrenci eklendi:", result.id);
    } else {
      console.error("❌ Öğrenci eklenemedi — createStudent null döndü");
    }

    const fresh = await getStudents();
    console.log("📋 Güncel öğrenci listesi:", fresh.length, "kişi");
    setStudents(fresh);
    setASaving(false);
    if (result) setAddOpen(false);
  };

  /* ─── Düzenle aç ─────────────────────────────────────────────── */
  const openEdit = (s: Student) => {
    setEName(s.fullName);
    setEPhone(s.phone);
    setELevel(s.level);
    setERemainingLessons(String(s.remainingLessons));
    setETotalLessons(String(s.totalLessons));
    setEAmountPaid(String(s.amountPaid));
    setEAmountDue(String(s.amountDue));
    setEPayStatus(s.paymentStatus);
    setENotes(s.notes ?? "");
    setEditStudent(s);
  };

  /* ─── Güncelle ───────────────────────────────────────────────── */
  const handleEdit = async () => {
    if (!editStudent) return;
    setESaving(true);
    await updateStudent(editStudent.id, {
      fullName: eName.trim(),
      phone: ePhone.trim(),
      level: eLevel as Student["level"],
      remainingLessons: Number(eRemainingLessons),
      totalLessons: Number(eTotalLessons),
      amountPaid: Number(eAmountPaid),
      amountDue: Number(eAmountDue),
      paymentStatus: ePayStatus as Student["paymentStatus"],
      notes: eNotes.trim(),
    });
    setStudents(await getStudents());
    setESaving(false);
    setEditStudent(null);
  };

  /* ─── Sil ────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteStudent_) return;
    await deleteStudent(deleteStudent_.id);
    setStudents(prev => prev.filter(s => s.id !== deleteStudent_.id));
    setDeleteStudent(null);
  };

  /* ─── Render ─────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Admin</span>
          </div>
          <h1 className="text-3xl font-display text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>
            ÖĞRENCİ YÖNETİMİ
          </h1>
          <p className="text-white/35 text-sm mt-0.5" style={{ fontFamily: "var(--font-inter)" }}>
            {students.length} toplam öğrenci
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          style={{ fontFamily: "var(--font-barlow-condensed)" }}
        >
          <Plus size={14} />Yeni Öğrenci
        </button>
      </div>

      {/* ── SUPABASE BAĞLANTI UYARISI ───────────────────────────── */}
      {!isSupabaseConfigured && (
        <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm text-yellow-400 font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              ⚠️ Supabase Bağlı Değil — Veriler Kaydedilmez!
            </div>
            <div className="text-xs text-yellow-400/60 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              .env.local dosyasında NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY eksik.
              Dosyayı doldurup <strong>npm run dev yeniden başlatın</strong>.
            </div>
          </div>
        </div>
      )}
      {isSupabaseConfigured && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-500/8 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 tracking-wider" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            Supabase bağlı — veriler kalıcı olarak kaydedilir
          </span>
        </div>
      )}

      {/* ── YENİ ÖĞRENCİ FORMU (inline panel) ──────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="bg-carbon border border-crimson/30 relative"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                  YENİ ÖĞRENCİ EKLE
                </h2>
                <button onClick={() => setAddOpen(false)} className="text-white/25 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div className="sm:col-span-2">
                  <F label="Ad Soyad *" value={aName} onChange={setAName} placeholder="Ahmet Yılmaz" />
                </div>
                <F label="Telefon *" value={aPhone} onChange={setAPhone} placeholder="05XX XXX XX XX" />
                <F label="E-posta" value={aEmail} onChange={setAEmail} placeholder="ornek@email.com" />
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <Sel label="Seviye" value={aLevel} onChange={setALevel} options={[
                  { value: "baslangic", label: "Başlangıç" },
                  { value: "orta", label: "Orta Seviye" },
                  { value: "ileri", label: "İleri Seviye" },
                ]} />
                {/* ← MANUEL GİRİŞ */}
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Toplam Ders Sayısı <span className="text-crimson">*</span>
                  </label>
                  <input
                    type="number" min="1" value={aTotalLessons} onChange={e => setATotalLessons(e.target.value)}
                    className="w-full bg-steel/60 border-2 border-gold/30 focus:border-gold text-gold-bright px-3 py-2.5 text-sm outline-none transition-colors font-semibold"
                    style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}
                  />
                  <p className="text-xs text-white/20 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>ders paketi adedi</p>
                </div>
                {/* ← ÖDENEN PARA MANUEL */}
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Ödenen (₺)
                  </label>
                  <input
                    type="number" min="0" value={aAmountPaid} onChange={e => setAAmountPaid(e.target.value)}
                    placeholder="0"
                    className="w-full bg-steel/60 border-2 border-green-500/25 focus:border-green-500/60 text-green-400 px-3 py-2.5 text-sm outline-none transition-colors font-semibold"
                    style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}
                  />
                </div>
                {/* ← KALAN BORÇ MANUEL */}
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Kalan Borç (₺)
                  </label>
                  <input
                    type="number" min="0" value={aAmountDue} onChange={e => setAAmountDue(e.target.value)}
                    placeholder="0"
                    className="w-full bg-steel/60 border-2 border-crimson/25 focus:border-crimson/60 text-crimson px-3 py-2.5 text-sm outline-none transition-colors font-semibold"
                    style={{ fontFamily: "var(--font-bebas)", fontSize: "1.1rem" }}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <Sel label="Ödeme Durumu" value={aPayStatus} onChange={setAPayStatus} options={[
                  { value: "odendi", label: "Ödendi" },
                  { value: "kismi", label: "Kısmi Ödeme" },
                  { value: "beklemede", label: "Beklemede" },
                ]} />
                <F label="Not (isteğe bağlı)" value={aNotes} onChange={setANotes} placeholder="Öğrenci hakkında not..." />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setAddOpen(false)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!aName.trim() || !aPhone.trim() || aSaving}
                  className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >
                  {aSaving ? "Ekleniyor..." : "Öğrenci Ekle"}
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
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ad, kod veya telefon..."
            className="w-full bg-carbon border border-white/10 text-white placeholder-white/20 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-crimson/50 transition-all"
            style={{ fontFamily: "var(--font-inter)" }}
          />
        </div>
        <div className="flex gap-1.5">
          {[
            { v: "all", l: "Tümü" }, { v: "active", l: "Aktif" },
            { v: "payment", l: "Ödeme Bekleyen" }, { v: "low", l: "Ders Az" },
          ].map(({ v, l }) => (
            <button
              key={v} onClick={() => setFilter(v)}
              className={`px-3 py-2 text-xs tracking-wider transition-all border ${filter === v ? "bg-crimson border-crimson text-white" : "border-white/10 text-white/35 hover:border-white/20"}`}
              style={{ fontFamily: "var(--font-barlow-condensed)" }}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Tablo */}
      <div className="bg-carbon border border-white/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-steel/30">
                {["Öğrenci", "Kod", "Kalan / Toplam Ders", "Ödenen", "Borç", "Ödeme", "İşlem"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-white/30 tracking-widest uppercase whitespace-nowrap" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.025 }}
                    className={`border-b border-white/5 hover:bg-steel/15 transition-colors ${editStudent?.id === s.id ? "bg-crimson/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-crimson/10 border border-crimson/20 flex items-center justify-center text-xs text-crimson font-display flex-shrink-0" style={{ fontFamily: "var(--font-bebas)" }}>
                          {s.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.fullName}</div>
                          <div className="text-xs text-white/25" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gold font-mono tracking-wider">{s.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      {/* ← Kalan/Toplam ders gösterimi */}
                      <span className={`text-lg font-display ${s.remainingLessons <= 2 ? "text-crimson" : "text-white"}`} style={{ fontFamily: "var(--font-bebas)" }}>
                        {s.remainingLessons}
                      </span>
                      <span className="text-sm text-white/25 font-display" style={{ fontFamily: "var(--font-bebas)" }}>
                        /{s.totalLessons}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-green-400 font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {s.amountPaid > 0 ? `₺${s.amountPaid.toLocaleString("tr-TR")}` : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${s.amountDue > 0 ? "text-crimson" : "text-white/25"}`} style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {s.amountDue > 0 ? `₺${s.amountDue.toLocaleString("tr-TR")}` : "✓"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={s.paymentStatus === "odendi" ? "green" : s.paymentStatus === "kismi" ? "gold" : "red"}>
                        {PAYMENT_LABELS[s.paymentStatus]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setQrStudent(s)} className="p-1.5 text-white/25 hover:text-gold transition-colors" title="QR Kod"><QrCode size={13} /></button>
                        <a href={`https://wa.me/90${s.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-white/25 hover:text-green-400 transition-colors" title="WhatsApp"><Phone size={13} /></a>
                        <button onClick={() => openEdit(s)} className="p-1.5 text-white/25 hover:text-gold transition-colors" title="Düzenle"><Edit size={13} /></button>
                        <button onClick={() => setDeleteStudent(s)} className="p-1.5 text-white/25 hover:text-crimson transition-colors" title="Sil"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <User size={28} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/20 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Öğrenci bulunamadı</p>
            </div>
          )}
        </div>
      </div>

      {/* ── ÖĞRENCİ DÜZENLEME MODAL ──────────────────────────────── */}
      <Modal open={!!editStudent} onClose={() => setEditStudent(null)} title="Öğrenciyi Düzenle" maxWidth="max-w-2xl">
        {editStudent && (
          <div className="space-y-4">
            {/* Öğrenci kodu göstergesi */}
            <div className="flex items-center gap-3 p-3 bg-steel/40 border border-white/5">
              <div className="w-9 h-9 bg-crimson/10 border border-crimson/20 flex items-center justify-center text-crimson font-display text-sm" style={{ fontFamily: "var(--font-bebas)" }}>
                {editStudent.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{editStudent.fullName}</div>
                <div className="text-xs text-gold tracking-widest" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{editStudent.code}</div>
              </div>
            </div>

            {/* Kişisel bilgiler */}
            <div className="grid sm:grid-cols-2 gap-3">
              <F label="Ad Soyad" value={eName} onChange={setEName} />
              <F label="Telefon" value={ePhone} onChange={setEPhone} />
            </div>

            <Sel label="Seviye" value={eLevel} onChange={setELevel} options={[
              { value: "baslangic", label: "Başlangıç" },
              { value: "orta", label: "Orta Seviye" },
              { value: "ileri", label: "İleri Seviye" },
            ]} />

            {/* ── DERS SAYISI BLOĞU ─────────────────────────────── */}
            <div className="p-4 bg-steel/30 border border-gold/15 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gold tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ders Bilgileri</span>
                <span className="flex-1 h-px bg-gold/15" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Kalan Ders Sayısı <span className="text-crimson">*</span>
                  </label>
                  <input
                    type="number" min="0" value={eRemainingLessons} onChange={e => setERemainingLessons(e.target.value)}
                    className="w-full bg-carbon border-2 border-gold/40 focus:border-gold text-gold-bright px-3 py-3 text-lg outline-none transition-colors font-display tracking-wider"
                    style={{ fontFamily: "var(--font-bebas)" }}
                  />
                  <p className="text-xs text-white/20 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Mevcut: {editStudent.remainingLessons} ders
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Toplam Ders Sayısı
                  </label>
                  <input
                    type="number" min="0" value={eTotalLessons} onChange={e => setETotalLessons(e.target.value)}
                    className="w-full bg-carbon border-2 border-white/15 focus:border-white/30 text-white px-3 py-3 text-lg outline-none transition-colors font-display tracking-wider"
                    style={{ fontFamily: "var(--font-bebas)" }}
                  />
                  <p className="text-xs text-white/20 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Mevcut: {editStudent.totalLessons} ders
                  </p>
                </div>
              </div>
            </div>

            {/* ── ÖDEME BLOĞU ──────────────────────────────────── */}
            <div className="p-4 bg-steel/30 border border-crimson/10 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-crimson tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödeme Bilgileri</span>
                <span className="flex-1 h-px bg-crimson/15" />
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Ödenen (₺) <span className="text-crimson">*</span>
                  </label>
                  <input
                    type="number" min="0" value={eAmountPaid} onChange={e => setEAmountPaid(e.target.value)}
                    className="w-full bg-carbon border-2 border-green-500/30 focus:border-green-500/60 text-green-400 px-3 py-3 text-lg outline-none transition-colors font-display tracking-wider"
                    style={{ fontFamily: "var(--font-bebas)" }}
                  />
                  <p className="text-xs text-white/20 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Mevcut: ₺{editStudent.amountPaid.toLocaleString("tr-TR")}
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Kalan Borç (₺)
                  </label>
                  <input
                    type="number" min="0" value={eAmountDue} onChange={e => setEAmountDue(e.target.value)}
                    className="w-full bg-carbon border-2 border-crimson/25 focus:border-crimson/60 text-crimson px-3 py-3 text-lg outline-none transition-colors font-display tracking-wider"
                    style={{ fontFamily: "var(--font-bebas)" }}
                  />
                  <p className="text-xs text-white/20 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    Mevcut: ₺{editStudent.amountDue.toLocaleString("tr-TR")}
                  </p>
                </div>
                <Sel label="Ödeme Durumu" value={ePayStatus} onChange={setEPayStatus} options={[
                  { value: "odendi", label: "Ödendi" },
                  { value: "kismi", label: "Kısmi Ödeme" },
                  { value: "beklemede", label: "Beklemede" },
                ]} />
              </div>
            </div>

            <F label="Not (isteğe bağlı)" value={eNotes} onChange={setENotes} placeholder="Öğrenci hakkında not..." span />

            <div className="flex gap-3">
              <button
                onClick={() => setEditStudent(null)}
                className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                Vazgeç
              </button>
              <button
                onClick={handleEdit}
                disabled={eSaving}
                className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}
              >
                {eSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Silme onayı */}
      <Modal open={!!deleteStudent_} onClose={() => setDeleteStudent(null)} title="Öğrenci Sil">
        <p className="text-white/55 text-sm mb-4" style={{ fontFamily: "var(--font-inter)" }}>
          <strong>{deleteStudent_?.fullName}</strong> adlı öğrencinin tüm verileri silinecek.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteStudent(null)} className="flex-1 border border-white/10 text-white/40 text-xs font-semibold tracking-widest uppercase py-3 transition-all" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Vazgeç</button>
          <button onClick={handleDelete} className="flex-1 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Sil</button>
        </div>
      </Modal>

      {/* QR modal */}
      <Modal open={!!qrStudent} onClose={() => setQrStudent(null)} title="Giriş Kodu">
        {qrStudent && (
          <div className="text-center space-y-4">
            <div className="inline-flex flex-col items-center justify-center p-8 bg-carbon border border-gold/20">
              <div className="text-[72px] font-display text-gold-bright leading-none tracking-widest mb-2" style={{ fontFamily: "var(--font-bebas)" }}>
                {qrStudent.code}
              </div>
              <div className="text-sm text-white/50" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{qrStudent.fullName}</div>
            </div>
            <p className="text-xs text-white/25 max-w-xs mx-auto" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              Bu kodu öğrenciye gösterin. <strong>{window.location.origin}/giris</strong> adresinde giriş yapacaklar.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
