-- ══════════════════════════════════════════════════════════════════
-- Onur Listesi (Hall of Fame) Premium — students tablosu güncelleme
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Yeni kolonları ekle ────────────────────────────────────────
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS show_in_hall_of_fame boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS hall_featured        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_student_of_month  boolean NOT NULL DEFAULT false;

-- ── 2. Schema cache yenile ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- ── 3. Doğrulama ──────────────────────────────────────────────────
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'students'
  AND table_schema = 'public'
  AND column_name IN ('show_in_hall_of_fame', 'hall_featured', 'is_student_of_month')
ORDER BY ordinal_position;
