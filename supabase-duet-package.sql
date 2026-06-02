-- ════════════════════════════════════════════════════════════════
-- Paket + Düet Ders Sistemi
-- Supabase SQL Editor'de çalıştırın
-- ════════════════════════════════════════════════════════════════

-- 1. Packages: ders başı fiyat
ALTER TABLE packages ADD COLUMN IF NOT EXISTS price_per_lesson decimal;
UPDATE packages SET price_per_lesson = ROUND(price / lesson_count, 2) WHERE price_per_lesson IS NULL;

-- 2. Students: paket bağlantısı + manuel indirimli fiyat
ALTER TABLE students ADD COLUMN IF NOT EXISTS package_id uuid REFERENCES packages(id);
ALTER TABLE students ADD COLUMN IF NOT EXISTS custom_price decimal;  -- indirimli fiyat (null = paket fiyatı)

-- 3. Appointments: ders tipi
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lesson_type text DEFAULT 'bireysel';
-- lesson_type: 'bireysel' | 'duet' | 'grup'

-- 4. Appointment_students: düet/grup için çoka-çok ilişki
CREATE TABLE IF NOT EXISTS appointment_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_deducted boolean DEFAULT false,  -- aynı randevuyu iki kere tamamlamayı önler
  created_at timestamptz DEFAULT now(),
  UNIQUE(appointment_id, student_id)
);

-- 5. RLS
ALTER TABLE appointment_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_all" ON appointment_students
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Varolan tüm randevuları appointment_students'a aktar (migration)
INSERT INTO appointment_students (appointment_id, student_id, lesson_deducted)
SELECT id, student_id, (status = 'tamamlandi')
FROM appointments
WHERE student_id IS NOT NULL
ON CONFLICT (appointment_id, student_id) DO NOTHING;

-- 7. Tamamlanmış randevularda ders_deducted = true yap
UPDATE appointment_students ap_s
SET lesson_deducted = true
FROM appointments ap
WHERE ap_s.appointment_id = ap.id
  AND ap.status = 'tamamlandi';

-- Kontrol
SELECT
  'packages'             AS tablo, COUNT(*) FROM packages
UNION ALL SELECT
  'appointment_students', COUNT(*) FROM appointment_students;
