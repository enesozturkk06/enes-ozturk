-- ════════════════════════════════════════════════════════════════
-- SUPABASE FIX ALL — Tüm sorunları çözer
-- SQL Editor'de çalıştırın
-- ════════════════════════════════════════════════════════════════

-- ── 1. packages tablosu ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lesson_count int NOT NULL,
  price decimal NOT NULL,
  duration_days int DEFAULT 45,
  description text DEFAULT '',
  is_active boolean DEFAULT true,
  highlight boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── 2. time_slots: is_open kolonu ekle ───────────────────────────
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT true;

-- Eski kolonları kaldır (varsa)
ALTER TABLE time_slots DROP COLUMN IF EXISTS is_available;
ALTER TABLE time_slots DROP COLUMN IF EXISTS is_blocked;
ALTER TABLE time_slots DROP COLUMN IF EXISTS block_reason;

-- ── 3. Sağlık tabloları ───────────────────────────────────────────
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

-- ── 4. RLS politikalarını tamamen sıfırla ve yeniden yaz ─────────
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    AND tablename IN (
      'students','appointments','lesson_records','payments','notifications',
      'time_slots','packages','health_profiles','weight_logs','calorie_logs','water_logs'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- RLS etkinleştir
ALTER TABLE students       ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE calorie_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE water_logs     ENABLE ROW LEVEL SECURITY;

-- Tek policy: tüm işlemlere tam izin (anon key dahil)
CREATE POLICY "open_all" ON students       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON appointments   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON lesson_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON payments       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON notifications  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON time_slots     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON packages       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON health_profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON weight_logs    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON calorie_logs   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON water_logs     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── 5. Örnek paketler (yoksa ekle) ───────────────────────────────
INSERT INTO packages (name, lesson_count, price, duration_days, description, is_active, highlight, sort_order)
VALUES
  ('Başlangıç', 8,  1490, 45, 'Temel teknikler, duruş ve kondisyon', true, false, 1),
  ('Gelişim',   10, 1790, 60, 'Kombine çalışmalar, serbest çalışma', true, true,  2),
  ('Şampiyon',  12, 2190, 75, 'İleri seviye teknik, müsabaka hazırlığı', true, false, 3)
ON CONFLICT DO NOTHING;

-- ── 6. Test verisini temizle (kalan sahte kayıtlar) ──────────────
DELETE FROM students WHERE code LIKE 'TEST_%';

-- ── 7. Kontrol raporu ─────────────────────────────────────────────
SELECT
  t.tablename,
  (SELECT count(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public') AS policy_count
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'students','appointments','lesson_records','payments','notifications',
    'time_slots','packages','health_profiles','weight_logs','calorie_logs','water_logs'
  )
ORDER BY t.tablename;
