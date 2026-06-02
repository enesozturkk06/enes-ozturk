-- ============================================================
-- Supabase RLS Sıfırlama + Tam Yetki Politikaları
-- Bu scripti Supabase SQL Editor'de çalıştırın
-- ============================================================

-- 1. Mevcut tüm politikaları temizle
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('students','appointments','lesson_records',
                      'payments','notifications','time_slots','packages')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- 2. Tabloları oluştur (yoksa)
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  level text DEFAULT 'baslangic',
  package_type text DEFAULT 'sampiyon',
  total_lessons int DEFAULT 0,
  remaining_lessons int DEFAULT 0,
  completed_lessons int DEFAULT 0,
  payment_status text DEFAULT 'beklemede',
  amount_paid decimal DEFAULT 0,
  amount_due decimal DEFAULT 0,
  package_start_date date,
  package_end_date date,
  notes text,
  is_active boolean DEFAULT true,
  weight int,
  age int,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_code text NOT NULL,
  student_phone text,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  status text DEFAULT 'onaylandi',
  cancelled_at date,
  completed_at date,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lesson_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  date date NOT NULL,
  conditioning int DEFAULT 5,
  punch int DEFAULT 5,
  kick int DEFAULT 5,
  defense int DEFAULT 5,
  combination int DEFAULT 5,
  sparring int DEFAULT 5,
  overall int DEFAULT 5,
  trainer_notes text,
  duration_minutes int DEFAULT 60,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  amount decimal NOT NULL,
  paid_at date NOT NULL,
  method text DEFAULT 'nakit',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  is_open boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, start_time)
);

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lesson_count int NOT NULL,
  price decimal NOT NULL,
  duration_days int DEFAULT 45,
  description text,
  is_active boolean DEFAULT true,
  highlight boolean DEFAULT false,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. RLS etkinleştir
ALTER TABLE students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages      ENABLE ROW LEVEL SECURITY;

-- 4. Tek policy: tüm işlemlere tam izin (anon key dahil)
CREATE POLICY "open_students"       ON students       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_appointments"   ON appointments   FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_lesson_records" ON lesson_records FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_payments"       ON payments       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_notifications"  ON notifications  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_time_slots"     ON time_slots     FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "open_packages"       ON packages       FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. Örnek paketler (yoksa ekle)
INSERT INTO packages (name, lesson_count, price, duration_days, description, is_active, highlight, sort_order)
VALUES
  ('Başlangıç', 8,  1490, 45, 'Temel teknikler, duruş ve kondisyon', true, false, 1),
  ('Gelişim',   10, 1790, 60, 'Kombine çalışmalar, serbest çalışma', true, true,  2),
  ('Şampiyon',  12, 2190, 75, 'İleri seviye teknik, müsabaka hazırlığı', true, false, 3)
ON CONFLICT DO NOTHING;

-- Kontrol: tablolar ve kayıt sayıları
SELECT 'students' as tablo, count(*) FROM students
UNION ALL SELECT 'appointments', count(*) FROM appointments
UNION ALL SELECT 'packages', count(*) FROM packages
UNION ALL SELECT 'time_slots', count(*) FROM time_slots
UNION ALL SELECT 'payments', count(*) FROM payments;
