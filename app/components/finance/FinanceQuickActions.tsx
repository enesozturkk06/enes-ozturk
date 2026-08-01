"use client";

import { Plus, Receipt, Building2, FileSpreadsheet, FileText } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/app/components/shared/Toast";
import { toCsv } from "@/lib/financeCenter";
import type { IncomeMovement } from "@/lib/types";
import type { FinanceKpis } from "@/lib/financeCenter";

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function FinanceQuickActions({
  onAddPayment, movements, kpis,
}: {
  onAddPayment: () => void;
  movements: IncomeMovement[];
  kpis: FinanceKpis;
}) {
  const { toast } = useToast();
  const dateStamp = format(new Date(), "yyyy-MM-dd");

  const handleExpense = () => toast("Gider takibi yakında eklenecek.", "warning");
  const handleGymPayout = () => toast("Salon ödemesi kaydı yakında eklenecek.", "warning");

  const handleExportCsv = () => {
    downloadBlob(toCsv(movements), `finans-hareketleri-${dateStamp}.csv`, "text/csv;charset=utf-8;");
    toast("CSV dosyası indirildi.");
  };

  const handleExportPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Finans Merkezi Raporu", 14, 18);
    doc.setFontSize(10);
    doc.text(`Oluşturulma: ${format(new Date(), "dd.MM.yyyy HH:mm")}`, 14, 25);

    let y = 38;
    doc.setFontSize(12);
    doc.text("Özet", 14, y); y += 7;
    doc.setFontSize(10);
    const lines = [
      `Toplam Ciro: ₺${kpis.totalRevenue.value.toLocaleString("tr-TR")} (${kpis.totalRevenue.deltaLabel})`,
      `Net Kazanç: ₺${kpis.netEarnings.value.toLocaleString("tr-TR")} (${kpis.netEarnings.deltaLabel})`,
      `Salonlara Ödenecek: ₺${kpis.owedToGyms.value.toLocaleString("tr-TR")}`,
      `Bekleyen Tahsilatlar: ₺${kpis.pendingCollections.value.toLocaleString("tr-TR")}`,
      `Aktif Öğrenci: ${kpis.activeStudents.value}`,
    ];
    for (const line of lines) { doc.text(line, 14, y); y += 6; }

    y += 6;
    doc.setFontSize(12);
    doc.text(`İşlemler (ilk ${Math.min(30, movements.length)})`, 14, y); y += 7;
    doc.setFontSize(8);
    for (const m of movements.slice(0, 30)) {
      if (y > 285) { doc.addPage(); y = 18; }
      doc.text(`${m.paymentDate}  ${m.studentName.slice(0, 22).padEnd(22)}  ₺${m.paymentAmount.toLocaleString("tr-TR")}  ${m.status}`, 14, y);
      y += 5;
    }

    doc.save(`finans-raporu-${dateStamp}.pdf`);
    toast("PDF raporu indirildi.");
  };

  const actions = [
    { label: "Ödeme Ekle", icon: <Plus size={14} />, onClick: onAddPayment, color: "#8B5CF6", primary: true },
    { label: "Gider Ekle", icon: <Receipt size={14} />, onClick: handleExpense, color: "rgba(255,255,255,0.5)" },
    { label: "Salon Ödemesi", icon: <Building2 size={14} />, onClick: handleGymPayout, color: "rgba(255,255,255,0.5)" },
    { label: "Excel Aktar", icon: <FileSpreadsheet size={14} />, onClick: handleExportCsv, color: "#4ADE80" },
    { label: "PDF Rapor", icon: <FileText size={14} />, onClick: handleExportPdf, color: "#60A5FA" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map(a => (
        <button key={a.label} onClick={a.onClick}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold tracking-wide rounded-lg transition-transform hover:scale-[1.03] active:scale-95 ${a.primary ? "gradient-animated gradient-slow gradient-violet-pink-orange" : "glass"}`}
          style={{
            color: a.primary ? "#fff" : a.color,
            fontFamily: "var(--font-label)",
          }}>
          {a.icon}
          <span className="hidden sm:inline">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
