"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStudents, createStudent, updateStudent, deleteStudent, getDuetPartner, setDuetPartner, removeDuetPartner, renewStudentPackage, getStudentPackageHistory } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getPackages, getActivePackages, type LessonPackage } from "@/lib/packages";
import type { Student, PackagePurchase } from "@/lib/types";
import { PAYMENT_LABELS, LEVEL_LABELS, LESSON_DURATIONS, MONTHLY_DURATION_DAYS } from "@/lib/constants";
import { getPackageDurationDays, calcPackageEndDate, getDaysRemaining, getPackageUrgency, isPackageExpired } from "@/lib/packageDuration";
import { Search, Plus, Edit, Trash2, Phone, User, QrCode, X, AlertTriangle, CheckCircle, RefreshCw, Wand2, Users, Link as LinkIcon, Unlink, Package as PackageIcon, RotateCcw, ChevronDown, ChevronUp, History, CalendarClock, Infinity as InfinityIcon } from "lucide-react";
import { useToast } from "@/app/components/shared/Toast";
import { format } from "date-fns";

/* ── Sıralı kod üret: ENES001, ENES002... ────────────────────────────── */
function genCodeSequential(students: Student[]): string {
  const nums = students.map(s => parseInt(s.code.replace(/\D/g, ""))).filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `ENES${String(next).padStart(3, "0")}`;
}

/* ── İsimden kod üret: "Ahmet Yılmaz" → "ENES-AY" ───────────────────── */
const TR: Record<string, string> = { ş:"S",Ş:"S",ı:"I",İ:"I",ç:"C",Ç:"C",ğ:"G",Ğ:"G",ö:"O",Ö:"O",ü:"U",Ü:"U" };
function normTR(s: string): string { return s.split("").map(c => TR[c] ?? c).join(""); }

function genCodeFromName(name: string, students: Student[]): string {
  const words = normTR(name.trim()).toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return genCodeSequential(students);
  // Her kelimenin ilk harfi
  const initials = words.map(w => w[0]).join("");
  const base = `ENES-${initials}`;
  // Çakışma varsa sayı ekle
  const existing = students.map(s => s.code);
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}${n}`)) n++;
  return `${base}${n}`;
}

/* ── Kod benzersizlik kontrolü ───────────────────────────────────────── */
function isCodeTaken(code: string, students: Student[], excludeId?: string): boolean {
  return students.some(s => s.code.toUpperCase() === code.toUpperCase() && s.id !== excludeId);
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
  const [packages, setPackages]   = useState<LessonPackage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState("all");
  const [error, setError]         = useState<string | null>(null);

  /* Ekle paneli */
  const [addOpen, setAddOpen]     = useState(false);
  const [aCode, setACode]         = useState("");
  const [aName, setAName]         = useState("");
  const [aPhone, setAPhone]       = useState("");
  const [aEmail, setAEmail]       = useState("");
  const [aLevel, setALevel]       = useState("baslangic");
  const [aSubType, setASubType]   = useState<"lesson_pack"|"monthly">("lesson_pack");
  const [aMonthlyFee, setAMonthlyFee] = useState("");
  const [aPackageId, setAPackageId] = useState(""); // ← Paket ID
  const [aTotalLessons, setATL]   = useState("8");
  const [aDurationDays, setADurationDays] = useState("45");
  const [aAmountPaid, setAAP]     = useState("");
  const [aAmountDue, setAAD]      = useState(""); // paket fiyatı (otomatik)
  const [aCustomPrice, setACustom] = useState(""); // indirimli fiyat
  const [aPayStatus, setAPayStatus] = useState("beklemede");
  const [aNotes, setANotes]       = useState("");
  const [aSaving, setASaving]     = useState(false);

  /* Düzenle paneli */
  const [editSt, setEditSt]       = useState<Student | null>(null);
  const [eName, setEName]         = useState("");
  const [ePhone, setEPhone]       = useState("");
  const [eLevel, setELevel]       = useState("baslangic");
  const [eSubType, setESubType]   = useState<"lesson_pack"|"monthly">("lesson_pack");
  const [eMonthlyFee, setEMonthlyFee] = useState("");
  const [eRL, setERL]             = useState("");
  const [eTL, setETL]             = useState("");
  const [eStartDate, setEStartDate] = useState("");
  const [eEndDate, setEEndDate]   = useState("");
  const [eAP, setEAP]             = useState("");
  const [eAD, setEAD]             = useState("");
  const [ePS, setEPS]             = useState("beklemede");
  const [eNotes, setENotes]       = useState("");
  const [eSaving, setESaving]     = useState(false);

  /* Paket yenile */
  const [renewSt, setRenewSt]           = useState<Student | null>(null);
  const [activePackages, setActivePackages] = useState<LessonPackage[]>([]);
  const [pkgHistory, setPkgHistory]     = useState<PackagePurchase[]>([]);
  const [pkgHistLoading, setPkgHistLoading] = useState(false);
  const [histOpen, setHistOpen]         = useState(false);
  const [selPkg, setSelPkg]             = useState<LessonPackage | null>(null);
  const [rListPrice, setRListPrice]     = useState("");
  const [rPaidAmount, setRPaidAmount]   = useState("");
  const [rPayStatus, setRPayStatus]     = useState("beklemede");
  const [rNotes, setRNotes]             = useState("");
  const [rSaving, setRSaving]           = useState(false);
  const { toast } = useToast();

  /* Düet partner */
  const [partnerModal, setPartnerModal]   = useState<Student | null>(null);
  const [currentPartner, setCurrentPartner] = useState<Student | null>(null);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerSaving, setPartnerSaving] = useState(false);

  const openPartnerModal = async (s: Student) => {
    setPartnerModal(s);
    setPartnerSearch("");
    const p = await getDuetPartner(s.id);
    setCurrentPartner(p);
  };

  const openRenewModal = async (s: Student) => {
    setRenewSt(s);
    setSelPkg(null);
    setRListPrice("");
    setRPaidAmount("");
    setRPayStatus("beklemede");
    setRNotes("");
    setHistOpen(false);
    // Aktif paketleri ve geçmişi paralel çek
    setPkgHistLoading(true);
    const [active, hist] = await Promise.all([
      getActivePackages(),
      getStudentPackageHistory(s.id),
    ]);
    setActivePackages(active);
    // İlk aktif paketi varsayılan seç (modal yeni açıldığı için selPkg null)
    if (active.length > 0) {
      setSelPkg(active[0]);
      setRListPrice(String(active[0].price));
    }
    setPkgHistory(hist);
    setPkgHistLoading(false);
  };

  const handleRenew = async () => {
    if (!renewSt || !selPkg) return;
    setRSaving(true);
    try {
      const today = new Date();
      const fmt = (d: Date) => d.toISOString().split("T")[0];
      const durationDays = LESSON_DURATIONS[selPkg.lessonCount] ?? selPkg.durationDays;
      const end = calcPackageEndDate(today, durationDays);
      const paid = Number(rPaidAmount) || 0;

      const { newRemaining } = await renewStudentPackage({
        studentId:     renewSt.id,
        studentName:   renewSt.fullName,
        packageId:     selPkg.id,
        packageName:   selPkg.name,
        lessonCount:   selPkg.lessonCount,
        listPrice:     Number(rListPrice) || selPkg.price,
        paidAmount:    paid,
        paymentStatus: rPayStatus as "odendi" | "kismi" | "beklemede",
        startDate:     fmt(today),
        endDate:       end,
        notes:         rNotes || undefined,
      });

      // Öğrenci listesini yenile
      const updated = await getStudents();
      setStudents(updated);

      toast(`Paket başarıyla yenilendi. Yeni kalan ders: ${newRemaining}`, "success");
      setRenewSt(null);
    } catch (err) {
      toast("Hata: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setRSaving(false);
    }
  };

  const handleSetPartner = async (targetId: string) => {
    if (!partnerModal) return;
    setPartnerSaving(true);
    try {
      await setDuetPartner(partnerModal.id, targetId);
      const p = await getDuetPartner(partnerModal.id);
      setCurrentPartner(p);
      setPartnerSearch("");
    } catch (err) { alert("Hata: " + (err instanceof Error ? err.message : String(err))); }
    finally { setPartnerSaving(false); }
  };

  const handleRemovePartner = async () => {
    if (!partnerModal) return;
    setPartnerSaving(true);
    try {
      await removeDuetPartner(partnerModal.id);
      setCurrentPartner(null);
    } catch (err) { alert("Hata: " + (err instanceof Error ? err.message : String(err))); }
    finally { setPartnerSaving(false); }
  };

  /* Sil */
  const [delSt, setDelSt]         = useState<Student | null>(null);
  const [delSaving, setDelSaving] = useState(false);

  /* QR */
  const [qrSt, setQrSt]          = useState<Student | null>(null);

  /* ── Yükle ─────────────────────────────────────────────────────── */
  useEffect(() => { getPackages().then(setPackages); }, []);

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

  /* ── Süresi dolan öğrenciler ────────────────────────────────────── */
  const expiredStudents = students.filter(s => isPackageExpired(s.packageEndDate));
  const [expiredBusy, setExpiredBusy] = useState<string | null>(null);

  const handleExtendPackage = async (s: Student) => {
    setExpiredBusy(s.id);
    try {
      const today = new Date().toISOString().split("T")[0];
      const duration = getPackageDurationDays(s.totalLessons, s.subscriptionType);
      await updateStudent(s.id, {
        packageStartDate: today,
        packageEndDate: calcPackageEndDate(today, duration),
      });
      await reload();
      toast(`${s.fullName} için paket süresi uzatıldı.`, "success");
    } catch (err) {
      toast("Hata: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setExpiredBusy(null);
    }
  };

  const handleMakeUnlimited = async (s: Student) => {
    setExpiredBusy(s.id);
    try {
      const today = new Date().toISOString().split("T")[0];
      await updateStudent(s.id, {
        subscriptionType: "monthly",
        packageStartDate: today,
        packageEndDate: calcPackageEndDate(today, MONTHLY_DURATION_DAYS),
      });
      await reload();
      toast(`${s.fullName} sınırsız üyeliğe geçirildi.`, "success");
    } catch (err) {
      toast("Hata: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setExpiredBusy(null);
    }
  };

  /* ── Ekle ───────────────────────────────────────────────────────── */
  /* Paket seçilince otomatik doldur */
  const handlePackageSelect = (pkgId: string) => {
    setAPackageId(pkgId);
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) return;
    setATL(String(pkg.lessonCount));
    setAAD(String(pkg.price));  // standart fiyat → borç
    setACustom("");              // indirim sıfırla
    setADurationDays(String(pkg.durationDays)); // paket süresi
  };

  /* Ders sayısı değişince paket süresini öner (manuel paket seçilmediyse) */
  const handleTotalLessonsChange = (v: string) => {
    setATL(v);
    if (!aPackageId) {
      setADurationDays(String(getPackageDurationDays(Number(v) || 0, "lesson_pack")));
    }
  };

  const openAdd = () => {
    const seq = genCodeSequential(students);
    setACode(seq); setAName(""); setAPhone(""); setAEmail(""); setALevel("baslangic");
    setAPackageId(""); setATL("8"); setADurationDays(String(LESSON_DURATIONS[8])); setAAP(""); setAAD(""); setACustom("");
    setAPayStatus("beklemede"); setANotes("");
    setAddOpen(true);
  };

  const handleAdd = async () => {
    if (!aName.trim() || !aPhone.trim()) {
      alert("Ad Soyad ve Telefon zorunludur.");
      return;
    }
    const finalCode = aCode.trim().toUpperCase() || genCodeSequential(students);
    if (isCodeTaken(finalCode, students)) {
      alert(`"${finalCode}" kodu zaten kullanımda. Farklı bir kod girin.`);
      return;
    }
    setASaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const totalLessons = Number(aTotalLessons) || 8;
      const customPrice  = aCustomPrice ? Number(aCustomPrice) : undefined;
      // Borç: indirimli fiyat varsa onu, yoksa standart borç alanını kullan
      const amountDue = customPrice !== undefined ? customPrice : (Number(aAmountDue) || 0);
      // Bitiş tarihi: paket süresi alanına göre hesaplanır
      const durationDays = Number(aDurationDays) || getPackageDurationDays(totalLessons, "lesson_pack");
      const endDate = calcPackageEndDate(today, durationDays);

      await createStudent({
        code:             finalCode,
        fullName:         aName.trim(),
        phone:            aPhone.trim(),
        email:            aEmail.trim() || undefined,
        level:            aLevel as Student["level"],
        packageType:      "sampiyon",
        packageId:        aPackageId || undefined,
        customPrice,
        totalLessons,
        remainingLessons: totalLessons,
        completedLessons: 0,
        paymentStatus:    aPayStatus as Student["paymentStatus"],
        amountPaid:       Number(aAmountPaid) || 0,
        amountDue,
        packageStartDate: today,
        packageEndDate:   endDate,
        notes:            aNotes.trim() || undefined,
        isActive:         true,
      });
      await reload();
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
    setESubType(s.subscriptionType ?? "lesson_pack");
    setEMonthlyFee(s.monthlyFee ? String(s.monthlyFee) : "");
    setERL(String(s.remainingLessons)); setETL(String(s.totalLessons));
    setEStartDate(s.packageStartDate || ""); setEEndDate(s.packageEndDate || "");
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
        subscriptionType: eSubType,
        monthlyFee:       eSubType === "monthly" && eMonthlyFee ? Number(eMonthlyFee) : undefined,
        remainingLessons: Number(eRL),
        totalLessons:     Number(eTL),
        packageStartDate: eStartDate,
        packageEndDate:   eEndDate,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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
              {/* ── GİRİŞ KODU ──────────────────────────────────── */}
              <div className="mb-4 p-3 bg-steel/30 border border-gold/20">
                <label className="block text-xs text-gold/70 tracking-widest uppercase mb-2"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Giriş Kodu <span className="text-white/30">(öğrencinin sisteme giriş şifresi)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={aCode}
                    onChange={e => setACode(e.target.value.toUpperCase())}
                    placeholder="ENES001"
                    className={`flex-1 bg-carbon border-2 px-4 py-2.5 text-xl outline-none transition-all tracking-widest font-display uppercase ${
                      aCode && isCodeTaken(aCode, students)
                        ? "border-crimson/60 text-crimson"
                        : "border-gold/40 focus:border-gold text-gold-bright"
                    }`}
                    style={{ fontFamily: "var(--font-bebas)" }}
                  />
                  {/* İsimden üret */}
                  <button
                    type="button"
                    onClick={() => setACode(genCodeFromName(aName, students))}
                    disabled={!aName.trim()}
                    title="İsmin baş harflerinden kod üret"
                    className="flex items-center gap-1.5 px-3 py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-semibold tracking-wider uppercase"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    <Wand2 size={14} />
                    <span className="hidden sm:inline">İsimden</span>
                  </button>
                  {/* Sıralı üret */}
                  <button
                    type="button"
                    onClick={() => setACode(genCodeSequential(students))}
                    title="Sıralı kod üret (ENES001, ENES002...)"
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white/50 hover:text-white transition-all text-xs font-semibold tracking-wider uppercase"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}
                  >
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Sıralı</span>
                  </button>
                </div>
                {/* Çakışma uyarısı */}
                {aCode && isCodeTaken(aCode, students) && (
                  <p className="text-xs text-crimson mt-1.5 flex items-center gap-1" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    <AlertTriangle size={12} />
                    Bu kod zaten kullanımda — farklı bir kod girin
                  </p>
                )}
                {aCode && !isCodeTaken(aCode, students) && (
                  <p className="text-xs text-green-400/60 mt-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                    ✓ Bu kod kullanılabilir
                  </p>
                )}
                <p className="text-xs text-white/20 mt-1.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  Manuel yazabilir, isimden üretebilir veya sıralı kod kullanabilirsiniz.
                </p>
              </div>

              {/* Kişisel bilgiler */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <F label="Ad Soyad *" value={aName} onChange={v => { setAName(v); }} placeholder="Ahmet Yılmaz" col2 />
                <F label="Telefon *" value={aPhone} onChange={setAPhone} placeholder="05XX XXX XX XX" />
                <F label="E-posta" value={aEmail} onChange={setAEmail} placeholder="ornek@email.com" />
              </div>

              {/* Paket Seçimi */}
              <div className="mb-3 p-3 bg-steel/30 border border-gold/20">
                <div className="flex items-center gap-2 mb-2">
                  <PackageIcon size={14} className="text-gold" />
                  <span className="text-xs text-gold tracking-widest uppercase" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                    Ders Paketi Seç (otomatik doldurur)
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Paket</label>
                    <select value={aPackageId} onChange={e => handlePackageSelect(e.target.value)}
                      className="w-full bg-carbon border border-gold/25 focus:border-gold text-white px-3 py-2.5 text-sm outline-none appearance-none transition-colors"
                      style={{ fontFamily:"var(--font-inter)" }}>
                      <option value="" className="bg-carbon">— Paket seçin veya manuel girin —</option>
                      {packages.filter(p => p.isActive).map(p => (
                        <option key={p.id} value={p.id} className="bg-carbon">
                          {p.name} — {p.lessonCount} ders — ₺{p.price.toLocaleString("tr-TR")}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Toplam ders */}
                  <div>
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                      Toplam Ders *
                    </label>
                    <input type="number" min="1" value={aTotalLessons} onChange={e => handleTotalLessonsChange(e.target.value)}
                      className="w-full bg-steel/60 border-2 border-gold/30 focus:border-gold text-gold-bright px-3 py-2.5 text-lg outline-none"
                      style={{ fontFamily:"var(--font-bebas)" }} />
                  </div>
                  {/* Standart fiyat (paket fiyatı) */}
                  <div>
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                      Standart Fiyat (₺)
                    </label>
                    <input type="number" min="0" value={aAmountDue} onChange={e => setAAD(e.target.value)} placeholder="Paket fiyatı"
                      className="w-full bg-steel/60 border-2 border-white/15 focus:border-white/30 text-white/70 px-3 py-2.5 text-lg outline-none"
                      style={{ fontFamily:"var(--font-bebas)" }} />
                  </div>
                </div>
                {/* Paket geçerlilik süresi */}
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                      Paket Geçerlilik Süresi (gün)
                    </label>
                    <input type="number" min="1" value={aDurationDays} onChange={e => setADurationDays(e.target.value)}
                      className="w-full bg-steel/60 border-2 border-violet/30 focus:border-violet text-white px-3 py-2.5 text-lg outline-none"
                      style={{ fontFamily:"var(--font-bebas)" }} />
                  </div>
                  <div className="flex flex-col justify-end">
                    <p className="text-xs text-white/20" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                      Bugün başlar, {format(new Date(calcPackageEndDate(new Date(), Number(aDurationDays) || 0)), "dd MMMM yyyy")} tarihinde sona erer.
                    </p>
                  </div>
                </div>
                {/* İndirimli fiyat */}
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)", color:"#f59e0b" }}>
                      İndirimli / Özel Fiyat (₺) — isteğe bağlı
                    </label>
                    <input type="number" min="0" value={aCustomPrice} onChange={e => setACustom(e.target.value)}
                      placeholder={aAmountDue ? `Standart: ₺${Number(aAmountDue).toLocaleString("tr-TR")}` : "Boş = standart fiyat"}
                      className="w-full bg-steel/60 border-2 border-gold/40 focus:border-gold text-gold-bright px-3 py-2.5 text-lg outline-none"
                      style={{ fontFamily:"var(--font-bebas)" }} />
                    {aCustomPrice && aAmountDue && Number(aCustomPrice) < Number(aAmountDue) && (
                      <p className="text-xs text-gold mt-1" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                        İndirim: ₺{(Number(aAmountDue) - Number(aCustomPrice)).toLocaleString("tr-TR")} (%{Math.round((1-Number(aCustomPrice)/Number(aAmountDue))*100)})
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Ödenen (₺)</label>
                    <input type="number" min="0" value={aAmountPaid} onChange={e => setAAP(e.target.value)} placeholder="0"
                      className="w-full bg-steel/60 border-2 border-green-500/25 focus:border-green-500/60 text-green-400 px-3 py-2.5 text-lg outline-none"
                      style={{ fontFamily:"var(--font-bebas)" }} />
                  </div>
                </div>
                <p className="text-xs text-white/20 mt-2" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                  İndirimli fiyat girilirse borç = indirimli fiyat − ödenen. Girilmezse standart fiyat kullanılır.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                <Sel label="Seviye" value={aLevel} onChange={setALevel} options={[
                  { value: "baslangic", label: "Başlangıç" },
                  { value: "orta", label: "Orta Seviye" },
                  { value: "ileri", label: "İleri Seviye" },
                ]} />
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
        <div className="flex flex-wrap gap-1.5">
          {[["all","Tümü"],["active","Aktif"],["payment","Ödeme Bekl."],["low","Ders Az"]].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-2 text-xs tracking-wider transition-all border ${filter === v ? "bg-crimson border-crimson text-white" : "border-white/10 text-white/35 hover:border-white/20"}`}
              style={{ fontFamily: "var(--font-barlow-condensed)" }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── SÜRESİ DOLAN ÖĞRENCİLER ──────────────────────────────── */}
      {expiredStudents.length > 0 && (
        <div className="bg-carbon border border-crimson/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson" />
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-crimson" />
              <h2 className="text-base font-display text-white tracking-wider" style={{ fontFamily: "var(--font-bebas)" }}>
                SÜRESİ DOLAN ÖĞRENCİLER ({expiredStudents.length})
              </h2>
            </div>
            <div className="space-y-2">
              {expiredStudents.map(s => {
                const days = getDaysRemaining(s.packageEndDate);
                const busy = expiredBusy === s.id;
                return (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <div className="min-w-0">
                      <div className="text-sm text-white font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.fullName}</div>
                      <div className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {s.code} · {days !== null ? `${Math.abs(days)} gün önce doldu` : "—"} · {s.remainingLessons} ders kaldı
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleExtendPackage(s)} disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg disabled:opacity-40 transition-all"
                        style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "#A855F7", fontFamily: "var(--font-barlow-condensed)" }}>
                        <CalendarClock size={12} />Süre Uzat
                      </button>
                      <button onClick={() => openRenewModal(s)} disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg disabled:opacity-40 transition-all"
                        style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)", color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
                        <PackageIcon size={12} />Yeni Paket Ata
                      </button>
                      <button onClick={() => handleMakeUnlimited(s)} disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg disabled:opacity-40 transition-all"
                        style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontFamily: "var(--font-barlow-condensed)" }}>
                        <InfinityIcon size={12} />Sınırsız Yap
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Kart görünümü — mobil (sm altı) ───────────────────────── */}
      <div className="block sm:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-white/30 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <User size={28} className="text-white/10 mx-auto mb-2" />
            <p className="text-white/20 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Öğrenci bulunamadı</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((s, i) => {
              const days = getDaysRemaining(s.packageEndDate);
              const u = days !== null ? getPackageUrgency(days) : null;
              return (
                <motion.div key={s.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="relative overflow-hidden bg-carbon border border-white/8 p-4 space-y-3"
                  style={{ isolation: "isolate" }}>

                  {/* Üst: Ad, Kod, Ödeme durumu */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 bg-crimson/10 border border-crimson/20 flex items-center justify-center text-xs text-crimson flex-shrink-0"
                        style={{ fontFamily: "var(--font-bebas)" }}>
                        {s.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white font-semibold truncate" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{s.fullName}</div>
                        <div className="text-xs text-gold font-mono tracking-wider">{s.code}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 border flex-shrink-0 ${s.paymentStatus === "odendi" ? "border-green-500/20 bg-green-500/8 text-green-400" : s.paymentStatus === "kismi" ? "border-gold/20 bg-gold/8 text-gold" : "border-crimson/20 bg-crimson/8 text-crimson"}`}
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      {PAYMENT_LABELS[s.paymentStatus]}
                    </span>
                  </div>

                  {/* İstatistik satırı */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-steel/20 p-2">
                      <div className="text-[10px] text-white/30 mb-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kalan Ders</div>
                      <div className={`text-lg leading-none ${s.remainingLessons <= 2 ? "text-crimson" : "text-white"}`}
                        style={{ fontFamily: "var(--font-bebas)" }}>
                        {s.remainingLessons}<span className="text-xs text-white/25">/{s.totalLessons}</span>
                      </div>
                    </div>
                    <div className="bg-steel/20 p-2">
                      <div className="text-[10px] text-white/30 mb-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödenen</div>
                      <div className="text-sm text-green-400 font-semibold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {s.amountPaid > 0 ? `₺${s.amountPaid.toLocaleString("tr-TR")}` : "—"}
                      </div>
                    </div>
                    <div className="bg-steel/20 p-2">
                      <div className="text-[10px] text-white/30 mb-0.5" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Borç</div>
                      <div className={`text-sm font-semibold ${s.amountDue > 0 ? "text-crimson" : "text-white/25"}`}
                        style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                        {s.amountDue > 0 ? `₺${s.amountDue.toLocaleString("tr-TR")}` : "✓"}
                      </div>
                    </div>
                  </div>

                  {/* Paket süresi */}
                  {u && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/30" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Paket Süresi:</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${u.color}`}
                        style={{ background: u.bg, border: `1px solid ${u.border}`, fontFamily: "var(--font-barlow-condensed)" }}>
                        {days! < 0 ? "Süresi Doldu" : `${days} gün`}
                      </span>
                    </div>
                  )}

                  {/* Aksiyon butonları */}
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-white/5">
                    <button onClick={() => openRenewModal(s)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all"
                      style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e", fontFamily: "var(--font-barlow-condensed)" }}>
                      <RotateCcw size={12} />Yenile
                    </button>
                    <button onClick={() => openEdit(s)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all"
                      style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#FBBF24", fontFamily: "var(--font-barlow-condensed)" }}>
                      <Edit size={12} />Düzenle
                    </button>
                    <button onClick={() => openPartnerModal(s)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all"
                      style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", color: "#A855F7", fontFamily: "var(--font-barlow-condensed)" }}>
                      <Users size={12} />Düet
                    </button>
                    <button onClick={() => setQrSt(s)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-barlow-condensed)" }}>
                      <QrCode size={12} />QR
                    </button>
                    <button onClick={() => setDelSt(s)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all"
                      style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", color: "#F87171", fontFamily: "var(--font-barlow-condensed)" }}>
                      <Trash2 size={12} />Sil
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* ── Tablo — masaüstü (sm ve üzeri) ─────────────────────── */}
      <div className="hidden sm:block bg-carbon border border-white/6 overflow-hidden">
        <div className="overflow-x-auto overscroll-x-contain" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="w-full" style={{ minWidth: 640 }}>
            <thead>
              <tr className="border-b border-white/5 bg-steel/30">
                {["Öğrenci","Kod","Kalan / Toplam","Paket Süresi","Ödenen","Borç","Ödeme","İşlem"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-white/30 tracking-widest uppercase whitespace-nowrap"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-white/30 text-sm" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Yükleniyor...</td></tr>
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
                      <td className="px-4 py-3">
                        {(() => {
                          const days = getDaysRemaining(s.packageEndDate);
                          if (days === null) return <span className="text-xs text-white/20" style={{ fontFamily: "var(--font-barlow-condensed)" }}>—</span>;
                          const u = getPackageUrgency(days);
                          return (
                            <span className={`text-xs px-2 py-0.5 rounded ${u.color}`}
                              style={{ background: u.bg, border: `1px solid ${u.border}`, fontFamily: "var(--font-barlow-condensed)" }}>
                              {days < 0 ? "Süresi Doldu" : `${days} gün`}
                            </span>
                          );
                        })()}
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
                          <button onClick={() => openRenewModal(s)} className="p-1.5 text-white/25 hover:text-green-400 transition-colors" title="Paket Yenile"><RotateCcw size={13} /></button>
                          <button onClick={() => openPartnerModal(s)} className="p-1.5 text-white/25 hover:text-violet transition-colors" title="Düet Partneri"><Users size={13} /></button>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setEditSt(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="relative z-10 w-full sm:max-w-2xl bg-carbon border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col"
            style={{
              borderRadius: "16px 16px 0 0",
              maxHeight: "92dvh",        /* dvh = dynamic viewport, iOS Safari safe */
            }}
            onClick={e => e.stopPropagation()}>
            {/* ── Sabit header — scroll edilince kaybolmaz ── */}
            <div className="flex-shrink-0 relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-crimson rounded-t-2xl" />
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/6">
                <div className="w-9 h-9 bg-crimson/10 border border-crimson/20 flex-shrink-0 flex items-center justify-center text-crimson font-display text-sm"
                  style={{ fontFamily: "var(--font-bebas)" }}>
                  {editSt.fullName.split(" ").map(n => n[0]).join("").slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-display text-white tracking-wider truncate"
                    style={{ fontFamily: "var(--font-bebas)" }}>{editSt.fullName}</div>
                  <div className="text-xs text-gold" style={{ fontFamily: "var(--font-barlow-condensed)" }}>{editSt.code}</div>
                </div>
                {/* X butonu — her zaman görünür, scroll'dan etkilenmez */}
                <button onClick={() => setEditSt(null)}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* ── Kaydırılabilir içerik ── */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3"
              style={{ WebkitOverflowScrolling: "touch" }}>

              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Ad Soyad" value={eName} onChange={setEName} />
                <F label="Telefon" value={ePhone} onChange={setEPhone} />
              </div>
              <Sel label="Seviye" value={eLevel} onChange={setELevel} options={[
                { value: "baslangic", label: "Başlangıç" },
                { value: "orta", label: "Orta Seviye" },
                { value: "ileri", label: "İleri Seviye" },
              ]} />

              {/* Üyelik tipi */}
              <div className="p-3 border space-y-3" style={{ borderColor:"rgba(139,92,246,0.2)", background:"rgba(139,92,246,0.04)" }}>
                <p className="text-xs tracking-widest uppercase" style={{ color:"#A855F7", fontFamily:"var(--font-barlow-condensed)" }}>Üyelik Tipi</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v:"lesson_pack", l:"Ders Paketi", d:"Kalan ders sayılır" }, { v:"monthly", l:"Aylık Üyelik", d:"Sınırsız ders" }].map(opt => (
                    <button key={opt.v} type="button" onClick={() => setESubType(opt.v as "lesson_pack"|"monthly")}
                      className="flex flex-col gap-0.5 p-3 text-left transition-all"
                      style={{
                        background: eSubType===opt.v ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                        border: eSubType===opt.v ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      }}>
                      <span className="text-xs font-semibold" style={{ color: eSubType===opt.v ? "#fff" : "rgba(255,255,255,0.4)", fontFamily:"var(--font-barlow-condensed)" }}>{opt.l}</span>
                      <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.25)", fontFamily:"var(--font-barlow-condensed)" }}>{opt.d}</span>
                    </button>
                  ))}
                </div>
                {eSubType === "monthly" && (
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Aylık Tutar (₺)</label>
                    <input type="number" value={eMonthlyFee} onChange={e => setEMonthlyFee(e.target.value)} placeholder="Örn: 1500"
                      className="w-full bg-carbon border border-white/10 focus:border-violet/50 text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily:"var(--font-inter)" }} />
                  </div>
                )}
              </div>

              <div className="p-4 bg-steel/30 border border-gold/15 space-y-3">
                <div className="text-xs text-gold tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ders Bilgileri</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kalan Ders *</label>
                    <input type="number" min="0" value={eRL} onChange={e => setERL(e.target.value)}
                      className="w-full bg-carbon border-2 border-gold/40 focus:border-gold text-gold-bright px-3 py-3 text-lg outline-none font-display tracking-wider"
                      style={{ fontFamily: "var(--font-bebas)" }} />
                    <p className="text-xs text-white/20 mt-1"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Mevcut: {editSt.remainingLessons}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Toplam Ders</label>
                    <input type="number" min="0" value={eTL} onChange={e => setETL(e.target.value)}
                      className="w-full bg-carbon border-2 border-white/15 focus:border-white/30 text-white px-3 py-3 text-lg outline-none font-display tracking-wider"
                      style={{ fontFamily: "var(--font-bebas)" }} />
                    <p className="text-xs text-white/20 mt-1"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Mevcut: {editSt.totalLessons}</p>
                  </div>
                </div>
              </div>

              {/* Paket süresi */}
              <div className="p-4 bg-steel/30 border border-violet/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-violet tracking-widest uppercase"
                    style={{ fontFamily: "var(--font-barlow-condensed)" }}>Paket Süresi</div>
                  {(() => {
                    const days = getDaysRemaining(eEndDate);
                    if (days === null) return null;
                    const u = getPackageUrgency(days);
                    return (
                      <span className={`text-xs px-2 py-0.5 rounded ${u.color}`}
                        style={{ background: u.bg, border: `1px solid ${u.border}`, fontFamily: "var(--font-barlow-condensed)" }}>
                        {days < 0 ? "Süresi Doldu" : `${days} gün kaldı`}
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Başlangıç Tarihi</label>
                    <input type="date" value={eStartDate} onChange={e => setEStartDate(e.target.value)}
                      className="w-full bg-carbon border-2 border-white/15 focus:border-violet/50 text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily: "var(--font-inter)" }} />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Bitiş Tarihi</label>
                    <input type="date" value={eEndDate} onChange={e => setEEndDate(e.target.value)}
                      className="w-full bg-carbon border-2 border-white/15 focus:border-violet/50 text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily: "var(--font-inter)" }} />
                  </div>
                </div>
                <button type="button"
                  onClick={() => {
                    const start = new Date().toISOString().split("T")[0];
                    const duration = getPackageDurationDays(Number(eTL) || editSt.totalLessons, eSubType);
                    setEStartDate(start);
                    setEEndDate(calcPackageEndDate(start, duration));
                  }}
                  className="flex items-center justify-center gap-2 w-full border border-violet/30 text-violet hover:bg-violet/10 text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                  <CalendarClock size={13} />Süreyi Bugünden Başlat ve Yenile
                </button>
              </div>

              <div className="p-4 bg-steel/30 border border-crimson/10 space-y-3">
                <div className="text-xs text-crimson tracking-widest uppercase"
                  style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödeme Bilgileri</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Ödenen (₺)</label>
                    <input type="number" min="0" value={eAP} onChange={e => setEAP(e.target.value)}
                      className="w-full bg-carbon border-2 border-green-500/30 text-green-400 px-3 py-3 text-lg outline-none font-display tracking-wider"
                      style={{ fontFamily: "var(--font-bebas)" }} />
                    <p className="text-xs text-white/20 mt-1"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Mevcut: ₺{editSt.amountPaid.toLocaleString("tr-TR")}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Kalan Borç (₺)</label>
                    <input type="number" min="0" value={eAD} onChange={e => setEAD(e.target.value)}
                      className="w-full bg-carbon border-2 border-crimson/25 text-crimson px-3 py-3 text-lg outline-none font-display tracking-wider"
                      style={{ fontFamily: "var(--font-bebas)" }} />
                    <p className="text-xs text-white/20 mt-1"
                      style={{ fontFamily: "var(--font-barlow-condensed)" }}>Mevcut: ₺{editSt.amountDue.toLocaleString("tr-TR")}</p>
                  </div>
                  <Sel label="Ödeme Durumu" value={ePS} onChange={setEPS} options={[
                    { value: "beklemede", label: "Beklemede" },
                    { value: "kismi", label: "Kısmi Ödeme" },
                    { value: "odendi", label: "Ödendi" },
                  ]} />
                </div>
              </div>

              <F label="Not (isteğe bağlı)" value={eNotes} onChange={setENotes} placeholder="Öğrenci hakkında not..." />

              {/* Alt boşluk — butonlar sabit olduğunda içerik onların altında kalmaz */}
              <div className="h-2" />
            </div>

            {/* ── Sabit footer — scroll edilince kaybolmaz ── */}
            <div className="flex-shrink-0 flex gap-3 px-5 py-4 border-t border-white/6"
              style={{ background: "rgba(24,24,27,0.98)" }}>
              <button onClick={() => setEditSt(null)}
                className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>Vazgeç</button>
              <button onClick={handleEdit} disabled={eSaving}
                className="flex-1 bg-crimson hover:bg-crimson-bright disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                {eSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
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

      {/* ── DÜET PARTNER MODAL ────────────────────────────────────── */}
      {partnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPartnerModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPartnerModal(null)} />
          <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
            className="relative z-10 w-full max-w-md bg-carbon border border-white/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
            onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background:"linear-gradient(90deg,transparent,#8B5CF6,transparent)" }} />
            <div className="flex items-center gap-3 mb-5">
              <Users size={20} className="text-violet" />
              <div>
                <h3 className="text-lg font-display text-white tracking-wider" style={{ fontFamily:"var(--font-bebas)" }}>DÜET PARTNERİ</h3>
                <p className="text-xs text-white/35" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{partnerModal.fullName} ({partnerModal.code})</p>
              </div>
              <button onClick={() => setPartnerModal(null)} className="ml-auto text-white/25 hover:text-white"><X size={18}/></button>
            </div>

            {/* Mevcut partner */}
            {currentPartner ? (
              <div className="mb-4 p-3 rounded-xl flex items-center justify-between" style={{ background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.25)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background:"rgba(139,92,246,0.2)", color:"#A855F7" }}>
                    {currentPartner.fullName.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div>
                    <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{currentPartner.fullName}</div>
                    <div className="text-xs text-white/35" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{currentPartner.code} · {currentPartner.remainingLessons} ders</div>
                  </div>
                </div>
                <button onClick={handleRemovePartner} disabled={partnerSaving}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 border border-red-400/25 hover:border-red-400/50 rounded transition-all"
                  style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                  <Unlink size={12}/> Kaldır
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/30 mb-4 text-center py-3" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Henüz düet partneri yok</p>
            )}

            {/* Arama */}
            <div className="space-y-1.5 mb-4">
              <label className="text-xs text-white/40 tracking-widest uppercase" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Partner Seç</label>
              <input value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)} placeholder="İsim veya kod ara..."
                className="w-full bg-carbon border border-white/10 focus:border-violet/50 text-white placeholder-white/20 px-3 py-2 text-sm outline-none rounded-lg"
                style={{ fontFamily:"var(--font-inter)" }} />
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {students.filter(s =>
                s.id !== partnerModal.id && s.isActive &&
                (s.fullName.toLowerCase().includes(partnerSearch.toLowerCase()) ||
                 s.code.toLowerCase().includes(partnerSearch.toLowerCase()))
              ).slice(0,8).map(s => (
                <button key={s.id} onClick={() => handleSetPartner(s.id)} disabled={partnerSaving}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all hover:bg-steel/40 disabled:opacity-50"
                  style={{ border:"1px solid rgba(255,255,255,0.05)" }}>
                  <div>
                    <div className="text-xs font-semibold text-white" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{s.fullName}</div>
                    <div className="text-[10px] text-white/30" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{s.code} · {s.remainingLessons} ders</div>
                  </div>
                  <LinkIcon size={13} className="text-violet/50" />
                </button>
              ))}
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

      {/* ── PAKET YENİLE MODAL ──────────────────────────────────────── */}
      {renewSt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ padding: 0 }} onClick={() => setRenewSt(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="relative z-10 w-full sm:max-w-2xl bg-carbon border border-white/10 flex flex-col"
            style={{ borderRadius: "16px 16px 0 0", maxHeight: "92dvh" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex-shrink-0 relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background:"linear-gradient(90deg,#22c55e,#86efac)" }} />
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/6">
                <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-green-400 font-display text-sm"
                  style={{ background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", fontFamily:"var(--font-bebas)" }}>
                  {renewSt.fullName.split(" ").map(n => n[0]).join("").slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-display text-white tracking-wider truncate" style={{ fontFamily:"var(--font-bebas)" }}>{renewSt.fullName}</div>
                  <div className="text-xs" style={{ color:"rgba(34,197,94,0.7)", fontFamily:"var(--font-barlow-condensed)" }}>
                    {renewSt.code} · Mevcut kalan: <strong>{renewSt.remainingLessons}</strong> ders
                  </div>
                </div>
                <button onClick={() => setRenewSt(null)}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full"
                  style={{ background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)" }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Kaydırılabilir içerik */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-5"
              style={{ WebkitOverflowScrolling:"touch" }}>

              {/* Paket Seç — /admin/paketler sayfasındaki aktif paketler */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs tracking-widest uppercase"
                    style={{ color:"rgba(255,255,255,0.35)", fontFamily:"var(--font-barlow-condensed)" }}>
                    Paket Seç
                  </p>
                  <a href="/admin/paketler" target="_blank"
                    className="text-[10px] tracking-widest uppercase transition-colors"
                    style={{ color:"rgba(139,92,246,0.5)", fontFamily:"var(--font-barlow-condensed)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "rgba(139,92,246,0.9)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "rgba(139,92,246,0.5)")}>
                    Paketleri Yönet →
                  </a>
                </div>
                {pkgHistLoading && !selPkg ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"rgba(255,255,255,0.2)", borderTopColor:"transparent" }} />
                  </div>
                ) : activePackages.length === 0 ? (
                  <div className="p-4 text-center" style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8 }}>
                    <p className="text-xs" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                      Aktif paket yok. /admin/paketler sayfasından paket ekleyin.
                    </p>
                  </div>
                ) : (
                  <div className={`grid gap-2 ${activePackages.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}>
                    {activePackages.map(pkg => {
                      const isActive = selPkg?.id === pkg.id;
                      return (
                        <button key={pkg.id}
                          onClick={() => { setSelPkg(pkg); setRListPrice(String(pkg.price)); }}
                          className="flex flex-col items-start gap-1 py-3 px-3 rounded-xl transition-all text-left"
                          style={{
                            background: isActive ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
                            border: isActive ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(255,255,255,0.08)",
                          }}>
                          <div className="flex items-center gap-1.5 w-full">
                            <PackageIcon size={12} style={{ color: isActive ? "#22c55e" : "rgba(255,255,255,0.3)", flexShrink:0 }} />
                            <span className="text-xs font-semibold truncate" style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.5)", fontFamily:"var(--font-barlow-condensed)" }}>{pkg.name}</span>
                            {pkg.highlight && (
                              <span className="ml-auto text-[9px] px-1 py-0.5 rounded" style={{ background:"rgba(217,119,6,0.15)", color:"#d97706", fontFamily:"var(--font-barlow-condensed)", flexShrink:0 }}>
                                Popüler
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: isActive ? "#22c55e" : "rgba(255,255,255,0.6)", fontFamily:"var(--font-bebas)", letterSpacing:"0.03em" }}>
                            {pkg.lessonCount} ders
                          </span>
                          <span className="text-[10px]" style={{ color: isActive ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.2)", fontFamily:"var(--font-barlow-condensed)" }}>
                            ₺{pkg.price.toLocaleString("tr-TR")} · {pkg.durationDays}g
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ders özeti */}
              {selPkg && (
                <div className="p-3 rounded-xl" style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.15)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-barlow-condensed)" }}>Mevcut Kalan</span>
                    <span className="text-sm font-semibold text-white" style={{ fontFamily:"var(--font-barlow-condensed)" }}>{renewSt.remainingLessons} ders</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-barlow-condensed)" }}>+ {selPkg.name}</span>
                    <span className="text-sm font-semibold" style={{ color:"#22c55e", fontFamily:"var(--font-barlow-condensed)" }}>+ {selPkg.lessonCount} ders</span>
                  </div>
                  <div className="h-px my-2" style={{ background:"rgba(255,255,255,0.06)" }} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color:"rgba(255,255,255,0.5)", fontFamily:"var(--font-barlow-condensed)" }}>Yeni Kalan</span>
                    <span className="text-lg font-bold" style={{ color:"#22c55e", fontFamily:"var(--font-bebas)", letterSpacing:"0.05em" }}>
                      {renewSt.remainingLessons + selPkg.lessonCount} ders
                    </span>
                  </div>
                </div>
              )}

              {/* Ödeme Bilgileri */}
              <div className="p-4 space-y-3" style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8 }}>
                <p className="text-xs tracking-widest uppercase" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>Ödeme Bilgileri</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                      Paket Fiyatı (₺)
                    </label>
                    <input type="number" value={rListPrice} onChange={e => setRListPrice(e.target.value)}
                      className="w-full bg-carbon border border-white/10 focus:border-gold/50 text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily:"var(--font-inter)" }} />
                    <p className="text-[10px] text-white/20 mt-1" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Katalog: ₺{selPkg?.price.toLocaleString("tr-TR") ?? "—"}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                      Ödenen (₺)
                    </label>
                    <input type="number" value={rPaidAmount} onChange={e => setRPaidAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-carbon border border-white/10 focus:border-green-500/50 text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily:"var(--font-inter)" }} />
                    {Number(rPaidAmount) > 0 && Number(rListPrice) > 0 && (
                      <p className="text-[10px] mt-1" style={{ color: Number(rPaidAmount) >= Number(rListPrice) ? "#22c55e" : "#d97706", fontFamily:"var(--font-barlow-condensed)" }}>
                        Kalan: ₺{Math.max(0, Number(rListPrice) - Number(rPaidAmount)).toLocaleString("tr-TR")}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Ödeme Durumu</label>
                  <select value={rPayStatus} onChange={e => setRPayStatus(e.target.value)}
                    className="w-full bg-carbon border border-white/10 text-white px-3 py-2.5 text-sm outline-none appearance-none"
                    style={{ fontFamily:"var(--font-inter)" }}>
                    <option value="beklemede">Beklemede</option>
                    <option value="kismi">Kısmi Ödeme</option>
                    <option value="odendi">Ödendi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-barlow-condensed)" }}>Not (opsiyonel)</label>
                  <input type="text" value={rNotes} onChange={e => setRNotes(e.target.value)}
                    placeholder="İndirim nedeni, özel not..."
                    className="w-full bg-carbon border border-white/10 text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none"
                    style={{ fontFamily:"var(--font-inter)" }} />
                </div>
              </div>

              {/* Paket Geçmişi */}
              <div>
                <button className="flex items-center gap-2 w-full text-left py-2" onClick={() => setHistOpen(o => !o)}>
                  <History size={13} style={{ color:"rgba(255,255,255,0.3)" }} />
                  <span className="text-xs tracking-widest uppercase flex-1"
                    style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                    Paket Geçmişi {pkgHistory.length > 0 && `(${pkgHistory.length})`}
                  </span>
                  {histOpen ? <ChevronUp size={12} style={{ color:"rgba(255,255,255,0.2)" }}/> : <ChevronDown size={12} style={{ color:"rgba(255,255,255,0.2)"}}/> }
                </button>
                {histOpen && (
                  <div className="space-y-1.5 mt-2">
                    {pkgHistLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor:"rgba(255,255,255,0.2)", borderTopColor:"transparent" }} />
                      </div>
                    ) : pkgHistory.length === 0 ? (
                      <p className="text-xs text-center py-4" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"var(--font-barlow-condensed)" }}>
                        Henüz paket geçmişi yok
                      </p>
                    ) : pkgHistory.map(h => (
                      <div key={h.id} className="flex items-center gap-3 px-3 py-2.5 rounded"
                        style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)" }}>
                        <PackageIcon size={12} style={{ color:"rgba(139,92,246,0.5)", flexShrink:0 }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white" style={{ fontFamily:"var(--font-barlow-condensed)" }}>
                            {h.packageName} — {h.lessonCount} ders
                          </div>
                          <div className="text-[10px]" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-barlow-condensed)" }}>
                            ₺{h.paidAmount.toLocaleString("tr-TR")} · {h.startDate ? format(new Date(h.startDate), "dd.MM.yyyy") : ""}
                          </div>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 ${h.paymentStatus === "odendi" ? "text-green-400 border-green-500/20 bg-green-500/8" : h.paymentStatus === "kismi" ? "text-gold border-gold/20 bg-gold/8" : "text-crimson border-crimson/20 bg-crimson/8"}`}
                          style={{ fontFamily:"var(--font-barlow-condensed)", border:"1px solid" }}>
                          {PAYMENT_LABELS[h.paymentStatus]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-2" />
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 flex gap-3 px-5 py-4 border-t border-white/6"
              style={{ background:"rgba(24,24,27,0.98)" }}>
              <button onClick={() => setRenewSt(null)}
                className="flex-1 border border-white/10 text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                style={{ fontFamily:"var(--font-barlow-condensed)" }}>Vazgeç</button>
              <button onClick={handleRenew} disabled={rSaving || !selPkg}
                className="flex-1 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", fontFamily:"var(--font-barlow-condensed)" }}>
                {rSaving ? (
                  <><div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin" />Yenileniyor...</>
                ) : !selPkg ? (
                  <>Paket Seçin</>
                ) : (
                  <><RotateCcw size={13}/>Paketi Yenile — {renewSt.remainingLessons + selPkg.lessonCount} Ders</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
