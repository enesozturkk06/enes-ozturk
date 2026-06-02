import type { WorkoutInput, WorkoutPlan, WorkoutExercise } from "./types";

const warmupByLevel: Record<string, WorkoutExercise[]> = {
  baslangic: [
    { name: "Yerinde Koşu", duration: "3 dk", description: "Hafif tempoda yerinde koşu ile kan dolaşımını artır.", icon: "🏃" },
    { name: "Boyun Hareketleri", sets: 2, reps: "10 tekrar", description: "Boynu yavaşça her yöne döndür.", icon: "🔄" },
    { name: "Kol Çevirme", sets: 2, reps: "15 tekrar", description: "Her iki kolu büyük daireler çizerek geri/ileri döndür.", icon: "💪" },
    { name: "Bel Rotasyonu", sets: 2, reps: "10 tekrar", description: "Elleri yana aç, belinden dönüşler yap.", icon: "🌀" },
    { name: "Bacak Sallama", sets: 2, reps: "10 tekrar/taraf", description: "Duvara tutunarak bacağı öne/arkaya salladır.", icon: "🦵" },
  ],
  orta: [
    { name: "Atlama İpi", duration: "3 dk", description: "Orta tempoda atlama ipi — kardiyo aktivasyonu.", icon: "🪢" },
    { name: "Dinamik Germe", sets: 2, reps: "10 tekrar", description: "Öne ve yana akıcı adımlarla bacak gerdirme.", icon: "🤸" },
    { name: "Shadowboxing", duration: "2 dk", description: "Hafif tempoda yumruk kombinasyonları, ayak çalışması.", icon: "🥊" },
    { name: "Hip Rotasyon", sets: 2, reps: "15 tekrar", description: "Kalçayı büyük daireler çizerek döndür.", icon: "🔄" },
    { name: "Shoulder Roll", sets: 2, reps: "20 tekrar", description: "Omuzları geriye doğru döndür.", icon: "💪" },
  ],
  ileri: [
    { name: "Atlama İpi — Hızlı", duration: "5 dk", description: "Yüksek tempoda atlama ipi, ısınma ve koordinasyon.", icon: "🪢" },
    { name: "Shadowboxing Kombinasyon", duration: "3 dk", description: "1-2-3-4 kombinasyonları ile hızlı shadowboxing.", icon: "🥊" },
    { name: "Dinamik Hamstring Germe", sets: 3, reps: "12 tekrar", description: "Öne eğilme ve bacak kaldırma kombinasyonu.", icon: "🤸" },
    { name: "Plyometrik Squat", sets: 2, reps: "15 tekrar", description: "Sıçramalı squat ile patlamacı güç aktivasyonu.", icon: "⚡" },
    { name: "Core Aktivasyon", sets: 2, reps: "30 sn", description: "Plank + yan plank ile core ısınması.", icon: "🔥" },
  ],
};

const mainByGoal: Record<string, WorkoutExercise[]> = {
  kondisyon: [
    { name: "Torba Vurma — Raunt", sets: 3, reps: "3 dk raunt", rest: "1 dk", description: "Ağır torbaya sürekli kombinasyonlar. 10-2-3 ritmi.", icon: "🥊" },
    { name: "Pad Kombinasyon", sets: 4, reps: "2 dk", rest: "45 sn", description: "Antrenör yönlendirmesiyle kombine vuruşlar.", icon: "🎯" },
    { name: "Burpee + Yumruk", sets: 3, reps: "10 tekrar", rest: "1 dk", description: "Burpee kalk, iki el yumruk. Patlamacı kondisyon.", icon: "⚡" },
    { name: "Squat + Üst Kros", sets: 3, reps: "15 tekrar", rest: "45 sn", description: "Squat al, kalk, kros vur. Tam vücut entegrasyonu.", icon: "💥" },
  ],
  teknik: [
    { name: "Jab-Cross Tekniği", sets: 5, reps: "20 tekrar", rest: "30 sn", description: "Yavaş ve kontrollü. Duruş, kol uzatma, geri çekme.", icon: "🥊" },
    { name: "Sol Hook Çalışması", sets: 4, reps: "15 tekrar/taraf", rest: "45 sn", description: "Kanca tekniği — dirsek açısı, omuz rotasyonu.", icon: "🎯" },
    { name: "Öne Tekme (Ön Bacak)", sets: 3, reps: "12 tekrar/taraf", rest: "30 sn", description: "Diz kaldırma, ayak yüzü teması, geri çekme.", icon: "🦵" },
    { name: "Yan Tekme", sets: 3, reps: "10 tekrar/taraf", rest: "45 sn", description: "Pivot, kalça açılımı, tekme uzatma, denge.", icon: "⚡" },
    { name: "Kombinasyon Akışı", sets: 3, reps: "90 sn", rest: "1 dk", description: "1-2-3-tekme-savunma-1-2. Yavaştan hızlanma.", icon: "💥" },
  ],
  guc: [
    { name: "Medicine Ball Slam", sets: 4, reps: "10 tekrar", rest: "1 dk", description: "Topu başın üstünden güçle yere vur.", icon: "⚡" },
    { name: "Kettlebell Swing", sets: 4, reps: "15 tekrar", rest: "1 dk", description: "Kalça itişiyle kettlebell salını — patlamacı güç.", icon: "🏋️" },
    { name: "Ağır Torba Güç Vuruşu", sets: 5, reps: "5 tekrar/el", rest: "90 sn", description: "Her vuruşta maksimum güç. Tam vücut devreye.", icon: "💥" },
    { name: "Push-Up + Tors Rotasyon", sets: 3, reps: "12 tekrar", rest: "1 dk", description: "Şınavdan kalk, kol uzat ve tors döndür.", icon: "🥊" },
    { name: "Squat Thrust", sets: 3, reps: "12 tekrar", rest: "45 sn", description: "Hızlı squat + öne atlama kombinasyonu.", icon: "🦵" },
  ],
  "kilo-verme": [
    { name: "HIIT Shadowboxing", sets: 5, reps: "40 sn çalış / 20 sn dinlen", description: "Maksimum hızda kombinasyonlar. Kalp hızı zirveye.", icon: "🥊" },
    { name: "Atlama İpi HIIT", sets: 5, reps: "40 sn / 20 sn", description: "Yüksek tempoda atlama — yağ yakma zonu.", icon: "🪢" },
    { name: "Mountain Climber", sets: 4, reps: "30 tekrar", rest: "30 sn", description: "Plank pozisyonunda diz çekme — core + kardiyo.", icon: "🔥" },
    { name: "Kickboxing Kardiyo Turu", sets: 3, reps: "3 dk raunt", rest: "1 dk", description: "Sürekli hareket: tekme, yumruk, atlama kombinasyonu.", icon: "⚡" },
    { name: "Lateral Shuffle + Yumruk", sets: 3, reps: "1 dk", rest: "45 sn", description: "Yana kayma hareketi + iki el jab.", icon: "💥" },
  ],
  musabaka: [
    { name: "Serbest Çalışma Raundu", sets: 6, reps: "3 dk raunt", rest: "1 dk", description: "Tam müsabaka simulasyonu. Savunma + saldırı.", icon: "🥊" },
    { name: "Kombine Pad Çalışması", sets: 4, reps: "3 dk", rest: "1 dk", description: "Antrenör yönlendirmeli hızlı kombinasyonlar.", icon: "🎯" },
    { name: "Ayak Çalışması", sets: 3, reps: "2 dk", rest: "45 sn", description: "Ring hareketi: öne/geri/yana + vuruş geçişleri.", icon: "👟" },
    { name: "Klinç + Kısa Vuruşlar", sets: 3, reps: "2 dk", rest: "1 dk", description: "Yakın mesafe dövüş, dirsek çalışması.", icon: "⚡" },
    { name: "Counter Atma", sets: 4, reps: "90 sn", rest: "45 sn", description: "Savunma + anında karşı atak kombinasyonu.", icon: "💥" },
  ],
};

const cardioOptions: WorkoutExercise[] = [
  { name: "Atlama İpi", duration: "5 dk", description: "Orta tempoda — aktif dinlenme.", icon: "🪢" },
  { name: "Shadowboxing", duration: "3 dk", description: "Hafif tempoda serbest hareket.", icon: "🥊" },
  { name: "Yerinde Yüksek Diz", duration: "3×30 sn", description: "Diz zirveye kadar kaldırılır.", icon: "🏃" },
  { name: "Box Step", duration: "5 dk", description: "Koordinasyon ve kardiyo kombinasyonu.", icon: "📦" },
];

const combinationsByLevel: Record<string, string[]> = {
  baslangic: [
    "1-2 → Jab + Kros (Temel kombinasyon)",
    "1-2-3 → Jab + Kros + Sol Hook",
    "1-2-Savunma → Jab + Kros + Kafa hareketi",
    "Öne Tekme + 1-2 → Tekme + Temel kombinasyon",
  ],
  orta: [
    "1-2-3-4 → Jab + Kros + Sol Hook + Sağ Uppercut",
    "1-2-Yan Tekme → Jab + Kros + Yan Tekme",
    "Slipback + Kros → Geri kayarak + Kros",
    "Öne Tekme + 1-2-3 → Tekme + Üç vuruş kombinasyon",
    "Double Jab + Kros + Sol Hook + Sağ Kanca",
  ],
  ileri: [
    "1-2-3-4-Tepe Tekme → 4'lü kombinasyon + Yüksek tekme",
    "Slip + Kanca + Yan Tekme → Savunma + Karşı atak serisi",
    "1-2-Kaydır-Hook-Uppercut-Tekme → Tam kombine seri",
    "Counter: Blok + Kros + Sol Hook + Sağ Kanca + Tekme",
    "Clinch Exit + Kombinasyon → Klinç kırma + 5'li seri",
  ],
};

export function generateWorkout(input: WorkoutInput): WorkoutPlan {
  const { level, goal, weight, hasEquipment, daysPerWeek } = input;

  const warmup = warmupByLevel[level] ?? warmupByLevel.baslangic;
  const main = mainByGoal[goal] ?? mainByGoal.kondisyon;
  const cardio = [cardioOptions[0], cardioOptions[1]];
  const cooldown: WorkoutExercise[] = [
    { name: "Derin Hamstring Germe", duration: "30 sn/taraf", description: "Oturarak bacağı uzat, öne eğil.", icon: "🤸" },
    { name: "Omuz + Göğüs Germe", duration: "30 sn/taraf", description: "Kolu duvara yasla, gövdeyi döndür.", icon: "💪" },
    { name: "Nefes Egzersizi", sets: 3, reps: "4-4-4 sn ritmi", description: "4 sn nefes al, 4 sn tut, 4 sn ver.", icon: "🌬️" },
    { name: "Boyun ve Omuz Germe", duration: "30 sn/taraf", description: "Kafayı yana eğ ve kolu aşağı çek.", icon: "🔄" },
  ];

  const combinations = combinationsByLevel[level] ?? combinationsByLevel.baslangic;

  const calBurn = Math.round(weight * (goal === "kilo-verme" ? 9 : 7) * (daysPerWeek / 5));
  const dailyTips = buildTips(input, calBurn);
  const restAdvice = buildRestAdvice(daysPerWeek, level);
  const weeklySchedule = buildWeeklySchedule(daysPerWeek, goal);

  if (!hasEquipment) {
    main.forEach(e => {
      if (e.name.includes("Torba") || e.name.includes("Kettlebell") || e.name.includes("Medicine")) {
        e.description = `(Ekipmansız alternatif) ${e.description} → Shadowboxing veya vücut ağırlığıyla yapılabilir.`;
      }
    });
  }

  return { warmup, main, cardio, cooldown, combinations, dailyTips, restAdvice, weeklySchedule };
}

function buildTips(input: WorkoutInput, calBurn: number): string[] {
  const tips: string[] = [
    `Tahmini günlük kalori yakımı: ~${calBurn} kcal (kilonuz ve yoğunluğa göre değişir).`,
    "Her antrenman öncesi en az 500ml su için.",
    "Antrenman sonrası 30–45 dakika içinde protein tüketin.",
  ];

  if (input.goal === "kilo-verme") {
    tips.push("Günlük kalori açığı oluşturun: yaklaşık 300–500 kcal eksik hedefleyin.");
    tips.push("Yüksek proteinli beslenme kas kaybını önler: yumurta, tavuk, yoğurt.");
  }
  if (input.goal === "musabaka") {
    tips.push("Yarışmadan 2 gün önce antrenmanı hafifletin.");
    tips.push("Uyku en az 8 saat — performans için kritik.");
  }
  if (input.level === "baslangic") {
    tips.push("Ağrı hissedince durun. İlk haftalarda hafif ağrı normaldir, keskin ağrı değil.");
  }
  if (input.weight > 90) {
    tips.push("Eklem yüklenmesini azaltmak için zeminlerde atlamayı sınırlandırın.");
  }
  return tips;
}

function buildRestAdvice(daysPerWeek: number, level: string): string {
  if (daysPerWeek >= 5) {
    return "Haftada 5+ gün antrenman yapıyorsunuz. En az 2 tam dinlenme günü şarttır. Kaslar dinlenmede güçlenir. Hafta içi ağır, hafta sonu aktif dinlenme (yürüyüş, hafif germe) öneririm.";
  }
  if (daysPerWeek === 4) {
    return "Haftada 4 gün antrenman için ideal program: 2 gün çalış, 1 gün dinlen, 2 gün çalış, 2 gün dinlen. Aktif iyileşme günlerinde hafif kardiyo yapabilirsiniz.";
  }
  if (level === "ileri") {
    return "İleri seviye antrenman yoğundur. Dinlenme günleri foam roller ve soğuk duş ile iyileşmeyi hızlandırın. Haftada 1 gün tam dinlenme minimum.";
  }
  return "Haftada 2-3 gün için dinlenme günleri yeterlidir. Antrenman günleri arası en az 1 gün boşluk bırakın.";
}

function buildWeeklySchedule(daysPerWeek: number, goal: string): string[] {
  const schedules: Record<number, string[]> = {
    2: ["Pazartesi: Antrenman", "Perşembe: Antrenman"],
    3: ["Pazartesi: Antrenman", "Çarşamba: Antrenman", "Cuma: Antrenman"],
    4: ["Pazartesi: Antrenman", "Salı: Antrenman", "Perşembe: Antrenman", "Cuma: Antrenman"],
    5: ["Pzt: Teknik", "Sal: Kondisyon", "Çar: Dinlenme", "Per: Güç", "Cum: Serbest Çalışma"],
    6: ["Pzt: Teknik", "Sal: Kondisyon", "Çar: Güç", "Per: Teknik", "Cum: Kondisyon", "Cmt: Hafif Kardiyo"],
  };

  const base = schedules[Math.min(daysPerWeek, 6)] || schedules[3];

  if (goal === "kilo-verme") {
    return base.map(d => d.includes("Antrenman") ? d + " + Kardiyo Finişi" : d);
  }
  if (goal === "musabaka") {
    return base.map(d => d.includes("Antrenman") ? d + " + Serbest Çalışma" : d);
  }
  return base;
}
