-- ══════════════════════════════════════════════════════════════════════
-- xp_adjustments — Manuel XP Yönetimi (Admin XP Ekle/Düş geçmişi)
-- Supabase SQL Editor'a yapıştır → RUN
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS xp_adjustments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name  text        NOT NULL DEFAULT '',
  amount        integer     NOT NULL DEFAULT 0,
  reason        text        NOT NULL DEFAULT 'Manuel Düzeltme',
  note          text        NOT NULL DEFAULT '',
  admin_name    text        NOT NULL DEFAULT 'Admin',
  season        text        NOT NULL DEFAULT '2026-Q2',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE xp_adjustments
  ADD COLUMN IF NOT EXISTS student_name text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS amount       integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reason       text        NOT NULL DEFAULT 'Manuel Düzeltme',
  ADD COLUMN IF NOT EXISTS note         text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS admin_name   text        NOT NULL DEFAULT 'Admin',
  ADD COLUMN IF NOT EXISTS season       text        NOT NULL DEFAULT '2026-Q2';

ALTER TABLE xp_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_all" ON xp_adjustments;

CREATE POLICY "open_all" ON xp_adjustments
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'xp_adjustments'
  AND table_schema = 'public'
ORDER BY ordinal_position;
