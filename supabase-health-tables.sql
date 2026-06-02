-- ── Sağlık takip tabloları ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS health_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  height int DEFAULT 170,
  weight decimal DEFAULT 70,
  age int DEFAULT 25,
  gender text DEFAULT 'male',
  activity_level text DEFAULT 'moderate',
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight decimal NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS calorie_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  consumed int DEFAULT 0,
  burned int DEFAULT 0,
  target int DEFAULT 2000,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  glasses int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);

-- RLS
ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calorie_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs      ENABLE ROW LEVEL SECURITY;

-- Tam erişim politikaları
CREATE POLICY "open_all" ON health_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON weight_logs     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON calorie_logs    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON water_logs      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Kontrol
SELECT 'health_profiles' as tablo, count(*) FROM health_profiles
UNION ALL SELECT 'weight_logs',   count(*) FROM weight_logs
UNION ALL SELECT 'calorie_logs',  count(*) FROM calorie_logs
UNION ALL SELECT 'water_logs',    count(*) FROM water_logs;
