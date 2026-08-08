/**
 * lib/kediProgramPdf.ts — Kedi AI programı PDF dışa aktarımı.
 * app/components/finance/FinanceQuickActions.tsx'teki jsPDF deseniyle
 * aynı: dinamik import, manuel y-cursor, doc.save(). Hem öğrenci paneli
 * hem admin Koç Merkezi BURADAN çağırır — iki farklı PDF üretici olmasın.
 */
import type { KediProgram } from "./types";
import { SPORT_LABELS, GOAL_LABELS } from "./kediProgramLabels";

export async function exportKediProgramPdf(program: KediProgram, student: { fullName: string; code: string }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 18;
  const addLine = (text: string, size = 10) => {
    if (y > 280) { doc.addPage(); y = 18; }
    doc.setFontSize(size);
    doc.text(text, 14, y);
    y += size > 12 ? 8 : 6;
  };

  addLine("Kedi AI — Kişisel Antrenman & Beslenme Programı", 16);
  addLine(`${student.fullName}  ·  ${SPORT_LABELS[program.sport]}  ·  ${GOAL_LABELS[program.goalType]}`, 10);
  if (program.version) addLine(`Sürüm ${program.version}${program.status ? ` — ${program.status}` : ""}`, 8);
  y += 4;

  addLine("Günlük Beslenme Hedefi", 13);
  addLine(`${program.dailyCalories} kcal — Protein ${program.proteinG}g, Karbonhidrat ${program.carbsG}g, Yağ ${program.fatG}g`);
  y += 4;

  if (program.analysis.rationale) {
    addLine("Neden Bu Program?", 13);
    addLine(program.analysis.rationale, 9);
    y += 4;
  }

  addLine("Haftalık Antrenman Programı", 13);
  for (const day of program.trainingDays) {
    addLine(`${day.day} — ${day.focus}`, 11);
    for (const ex of day.exercises) {
      addLine(`  • ${ex.name}${ex.sets ? ` — ${ex.sets} set` : ""}${ex.reps ? ` x ${ex.reps}` : ""}${ex.duration ? ` (${ex.duration})` : ""}`, 9);
    }
  }
  y += 4;

  addLine("Aylık İlerleme Planı", 13);
  for (const week of program.monthlyProgression) {
    addLine(`Hafta ${week.weekNumber}: ${week.focus} — ${week.intensityNote}`, 9);
  }
  y += 4;

  // weeklyMeals varsa (yeni programlar) 7 günü ayrı ayrı yazdır, yoksa
  // (eski kaydedilmiş programlar) tek günlük "meals" özetine geri düş.
  if (program.weeklyMeals && program.weeklyMeals.length > 0) {
    addLine("Haftalık Öğün Planı", 13);
    for (const dayMeals of program.weeklyMeals) {
      addLine(dayMeals.day, 11);
      for (const meal of dayMeals.meals) {
        addLine(`${meal.name} (${meal.calories} kcal, P:${meal.protein}g K:${meal.carbs}g Y:${meal.fat}g)`, 9);
        addLine(`  ${meal.items.join(", ")}`, 8);
        if (meal.alternative && meal.alternative.length > 0) addLine(`  Alternatif: ${meal.alternative.join(", ")}`, 8);
      }
    }
  } else {
    addLine("Beslenme Planı", 13);
    for (const meal of program.meals) {
      addLine(`${meal.name} (${meal.calories} kcal, P:${meal.protein}g K:${meal.carbs}g Y:${meal.fat}g)`, 10);
      addLine(`  ${meal.items.join(", ")}`, 9);
    }
  }
  y += 4;

  addLine("Alışveriş Listesi", 13);
  addLine(program.shoppingList.join(", "), 9);
  y += 4;

  addLine("Analiz ve Öneriler", 13);
  addLine(program.analysis.attendanceSummary, 9);
  addLine(program.analysis.performanceSummary, 9);
  for (const rec of program.analysis.recommendations) addLine(`  • ${rec}`, 9);
  y += 6;

  doc.setFontSize(8);
  doc.setTextColor(120);
  if (y > 270) { doc.addPage(); y = 18; }
  doc.text(program.safetyNote, 14, y, { maxWidth: 180 });

  doc.save(`kedi-ai-program-${student.code}-v${program.version ?? 1}.pdf`);
}

/** WhatsApp'ta paylaşmak için kısa, okunabilir metin özeti (wa.me sadece düz metin destekler, dosya eki değil). */
export function buildWhatsAppProgramText(program: KediProgram, student: { fullName: string }): string {
  const lines = [
    `🐈 *Kedi AI Programı* — ${student.fullName}`,
    `${SPORT_LABELS[program.sport]} · ${GOAL_LABELS[program.goalType]}`,
    "",
    `📊 Günlük hedef: ${program.dailyCalories} kcal (P:${program.proteinG}g K:${program.carbsG}g Y:${program.fatG}g)`,
    "",
    "📅 *Haftalık Program:*",
    ...program.trainingDays.map(d => `• ${d.day}: ${d.focus}`),
    "",
    "🍽️ *Beslenme:* " + program.meals.map(m => m.name).join(", "),
    "",
    program.analysis.rationale ? `💡 ${program.analysis.rationale}` : "",
    "",
    "Tam detaylar için uygulamayı aç.",
  ].filter(Boolean);
  return lines.join("\n");
}

/** app/components/ogrenciler/StudentCard.tsx'teki telefon→WhatsApp deseniyle aynı (son 10 hane + 90 öneki). */
export function buildWhatsAppLink(phone: string, text: string): string {
  return `https://wa.me/90${phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(text)}`;
}
