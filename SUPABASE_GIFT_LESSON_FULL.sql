-- ══════════════════════════════════════════════════════════════════════
-- gift_lesson_requests — Tam Kurulum
-- Supabase SQL Editor'a yapıştır → RUN
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gift_lesson_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name  text        NOT NULL DEFAULT '',
  threshold     integer     NOT NULL DEFAULT 5000,
  season        text        NOT NULL DEFAULT '2026-Q2',
  season_xp     integer     NOT NULL DEFAULT 0,
  xp_at_request integer     NOT NULL DEFAULT 0,
  status        text        NOT NULL DEFAULT 'pending',
  requested_at  timestamptz NOT NULL DEFAULT now(),
  approved_at   timestamptz,
  rejected_at   timestamptz,
  admin_note    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gift_lesson_requests
  ADD COLUMN IF NOT EXISTS student_name  text        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS threshold     integer     NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS season        text        NOT NULL DEFAULT '2026-Q2',
  ADD COLUMN IF NOT EXISTS season_xp     integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_at_request integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requested_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS rejected_at   timestamptz,
  ADD COLUMN IF NOT EXISTS admin_note    text;

ALTER TABLE gift_lesson_requests
  DROP CONSTRAINT IF EXISTS gift_lesson_requests_student_id_status_key;

ALTER TABLE gift_lesson_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_all" ON gift_lesson_requests;

CREATE POLICY "open_all" ON gift_lesson_requests
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'gift_lesson_requests'
  AND table_schema = 'public'
ORDER BY ordinal_position;
