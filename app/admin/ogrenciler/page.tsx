"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStudents, createStudent, updateStudent, deleteStudent, getDuetPartner, setDuetPartner, removeDuetPartner, renewStudentPackage, getStudentPackageHistory, getGyms, addPayment, getAppointments, getLessonRecords, getAllXPAdjustments, getPayments } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getPackages, getActivePackages, type LessonPackage } from "@/lib/packages";
import type { Student, PackagePurchase, Gym, GymShareType, Appointment, LessonRecord, XPAdjustment, Payment } from "@/lib/types";
import { PAYMENT_LABELS, LESSON_DURATIONS, MONTHLY_DURATION_DAYS } from "@/lib/constants";
import { getPackageDurationDays, calcPackageEndDate, getDaysRemaining, getPackageUrgency, isPackageExpired } from "@/lib/packageDuration";
import { computeFullXP, getCurrentSeason, sumManualXP } from "@/lib/xp";
import { computeBadges } from "@/lib/badges";
import { User, X, AlertTriangle, CheckCircle, RefreshCw, Wand2, Users, Link as LinkIcon, Unlink, Package as PackageIcon, RotateCcw, ChevronDown, ChevronUp, History, CalendarClock } from "lucide-react";
import { useToast } from "@/app/components/shared/Toast";
import { format } from "date-fns";
import StudentsHero from "@/app/components/ogrenciler/StudentsHero";
import SearchAndFilters from "@/app/components/ogrenciler/SearchAndFilters";
import StudentCard from "@/app/components/ogrenciler/StudentCard";
import ExpiredWarningCard from "@/app/components/ogrenciler/ExpiredWarningCard";

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = {
  initial: { opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

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
        style={{ fontFamily: "var(--font-label)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none rounded-lg transition-colors"
        style={{ fontFamily: "var(--font-label)" }} />
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
        style={{ fontFamily: "var(--font-label)" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full glass text-white px-3 py-2.5 text-sm outline-none rounded-lg appearance-none transition-colors"
        style={{ fontFamily: "var(--font-label)" }}>
        {options.map(o => <option key={o.value} value={o.value} className="bg-carbon">{o.label}</option>)}
      </select>
    </div>
  );
}

/* ── Ana bileşen ─────────────────────────────────────────────────────── */
export default function OgrencilerPage() {
  const [students, setStudents]   = useState<Student[]>([]);
  /* XP/Rozet/Son Ders/Son Ödeme kartları için salt-okunur toplu veri — Admin Dashboard'daki aynı desen */
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [allRecords, setAllRecords]           = useState<LessonRecord[]>([]);
  const [allAdjustments, setAllAdjustments]   = useState<XPAdjustment[]>([]);
  const [allPayments, setAllPayments]         = useState<Payment[]>([]);
  const [packages, setPackages]   = useState<LessonPackage[]>([]);
  const [gyms, setGyms]           = useState<Gym[]>([]);
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
  /* Salon ataması */
  const [aGymId, setAGymId]               = useState("");
  const [aGymOverride, setAGymOverride]   = useState(false);
  const [aGymOvType, setAGymOvType]       = useState<GymShareType>("no_share");
  const [aGymOvValue, setAGymOvValue]     = useState("");

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
  /* Salon ataması */
  const [eGymId, setEGymId]               = useState("");
  const [eGymOverride, setEGymOverride]   = useState(false);
  const [eGymOvType, setEGymOvType]       = useState<GymShareType>("no_share");
  const [eGymOvValue, setEGymOvValue]     = useState("");

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
  useEffect(() => { getGyms().then(setGyms).catch(() => {}); }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, apts, recs, adjustments, payments] = await Promise.all([
        getStudents(),
        getAppointments().catch(() => []),
        getLessonRecords().catch(() => []),
        getAllXPAdjustments().catch(() => []),
        getPayments().catch(() => []),
      ]);
      setStudents(data);
      setAllAppointments(apts);
      setAllRecords(recs);
      setAllAdjustments(adjustments);
      setAllPayments(payments);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      console.error("reload hatası:", msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /* ── Kart için türetilmiş veri: XP / Rozetler / Son Ders / Son Ödeme ──
     Salt-okunur, sadece kaynak veri değiştiğinde yeniden hesaplanır — arama/filtre
     tuşlarında tüm liste için tekrar hesaplama YAPILMAZ (performans). Admin
     Dashboard'daki computeFullXP/computeBadges kullanımıyla birebir aynı desen. */
  const studentExtras = useMemo(() => {
    const season = getCurrentSeason();
    const map = new Map<string, { xpTotal: number; badges: ReturnType<typeof computeBadges>; lastLessonDate: string | null; lastPaymentDate: string | null }>();
    for (const s of students) {
      const apts = allAppointments.filter(a => a.studentId === s.id);
      const recs = allRecords.filter(r => r.studentId === s.id);
      const adjs = allAdjustments.filter(a => a.studentId === s.id);
      const manualXP = sumManualXP(adjs);
      const xpTotal = computeFullXP(s.completedLessons, apts, recs, season, adjs).lifetimeResult.breakdown.total;
      const badges = computeBadges(s, apts, recs, {}, manualXP).filter(b => b.earned);
      const lastLessonDate = apts
        .filter(a => a.status === "tamamlandi")
        .sort((a, b) => `${b.date}T${b.startTime}`.localeCompare(`${a.date}T${a.startTime}`))[0]?.date ?? null;
      const lastPaymentDate = allPayments.find(p => p.studentId === s.id)?.paidAt ?? null;
      map.set(s.id, { xpTotal, badges, lastLessonDate, lastPaymentDate });
    }
    return map;
  }, [students, allAppointments, allRecords, allAdjustments, allPayments]);

  /* ── Filtre ─────────────────────────────────────────────────────── */
  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const match = s.fullName.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.phone.includes(q);
    const filt = filter === "all"      ? true
      : filter === "active"   ? s.isActive
      : filter === "inactive" ? !s.isActive
      : filter === "payment"  ? s.paymentStatus !== "odendi"
      : filter === "expired"  ? isPackageExpired(s.packageEndDate)
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
    setAGymId(""); setAGymOverride(false); setAGymOvType("no_share"); setAGymOvValue("");
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
      // Paket fiyatı: indirimli fiyat varsa onu, yoksa standart fiyat alanını kullan
      const packagePrice = customPrice !== undefined ? customPrice : (Number(aAmountDue) || 0);
      const paidNow       = Number(aAmountPaid) || 0;
      // Bitiş tarihi: paket süresi alanına göre hesaplanır
      const durationDays = Number(aDurationDays) || getPackageDurationDays(totalLessons, "lesson_pack");
      const endDate = calcPackageEndDate(today, durationDays);
      const pkgName = packages.find(p => p.id === aPackageId)?.name;

      // Öğrenci 0 ödenmiş / tam borçlu olarak oluşturulur — bakiye aşağıdaki
      // addPayment çağrılarıyla doğru şekilde ayarlanır (çift sayım olmasın).
      const created = await createStudent({
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
        paymentStatus:    "beklemede",
        amountPaid:       0,
        amountDue:        packagePrice,
        packageStartDate: today,
        packageEndDate:   endDate,
        notes:            aNotes.trim() || undefined,
        isActive:         true,
        gymId:                 aGymId || undefined,
        gymShareOverrideType:  aGymOverride ? aGymOvType : undefined,
        gymShareOverrideValue: aGymOverride && aGymOvValue ? Number(aGymOvValue) : undefined,
      });

      // Finans Merkezi — ödenen kısım "odendi", kalan borç "beklemede" olarak
      // Gelir Hareketleri'ne yansır (öğrenciler kısmından eklenen ödeme/borç
      // artık Finans Merkezi'nde görünür).
      if (paidNow > 0) {
        await addPayment({
          studentId: created.id, studentName: created.fullName,
          amount: paidNow, paidAt: today, method: "paket", status: "odendi",
          notes: pkgName ? `${pkgName} — ${totalLessons} ders` : `${totalLessons} ders paketi`,
        }, { movementType: "yeni_paket", packageType: pkgName });
      }
      const stillDue = packagePrice - paidNow;
      if (stillDue > 0) {
        await addPayment({
          studentId: created.id, studentName: created.fullName,
          amount: stillDue, paidAt: today, method: "paket", status: "beklemede",
          notes: "Kalan borç",
        }, { movementType: "yeni_paket", packageType: pkgName });
      }

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
    setEGymId(s.gymId ?? "");
    setEGymOverride(!!s.gymShareOverrideType);
    setEGymOvType(s.gymShareOverrideType ?? "no_share");
    setEGymOvValue(s.gymShareOverrideValue != null ? String(s.gymShareOverrideValue) : "");
    setEditSt(s);
  };

  const handleEdit = async () => {
    if (!editSt) return;
    setESaving(true);
    try {
      // Ödenen alanı yükseldiyse (örn. öğrenci nakit ödedi, admin burada
      // güncelliyor) farkı otomatik Finans Merkezi'ne gelir hareketi olarak
      // yansıtırız — admin'in ayrıca Finans Merkezi'nden manuel eklemesine
      // gerek kalmaz. Borç (amountDue) yükseldiyse de "beklemede" olarak
      // aynı şekilde yansır.
      const paidDelta = Number(eAP) - editSt.amountPaid;
      const dueDelta  = Number(eAD) - editSt.amountDue;

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
        gymId:                 eGymId || null,
        gymShareOverrideType:  eGymOverride ? eGymOvType : null,
        gymShareOverrideValue: eGymOverride && eGymOvValue ? Number(eGymOvValue) : null,
      });

      if (paidDelta > 0) {
        const today = new Date().toISOString().split("T")[0];
        await addPayment({
          studentId:   editSt.id,
          studentName: eName.trim() || editSt.fullName,
          amount:      paidDelta,
          paidAt:      today,
          method:      "nakit",
          status:      "odendi",
          notes:       "Öğrenci profilinden güncellendi",
        }, { movementType: "ek_odeme", skipBalanceUpdate: true });
      }

      if (dueDelta > 0) {
        const today = new Date().toISOString().split("T")[0];
        await addPayment({
          studentId:   editSt.id,
          studentName: eName.trim() || editSt.fullName,
          amount:      dueDelta,
          paidAt:      today,
          method:      "nakit",
          status:      "beklemede",
          notes:       "Öğrenci profilinden borç güncellendi",
        }, { movementType: "ek_odeme", skipBalanceUpdate: true });
      }

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
    <motion.div variants={stagger} initial="initial" animate="animate" className="max-w-6xl mx-auto space-y-5">

      {/* Hero */}
      <motion.div variants={fadeUp}>
        <StudentsHero
          totalCount={students.length}
          activeCount={students.filter(s => s.isActive).length}
          expiredCount={expiredStudents.length}
          pendingPaymentCount={students.filter(s => s.paymentStatus !== "odendi").length}
          onAddStudent={openAdd}
        />
      </motion.div>

      {/* Supabase bağlantı durumu */}
      {!isSupabaseConfigured ? (
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.25)" }}>
          <AlertTriangle size={18} style={{ color:"var(--color-achievement)" }} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold" style={{ color:"var(--color-achievement)", fontFamily: "var(--font-label)" }}>
              ⚠️ Supabase bağlı değil — veriler kalıcı olmaz!
            </div>
            <div className="text-xs mt-0.5" style={{ color:"var(--color-achievement)", opacity:0.6, fontFamily: "var(--font-label)" }}>
              .env.local dosyasını doldurun ve npm run dev&apos;i yeniden başlatın.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:"rgba(34,197,94,0.06)", border:"1px solid rgba(34,197,94,0.2)" }}>
          <CheckCircle size={14} style={{ color:"var(--color-success)" }} />
          <span className="text-xs tracking-wider" style={{ color:"var(--color-success)", fontFamily: "var(--font-label)" }}>
            Supabase bağlı — tüm veriler kalıcı olarak kaydedilir
          </span>
        </div>
      )}

      {/* Genel hata */}
      {error && (
        <div className="p-3 rounded-xl text-xs" style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)", color:"var(--color-error)", fontFamily: "var(--font-label)" }}>
          ⛔ {error}
        </div>
      )}

      {/* ── YENİ ÖĞRENCİ FORMU ────────────────────────────────────── */}
      <AnimatePresence>
        {addOpen && (
          <motion.div initial={{ y: -14, scale: 0.98, filter: "blur(6px)" }} animate={{ y: 0, scale: 1, filter: "blur(0px)" }} exit={{ y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-2xl overflow-hidden gradient-animated gradient-slow gradient-violet-pink-orange gradient-border-quiet p-[1px]">
            <div className="glass-strong relative rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>YENİ ÖĞRENCİ EKLE</h2>
                <button onClick={() => setAddOpen(false)} className="text-white/25 hover:text-white transition-colors"><X size={18} /></button>
              </div>
              {/* ── GİRİŞ KODU ──────────────────────────────────── */}
              <div className="mb-4 p-3 glass rounded-xl">
                <label className="block text-xs tracking-widest uppercase mb-2"
                  style={{ color: "var(--color-achievement)", opacity: 0.8, fontFamily: "var(--font-label)" }}>
                  Giriş Kodu <span className="text-white/30">(öğrencinin sisteme giriş şifresi)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={aCode}
                    onChange={e => setACode(e.target.value.toUpperCase())}
                    placeholder="ENES001"
                    className="flex-1 glass rounded-lg border-2 px-4 py-2.5 text-xl outline-none transition-all tracking-widest uppercase"
                    style={{
                      fontFamily: "var(--font-display)",
                      borderColor: aCode && isCodeTaken(aCode, students) ? "rgba(239,68,68,0.6)" : "rgba(245,158,11,0.4)",
                      color: aCode && isCodeTaken(aCode, students) ? "var(--color-error)" : "var(--color-achievement)",
                    }}
                  />
                  {/* İsimden üret */}
                  <button
                    type="button"
                    onClick={() => setACode(genCodeFromName(aName, students))}
                    disabled={!aName.trim()}
                    title="İsmin baş harflerinden kod üret"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-semibold tracking-wider uppercase"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}
                  >
                    <Wand2 size={14} />
                    <span className="hidden sm:inline">İsimden</span>
                  </button>
                  {/* Sıralı üret */}
                  <button
                    type="button"
                    onClick={() => setACode(genCodeSequential(students))}
                    title="Sıralı kod üret (ENES001, ENES002...)"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/50 hover:text-white transition-all text-xs font-semibold tracking-wider uppercase"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", fontFamily: "var(--font-label)" }}
                  >
                    <RefreshCw size={14} />
                    <span className="hidden sm:inline">Sıralı</span>
                  </button>
                </div>
                {/* Çakışma uyarısı */}
                {aCode && isCodeTaken(aCode, students) && (
                  <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "var(--color-error)", fontFamily: "var(--font-label)" }}>
                    <AlertTriangle size={12} />
                    Bu kod zaten kullanımda — farklı bir kod girin
                  </p>
                )}
                {aCode && !isCodeTaken(aCode, students) && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--color-success)", opacity: 0.7, fontFamily: "var(--font-label)" }}>
                    ✓ Bu kod kullanılabilir
                  </p>
                )}
                <p className="text-xs text-white/20 mt-1.5" style={{ fontFamily: "var(--font-label)" }}>
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
              <div className="mb-3 p-3 glass rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <PackageIcon size={14} style={{ color: "var(--color-achievement)" }} />
                  <span className="text-xs tracking-widest uppercase" style={{ color: "var(--color-achievement)", fontFamily:"var(--font-label)" }}>
                    Ders Paketi Seç (otomatik doldurur)
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>Paket</label>
                    <select value={aPackageId} onChange={e => handlePackageSelect(e.target.value)}
                      className="w-full glass text-white px-3 py-2.5 text-sm outline-none appearance-none rounded-lg transition-colors"
                      style={{ fontFamily:"var(--font-label)" }}>
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
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>
                      Toplam Ders *
                    </label>
                    <input type="number" min="1" value={aTotalLessons} onChange={e => handleTotalLessonsChange(e.target.value)}
                      className="w-full glass rounded-lg px-3 py-2.5 text-lg outline-none"
                      style={{ color: "var(--color-achievement)", fontFamily:"var(--font-display)" }} />
                  </div>
                  {/* Standart fiyat (paket fiyatı) */}
                  <div>
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>
                      Standart Fiyat (₺)
                    </label>
                    <input type="number" min="0" value={aAmountDue} onChange={e => setAAD(e.target.value)} placeholder="Paket fiyatı"
                      className="w-full glass rounded-lg text-white/70 px-3 py-2.5 text-lg outline-none"
                      style={{ fontFamily:"var(--font-display)" }} />
                  </div>
                </div>
                {/* Paket geçerlilik süresi */}
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>
                      Paket Geçerlilik Süresi (gün)
                    </label>
                    <input type="number" min="1" value={aDurationDays} onChange={e => setADurationDays(e.target.value)}
                      className="w-full glass rounded-lg text-white px-3 py-2.5 text-lg outline-none"
                      style={{ fontFamily:"var(--font-display)" }} />
                  </div>
                  <div className="flex flex-col justify-end">
                    <p className="text-xs text-white/20" style={{ fontFamily:"var(--font-label)" }}>
                      Bugün başlar, {format(new Date(calcPackageEndDate(new Date(), Number(aDurationDays) || 0)), "dd MMMM yyyy")} tarihinde sona erer.
                    </p>
                  </div>
                </div>
                {/* İndirimli fiyat */}
                <div className="mt-2 grid sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)", color:"var(--color-achievement)" }}>
                      İndirimli / Özel Fiyat (₺) — isteğe bağlı
                    </label>
                    <input type="number" min="0" value={aCustomPrice} onChange={e => setACustom(e.target.value)}
                      placeholder={aAmountDue ? `Standart: ₺${Number(aAmountDue).toLocaleString("tr-TR")}` : "Boş = standart fiyat"}
                      className="w-full glass rounded-lg px-3 py-2.5 text-lg outline-none"
                      style={{ color: "var(--color-achievement)", fontFamily:"var(--font-display)" }} />
                    {aCustomPrice && aAmountDue && Number(aCustomPrice) < Number(aAmountDue) && (
                      <p className="text-xs mt-1" style={{ color: "var(--color-achievement)", fontFamily:"var(--font-label)" }}>
                        İndirim: ₺{(Number(aAmountDue) - Number(aCustomPrice)).toLocaleString("tr-TR")} (%{Math.round((1-Number(aCustomPrice)/Number(aAmountDue))*100)})
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-white/35 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>Ödenen (₺)</label>
                    <input type="number" min="0" value={aAmountPaid} onChange={e => setAAP(e.target.value)} placeholder="0"
                      className="w-full glass rounded-lg px-3 py-2.5 text-lg outline-none"
                      style={{ color: "var(--color-success)", fontFamily:"var(--font-display)" }} />
                  </div>
                </div>
                <p className="text-xs text-white/20 mt-2" style={{ fontFamily:"var(--font-label)" }}>
                  İndirimli fiyat girilirse borç = indirimli fiyat − ödenen. Girilmezse standart fiyat kullanılır.
                </p>
              </div>

              {/* Salon ataması — gelir paylaşımı */}
              <div className="mb-3 p-3 glass rounded-xl">
                <p className="text-xs tracking-widest uppercase mb-2" style={{ color:"#A855F7", fontFamily:"var(--font-label)" }}>
                  Salon (gelir paylaşımı)
                </p>
                <select value={aGymId} onChange={e => setAGymId(e.target.value)}
                  className="w-full glass text-white px-3 py-2.5 text-sm outline-none appearance-none rounded-lg transition-colors mb-2"
                  style={{ fontFamily:"var(--font-label)" }}>
                  <option value="" className="bg-carbon">— Salon yok (tamamen kendi öğrencin) —</option>
                  {gyms.filter(g => g.isActive).map(g => (
                    <option key={g.id} value={g.id} className="bg-carbon">
                      {g.name} — {g.shareType === "fixed_per_lesson" ? `Ders başı ₺${g.fixedLessonFee}` : g.shareType === "percentage" ? `Salon %${g.gymPercentage}` : "Pay yok"}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={aGymOverride} onChange={e => setAGymOverride(e.target.checked)} className="w-3.5 h-3.5" />
                  <span className="text-xs text-white/40" style={{ fontFamily:"var(--font-label)" }}>Bu öğrenci için özel anlaşma uygula</span>
                </label>
                {aGymOverride && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <select value={aGymOvType} onChange={e => setAGymOvType(e.target.value as GymShareType)}
                      className="glass text-white px-2 py-2 text-xs outline-none appearance-none rounded-lg" style={{ fontFamily:"var(--font-label)" }}>
                      <option value="fixed_per_lesson">Ders Başı Sabit</option>
                      <option value="percentage">Yüzdelik</option>
                      <option value="no_share">Pay Yok</option>
                    </select>
                    {aGymOvType !== "no_share" && (
                      <input type="number" value={aGymOvValue} onChange={e => setAGymOvValue(e.target.value)}
                        placeholder={aGymOvType === "percentage" ? "Salon %" : "Ders başı ₺"}
                        className="glass text-white px-2 py-2 text-xs outline-none rounded-lg" style={{ fontFamily:"var(--font-label)" }} />
                    )}
                  </div>
                )}
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
                  className="flex-1 rounded-lg text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: "var(--font-label)" }}>Vazgeç</button>
                <button onClick={handleAdd} disabled={!aName.trim() || !aPhone.trim() || aSaving}
                  className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 rounded-lg disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-transform hover:scale-[1.01] active:scale-95"
                  style={{ fontFamily: "var(--font-label)" }}>
                  {aSaving ? "Kaydediliyor..." : "Öğrenci Ekle"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Arama + filtre */}
      <motion.div variants={fadeUp}>
        <SearchAndFilters search={search} onSearchChange={setSearch} filter={filter} onFilterChange={setFilter} />
      </motion.div>

      {/* ── SÜRESİ DOLAN ÖĞRENCİLER ──────────────────────────────── */}
      {expiredStudents.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: "var(--color-error)" }} />
            <h2 className="text-base text-white tracking-wider" style={{ fontFamily: "var(--font-display)" }}>
              SÜRESİ DOLAN ÖĞRENCİLER ({expiredStudents.length})
            </h2>
          </div>
          <div className="space-y-2.5">
            {expiredStudents.map(s => (
              <ExpiredWarningCard
                key={s.id}
                student={s}
                busy={expiredBusy === s.id}
                onExtend={handleExtendPackage}
                onRenew={openRenewModal}
                onUnlimited={handleMakeUnlimited}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Öğrenci kartları — tüm ekran boyutlarında tek responsive grid ── */}
      {loading ? (
        <div className="text-center py-12 text-white/30 text-sm" style={{ fontFamily: "var(--font-label)" }}>Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <User size={28} className="text-white/10 mx-auto mb-2" />
          <p className="text-white/20 text-sm" style={{ fontFamily: "var(--font-label)" }}>Öğrenci bulunamadı</p>
        </div>
      ) : (
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(s => {
              const extra = studentExtras.get(s.id);
              return (
                <StudentCard
                  key={s.id}
                  student={s}
                  xpTotal={extra?.xpTotal ?? 0}
                  badges={extra?.badges ?? []}
                  lastLessonDate={extra?.lastLessonDate ?? null}
                  lastPaymentDate={extra?.lastPaymentDate ?? null}
                  onEdit={openEdit}
                  onPartner={openPartnerModal}
                  onQr={setQrSt}
                  onDelete={setDelSt}
                  onRenew={openRenewModal}
                />
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── DÜZENLEME MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {editSt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setEditSt(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ y: 40, opacity: 0, scale: 0.98, filter: "blur(6px)" }} animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ y: 20, opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col"
            style={{
              maxHeight: "92dvh",        /* dvh = dynamic viewport, iOS Safari safe */
            }}
            onClick={e => e.stopPropagation()}>
            {/* ── Sabit header — scroll edilince kaybolmaz ── */}
            <div className="flex-shrink-0 relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl gradient-animated gradient-slow gradient-violet-pink-orange" />
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/6">
                <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-sm"
                  style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#A78BFA", fontFamily: "var(--font-display)" }}>
                  {editSt.fullName.split(" ").map(n => n[0]).join("").slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base text-white tracking-wider truncate"
                    style={{ fontFamily: "var(--font-display)" }}>{editSt.fullName}</div>
                  <div className="text-xs" style={{ color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>{editSt.code}</div>
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
              <div className="p-3 glass rounded-xl space-y-3">
                <p className="text-xs tracking-widest uppercase" style={{ color:"#A855F7", fontFamily:"var(--font-label)" }}>Üyelik Tipi</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v:"lesson_pack", l:"Ders Paketi", d:"Kalan ders sayılır" }, { v:"monthly", l:"Aylık Üyelik", d:"Sınırsız ders" }].map(opt => (
                    <button key={opt.v} type="button" onClick={() => setESubType(opt.v as "lesson_pack"|"monthly")}
                      className="flex flex-col gap-0.5 p-3 text-left transition-all rounded-lg"
                      style={{
                        background: eSubType===opt.v ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                        border: eSubType===opt.v ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      }}>
                      <span className="text-xs font-semibold" style={{ color: eSubType===opt.v ? "#fff" : "rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>{opt.l}</span>
                      <span className="text-[10px]" style={{ color:"rgba(255,255,255,0.25)", fontFamily:"var(--font-label)" }}>{opt.d}</span>
                    </button>
                  ))}
                </div>
                {eSubType === "monthly" && (
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>Aylık Tutar (₺)</label>
                    <input type="number" value={eMonthlyFee} onChange={e => setEMonthlyFee(e.target.value)} placeholder="Örn: 1500"
                      className="w-full glass rounded-lg text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily:"var(--font-label)" }} />
                  </div>
                )}
              </div>

              {/* Salon ataması — gelir paylaşımı */}
              <div className="p-3 glass rounded-xl space-y-2">
                <p className="text-xs tracking-widest uppercase" style={{ color:"#A855F7", fontFamily:"var(--font-label)" }}>Salon (gelir paylaşımı)</p>
                <select value={eGymId} onChange={e => setEGymId(e.target.value)}
                  className="w-full glass text-white px-3 py-2.5 text-sm outline-none appearance-none rounded-lg transition-colors"
                  style={{ fontFamily:"var(--font-label)" }}>
                  <option value="" className="bg-carbon">— Salon yok (tamamen kendi öğrencin) —</option>
                  {gyms.filter(g => g.isActive || g.id === eGymId).map(g => (
                    <option key={g.id} value={g.id} className="bg-carbon">
                      {g.name} — {g.shareType === "fixed_per_lesson" ? `Ders başı ₺${g.fixedLessonFee}` : g.shareType === "percentage" ? `Salon %${g.gymPercentage}` : "Pay yok"}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={eGymOverride} onChange={e => setEGymOverride(e.target.checked)} className="w-3.5 h-3.5" />
                  <span className="text-xs text-white/40" style={{ fontFamily:"var(--font-label)" }}>Bu öğrenci için özel anlaşma uygula</span>
                </label>
                {eGymOverride && (
                  <div className="grid grid-cols-2 gap-2">
                    <select value={eGymOvType} onChange={e => setEGymOvType(e.target.value as GymShareType)}
                      className="glass text-white px-2 py-2 text-xs outline-none appearance-none rounded-lg" style={{ fontFamily:"var(--font-label)" }}>
                      <option value="fixed_per_lesson">Ders Başı Sabit</option>
                      <option value="percentage">Yüzdelik</option>
                      <option value="no_share">Pay Yok</option>
                    </select>
                    {eGymOvType !== "no_share" && (
                      <input type="number" value={eGymOvValue} onChange={e => setEGymOvValue(e.target.value)}
                        placeholder={eGymOvType === "percentage" ? "Salon %" : "Ders başı ₺"}
                        className="glass text-white px-2 py-2 text-xs outline-none rounded-lg" style={{ fontFamily:"var(--font-label)" }} />
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 glass rounded-xl space-y-3">
                <div className="text-xs tracking-widest uppercase"
                  style={{ color: "var(--color-achievement)", fontFamily: "var(--font-label)" }}>Ders Bilgileri</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-label)" }}>Kalan Ders *</label>
                    <input type="number" min="0" value={eRL} onChange={e => setERL(e.target.value)}
                      className="w-full glass rounded-lg px-3 py-3 text-lg outline-none tracking-wider"
                      style={{ color: "var(--color-achievement)", fontFamily: "var(--font-display)" }} />
                    <p className="text-xs text-white/20 mt-1"
                      style={{ fontFamily: "var(--font-label)" }}>Mevcut: {editSt.remainingLessons}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-label)" }}>Toplam Ders</label>
                    <input type="number" min="0" value={eTL} onChange={e => setETL(e.target.value)}
                      className="w-full glass rounded-lg text-white px-3 py-3 text-lg outline-none tracking-wider"
                      style={{ fontFamily: "var(--font-display)" }} />
                    <p className="text-xs text-white/20 mt-1"
                      style={{ fontFamily: "var(--font-label)" }}>Mevcut: {editSt.totalLessons}</p>
                  </div>
                </div>
              </div>

              {/* Paket süresi */}
              <div className="p-4 glass rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs tracking-widest uppercase"
                    style={{ color: "#A78BFA", fontFamily: "var(--font-label)" }}>Paket Süresi</div>
                  {(() => {
                    const days = getDaysRemaining(eEndDate);
                    if (days === null) return null;
                    const u = getPackageUrgency(days);
                    return (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.color}`}
                        style={{ background: u.bg, border: `1px solid ${u.border}`, fontFamily: "var(--font-label)" }}>
                        {days < 0 ? "Süresi Doldu" : `${days} gün kaldı`}
                      </span>
                    );
                  })()}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-label)" }}>Başlangıç Tarihi</label>
                    <input type="date" value={eStartDate} onChange={e => setEStartDate(e.target.value)}
                      className="w-full glass rounded-lg text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily: "var(--font-label)" }} />
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-label)" }}>Bitiş Tarihi</label>
                    <input type="date" value={eEndDate} onChange={e => setEEndDate(e.target.value)}
                      className="w-full glass rounded-lg text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily: "var(--font-label)" }} />
                  </div>
                </div>
                <button type="button"
                  onClick={() => {
                    const start = new Date().toISOString().split("T")[0];
                    const duration = getPackageDurationDays(Number(eTL) || editSt.totalLessons, eSubType);
                    setEStartDate(start);
                    setEEndDate(calcPackageEndDate(start, duration));
                  }}
                  className="flex items-center justify-center gap-2 w-full rounded-lg hover:bg-violet-500/10 text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ border: "1px solid rgba(139,92,246,0.3)", color: "#A78BFA", fontFamily: "var(--font-label)" }}>
                  <CalendarClock size={13} />Süreyi Bugünden Başlat ve Yenile
                </button>
              </div>

              <div className="p-4 glass rounded-xl space-y-3">
                <div className="text-xs tracking-widest uppercase"
                  style={{ color: "var(--color-error)", fontFamily: "var(--font-label)" }}>Ödeme Bilgileri</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-label)" }}>Ödenen (₺)</label>
                    <input type="number" min="0" value={eAP} onChange={e => setEAP(e.target.value)}
                      className="w-full glass rounded-lg px-3 py-3 text-lg outline-none tracking-wider"
                      style={{ color: "var(--color-success)", fontFamily: "var(--font-display)" }} />
                    <p className="text-xs text-white/20 mt-1"
                      style={{ fontFamily: "var(--font-label)" }}>Mevcut: ₺{editSt.amountPaid.toLocaleString("tr-TR")}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5"
                      style={{ fontFamily: "var(--font-label)" }}>Kalan Borç (₺)</label>
                    <input type="number" min="0" value={eAD} onChange={e => setEAD(e.target.value)}
                      className="w-full glass rounded-lg px-3 py-3 text-lg outline-none tracking-wider"
                      style={{ color: "var(--color-error)", fontFamily: "var(--font-display)" }} />
                    <p className="text-xs text-white/20 mt-1"
                      style={{ fontFamily: "var(--font-label)" }}>Mevcut: ₺{editSt.amountDue.toLocaleString("tr-TR")}</p>
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
                className="flex-1 rounded-lg text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: "var(--font-label)" }}>Vazgeç</button>
              <button onClick={handleEdit} disabled={eSaving}
                className="gradient-animated gradient-slow gradient-violet-pink-orange flex-1 rounded-lg disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-3 transition-transform hover:scale-[1.01] active:scale-95"
                style={{ fontFamily: "var(--font-label)" }}>
                {eSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* ── SİLME ONAYI ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {delSt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDelSt(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-sm rounded-2xl p-6"
              onClick={e => e.stopPropagation()}>
              <h3 className="text-xl text-white tracking-wider mb-2" style={{ fontFamily: "var(--font-display)" }}>ÖĞRENCİYİ SİL</h3>
              <p className="text-sm text-white/50 mb-5" style={{ fontFamily: "var(--font-label)" }}>
                <strong>{delSt.fullName}</strong> ({delSt.code}) ve tüm verileri Supabase&apos;den kalıcı olarak silinecek.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDelSt(null)}
                  className="flex-1 rounded-lg text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily: "var(--font-label)" }}>Vazgeç</button>
                <button onClick={handleDelete} disabled={delSaving}
                  className="flex-1 rounded-lg disabled:opacity-40 text-white text-xs font-semibold tracking-widest uppercase py-2.5 transition-all"
                  style={{ background: "var(--color-error)", fontFamily: "var(--font-label)" }}>
                  {delSaving ? "Siliniyor..." : "Evet, Sil"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DÜET PARTNER MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {partnerModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setPartnerModal(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPartnerModal(null)} />
          <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 w-full max-w-md rounded-2xl p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <Users size={20} style={{ color: "#A78BFA" }} />
              <div>
                <h3 className="text-lg text-white tracking-wider" style={{ fontFamily:"var(--font-display)" }}>DÜET PARTNERİ</h3>
                <p className="text-xs text-white/35" style={{ fontFamily:"var(--font-label)" }}>{partnerModal.fullName} ({partnerModal.code})</p>
              </div>
              <button onClick={() => setPartnerModal(null)} className="ml-auto text-white/25 hover:text-white"><X size={18}/></button>
            </div>

            {/* Mevcut partner */}
            {currentPartner ? (
              <div className="mb-4 p-3 rounded-xl flex items-center justify-between glass">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background:"rgba(139,92,246,0.2)", color:"#A855F7" }}>
                    {currentPartner.fullName.split(" ").map(n=>n[0]).join("").slice(0,2)}
                  </div>
                  <div>
                    <div className="text-sm text-white font-semibold" style={{ fontFamily:"var(--font-label)" }}>{currentPartner.fullName}</div>
                    <div className="text-xs text-white/35" style={{ fontFamily:"var(--font-label)" }}>{currentPartner.code} · {currentPartner.remainingLessons} ders</div>
                  </div>
                </div>
                <button onClick={handleRemovePartner} disabled={partnerSaving}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs border rounded-lg transition-all"
                  style={{ color: "var(--color-error)", borderColor: "rgba(239,68,68,0.25)", fontFamily:"var(--font-label)" }}>
                  <Unlink size={12}/> Kaldır
                </button>
              </div>
            ) : (
              <p className="text-xs text-white/30 mb-4 text-center py-3" style={{ fontFamily:"var(--font-label)" }}>Henüz düet partneri yok</p>
            )}

            {/* Arama */}
            <div className="space-y-1.5 mb-4">
              <label className="text-xs text-white/40 tracking-widest uppercase" style={{ fontFamily:"var(--font-label)" }}>Partner Seç</label>
              <input value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)} placeholder="İsim veya kod ara..."
                className="w-full glass text-white placeholder-white/20 px-3 py-2 text-sm outline-none rounded-lg"
                style={{ fontFamily:"var(--font-label)" }} />
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {students.filter(s =>
                s.id !== partnerModal.id && s.isActive &&
                (s.fullName.toLowerCase().includes(partnerSearch.toLowerCase()) ||
                 s.code.toLowerCase().includes(partnerSearch.toLowerCase()))
              ).slice(0,8).map(s => (
                <button key={s.id} onClick={() => handleSetPartner(s.id)} disabled={partnerSaving}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all glass disabled:opacity-50">
                  <div>
                    <div className="text-xs font-semibold text-white" style={{ fontFamily:"var(--font-label)" }}>{s.fullName}</div>
                    <div className="text-[10px] text-white/30" style={{ fontFamily:"var(--font-label)" }}>{s.code} · {s.remainingLessons} ders</div>
                  </div>
                  <LinkIcon size={13} style={{ color: "rgba(167,139,250,0.5)" }} />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* ── QR MODAL ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {qrSt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setQrSt(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, y: 16, filter: "blur(6px)" }} animate={{ scale: 1, y: 0, filter: "blur(0px)" }} exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="glass-strong relative z-10 w-full max-w-xs rounded-2xl p-8 text-center" onClick={e => e.stopPropagation()}>
              <div className="text-6xl mb-3" style={{ color: "var(--color-achievement)", fontFamily: "var(--font-display)", letterSpacing: "0.2em" }}>{qrSt.code}</div>
              <div className="text-white font-semibold mb-1" style={{ fontFamily: "var(--font-label)" }}>{qrSt.fullName}</div>
              <p className="text-xs text-white/25 mt-2" style={{ fontFamily: "var(--font-label)" }}>
                Bu kodu öğrenciye verin. /giris sayfasında kullanacaklar.
              </p>
              <button onClick={() => setQrSt(null)} className="mt-4 text-xs text-white/30 hover:text-white tracking-widest uppercase transition-colors" style={{ fontFamily: "var(--font-label)" }}>Kapat</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PAKET YENİLE MODAL ──────────────────────────────────────── */}
      <AnimatePresence>
        {renewSt && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          style={{ padding: 0 }} onClick={() => setRenewSt(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div initial={{ y: 40, opacity: 0, scale: 0.98, filter: "blur(6px)" }} animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ y: 20, opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col"
            style={{ maxHeight: "92dvh" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex-shrink-0 relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background:"linear-gradient(90deg,#22c55e,#86efac)" }} />
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/6">
                <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-sm"
                  style={{ background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.25)", color: "var(--color-success)", fontFamily:"var(--font-display)" }}>
                  {renewSt.fullName.split(" ").map(n => n[0]).join("").slice(0,2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base text-white tracking-wider truncate" style={{ fontFamily:"var(--font-display)" }}>{renewSt.fullName}</div>
                  <div className="text-xs" style={{ color:"rgba(34,197,94,0.7)", fontFamily:"var(--font-label)" }}>
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
                    style={{ color:"rgba(255,255,255,0.35)", fontFamily:"var(--font-label)" }}>
                    Paket Seç
                  </p>
                  <a href="/admin/paketler" target="_blank"
                    className="text-[10px] tracking-widest uppercase transition-colors"
                    style={{ color:"rgba(139,92,246,0.5)", fontFamily:"var(--font-label)" }}
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
                  <div className="p-4 text-center glass rounded-xl">
                    <p className="text-xs" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
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
                            <span className="text-xs font-semibold truncate" style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.5)", fontFamily:"var(--font-label)" }}>{pkg.name}</span>
                            {pkg.highlight && (
                              <span className="ml-auto text-[9px] px-1 py-0.5 rounded-full" style={{ background:"rgba(217,119,6,0.15)", color:"var(--color-achievement)", fontFamily:"var(--font-label)", flexShrink:0 }}>
                                Popüler
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-bold" style={{ color: isActive ? "#22c55e" : "rgba(255,255,255,0.6)", fontFamily:"var(--font-display)", letterSpacing:"0.03em" }}>
                            {pkg.lessonCount} ders
                          </span>
                          <span className="text-[10px]" style={{ color: isActive ? "rgba(34,197,94,0.7)" : "rgba(255,255,255,0.2)", fontFamily:"var(--font-label)" }}>
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
                    <span className="text-xs" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>Mevcut Kalan</span>
                    <span className="text-sm font-semibold text-white" style={{ fontFamily:"var(--font-label)" }}>{renewSt.remainingLessons} ders</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs" style={{ color:"rgba(255,255,255,0.4)", fontFamily:"var(--font-label)" }}>+ {selPkg.name}</span>
                    <span className="text-sm font-semibold" style={{ color:"#22c55e", fontFamily:"var(--font-label)" }}>+ {selPkg.lessonCount} ders</span>
                  </div>
                  <div className="h-px my-2" style={{ background:"rgba(255,255,255,0.06)" }} />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color:"rgba(255,255,255,0.5)", fontFamily:"var(--font-label)" }}>Yeni Kalan</span>
                    <span className="text-lg font-bold" style={{ color:"#22c55e", fontFamily:"var(--font-display)", letterSpacing:"0.05em" }}>
                      {renewSt.remainingLessons + selPkg.lessonCount} ders
                    </span>
                  </div>
                </div>
              )}

              {/* Ödeme Bilgileri */}
              <div className="p-4 space-y-3 glass rounded-xl">
                <p className="text-xs tracking-widest uppercase" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>Ödeme Bilgileri</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>
                      Paket Fiyatı (₺)
                    </label>
                    <input type="number" value={rListPrice} onChange={e => setRListPrice(e.target.value)}
                      className="w-full glass rounded-lg text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily:"var(--font-label)" }} />
                    <p className="text-[10px] text-white/20 mt-1" style={{ fontFamily:"var(--font-label)" }}>Katalog: ₺{selPkg?.price.toLocaleString("tr-TR") ?? "—"}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>
                      Ödenen (₺)
                    </label>
                    <input type="number" value={rPaidAmount} onChange={e => setRPaidAmount(e.target.value)}
                      placeholder="0"
                      className="w-full glass rounded-lg text-white px-3 py-2.5 text-sm outline-none"
                      style={{ fontFamily:"var(--font-label)" }} />
                    {Number(rPaidAmount) > 0 && Number(rListPrice) > 0 && (
                      <p className="text-[10px] mt-1" style={{ color: Number(rPaidAmount) >= Number(rListPrice) ? "#22c55e" : "#d97706", fontFamily:"var(--font-label)" }}>
                        Kalan: ₺{Math.max(0, Number(rListPrice) - Number(rPaidAmount)).toLocaleString("tr-TR")}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>Ödeme Durumu</label>
                  <select value={rPayStatus} onChange={e => setRPayStatus(e.target.value)}
                    className="w-full glass text-white px-3 py-2.5 text-sm outline-none appearance-none rounded-lg"
                    style={{ fontFamily:"var(--font-label)" }}>
                    <option value="beklemede">Beklemede</option>
                    <option value="kismi">Kısmi Ödeme</option>
                    <option value="odendi">Ödendi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/40 tracking-widest uppercase mb-1.5" style={{ fontFamily:"var(--font-label)" }}>Not (opsiyonel)</label>
                  <input type="text" value={rNotes} onChange={e => setRNotes(e.target.value)}
                    placeholder="İndirim nedeni, özel not..."
                    className="w-full glass rounded-lg text-white placeholder-white/20 px-3 py-2.5 text-sm outline-none"
                    style={{ fontFamily:"var(--font-label)" }} />
                </div>
              </div>

              {/* Paket Geçmişi */}
              <div>
                <button className="flex items-center gap-2 w-full text-left py-2" onClick={() => setHistOpen(o => !o)}>
                  <History size={13} style={{ color:"rgba(255,255,255,0.3)" }} />
                  <span className="text-xs tracking-widest uppercase flex-1"
                    style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
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
                      <p className="text-xs text-center py-4" style={{ color:"rgba(255,255,255,0.2)", fontFamily:"var(--font-label)" }}>
                        Henüz paket geçmişi yok
                      </p>
                    ) : pkgHistory.map(h => (
                      <div key={h.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg glass">
                        <PackageIcon size={12} style={{ color:"rgba(139,92,246,0.5)", flexShrink:0 }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white" style={{ fontFamily:"var(--font-label)" }}>
                            {h.packageName} — {h.lessonCount} ders
                          </div>
                          <div className="text-[10px]" style={{ color:"rgba(255,255,255,0.3)", fontFamily:"var(--font-label)" }}>
                            ₺{h.paidAmount.toLocaleString("tr-TR")} · {h.startDate ? format(new Date(h.startDate), "dd.MM.yyyy") : ""}
                          </div>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{
                            fontFamily:"var(--font-label)",
                            background: h.paymentStatus === "odendi" ? "rgba(34,197,94,0.08)" : h.paymentStatus === "kismi" ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
                            color: h.paymentStatus === "odendi" ? "var(--color-success)" : h.paymentStatus === "kismi" ? "var(--color-achievement)" : "var(--color-error)",
                          }}>
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
                className="flex-1 rounded-lg text-white/40 hover:text-white text-xs font-semibold tracking-widest uppercase py-3 transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.1)", fontFamily:"var(--font-label)" }}>Vazgeç</button>
              <button onClick={handleRenew} disabled={rSaving || !selPkg}
                className="flex-1 text-white text-xs font-semibold tracking-widest uppercase py-3 rounded-lg transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)", fontFamily:"var(--font-label)" }}>
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
        </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
