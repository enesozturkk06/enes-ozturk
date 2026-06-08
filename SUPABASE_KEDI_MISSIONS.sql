-- ══════════════════════════════════════════════════════════════════
-- Kedi AI Görev Sistemi (kedi_missions + kedi_mission_completions)
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Admin tarafından oluşturulan özel görev tanımları ──────────
CREATE TABLE IF NOT EXISTS kedi_missions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  icon          text NOT NULL DEFAULT '🎯',
  xp_reward     int  NOT NULL DEFAULT 100,
  target_value  int  NOT NULL DEFAULT 1,
  student_id    uuid REFERENCES students(id) ON DELETE CASCADE,  -- null = tüm öğrenciler
  is_active     bool NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── 2. Tamamlama kayıtları (auto-mission ve custom-mission) ───────
CREATE TABLE IF NOT EXISTS kedi_mission_completions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mission_key  text NOT NULL,   -- auto: "weekly_2_lessons_2025-W03", custom: kedi_missions.id
  xp_amount    int  NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, mission_key)
);

-- ── 3. Schema cache yenile ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- ── 4. Doğrulama ──────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('kedi_missions', 'kedi_mission_completions');
