-- ════════════════════════════════════════════════════════════════════
-- TAM MİGRASYON — Tüm eksik kolonlar ve tablolar
-- Supabase SQL Editor'de TEK SEFERDE çalıştırın
-- IF NOT EXISTS / IF NOT EXISTS sayesinde güvenli — tekrar çalıştırılabilir
-- ════════════════════════════════════════════════════════════════════

-- ── 1. appointments: lesson_type ─────────────────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS lesson_type text NOT NULL DEFAULT 'bireysel';

-- Mevcut kayıtlara varsayılan değer
UPDATE appointments SET lesson_type = 'bireysel' WHERE lesson_type IS NULL;

-- ── 2. students: package_id, custom_price ────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id) ON DELETE SET NULL;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS custom_price decimal;

-- ── 3. packages: eksik kolonlar ──────────────────────────────────────
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS highlight    boolean NOT NULL DEFAULT false;

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS sort_order   int     NOT NULL DEFAULT 0;

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS price_per_lesson decimal;

-- Mevcut paketlere ders başı fiyat hesapla
UPDATE packages
SET price_per_lesson = ROUND(price / NULLIF(lesson_count, 0), 2)
WHERE price_per_lesson IS NULL AND lesson_count > 0;

-- ── 4. appointment_students: düet/grup tablosu ───────────────────────
CREATE TABLE IF NOT EXISTS appointment_students (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   uuid    NOT NULL REFERENCES appointments(id)  ON DELETE CASCADE,
  student_id       uuid    NOT NULL REFERENCES students(id)       ON DELETE CASCADE,
  lesson_deducted  boolean NOT NULL DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  UNIQUE (appointment_id, student_id)
);

ALTER TABLE appointment_students ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'appointment_students' AND policyname = 'open_all'
  ) THEN
    CREATE POLICY "open_all" ON appointment_students
      FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Mevcut tamamlanmış randevuları appointment_students'a aktar
INSERT INTO appointment_students (appointment_id, student_id, lesson_deducted)
SELECT id, student_id, (status = 'tamamlandi')
FROM appointments
WHERE student_id IS NOT NULL
ON CONFLICT (appointment_id, student_id) DO NOTHING;

-- ── 5. health tabloları (yoksa oluştur) ──────────────────────────────
CREATE TABLE IF NOT EXISTS health_profiles (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid    UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  height       int     DEFAULT 170,
  weight       decimal DEFAULT 70,
  age          int     DEFAULT 25,
  gender       text    DEFAULT 'male',
  activity_level text  DEFAULT 'moderate',
  updated_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid    REFERENCES students(id) ON DELETE CASCADE,
  date       date    NOT NULL,
  weight     decimal NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, date)
);

CREATE TABLE IF NOT EXISTS calorie_logs (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid    REFERENCES students(id) ON DELETE CASCADE,
  date       date    NOT NULL,
  consumed   int     DEFAULT 0,
  burned     int     DEFAULT 0,
  target     int     DEFAULT 2000,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, date)
);

CREATE TABLE IF NOT EXISTS water_logs (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid    REFERENCES students(id) ON DELETE CASCADE,
  date       date    NOT NULL,
  glasses    int     DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, date)
);

-- ── 6. RLS — tüm tablolara açık politika ─────────────────────────────
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'students','appointments','lesson_records','payments','notifications',
    'time_slots','packages','health_profiles','weight_logs','calorie_logs',
    'water_logs','appointment_students'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- Eski politikaları sil
    EXECUTE format('DROP POLICY IF EXISTS "open_all" ON %I', t);
    -- Yeni tek politika
    EXECUTE format(
      'CREATE POLICY "open_all" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- ── 7. Doğrulama raporu ───────────────────────────────────────────────
SELECT
  t.tablename,
  (SELECT count(*)
   FROM information_schema.columns c
   WHERE c.table_name = t.tablename AND c.table_schema = 'public'
  ) AS kolon_sayisi,
  (SELECT count(*)
   FROM pg_policies p
   WHERE p.tablename = t.tablename AND p.schemaname = 'public'
  ) AS policy_sayisi
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'students','appointments','packages','payments',
    'appointment_students','lesson_records','time_slots',
    'health_profiles','weight_logs','calorie_logs','water_logs'
  )
ORDER BY t.tablename;
