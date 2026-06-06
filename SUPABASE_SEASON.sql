-- ══════════════════════════════════════════════════════════════════
-- Sezon Sistemi — gift_lesson_requests tablosu güncelleme
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Yeni kolonları ekle ────────────────────────────────────────
ALTER TABLE gift_lesson_requests
  ADD COLUMN IF NOT EXISTS season     text    NOT NULL DEFAULT '2026-Q2',
  ADD COLUMN IF NOT EXISTS threshold  integer NOT NULL DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS season_xp  integer NOT NULL DEFAULT 0;

-- ── 2. Eski UNIQUE kısıtı kaldır (çok geniş tanımlıydı) ──────────
ALTER TABLE gift_lesson_requests
  DROP CONSTRAINT IF EXISTS gift_lesson_requests_student_id_status_key;

-- ── 3. Schema cache yenile ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
SELECT pg_notify('pgrst', 'reload schema');

-- ── 4. Mevcut satırları sezon bilgisiyle güncelle (opsiyonel) ─────
-- Mevcut tüm pending/approved talepleri 2026-Q2'ye ata:
-- UPDATE gift_lesson_requests SET season = '2026-Q2', threshold = 5000
-- WHERE season = '2026-Q2';  -- zaten default

-- ── 5. Doğrulama ──────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'gift_lesson_requests'
  AND table_schema = 'public'
ORDER BY ordinal_position;
