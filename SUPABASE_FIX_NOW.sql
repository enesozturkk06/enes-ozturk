-- ══════════════════════════════════════════════════════════════════
-- SUPABASE FIX — Tüm eksik kolonlar + schema cache yenileme
-- Supabase Dashboard → SQL Editor → Yeni Sorgu → Yapıştır → Çalıştır
-- ══════════════════════════════════════════════════════════════════

-- ── 1. appointment_students: eksik kolonları ekle ─────────────────
ALTER TABLE appointment_students
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'creator';

ALTER TABLE appointment_students
  ADD COLUMN IF NOT EXISTS invite_status text NOT NULL DEFAULT 'accepted';

ALTER TABLE appointment_students
  ADD COLUMN IF NOT EXISTS attendance_status text NOT NULL DEFAULT 'pending';

-- Eski mevcut kayıtlar: hepsi creator + accepted
UPDATE appointment_students
SET
  role = COALESCE(role, 'creator'),
  invite_status = COALESCE(invite_status, 'accepted'),
  attendance_status = COALESCE(attendance_status, 'pending')
WHERE role IS NULL OR invite_status IS NULL OR attendance_status IS NULL;

-- ── 2. appointments: lesson_type ekle ────────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS lesson_type text NOT NULL DEFAULT 'bireysel';

UPDATE appointments SET lesson_type = 'bireysel' WHERE lesson_type IS NULL OR lesson_type = '';

-- ── 3. duet_partners tablosu ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS duet_partners (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_a_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_b_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (student_a_id, student_b_id)
);

-- ── 4. students: package_id, custom_price (varsa geç) ─────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS package_id   uuid REFERENCES packages(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS custom_price  decimal;

-- ── 5. packages: eksik kolonlar ───────────────────────────────────
ALTER TABLE packages ADD COLUMN IF NOT EXISTS highlight       boolean NOT NULL DEFAULT false;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS sort_order      int     NOT NULL DEFAULT 0;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS price_per_lesson decimal;

UPDATE packages
SET price_per_lesson = ROUND(price / NULLIF(lesson_count,0), 2)
WHERE price_per_lesson IS NULL AND lesson_count > 0;

-- ── 6. RLS: tüm tablolara tam erişim ─────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students','appointments','appointment_students','duet_partners',
    'packages','time_slots','payments','lesson_records','notifications'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "open_all" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "open_all" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- ── 7. Schema cache yenile ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ── 8. Doğrulama ──────────────────────────────────────────────────
SELECT
  c.table_name,
  c.column_name,
  c.data_type,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN ('appointment_students','duet_partners','appointments')
ORDER BY c.table_name, c.ordinal_position;
