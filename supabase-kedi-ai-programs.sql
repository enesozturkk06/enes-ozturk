-- ── Kedi AI Ultra — yapılandırılmış antrenman + beslenme programı ──

-- Öğrenci başına tek aktif program (spor/hedef değişse de aynı satır
-- güncellenir — diet_plans tablosundaki "tek satır, upsert" konvansiyonuyla
-- tutarlı, ayrı bir geçmiş tablosuna gerek yok).
CREATE TABLE IF NOT EXISTS kedi_ai_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  sport text NOT NULL CHECK (sport IN ('kickboks','muaythai','boks','fitness')),
  goal_type text NOT NULL,
  daily_calories int,
  protein_g int,
  carbs_g int,
  fat_g int,
  program_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kedi_ai_programs_student ON kedi_ai_programs(student_id);

-- RLS
ALTER TABLE kedi_ai_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_all" ON kedi_ai_programs;
CREATE POLICY "open_all" ON kedi_ai_programs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Kontrol
SELECT 'kedi_ai_programs' as tablo, count(*) FROM kedi_ai_programs;
