-- ══════════════════════════════════════════════════════════════════
-- Bekleme Listesi Sistemi (waitlist)
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Bekleme listesi tablosu ─────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date         text NOT NULL,        -- "2025-03-10"
  start_time   text NOT NULL,        -- "10:00"
  end_time     text NOT NULL,        -- "11:00"
  lesson_type  text NOT NULL DEFAULT 'bireysel',
  notified     bool NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, date, start_time)
);

-- ── 2. İndeksler ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS waitlist_date_start ON waitlist(date, start_time);
CREATE INDEX IF NOT EXISTS waitlist_student    ON waitlist(student_id);

-- ── 3. Schema cache yenile ─────────────────────────────────────
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- ── 4. Doğrulama ───────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'waitlist';
