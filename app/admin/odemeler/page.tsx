"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStudents, getPayments, addPayment, deletePayment, updatePayment,
  getGyms, getGymReports, getFinanceSummary, getIncomeMovements, updateIncomeMovement,
  type GymReport,
} from "@/lib/db";
import type { Student, Payment, PaymentRecordStatus, Gym, IncomeMovement, IncomeMovementType } from "@/lib/types";
import { LESSON_PRICES } from "@/lib/constants";
import {
  Plus, Trash2, ChevronDown, ChevronUp, TrendingUp,
  AlertTriangle, CreditCard, X, Check, Edit2, Clock, Building2, Wallet, Receipt,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO, subMonths } from "date-fns";
import { tr } from "date-fns/locale";

/* ── Paket fiyatı hesapla ─────────────────────────────────────────── */
function getPackagePrice(s: Student): number | null {
  if (s.subscriptionType === "monthly") return s.monthlyFee ?? null;
  if (s.customPrice && s.customPrice > 0) return s.customPrice;
  return LESSON_PRICES[s.totalLessons] ?? null;
}

/* ── Durum etiket / renk ──────────────────────────────────────────── */
const STATUS_CFG: Record<PaymentRecordStatus, { label: string; bg: string; color: string; bar: string }> = {
  odendi:    { label: "Ödendi",     bg: "rgba(34,197,94,0.12)",  color: "#4ADE80", bar: "#22C55E" },
  beklemede: { label: "Beklemede",  bg: "rgba(251,191,36,0.12)", color: "#FBBF24", bar: "#F59E0B" },
  gecikti:   { label: "Gecikti",    bg: "rgba(220,38,38,0.12)",  color: "#F87171", bar: "#DC2626" },
};

function StatusBadge({ status }: { status: PaymentRecordStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
      style={{ background: c.bg, color: c.color, fontFamily: "var(--font-barlow-condensed)" }}>
      {c.label}
    </span>
  );
}

/* ── Ay etiketi ───────────────────────────────────────────────────── */
const monthLabel = (ym: string) =>
  format(parseISO(`${ym}-01`), "MMMM yyyy", { locale: tr });

/* ── Aylık grupla (sadece odendi) ─────────────────────────────────── */
function groupByMonth(payments: Payment[]): Record<string, Payment[]> {
  return payments
    .filter(p => p.status === "odendi")
    .reduce<Record<string, Payment[]>>((acc, p) => {
      const m = p.paidAt.substring(0, 7);
      if (!acc[m]) acc[m] = [];
      acc[m].push(p);
      return acc;
    }, {});
}

/* ── Input bileşeni ───────────────────────────────────────────────── */
function F({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
        style={{ fontFamily: "var(--font-barlow-condensed)" }}>
        {label}{required && " *"}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none transition-colors"
        style={{ fontFamily: "var(--font-inter)" }} />
    </div>
  );
}

/* ── Ödeme kartı (mobil + desktop) ───────────────────────────────── */
function PaymentCard({
  p, onEdit, onDelete,
}: {
  p: Payment; onEdit: (p: Payment) => void; onDelete: (id: string) => void;
}) {
  const c = STATUS_CFG[p.status];
  return (
    <div className="relative overflow-hidden rounded-lg sm:rounded-none"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${c.bar}22`,
      }}>
      {/* Durum şeridi */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg sm:rounded-none" style={{ background: c.bar }} />

      <div className="pl-4 pr-3 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        {/* Tarih — gizli küçük ekranda, inline büyük */}
        <div className="hidden sm:block w-14 flex-shrink-0">
          <div className="text-[11px] text-white/35 leading-tight" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {format(parseISO(p.paidAt), "dd MMM", { locale: tr })}
          </div>
        </div>

        {/* Öğrenci + detay */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white leading-tight" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              {p.studentName}
            </span>
            {/* Tarih — mobil */}
            <span className="sm:hidden text-[10px] text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              {format(parseISO(p.paidAt), "dd MMM yyyy", { locale: tr })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px]"
              style={{ color: p.method === "aylik" ? "#A78BFA" : "rgba(255,255,255,0.3)", fontFamily: "var(--font-barlow-condensed)" }}>
              {p.method === "aylik" ? "Aylık Üyelik" :
               p.method === "nakit" ? "Nakit" :
               p.method === "havale" ? "Havale/EFT" :
               p.method === "kredi" ? "Kredi Kartı" :
               p.method === "papara" ? "Papara" : p.method}
            </span>
            {p.notes && (
              <>
                <span className="text-white/15 text-[10px]">·</span>
                <span className="text-[11px] text-white/25 truncate max-w-[140px]" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {p.notes}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Tutar + durum */}
        <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end flex-shrink-0">
          <StatusBadge status={p.status} />
          <span className="text-base font-black tabular-nums"
            style={{ fontFamily: "var(--font-bebas)", color: c.color, minWidth: 80, textAlign: "right", letterSpacing: "0.04em" }}>
            {p.amount > 0 ? `₺${p.amount.toLocaleString("tr-TR")}` : "—"}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(p)} title="Düzenle"
              className="p-1.5 text-white/20 hover:text-white/70 transition-colors">
              <Edit2 size={12} />
            </button>
            <button onClick={() => onDelete(p.id)} title="Sil"
              className="p-1.5 text-white/20 hover:text-crimson transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ANA SAYFA
══════════════════════════════════════════════════════════════════ */
export default function OdemelerPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gyms, setGyms]                       = useState<Gym[]>([]);
  const [gymReports, setGymReports]           = useState<GymReport[]>([]);
  const [incomeMovements, setIncomeMovements] = useState<IncomeMovement[]>([]);
  const [financeSummary, setFinanceSummary]   = useState({ totalRevenue: 0, gymShareTotal: 0, netEarnings: 0 });

  /* Gelir Hareketleri filtreleri */
  const [fltDateFrom, setFltDateFrom]   = useState("");
  const [fltDateTo, setFltDateTo]       = useState("");
  const [fltStudentId, setFltStudentId] = useState("");
  const [fltGymId, setFltGymId]         = useState("");
  const [fltType, setFltType]           = useState<IncomeMovementType | "">("");
  const [fltStatus, setFltStatus]       = useState<PaymentRecordStatus | "">("");
  const [editingShareId, setEditingShareId] = useState<string | null>(null);
  const [editingShareValue, setEditingShareValue] = useState("");

  /* Form */
  const [addOpen, setAddOpen]     = useState(false);
  const [selStudent, setSelStudent] = useState("");
  const [amount, setAmount]       = useState("");
  const [method, setMethod]       = useState("nakit");
  const [paidDate, setPaidDate]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [payStatus, setPayStatus] = useState<PaymentRecordStatus>("odendi");
  const [note, setNote]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  /* Düzenleme */
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editAmount, setEditAmount]   = useState("");
  const [editStatus, setEditStatus]   = useState<PaymentRecordStatus>("odendi");
  const [editMethod, setEditMethod]   = useState("nakit");
  const [editNote, setEditNote]       = useState("");
  const [editSaving, setEditSaving]   = useState(false);

  /* Silme */
  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* Açık aylar */
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const [s, p, g, gr, fs, im] = await Promise.all([
      getStudents(), getPayments(),
      getGyms().catch(() => []),
      getGymReports().catch(() => []),
      getFinanceSummary().catch(() => ({ totalRevenue: 0, gymShareTotal: 0, netEarnings: 0 })),
      getIncomeMovements().catch(() => []),
    ]);
    setStudents(s);
    setPayments(p);
    setGyms(g);
    setGymReports(gr);
    setFinanceSummary(fs);
    setIncomeMovements(im);
  }, []);

  useEffect(() => {
    reload().then(() => {
      const thisMonth = format(new Date(), "yyyy-MM");
      setOpenMonths(new Set([thisMonth]));
    });
  }, [reload]);

  /* Öğrenci seçilince fiyatı otomatik doldur */
  const handleStudentChange = (id: string) => {
    setSelStudent(id);
    const s = students.find(x => x.id === id);
    if (!s) return;
    const price = getPackagePrice(s);
    if (price) setAmount(String(price));
  };

  /* ── İstatistikler (sadece odendi) ──────────────────────────────── */
  const thisMonthKey    = format(new Date(), "yyyy-MM");
  const paidOnly        = payments.filter(p => p.status === "odendi");
  const pendingOnly     = payments.filter(p => p.status === "beklemede" || p.status === "gecikti");
  const totalCollected  = paidOnly.reduce((s, p) => s + p.amount, 0);
  const thisMonthTotal  = paidOnly.filter(p => p.paidAt.startsWith(thisMonthKey)).reduce((s, p) => s + p.amount, 0);
  const totalPending    = pendingOnly.reduce((s, p) => s + p.amount, 0);
  const pendingCount    = new Set(pendingOnly.map(p => p.studentId)).size;

  /* Salonlara ödenecek tutar — tüm zamanlar, tüm salonların payı toplamı */
  const totalOwedToGyms = gymReports.reduce((s, r) => s + r.gymShareTotal, 0);

  /* ── Gelir Hareketleri — filtreler uygulanmış ───────────────────── */
  const filteredMovements = incomeMovements.filter(m => {
    if (fltDateFrom && m.paymentDate < fltDateFrom) return false;
    if (fltDateTo && m.paymentDate > fltDateTo) return false;
    if (fltStudentId && m.studentId !== fltStudentId) return false;
    if (fltGymId && m.gymId !== fltGymId) return false;
    if (fltType && m.paymentType !== fltType) return false;
    if (fltStatus && m.status !== fltStatus) return false;
    return true;
  }).sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const MOVEMENT_TYPE_LABELS: Record<IncomeMovementType, string> = {
    yeni_paket: "Yeni Paket", paket_yenileme: "Paket Yenileme",
    ek_odeme: "Ek Ödeme", ders_tamamlama: "Ders Tamamlama",
  };

  const handleSaveShare = async (m: IncomeMovement) => {
    const value = Number(editingShareValue);
    if (isNaN(value)) return;
    await updateIncomeMovement(m.id, { gymShareAmount: value, trainerNetAmount: m.paymentAmount - value });
    await reload();
    setEditingShareId(null);
  };

  /* ── Son 6 ay bar grafik (sadece odendi) ─────────────────────────── */
  const barData = Array.from({ length: 6 }, (_, i) => {
    const d   = subMonths(new Date(), 5 - i);
    const key = format(d, "yyyy-MM");
    const total = paidOnly.filter(p => p.paidAt.startsWith(key)).reduce((s, p) => s + p.amount, 0);
    return { ay: format(d, "MMM", { locale: tr }), gelir: total, key };
  });

  /* ── Aylık gruplar (odendi) ──────────────────────────────────────── */
  const byMonth      = groupByMonth(payments);
  const sortedMonths = Object.keys(byMonth).sort().reverse();

  const toggleMonth = (m: string) => {
    setOpenMonths(prev => {
      const n = new Set(prev);
      n.has(m) ? n.delete(m) : n.add(m);
      return n;
    });
  };

  /* ── Ödeme ekle ──────────────────────────────────────────────────── */
  const openAdd = () => {
    setSelStudent(""); setAmount(""); setMethod("nakit");
    setPaidDate(format(new Date(), "yyyy-MM-dd")); setPayStatus("odendi"); setNote("");
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!selStudent || !amount) return;
    setSaving(true);
    const student = students.find(s => s.id === selStudent)!;
    await addPayment({
      studentId: selStudent, studentName: student.fullName,
      amount: Number(amount), paidAt: paidDate, method, notes: note.trim() || undefined,
      status: payStatus,
    });
    await reload();
    const addedMonth = paidDate.substring(0, 7);
    setOpenMonths(prev => new Set([...prev, addedMonth]));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    setAddOpen(false);
  };

  /* ── Ödeme düzenle ───────────────────────────────────────────────── */
  const openEdit = (p: Payment) => {
    setEditPayment(p);
    setEditAmount(String(p.amount));
    setEditStatus(p.status);
    setEditMethod(p.method);
    setEditNote(p.notes ?? "");
  };

  const handleEdit = async () => {
    if (!editPayment) return;
    setEditSaving(true);
    await updatePayment(editPayment.id, {
      amount: Number(editAmount),
      status: editStatus,
      method: editMethod,
      notes:  editNote.trim() || undefined,
    });
    await reload();
    setEditSaving(false);
    setEditPayment(null);
  };

  /* ── Ödeme sil ───────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteId) return;
    await deletePayment(deleteId);
    await reload();
    setDeleteId(null);
  };

  const selectedStudent = students.find(s => s.id === selStudent);
  const packagePrice    = selectedStudent ? getPackagePrice(selectedStudent) : null;

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-20">

      {/* Başlık */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-8 h-px bg-crimson" />
            <span className="text-crimson text-xs tracking-[0.4em] uppercase" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Admin</span>
          </div>
          <h1 className="text-3xl font-display text-white tracking-wide" style={{ fontFamily: "var(--font-bebas)" }}>FİNANS MERKEZİ</h1>
          <p className="text-white/35 text-sm mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            {payments.length} ödeme kaydı · {gyms.filter(g => g.isActive).length} aktif salon
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
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-crimson hover:bg-crimson-bright text-white text-xs font-semibold tracking-widest uppercase px-5 py-2.5 transition-all hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            style={{ fontFamily: "var(--font-barlow-condensed)" }}>
            <Plus size={14} /> Ödeme Ekle
          </button>
        </div>
      </div>

      {/* ── YENİ ÖDEME FORMU ──────────────────────────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-carbon border border-crimson/30 relative">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                  YENİ ÖDEME EKLE
                </h2>
                <button onClick={() => setAddOpen(false)} className="text-white/25 hover:text-white transition-colors"><X size={18} /></button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                {/* Öğrenci seç */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Öğrenci *</label>
                  <select value={selStudent} onChange={e => handleStudentChange(e.target.value)}
                    className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white px-3 py-2.5 text-sm outline-none transition-colors appearance-none"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    <option value="" className="bg-carbon">Öğrenci seçin...</option>
                    {students.filter(s => s.isActive).sort((a, b) => a.fullName.localeCompare(b.fullName)).map(s => (
                      <option key={s.id} value={s.id} className="bg-carbon">
                        {s.fullName} ({s.code})
                      </option>
                    ))}
                  </select>
                  {/* Paket fiyatı bilgisi */}
                  {selectedStudent && (
                    <p className="text-[10px] mt-1 flex items-center gap-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>
                        {selectedStudent.subscriptionType === "monthly" ? "Aylık üyelik" :
                         `${selectedStudent.totalLessons} ders paketi`}
                      </span>
                      {packagePrice && (
                        <span style={{ color: "#FBBF24" }}>— Fiyat: ₺{packagePrice.toLocaleString("tr-TR")}</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Miktar */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Miktar (₺) *</label>
                  <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-steel/60 border-2 border-green-500/30 focus:border-green-500/60 text-green-400 px-3 py-2.5 text-lg outline-none transition-colors"
                    style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.05em" }} />
                </div>

                {/* Durum */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödeme Durumu</label>
                  <select value={payStatus} onChange={e => setPayStatus(e.target.value as PaymentRecordStatus)}
                    className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white px-3 py-2.5 text-sm outline-none transition-colors appearance-none"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    <option value="odendi" className="bg-carbon">✅ Ödendi</option>
                    <option value="beklemede" className="bg-carbon">🟡 Beklemede</option>
                    <option value="gecikti" className="bg-carbon">🔴 Gecikti</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                {/* Tarih */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Tarih *</label>
                  <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
                    className="w-full bg-carbon border border-white/10 focus:border-crimson/50 text-white px-3 py-2.5 text-sm outline-none transition-colors"
                    style={{ fontFamily: "var(--font-inter)" }} />
                </div>

                {/* Yöntem */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yöntem</label>
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

                <F label="Not" value={note} onChange={setNote} placeholder="Paket adı, detay..." />
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: `${format(new Date(), "MMMM", { locale: tr })} Toplam Ciro`, value: `₺${financeSummary.totalRevenue.toLocaleString("tr-TR")}`, sub: "Bu ayki tüm tahsilat", color: "#FBBF24", icon: <TrendingUp size={16} /> },
          { label: "Bu Ay Salon Payı",   value: `₺${financeSummary.gymShareTotal.toLocaleString("tr-TR")}`, sub: "Salonlara düşen pay", color: "#A855F7", icon: <Building2 size={16} /> },
          { label: "Bu Ay Net Kazanç",   value: `₺${financeSummary.netEarnings.toLocaleString("tr-TR")}`,  sub: "Salon payı düşülmüş", color: "#4ADE80", icon: <Wallet size={16} /> },
          { label: "Bekleyen Öğrenci Borçları", value: `₺${totalPending.toLocaleString("tr-TR")}`, sub: `${pendingCount} öğrenci`, color: "#F87171", icon: <Clock size={16} /> },
          { label: "Alınan Ödemeler",    value: `₺${totalCollected.toLocaleString("tr-TR")}`, sub: "Tüm zamanlar — ödendi", color: "#60A5FA", icon: <CreditCard size={16} /> },
          { label: "Salonlara Ödenecek Tutar", value: `₺${totalOwedToGyms.toLocaleString("tr-TR")}`, sub: "Tüm zamanlar — toplam pay", color: "#F472B6", icon: <Receipt size={16} /> },
        ].map(s => (
          <div key={s.label} className="bg-carbon border border-white/6 p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] text-white/30 tracking-widest uppercase leading-tight" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="text-2xl font-display" style={{ fontFamily: "var(--font-bebas)", color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-white/25 mt-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── SALON BAZLI RAPOR ────────────────────────────────────── */}
      {gymReports.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-1 pb-2">
            <Building2 size={13} style={{ color: "#A855F7" }} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-bebas)" }}>
              Salon Bazlı Rapor
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gymReports.map(r => (
              <div key={r.gym.id} className="bg-carbon border border-violet/15 p-4">
                <h4 className="text-lg font-display text-white tracking-wider mb-2" style={{ fontFamily: "var(--font-bebas)" }}>{r.gym.name}</h4>
                {r.gym.shareType === "fixed_per_lesson" ? (
                  <div className="space-y-1.5 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    <div className="flex justify-between"><span className="text-white/40">Toplam Ders</span><span className="text-white">{r.totalLessons}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Ders Başı</span><span className="text-white">₺{(r.gym.fixedLessonFee ?? 0).toLocaleString("tr-TR")}</span></div>
                    <div className="flex justify-between pt-1.5 border-t border-white/5"><span className="text-violet font-semibold">Ödenecek</span><span className="text-violet font-semibold">₺{r.gymShareTotal.toLocaleString("tr-TR")}</span></div>
                  </div>
                ) : r.gym.shareType === "percentage" ? (
                  <div className="space-y-1.5 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    <div className="flex justify-between"><span className="text-white/40">Toplam Ciro</span><span className="text-white">₺{r.totalRevenue.toLocaleString("tr-TR")}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Salon Payı (%{r.gym.gymPercentage})</span><span className="text-white">₺{r.gymShareTotal.toLocaleString("tr-TR")}</span></div>
                    <div className="flex justify-between pt-1.5 border-t border-white/5"><span className="text-green-400 font-semibold">Net Kazancım</span><span className="text-green-400 font-semibold">₺{r.netEarnings.toLocaleString("tr-TR")}</span></div>
                  </div>
                ) : (
                  <p className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Salon payı yok — toplam ciro ₺{r.totalRevenue.toLocaleString("tr-TR")}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GELİR HAREKETLERİ (filtrelenebilir) ─────────────────── */}
      <div>
        <div className="flex items-center gap-2 px-1 pb-2">
          <Receipt size={13} style={{ color: "#60A5FA" }} />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-bebas)" }}>
            Gelir Hareketleri
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {/* Filtreler */}
        <div className="bg-carbon border border-white/6 p-3 mb-2 grid sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <input type="date" value={fltDateFrom} onChange={e => setFltDateFrom(e.target.value)}
            className="bg-steel/40 border border-white/10 text-white px-2 py-2 text-xs outline-none" style={{ fontFamily: "var(--font-inter)" }} title="Başlangıç tarihi" />
          <input type="date" value={fltDateTo} onChange={e => setFltDateTo(e.target.value)}
            className="bg-steel/40 border border-white/10 text-white px-2 py-2 text-xs outline-none" style={{ fontFamily: "var(--font-inter)" }} title="Bitiş tarihi" />
          <select value={fltStudentId} onChange={e => setFltStudentId(e.target.value)}
            className="bg-steel/40 border border-white/10 text-white px-2 py-2 text-xs outline-none appearance-none" style={{ fontFamily: "var(--font-inter)" }}>
            <option value="" className="bg-carbon">Tüm Öğrenciler</option>
            {students.sort((a, b) => a.fullName.localeCompare(b.fullName)).map(s => (
              <option key={s.id} value={s.id} className="bg-carbon">{s.fullName}</option>
            ))}
          </select>
          <select value={fltGymId} onChange={e => setFltGymId(e.target.value)}
            className="bg-steel/40 border border-white/10 text-white px-2 py-2 text-xs outline-none appearance-none" style={{ fontFamily: "var(--font-inter)" }}>
            <option value="" className="bg-carbon">Tüm Salonlar</option>
            {gyms.map(g => <option key={g.id} value={g.id} className="bg-carbon">{g.name}</option>)}
          </select>
          <select value={fltType} onChange={e => setFltType(e.target.value as IncomeMovementType | "")}
            className="bg-steel/40 border border-white/10 text-white px-2 py-2 text-xs outline-none appearance-none" style={{ fontFamily: "var(--font-inter)" }}>
            <option value="" className="bg-carbon">Tüm Türler</option>
            <option value="yeni_paket" className="bg-carbon">Yeni Paket</option>
            <option value="paket_yenileme" className="bg-carbon">Paket Yenileme</option>
            <option value="ek_odeme" className="bg-carbon">Ek Ödeme</option>
            <option value="ders_tamamlama" className="bg-carbon">Ders Tamamlama</option>
          </select>
          <select value={fltStatus} onChange={e => setFltStatus(e.target.value as PaymentRecordStatus | "")}
            className="bg-steel/40 border border-white/10 text-white px-2 py-2 text-xs outline-none appearance-none" style={{ fontFamily: "var(--font-inter)" }}>
            <option value="" className="bg-carbon">Ödenen + Borçlu</option>
            <option value="odendi" className="bg-carbon">Sadece Ödenen</option>
            <option value="beklemede" className="bg-carbon">Sadece Borçlu (Beklemede)</option>
            <option value="gecikti" className="bg-carbon">Sadece Gecikmiş</option>
          </select>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="text-center py-10 bg-carbon border border-white/6">
            <Receipt size={28} className="text-white/10 mx-auto mb-2" />
            <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Filtreye uyan gelir hareketi yok</p>
          </div>
        ) : (
          <div className="bg-carbon border border-white/6 overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
              <thead>
                <tr className="border-b border-white/5 text-white/30 text-[10px] uppercase tracking-widest">
                  <th className="text-left px-3 py-2">Tarih</th>
                  <th className="text-left px-3 py-2">Öğrenci</th>
                  <th className="text-left px-3 py-2">Tür</th>
                  <th className="text-left px-3 py-2">Durum</th>
                  <th className="text-left px-3 py-2">Salon</th>
                  <th className="text-right px-3 py-2">Tutar</th>
                  <th className="text-right px-3 py-2">Salon Payı</th>
                  <th className="text-right px-3 py-2">Net</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredMovements.slice(0, 100).map(m => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-steel/20">
                    <td className="px-3 py-2 text-white/40 text-xs whitespace-nowrap">{format(parseISO(m.paymentDate), "dd MMM yy", { locale: tr })}</td>
                    <td className="px-3 py-2 text-white">{m.studentName}</td>
                    <td className="px-3 py-2 text-white/50 text-xs">{MOVEMENT_TYPE_LABELS[m.paymentType]}</td>
                    <td className="px-3 py-2"><StatusBadge status={m.status} /></td>
                    <td className="px-3 py-2 text-violet text-xs">{m.gymName ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-white tabular-nums">{m.paymentAmount > 0 ? `₺${m.paymentAmount.toLocaleString("tr-TR")}` : "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {editingShareId === m.id ? (
                        <div className="flex items-center gap-1 justify-end">
                          <input type="number" value={editingShareValue} onChange={e => setEditingShareValue(e.target.value)} autoFocus
                            className="w-20 bg-steel/60 border border-violet/40 text-white px-1.5 py-1 text-xs outline-none text-right" />
                          <button onClick={() => handleSaveShare(m)} className="text-green-400 hover:text-green-300"><Check size={13} /></button>
                          <button onClick={() => setEditingShareId(null)} className="text-white/30 hover:text-white"><X size={13} /></button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingShareId(m.id); setEditingShareValue(String(m.gymShareAmount)); }}
                          className="text-violet hover:underline" title="Manuel düzelt">
                          {m.gymShareAmount > 0 ? `₺${m.gymShareAmount.toLocaleString("tr-TR")}` : "—"}
                        </button>
                      )}
                    </td>
                    <td className={`px-3 py-2 text-right tabular-nums font-semibold ${m.trainerNetAmount < 0 ? "text-red-400" : "text-green-400"}`}>
                      ₺{m.trainerNetAmount.toLocaleString("tr-TR")}
                    </td>
                    <td className="px-2 py-2" />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── SON 6 AY GELİR GRAFİĞİ (sadece odendi) ──────────────── */}
      <div className="bg-carbon border border-white/6 p-4 sm:p-5">
        <h3 className="text-base font-display text-white tracking-wider mb-3" style={{ fontFamily: "var(--font-bebas)" }}>
          Son 6 Aylık Gelir (Ödendi)
        </h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="ay" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "var(--font-barlow-condensed)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={v => v === 0 ? "" : `₺${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 0, fontSize: 12 }}
              labelStyle={{ color: "#fff", fontFamily: "var(--font-barlow-condensed)" }}
              formatter={(v: unknown) => [`₺${Number(v).toLocaleString("tr-TR")}`, "Gelir"]}
              cursor={{ fill: "rgba(220,38,38,0.06)" }}
            />
            <Bar dataKey="gelir" fill="#22C55E" radius={[2, 2, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── BEKLEYENLEr / GECİKMİŞLER ───────────────────────────── */}
      {pendingOnly.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-1 pb-2">
            <Clock size={13} style={{ color: "#FBBF24" }} />
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-bebas)" }}>
              Bekleyen / Gecikmiş Ödemeler
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
              {pendingOnly.length}
            </span>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <div className="space-y-2">
            {pendingOnly.sort((a, b) => b.paidAt.localeCompare(a.paidAt)).map(p => (
              <PaymentCard key={p.id} p={p} onEdit={openEdit} onDelete={setDeleteId} />
            ))}
          </div>
        </div>
      )}

      {/* ── AYLIK GELİR LİSTESİ (odendi) ────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Check size={13} style={{ color: "#4ADE80" }} />
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/25" style={{ fontFamily: "var(--font-bebas)" }}>
            Ödeme Kayıtları — Aylık Geçmiş (Ekle / Düzenle / Sil)
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        {sortedMonths.length === 0 && (
          <div className="text-center py-12 bg-carbon border border-white/6">
            <CreditCard size={32} className="text-white/10 mx-auto mb-3" />
            <p className="text-white/25 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Henüz ödeme kaydı yok</p>
          </div>
        )}

        {sortedMonths.map(month => {
          const monthPayments = byMonth[month].sort((a, b) => b.paidAt.localeCompare(a.paidAt));
          const monthTotal    = monthPayments.reduce((s, p) => s + p.amount, 0);
          const isOpen        = openMonths.has(month);
          const isThisMonth   = month === thisMonthKey;

          return (
            <div key={month} className={`bg-carbon border overflow-hidden transition-colors ${isThisMonth ? "border-green-500/20" : "border-white/6"}`}>
              <button onClick={() => toggleMonth(month)}
                className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-steel/20 transition-colors">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className={`text-base font-display tracking-wider ${isThisMonth ? "text-green-400" : "text-white"}`}
                    style={{ fontFamily: "var(--font-bebas)" }}>
                    {monthLabel(month).toUpperCase()}
                  </div>
                  {isThisMonth && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bu Ay</span>
                  )}
                  <span className="text-[11px] text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    {monthPayments.length} ödeme
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-display text-green-400" style={{ fontFamily: "var(--font-bebas)" }}>
                    ₺{monthTotal.toLocaleString("tr-TR")}
                  </span>
                  {isOpen ? <ChevronUp size={15} className="text-white/30" /> : <ChevronDown size={15} className="text-white/30" />}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}
                    className="overflow-hidden">
                    <div className="border-t border-white/5 p-2 sm:p-3 space-y-1.5">
                      {monthPayments.map(p => (
                        <PaymentCard key={p.id} p={p} onEdit={openEdit} onDelete={setDeleteId} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── DÜZENLEME MODALI ──────────────────────────────────────── */}
      <AnimatePresence>
        {editPayment && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => !editSaving && setEditPayment(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-carbon border border-white/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>ÖDEMEYİ DÜZENLE</h3>
                <button onClick={() => setEditPayment(null)} className="text-white/25 hover:text-white"><X size={16} /></button>
              </div>
              <p className="text-xs text-white/40 mb-4 pb-3 border-b border-white/8" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {editPayment.studentName}
              </p>
              <div className="space-y-3">
                {/* Durum */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödeme Durumu</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["odendi", "beklemede", "gecikti"] as const).map(st => {
                      const c = STATUS_CFG[st];
                      return (
                        <button key={st} onClick={() => setEditStatus(st)}
                          className="py-2 text-[11px] font-semibold transition-all rounded"
                          style={{
                            background: editStatus === st ? `${c.bar}22` : "rgba(255,255,255,0.03)",
                            border: `1px solid ${editStatus === st ? c.bar + "66" : "rgba(255,255,255,0.08)"}`,
                            color: editStatus === st ? c.color : "rgba(255,255,255,0.35)",
                            fontFamily: "var(--font-barlow-condensed)",
                          }}>
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tutar */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Tutar (₺)</label>
                  <input type="number" min="0" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                    className="w-full bg-steel/60 border-2 border-green-500/30 focus:border-green-500/60 text-green-400 px-3 py-2.5 text-lg outline-none"
                    style={{ fontFamily: "var(--font-bebas)" }} />
                </div>

                {/* Yöntem */}
                <div>
                  <label className="block text-[10px] text-white/40 tracking-widest uppercase mb-1.5"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yöntem</label>
                  <select value={editMethod} onChange={e => setEditMethod(e.target.value)}
                    className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none appearance-none"
                    style={{ fontFamily: "var(--font-inter)" }}>
                    <option value="nakit" className="bg-carbon">Nakit</option>
                    <option value="havale" className="bg-carbon">Havale / EFT</option>
                    <option value="kredi" className="bg-carbon">Kredi Kartı</option>
                    <option value="papara" className="bg-carbon">Papara</option>
                    <option value="aylik" className="bg-carbon">Aylık Üyelik</option>
                  </select>
                </div>

                <F label="Not" value={editNote} onChange={setEditNote} placeholder="Açıklama..." />
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={() => setEditPayment(null)}
                  className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Vazgeç</button>
                <button onClick={handleEdit} disabled={editSaving}
                  className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  {editSaving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SİLME ONAYI ───────────────────────────────────────────── */}
      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteId(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="relative z-10 w-full max-w-sm bg-carbon border border-white/10 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
              onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-crimson/10 border border-crimson/20 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={16} className="text-crimson" />
                </div>
                <div>
                  <h3 className="text-base font-display text-white" style={{ fontFamily: "var(--font-bebas)" }}>ÖDEMEYİ SİL</h3>
                  {(() => {
                    const p = payments.find(x => x.id === deleteId);
                    return p ? (
                      <p className="text-[11px] text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {p.studentName} · ₺{p.amount.toLocaleString("tr-TR")}
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
              <p className="text-sm text-white/40 mb-4" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                Bu kayıt silinecek. "Ödendi" durumundaysa öğrencinin bakiyesi düzeltilir.
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
