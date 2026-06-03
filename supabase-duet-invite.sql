-- ══════════════════════════════════════════════════════════════════
-- DÜET DAVET SİSTEMİ MİGRASYONU
-- Supabase SQL Editor'de çalıştırın
-- ══════════════════════════════════════════════════════════════════

-- 1. appointment_students: role + invite_status kolonları ekle
ALTER TABLE appointment_students
  ADD COLUMN IF NOT EXISTS role          text NOT NULL DEFAULT 'creator';
  -- role: 'creator' | 'partner'

ALTER TABLE appointment_students
  ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'accepted';
  -- invite_status: 'pending' | 'accepted' | 'declined'

-- 2. Mevcut kayıtları güncelle (hepsi creator/accepted)
UPDATE appointment_students
SET role = 'creator', invite_status = 'accepted'
WHERE role IS NULL OR invite_status IS NULL OR role = '' OR invite_status = '';

-- 3. duet_partners tablosu (zaten varsa geç)
CREATE TABLE IF NOT EXISTS duet_partners (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (student_a_id, student_b_id)
);

-- 4. RLS
ALTER TABLE duet_partners ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='duet_partners' AND policyname='open_all') THEN
    CREATE POLICY "open_all" ON duet_partners FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. appointments.lesson_type (varsa geç)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lesson_type text NOT NULL DEFAULT 'bireysel';
UPDATE appointments SET lesson_type = 'bireysel' WHERE lesson_type IS NULL OR lesson_type = '';

-- 6. Schema cache yenile
NOTIFY pgrst, 'reload schema';

-- 7. Kontrol
SELECT
  'appointment_students kolonları:' AS info,
  column_name, data_type
FROM information_schema.columns
WHERE table_name = 'appointment_students' AND table_schema = 'public'
ORDER BY ordinal_position;
