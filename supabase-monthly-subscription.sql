-- ══════════════════════════════════════════════════════════════
-- AYLIK ÜYELİK SİSTEMİ
-- Supabase SQL Editor'de çalıştırın
-- ══════════════════════════════════════════════════════════════

-- students tablosuna iki yeni kolon
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS subscription_type text NOT NULL DEFAULT 'lesson_pack',
  ADD COLUMN IF NOT EXISTS monthly_fee       numeric(10,2);

-- Kontrol
SELECT id, full_name, subscription_type, monthly_fee
FROM   students
LIMIT  5;

NOTIFY pgrst, 'reload schema';
