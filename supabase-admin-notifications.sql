-- ══════════════════════════════════════════════════════════════
-- ADMİN BİLDİRİM SİSTEMİ — Supabase SQL Editor'de çalıştırın
-- notifications tablosuna appointment_id kolonu ekler
-- ══════════════════════════════════════════════════════════════

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS appointment_id uuid
  REFERENCES appointments(id) ON DELETE SET NULL;

-- Mevcut kayıtlar için index
CREATE INDEX IF NOT EXISTS idx_notifications_admin
  ON notifications(is_read, created_at DESC)
  WHERE student_id IS NULL;

-- Schema cache yenile
NOTIFY pgrst, 'reload schema';

-- Kontrol
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'notifications'
  AND table_schema = 'public'
ORDER BY ordinal_position;
