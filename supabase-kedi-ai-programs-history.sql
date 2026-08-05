-- ── Kedi AI Koç Merkezi — sürümleme + taslak/yayın akışı ─────────
-- Bu dosya, mevcut kedi_ai_programs tablosunu (tek satır/öğrenci) bir
-- SÜRÜM GEÇMİŞİ tablosuna dönüştürür (idempotent — tekrar çalıştırılabilir).
--
-- Yeni model: her AI üretimi/onay YENİ bir satır (version) oluşturur.
--   - status='published' → öğrencinin gördüğü, tek aktif sürüm.
--   - status='draft'     → antrenörün henüz onaylamadığı taslak.
--   - status='archived'  → yayından kaldırılmış eski sürüm (geçmiş/karşılaştırma için tutulur).
--   - created_by='student' → öğrencinin kendi ürettiği (Kedi AI Premium Program).
--   - created_by='admin'   → antrenörün Koç Merkezi'nden ürettiği/onayladığı.

ALTER TABLE kedi_ai_programs ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;
ALTER TABLE kedi_ai_programs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
ALTER TABLE kedi_ai_programs ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT 'student';
ALTER TABLE kedi_ai_programs ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false;
ALTER TABLE kedi_ai_programs ADD COLUMN IF NOT EXISTS change_note text;

DO $$ BEGIN
  ALTER TABLE kedi_ai_programs ADD CONSTRAINT kedi_ai_programs_status_check CHECK (status IN ('draft','published','archived'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE kedi_ai_programs ADD CONSTRAINT kedi_ai_programs_created_by_check CHECK (created_by IN ('student','admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Eski model tek satır/öğrenci UNIQUE kısıtını kaldır — artık öğrenci başına
-- birden çok sürüm (satır) olabilir.
ALTER TABLE kedi_ai_programs DROP CONSTRAINT IF EXISTS kedi_ai_programs_student_id_key;

CREATE INDEX IF NOT EXISTS idx_kedi_ai_programs_student_version ON kedi_ai_programs(student_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_kedi_ai_programs_student_status ON kedi_ai_programs(student_id, status);

-- Kontrol
SELECT 'kedi_ai_programs' as tablo, count(*) FROM kedi_ai_programs;
SELECT student_id, version, status, created_by FROM kedi_ai_programs ORDER BY student_id, version DESC LIMIT 20;
