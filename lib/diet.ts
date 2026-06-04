/**
 * lib/diet.ts — AI Diyet Planı Hesaplama ve Supabase Entegrasyonu
 * Mifflin-St Jeor formülü + Türkçe besin veritabanı
 */
import { supabase, isSupabaseConfigured } from "./supabase";

/* ─── Tipler ───────────────────────────────────────────────────────── */

export type GoalType =
  | "kilo-verme" | "kilo-alma" | "kas-kazanma"
  | "yag-yakma"  | "kondisyon";

export type ActivityLevel =
  | "sedentary" | "light" | "moderate" | "active" | "very-active";

export interface DietInput {
  age:            number;
  gender:         "male" | "female";
  heightCm:       number;
  weightKg:       number;
  targetWeightKg: number;
  goalType:       GoalType;
  activityLevel:  ActivityLevel;
  likedFoods:     string;
  dislikedFoods:  string;
  allergies:      string;
  mealsPerDay:    number;
}

export interface Meal {
  name:     string;
  time:     string;
  calories: number;
  items:    string[];
  macros:   { protein: number; carbs: number; fat: number };
}

export interface DietPlan {
  id?:         string;
  studentId?:  string;
  input:       DietInput;
  dailyCalories:   number;
  proteinG:    number;
  carbsG:      number;
  fatG:        number;
  waterMl:     number;
  meals:       Meal[];
  tips:        string[];
  createdAt?:  string;
  updatedAt?:  string;
}

/* ─── Aktivite çarpanları ─────────────────────────────────────────── */

const ACTIVITY_MULT: Record<ActivityLevel, number> = {
  "sedentary":   1.2,
  "light":       1.375,
  "moderate":    1.55,
  "active":      1.725,
  "very-active": 1.9,
};

/* ─── Hedef kalori ayarı ──────────────────────────────────────────── */

const GOAL_KCAL_DELTA: Record<GoalType, number> = {
  "kilo-verme":    -500,
  "kilo-alma":     +500,
  "kas-kazanma":   +300,
  "yag-yakma":     -350,
  "kondisyon":       0,
};

/* ─── Makro oranları (protein/karb/yag %) ────────────────────────── */

const GOAL_MACROS: Record<GoalType, [number, number, number]> = {
  // [protein%, carbs%, fat%]
  "kilo-verme":  [30, 40, 30],
  "kilo-alma":   [25, 50, 25],
  "kas-kazanma": [35, 45, 20],
  "yag-yakma":   [35, 35, 30],
  "kondisyon":   [25, 50, 25],
};

/* ─── Türkçe besin veritabanı ─────────────────────────────────────── */

type FoodDB = Record<GoalType, {
  breakfast: string[][];
  lunch:     string[][];
  dinner:    string[][];
  snack1:    string[][];
  snack2:    string[][];
}>;

const FOODS: FoodDB = {
  "kilo-verme": {
    breakfast: [
      ["2 yumurta (haşlama)", "1 dilim tam buğday ekmek", "Domates & salatalık", "Yeşil çay"],
      ["Yulaf ezmesi (40g) + süt", "1 muz", "Tarçın"],
      ["Az yağlı yoğurt (200g)", "Granola (30g)", "Mevsim meyvesi"],
    ],
    lunch: [
      ["Izgara tavuk göğsü (150g)", "Buğday salatası", "Zeytinyağlı ızgara sebze"],
      ["Mercimek çorbası (2 kase)", "Tam buğday ekmek (1 dilim)", "Yoğurt"],
      ["Ton balığı salatası", "Arugula & domates", "Limon sosu"],
    ],
    dinner: [
      ["Izgara somon (150g)", "Buharda brokoli & havuç", "Kinoa pilav (80g)"],
      ["Tavuk sote (150g)", "Zeytinyağlı yeşil fasulye", "Bulgur pilav (80g)"],
      ["Az yağlı köfte (150g)", "Mevsim salatası", "Yoğurt sosu"],
    ],
    snack1: [
      ["1 elma", "10 badem"],
      ["200g yoğurt", "1 çay kaşığı bal"],
      ["1 muz"],
    ],
    snack2: [
      ["1 portakal", "5 ceviz"],
      ["100g lor peyniri", "1 domates"],
    ],
  },
  "kilo-alma": {
    breakfast: [
      ["3 yumurta (omlet)", "Tam buğday ekmek (2 dilim)", "Beyaz peynir (60g)", "Zeytin", "Domates"],
      ["Yulaf ezmesi (80g) + tam yağlı süt", "Muz", "Fıstık ezmesi (1 yemek kaşığı)", "Bal"],
      ["2 yumurta + sosis", "Ekmek (2 dilim)", "Domates & salatalık", "Ayran"],
    ],
    lunch: [
      ["Tavuk but (200g)", "Pirinç pilav (200g)", "Yoğurtlu cacık", "Ekmek"],
      ["Kıymalı makarna (300g)", "Yoğurt", "Salata"],
      ["Etli kuru fasulye (300g)", "Pilav (150g)", "Ekmek (2 dilim)", "Turşu"],
    ],
    dinner: [
      ["Biftek (200g)", "Fırın patates (200g)", "Salata", "Ekmek"],
      ["Tavuk pirzola (200g)", "Bulgur pilav (200g)", "Cacık"],
      ["Kıymalı pide (300g)", "Yoğurt çorbası", "Ayran"],
    ],
    snack1: [
      ["Fıstık ezmeli ekmek (2 dilim)", "Muz", "Tam yağlı süt (300ml)"],
      ["Protein bar", "Meyve suyu (200ml)"],
    ],
    snack2: [
      ["Tam yağlı yoğurt (200g)", "Granola (50g)", "Kuru meyve"],
      ["Peynirli sandviç", "Ayran"],
    ],
  },
  "kas-kazanma": {
    breakfast: [
      ["3 yumurta + 2 yumurta beyazı (omlet)", "Yulaf ezmesi (80g)", "Muz", "Süt (200ml)"],
      ["Protein shake", "Tam buğday ekmek (2 dilim)", "Yumurta (2 adet)", "Peynir"],
      ["Yoğurt (250g)", "Granola (50g)", "Meyve", "Yumurta (2 haşlama)"],
    ],
    lunch: [
      ["Izgara tavuk göğsü (200g)", "Pirinç pilav (200g)", "Brokoli", "Yoğurt"],
      ["Ton balığı (150g)", "Makarna (200g)", "Zeytinyağı & limon sosu", "Salata"],
      ["Dana et (180g)", "Patates (200g)", "Salata", "Ayran"],
    ],
    dinner: [
      ["Somon fileto (200g)", "Tatlı patates (200g)", "Yeşil salata"],
      ["Tavuk but (200g)", "Bulgur (180g)", "Zeytinyağlı sebze"],
      ["Biftek (180g)", "Kinoa pilav (180g)", "Izgara sebze"],
    ],
    snack1: [
      ["Protein shake (1 ölçek)", "Muz", "Yulaf ezmesi (30g)"],
      ["Yoğurt (200g)", "15 badem", "Bal"],
    ],
    snack2: [
      ["Lor peyniri (100g)", "Tam buğday kraker (30g)"],
      ["Fıstık ezmesi (2 kaşık)", "Muz", "Süt"],
    ],
  },
  "yag-yakma": {
    breakfast: [
      ["3 yumurta beyazı + 1 tam yumurta", "Avokado (½)", "Domates & ıspanak"],
      ["Yulaf ezmesi (50g) + su", "Tarçın", "10 badem", "Yeşil çay"],
      ["Lor peyniri (150g)", "Salatalık & domates", "Zeytinyağı"],
    ],
    lunch: [
      ["Izgara tavuk (150g)", "Karnabahar pirinci", "Limon-zeytinyağı sosu"],
      ["Mercimek salatası (200g)", "Zeytinyağı", "Limon"],
      ["Ton balığı (120g)", "Salata (sınırsız)", "Elma sirkeli sos"],
    ],
    dinner: [
      ["Izgara balık (180g)", "Buhar sebze", "Yoğurt (100g)"],
      ["Tavuk şiş (150g)", "Mevsim salatası", "Yoğurt sosu"],
      ["Sebzeli omlet (2 yumurta)", "Roka salatası", "Zeytinyağı"],
    ],
    snack1: [
      ["1 elma", "10 badem"],
      ["Salatalık + yoğurt dip"],
    ],
    snack2: [
      ["Kereviz + havuç çubukları"],
      ["Yeşil çay", "5 ceviz"],
    ],
  },
  "kondisyon": {
    breakfast: [
      ["Yulaf ezmesi (70g) + süt", "Muz", "Bal (1 kaşık)"],
      ["2 yumurta", "Tam buğday ekmek (2 dilim)", "Domates", "Peynir", "Siyah çay"],
      ["Yoğurt (200g)", "Granola (40g)", "Meyve karışımı"],
    ],
    lunch: [
      ["Tavuk şiş (150g)", "Bulgur pilav (150g)", "Cacık", "Salata"],
      ["Balık güveç (150g)", "Pilav (150g)", "Salata"],
      ["Mercimek köfte (6 adet)", "Ayran", "Salata", "Ekmek"],
    ],
    dinner: [
      ["Izgara tavuk (150g)", "Makarna (150g)", "Domates sosu", "Salata"],
      ["Zeytinyağlı nohut (200g)", "Pilav (100g)", "Yoğurt"],
      ["Somon (150g)", "Haşlama patates (150g)", "Salata"],
    ],
    snack1: [
      ["Muz", "10 badem"],
      ["Yoğurt (150g)", "Bal"],
    ],
    snack2: [
      ["1 armut veya elma", "5 ceviz"],
      ["Tam buğday kraker (30g)", "Peynir (30g)"],
    ],
  },
};

/* ─── Yardımcı: rastgele seç ────────────────────────────────────── */

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ─── Makro hesapla (kcal → gram) ────────────────────────────────── */

function macrosFromCalories(
  kcal: number,
  [pPct, cPct, fPct]: [number, number, number]
): { protein: number; carbs: number; fat: number } {
  return {
    protein: Math.round((kcal * pPct / 100) / 4),
    carbs:   Math.round((kcal * cPct / 100) / 4),
    fat:     Math.round((kcal * fPct / 100) / 9),
  };
}

/* ─── Öğün dağılımı ─────────────────────────────────────────────── */

function mealDistribution(
  totalKcal: number,
  mealsPerDay: number
): { name: string; time: string; pct: number }[] {
  if (mealsPerDay === 2) return [
    { name: "Öğle",  time: "12:00", pct: 50 },
    { name: "Akşam", time: "19:00", pct: 50 },
  ];
  if (mealsPerDay === 3) return [
    { name: "Kahvaltı", time: "08:00", pct: 30 },
    { name: "Öğle",     time: "13:00", pct: 40 },
    { name: "Akşam",    time: "19:00", pct: 30 },
  ];
  if (mealsPerDay === 4) return [
    { name: "Kahvaltı",   time: "08:00", pct: 25 },
    { name: "Öğle",       time: "13:00", pct: 35 },
    { name: "Ara Öğün",   time: "16:30", pct: 15 },
    { name: "Akşam",      time: "19:30", pct: 25 },
  ];
  // 5 ve üzeri
  return [
    { name: "Kahvaltı",    time: "07:30", pct: 25 },
    { name: "Ara Öğün 1",  time: "10:30", pct: 12 },
    { name: "Öğle",        time: "13:00", pct: 30 },
    { name: "Ara Öğün 2",  time: "16:30", pct: 13 },
    { name: "Akşam",       time: "19:30", pct: 20 },
  ];
}

/* ─── Besin öğesi filtrele (sevmediği, alerji) ──────────────────── */

function filterItems(items: string[], disliked: string[], allergies: string[]): string[] {
  const blocked = [...disliked, ...allergies].map(s => s.toLowerCase());
  return items.filter(item =>
    !blocked.some(b => b.length > 2 && item.toLowerCase().includes(b))
  );
}

/* ─── ANA HESAPLAMA FONKSİYONU ───────────────────────────────────── */

export function generateDietPlan(input: DietInput): DietPlan {
  const { age, gender, heightCm, weightKg, goalType, activityLevel, mealsPerDay } = input;

  // 1. BMR (Mifflin-St Jeor)
  const bmr = gender === "male"
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  // 2. TDEE
  const tdee = Math.round(bmr * ACTIVITY_MULT[activityLevel]);

  // 3. Hedef kalori
  const dailyCalories = Math.max(1200, tdee + GOAL_KCAL_DELTA[goalType]);

  // 4. Makrolar
  const macroRatios = GOAL_MACROS[goalType];
  const { protein: proteinG, carbs: carbsG, fat: fatG } = macrosFromCalories(dailyCalories, macroRatios);

  // 5. Su hedefi (35ml / kg + aktiflik bonusu)
  const waterBonus = ["active", "very-active"].includes(activityLevel) ? 500 : 0;
  const waterMl = Math.round(weightKg * 35) + waterBonus;

  // 6. Sevmediği / alerji listesi
  const dislikedList = input.dislikedFoods.split(/[,;،\n]/).map(s => s.trim()).filter(Boolean);
  const allergyList  = input.allergies.split(/[,;،\n]/).map(s => s.trim()).filter(Boolean);

  // 7. Öğünler
  const foodDB = FOODS[goalType];
  const dist   = mealDistribution(dailyCalories, Math.min(5, Math.max(2, mealsPerDay)));

  const meals: Meal[] = dist.map(d => {
    const kcal = Math.round(dailyCalories * d.pct / 100);
    const mMacros = macrosFromCalories(kcal, macroRatios);

    // Öğün tipine göre besin seç
    let rawItems: string[];
    const lc = d.name.toLowerCase();
    if (lc.includes("kahvaltı")) {
      rawItems = pick(foodDB.breakfast);
    } else if (lc.includes("öğle")) {
      rawItems = pick(foodDB.lunch);
    } else if (lc.includes("akşam")) {
      rawItems = pick(foodDB.dinner);
    } else if (lc.includes("ara") && lc.includes("1")) {
      rawItems = pick(foodDB.snack1);
    } else {
      rawItems = pick(foodDB.snack2);
    }

    const items = filterItems(rawItems, dislikedList, allergyList);

    return {
      name:     d.name,
      time:     d.time,
      calories: kcal,
      items:    items.length > 0 ? items : rawItems, // alerji yoksa orijinal
      macros:   mMacros,
    };
  });

  // 8. İpuçları
  const tips = buildTips(goalType, waterMl, proteinG, activityLevel);

  return {
    input,
    dailyCalories,
    proteinG,
    carbsG,
    fatG,
    waterMl,
    meals,
    tips,
  };
}

function buildTips(goal: GoalType, waterMl: number, proteinG: number, activity: ActivityLevel): string[] {
  const tips: string[] = [
    `Her gün ${Math.round(waterMl / 250)} bardak (${waterMl} ml) su içmeyi hedefleyin.`,
    `Günlük protein hedefiniz ${proteinG}g — her öğünde protein kaynağı tüketin.`,
  ];
  if (goal === "kilo-verme" || goal === "yag-yakma") {
    tips.push("Öğünlerinizi yavaş yiyin; tokluk sinyali 20 dakikada oluşur.");
    tips.push("Gece 20:00'dan sonra yemek yememeye çalışın.");
    tips.push("İşlenmiş şeker ve hazır gıdalardan kaçının.");
  }
  if (goal === "kas-kazanma" || goal === "kilo-alma") {
    tips.push("Antrenman sonrası 30–45 dakika içinde protein + karbonhidrat tüketin.");
    tips.push("Gece yatmadan önce lor peyniri veya kazein protein tercih edin.");
  }
  if (goal === "kondisyon") {
    tips.push("Antrenmandan 1–2 saat önce hafif karbonhidrat tüketin.");
    tips.push("Egzersiz sonrası 15 dakika içinde bir öğün veya atıştırmalık alın.");
  }
  if (activity === "active" || activity === "very-active") {
    tips.push("Yoğun antrenman günlerinde karbonhidrat miktarını artırın.");
  }
  tips.push("Plan kişisel bir öneride bulunmaktadır. Sağlık durumunuzu antrenörünüzle paylaşın.");
  return tips;
}

/* ─── Supabase CRUD ──────────────────────────────────────────────── */

function db() {
  if (!isSupabaseConfigured || !supabase) throw new Error("Supabase bağlı değil");
  return supabase!;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlan(r: any): DietPlan {
  const plan = r.plan_json as DietPlan | null;
  return {
    id:            r.id,
    studentId:     r.student_id,
    input:         plan?.input ?? ({} as DietInput),
    dailyCalories: r.daily_calories,
    proteinG:      r.protein_g,
    carbsG:        r.carbs_g,
    fatG:          r.fat_g,
    waterMl:       r.water_ml,
    meals:         plan?.meals ?? [],
    tips:          plan?.tips  ?? [],
    createdAt:     r.created_at,
    updatedAt:     r.updated_at,
  };
}

export async function getDietPlan(studentId: string): Promise<DietPlan | null> {
  const { data, error } = await db()
    .from("diet_plans").select("*")
    .eq("student_id", studentId)
    .order("updated_at", { ascending: false })
    .limit(1).maybeSingle();
  if (error) {
    if (error.message.includes("schema cache") || error.message.includes("does not exist")) {
      console.warn("getDietPlan: diet_plans tablosu hazır değil");
      return null;
    }
    console.error("getDietPlan:", error.message);
    return null;
  }
  return data ? mapPlan(data) : null;
}

export async function saveDietPlan(studentId: string, plan: DietPlan): Promise<DietPlan> {
  const row = {
    student_id:       studentId,
    age:              plan.input.age,
    gender:           plan.input.gender,
    height_cm:        plan.input.heightCm,
    weight_kg:        plan.input.weightKg,
    target_weight_kg: plan.input.targetWeightKg,
    goal_type:        plan.input.goalType,
    activity_level:   plan.input.activityLevel,
    liked_foods:      plan.input.likedFoods,
    disliked_foods:   plan.input.dislikedFoods,
    allergies:        plan.input.allergies,
    meals_per_day:    plan.input.mealsPerDay,
    daily_calories:   plan.dailyCalories,
    protein_g:        plan.proteinG,
    carbs_g:          plan.carbsG,
    fat_g:            plan.fatG,
    water_ml:         plan.waterMl,
    plan_json:        plan,
    updated_at:       new Date().toISOString(),
  };

  // Var olan kaydı güncelle yoksa insert
  const existing = await getDietPlan(studentId);
  if (existing?.id) {
    const { data, error } = await db()
      .from("diet_plans").update(row).eq("id", existing.id).select().single();
    if (error) throw error;
    return mapPlan(data);
  }
  const { data, error } = await db()
    .from("diet_plans").insert(row).select().single();
  if (error) throw error;
  return mapPlan(data);
}
