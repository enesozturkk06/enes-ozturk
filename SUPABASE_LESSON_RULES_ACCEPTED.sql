-- ════════════════════════════════════════════════════════════
-- Ders Bilgilendirmesi Onayı
-- Supabase SQL Editor'da çalıştır
-- ════════════════════════════════════════════════════════════

-- students tablosuna rules_accepted kolonu ekle
ALTER TABLE students ADD COLUMN IF NOT EXISTS rules_accepted boolean DEFAULT false;

-- Sonuç kontrolü
SELECT column_name FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'rules_accepted';
