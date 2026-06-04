-- ══════════════════════════════════════════════════════════════
-- AI DİYET PLANI TABLOSU
-- Supabase SQL Editor'de çalıştırın
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS diet_plans (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  age              int,
  gender           text,
  height_cm        numeric,
  weight_kg        numeric,
  target_weight_kg numeric,
  goal_type        text,   -- kilo-verme | kilo-alma | kas-kazanma | yag-yakma | kondisyon
  activity_level   text,
  liked_foods      text,
  disliked_foods   text,
  allergies        text,
  meals_per_day    int     DEFAULT 3,
  daily_calories   int,
  protein_g        int,
  carbs_g          int,
  fat_g            int,
  water_ml         int,
  plan_json        jsonb,  -- tam diyet planı
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE diet_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_all" ON diet_plans;
CREATE POLICY "open_all" ON diet_plans
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_diet_plans_student
  ON diet_plans(student_id, updated_at DESC);

NOTIFY pgrst, 'reload schema';

SELECT 'diet_plans tablosu hazır' AS durum;
