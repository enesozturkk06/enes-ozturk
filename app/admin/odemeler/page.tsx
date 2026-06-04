"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStudents, getPayments, addPayment, deletePayment } from "@/lib/db";
import type { Student, Payment } from "@/lib/types";
import { PAYMENT_LABELS } from "@/lib/constants";
import {
  Plus, Trash2, ChevronDown, ChevronUp, TrendingUp,
  AlertTriangle, CreditCard, X, Check,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO, subMonths } from "date-fns";
import { tr } from "date-fns/locale";

/* ── Yardımcı: YYYY-MM → "Haziran 2026" ──────────────────────────── */
const monthLabel = (ym: string) =>
  format(parseISO(`${ym}-01`), "MMMM yyyy", { locale: tr });

/* ── Yardımcı: ödemeleri aya göre grupla ─────────────────────────── */
function groupByMonth(payments: Payment[]): Record<string, Payment[]> {
  return payments.reduce<Record<string, Payment[]>>((acc, p) => {
    const m = p.paidAt.substring(0, 7);
    if (!acc[m]) acc[m] = [];
    acc[m].push(p);
    return acc;
  }, {});
}

/* ── Küçük input ──────────────────────────────────────────────────── */
function F({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
        style={{ fontFamily: "var(--font-barlow-condensed)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none transition-colors"
        style={{ fontFamily: "var(--font-inter)" }} />
    </div>
  );
}

/* ── Ana sayfa ────────────────────────────────────────────────────── */
export default function OdemelerPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  /* Yeni ödeme formu */
  const [addOpen, setAddOpen] = useState(false);
  const [selStudent, setSelStudent] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("nakit");
  const [paidDate, setPaidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  /* Silme onayı */
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* Açık aylar */
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([getStudents(), getPayments()]).then(([s, p]) => {
      setStudents(s);
      setPayments(p);
      // Bu ayı otomatik aç
      const thisMonth = format(new Date(), "yyyy-MM");
      setOpenMonths(new Set([thisMonth]));
    });
  }, []);

  /* ── İstatistikler ─────────────────────────────────────────────── */
  const thisMonthKey = format(new Date(), "yyyy-MM");
  const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
  const thisMonthTotal = payments.filter(p => p.paidAt.startsWith(thisMonthKey)).reduce((s, p) => s + p.amount, 0);
  const totalDue = students.reduce((s, st) => s + st.amountDue, 0);
  const debtors = students.filter(s => s.amountDue > 0);

  /* ── Son 6 aylık bar grafik ────────────────────────────────────── */
  const barData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const key = format(d, "yyyy-MM");
    const total = payments.filter(p => p.paidAt.startsWith(key)).reduce((s, p) => s + p.amount, 0);
    return {
      ay: format(d, "MMM", { locale: tr }),
      gelir: total,
      key,
    };
  });

  /* ── Aylık gruplar ─────────────────────────────────────────────── */
  const byMonth = groupByMonth(payments);
  const sortedMonths = Object.keys(byMonth).sort().reverse();

  /* ── Ay aç/kapat ───────────────────────────────────────────────── */
  const toggleMonth = (m: string) => {
    setOpenMonths(prev => {
      const n = new Set(prev);
      n.has(m) ? n.delete(m) : n.add(m);
      return n;
    });
  };

  /* ── Ödeme ekle ────────────────────────────────────────────────── */
  const openAdd = () => {
    setSelStudent(""); setAmount(""); setMethod("nakit");
    setPaidDate(format(new Date(), "yyyy-MM-dd")); setNote("");
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!selStudent || !amount) return;
    setSaving(true);
    const student = students.find(s => s.id === selStudent)!;
    await addPayment({
      studentId: selStudent,
      studentName: student.fullName,
      amount: Number(amount),
      paidAt: paidDate,
      method,
      notes: note.trim(),
    });
    const [s, p] = await Promise.all([getStudents(), getPayments()]);
    setStudents(s); setPayments(p);
    // Eklenen ayı aç
    const addedMonth = paidDate.substring(0, 7);
    setOpenMonths(prev => new Set([...prev, addedMonth]));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    setAddOpen(false);
  };

  /* ── Ödeme sil ─────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePayment(deleteId);
    const [s, p] = await Promise.all([getStudents(), getPayments()]);
    setStudents(s); setPayments(p);
    setDeleteId(null);
  };

  const selectedStudent = students.find(s => s.id === selStudent);

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Admin</span>
          </div>
          <h1 className="text-3xl font-display text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>ÖDEME TAKİBİ</h1>
          <p className="text-white/35 text-sm mt-0.5" style={{ fontFamily: "var(--font-inter)" }}>
            {payments.length} kayıt · Aylık gelir analizi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {saved && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-green-400 text-xs" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                <Check size={13} />Kaydedildi
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            <Plus size={14} />Ödeme Ekle
          </button>
        </div>
      </div>

      {/* ── YENİ ÖDEME FORMU ──────────────────────────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-carbon border border-crimson/30 relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                  YENİ ÖDEME EKLE
                </h2>
                <button onClick={() => setAddOpen(false)} className="text-white/25 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                {/* Öğrenci seç */}
                <div className="sm:col-span-2">
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Öğrenci *</label>
                  <select value={selStudent} onChange={e => setSelStudent(e.target.value)}
                    className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white px-3 py-2.5 text-sm outline-none transition-colors appearance-none"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    <option value="" className="bg-carbon">Öğrenci seçin...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id} className="bg-carbon">
                        {s.fullName} ({s.code}) {s.amountDue > 0 ? `— ₺${s.amountDue.toLocaleString("tr-TR")} borç` : ""}
                      </option>
                    ))}
                  </select>
                  {/* Mevcut borç göstergesi */}
                  {selectedStudent && selectedStudent.amountDue > 0 && (
                    <p className="text-xs text-crimson/70 mt-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      Mevcut borç: ₺{selectedStudent.amountDue.toLocaleString("tr-TR")}
                    </p>
                  )}
                </div>

                {/* Miktar */}
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Miktar (₺) *</label>
                  <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-steel/60 border-2 border-green-500/30 focus:border-green-500/60 text-green-400 px-3 py-2.5 text-lg outline-none transition-colors font-display tracking-wider"
                    style={{ fontFamily: "var(--font-bebas)" }} />
                </div>

                {/* Tarih */}
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödeme Tarihi *</label>
                  <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
                    className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white px-3 py-2.5 text-sm outline-none transition-colors"
                    style={{ fontFamily: "var(--font-inter)" }} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödeme Yöntemi</label>
                  <select value={method} onChange={e => setMethod(e.target.value)}
                    className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white px-3 py-2.5 text-sm outline-none transition-colors appearance-none"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    <option value="nakit" className="bg-carbon">Nakit</option>
                    <option value="havale" className="bg-carbon">Havale / EFT</option>
                    <option value="kredi" className="bg-carbon">Kredi Kartı</option>
                    <option value="papara" className="bg-carbon">Papara</option>
                    <option value="aylik" className="bg-carbon">Aylık Üyelik</option>
                  </select>
                </div>
                <F label="Not (isteğe bağlı)" value={note} onChange={setNote} placeholder="Paket adı, açıklama..." />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setAddOpen(false)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Vazgeç</button>
                <button onClick={handleAdd} disabled={!selStudent || !amount || saving}
                  className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {saving ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STAT KARTLAR ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Toplam Tahsilat", value: `₺${totalCollected.toLocaleString("tr-TR")}`, sub: "Tüm zamanlar", color: "text-gold-bright", icon: <CreditCard size={16} /> },
          { label: format(new Date(), "MMMM", { locale: tr }), value: `₺${thisMonthTotal.toLocaleString("tr-TR")}`, sub: "Bu ayın geliri", color: "text-green-400", icon: <TrendingUp size={16} /> },
          { label: "Toplam Borç", value: `₺${totalDue.toLocaleString("tr-TR")}`, sub: `${debtors.length} öğrenci`, color: "text-crimson", icon: <AlertTriangle size={16} /> },
          { label: "Ödeme Bekleyen", value: debtors.length, sub: "Öğrenci sayısı", color: "text-white", icon: <CreditCard size={16} /> },
        ].map(s => (
          <div key={s.label} className="bg-carbon border border-white/6 p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs text-white/30 tracking-widest uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</span>
              <span className={s.color}>{s.icon}</span>
            </div>
            <div className={`text-2xl font-display ${s.color}`} style={{ fontFamily: "var(--font-bebas)" }}>{s.value}</div>
            <div className="text-xs text-white/25 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── SON 6 AY GELİR GRAFİĞİ ───────────────────────────────── */}
      <div className="bg-carbon border border-white/6 p-5">
        <h3 className="text-lg font-display text-white tracking-wider mb-4" style={{ fontFamily: "var(--font-bebas)" }}>
          Son 6 Aylık Gelir
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="ay" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "var(--font-barlow-condensed)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v === 0 ? "" : `₺${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 0, fontSize: 12 }}
              labelStyle={{ color: "#fff", fontFamily: "var(--font-barlow-condensed)" }}
              formatter={(v: unknown) => `₺${Number(v).toLocaleString("tr-TR")}`}
              cursor={{ fill: "rgba(220,38,38,0.06)" }}
            />
            <Bar dataKey="gelir" fill="#dc2626" radius={[2, 2, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── AYLIK GELİR LİSTESİ ───────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
          Aylık Detay
        </h3>

        {sortedMonths.length === 0 && (
          <div className="text-center py-12 bg-carbon border border-white/6">
            <CreditCard size={32} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Henüz ödeme kaydı yok</p>
          </div>
        )}

        {sortedMonths.map(month => {
          const monthPayments = byMonth[month].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
          const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0);
          const isOpen = openMonths.has(month);
          const isThisMonth = month === thisMonthKey;

          return (
            <div key={month} className={`bg-carbon border overflow-hidden transition-colors ${isThisMonth ? "border-crimson/25" : "border-white/6"}`}>

              {/* Ay başlığı — tıklanabilir */}
              <button
                onClick={() => toggleMonth(month)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-steel/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`text-base font-display tracking-wider ${isThisMonth ? "text-crimson" : "text-white"}`}
                    style={{ fontFamily: "var(--font-bebas)" }}>
                    {monthLabel(month).toUpperCase()}
                  </div>
                  {isThisMonth && (
                    <span className="text-xs px-2 py-0.5 bg-crimson/10 border border-crimson/20 text-crimson"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bu Ay</span>
                  )}
                  <span className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    {monthPayments.length} ödeme
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-display text-green-400" style={{ fontFamily: "var(--font-bebas)" }}>
                    ₺{monthTotal.toLocaleString("tr-TR")}
                  </span>
                  {isOpen ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                </div>
              </button>

              {/* Ay ödemeleri */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/5 divide-y divide-white/5">
                      {monthPayments.map(p => (
                        <div key={p.id} className="flex items-center gap-3 px-5 py-3 hover:bg-steel/15 transition-colors group">
                          {/* Renk etiketi */}
                          <div className="w-1 h-10 bg-green-500/50 flex-shrink-0 rounded-full" />

                          {/* Tarih */}
                          <div className="w-16 flex-shrink-0">
                            <div className="text-xs text-white/35" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                              {format(parseISO(p.paidAt), "dd MMM", { locale: tr })}
                            </div>
                          </div>

                          {/* Öğrenci */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                              {p.studentName}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs"
                                style={{
                                  color: p.method === "aylik" ? "rgba(139,92,246,0.8)" : "rgba(255,255,255,0.3)",
                                  fontFamily: "var(--font-barlow-condensed)",
                                }}>
                                {p.method === "aylik" ? "Aylık Üyelik" : p.method}
                              </span>
                              {p.notes && (
                                <>
                                  <span className="text-white/15">·</span>
                                  <span className="text-xs text-white/25 truncate" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                                    {p.notes}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Tutar */}
                          <div className="text-base font-display text-green-400 flex-shrink-0"
                            style={{ fontFamily: "var(--font-bebas)" }}>
                            +₺{p.amount.toLocaleString("tr-TR")}
                          </div>

                          {/* Sil butonu */}
                          <button
                            onClick={() => setDeleteId(p.id)}
                            title="Ödemeyi sil"
                            className="p-1.5 text-white/0 group-hover:text-white/20 hover:!text-crimson transition-colors flex-shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── BORÇLULAR ─────────────────────────────────────────────── */}
      {debtors.length > 0 && (
        <div className="bg-carbon border border-crimson/15">
          <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
            <AlertTriangle size={15} className="text-crimson" />
            <h3 className="text-base font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
              ÖDEME BEKLEYENLEr ({debtors.length})
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {debtors.map(s => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3 hover:bg-steel/15 transition-colors">
                <div className="w-8 h-8 bg-crimson/10 border border-crimson/20 flex items-center justify-center text-xs text-crimson font-display flex-shrink-0"
                  style={{ fontFamily: "var(--font-bebas)" }}>
                  {s.fullName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.fullName}</div>
                  <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.code}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-base font-display text-crimson" style={{ fontFamily: "var(--font-bebas)" }}>
                    ₺{s.amountDue.toLocaleString("tr-TR")}
                  </div>
                  <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    {PAYMENT_LABELS[s.paymentStatus]}
                  </div>
                </div>
                <a
                  href={`https://wa.me/90${s.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(`Merhaba ${s.fullName}, ₺${s.amountDue.toLocaleString("tr-TR")} tutarında ödemeniz bulunmaktadır. Bilginize 🥊`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs text-green-400/60 hover:text-green-400 tracking-wider transition-colors px-2 py-1 border border-green-500/15 hover:border-green-500/30"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}
                >WA</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SİLME ONAYI ───────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteId(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-carbon border border-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-crimson/10 border border-crimson/20 flex items-center justify-center">
                  <Trash2 size={18} className="text-crimson" />
                </div>
                <div>
                  <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                    ÖDEMEYİ SİL
                  </h3>
                  {deleteId && (() => {
                    const p = payments.find(x => x.id === deleteId);
                    return p ? (
                      <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {p.studentName} · ₺{p.amount.toLocaleString("tr-TR")} · {p.paidAt}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
              <p className="text-sm text-white/50 mb-5" style={{ fontFamily: "var(--font-inter)" }}>
                Bu ödeme kaydı silinecek. Öğrencinin ödenen tutarı azalacak, borcu artacaktır.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Vazgeç</button>
                <button onClick={handleDelete}
                  className="flex-1 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Evet, Sil</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
