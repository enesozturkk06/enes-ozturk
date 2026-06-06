-- ══════════════════════════════════════════════════════════════════
-- KEDİ AI — Yeni Tablolar: gift_lesson_requests
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
-- ══════════════════════════════════════════════════════════════════

-- ── Hediye Ders Talepleri ─────────────────────────────────────────
-- Öğrenci 5000 XP'ye ulaşınca otomatik oluşturulur.
-- Admin onaylayana kadar "pending" kalır.
CREATE TABLE IF NOT EXISTS gift_lesson_requests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_name  text        NOT NULL DEFAULT '',
  xp_at_request integer     NOT NULL DEFAULT 0,
  status        text        NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  approved_at   timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (student_id, status)  -- Aynı öğrenciden tek pending talep
);

-- RLS — tam erişim (mevcut policy'yle aynı)
ALTER TABLE gift_lesson_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_all" ON gift_lesson_requests;
CREATE POLICY "open_all" ON gift_lesson_requests
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── Doğrulama ─────────────────────────────────────────────────────
SELECT tablename, (SELECT count(*) FROM information_schema.columns c
  WHERE c.table_name = t.tablename AND c.table_schema = 'public') AS kolon_sayisi
FROM pg_tables t
WHERE t.schemaname = 'public' AND t.tablename = 'gift_lesson_requests';

-- ── Schema cache yenile ───────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');
