-- ── Kedi AI Vision — fotoğraf/video teknik analizi ──────────────────
-- Supabase SQL Editor'da çalıştır. İdempotent — tekrar çalıştırılabilir.
--
-- Her satır bir analiz sonucu: fotoğraf/video yüklenip AI tarafından
-- değerlendirildiğinde (gard/ayak/yumruk/omuz/kalça rotasyonu/denge/vücut
-- hizası + teknik skor kategorileri) buraya kaydedilir. media_hash aynı
-- görselin YANLIŞLIKLA iki kez analiz edilip gereksiz yere ücretsiz AI
-- kotası tüketmesini önlemek için kullanılır (bkz. lib/kediVision.ts).

CREATE TABLE IF NOT EXISTS kedi_ai_vision_analyses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  media_type       text NOT NULL,
  media_url        text NOT NULL,
  media_hash       text,
  overall_score    int NOT NULL,
  categories_json  jsonb NOT NULL,
  deficiencies_json jsonb NOT NULL,
  coach_notes_json jsonb NOT NULL,
  progress_note    text,
  raw_summary      text NOT NULL,
  created_by       text NOT NULL DEFAULT 'student',
  created_at       timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE kedi_ai_vision_analyses
    ADD CONSTRAINT kedi_ai_vision_analyses_media_type_check CHECK (media_type IN ('photo','video'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE kedi_ai_vision_analyses
    ADD CONSTRAINT kedi_ai_vision_analyses_created_by_check CHECK (created_by IN ('student','admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE kedi_ai_vision_analyses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "open_all" ON kedi_ai_vision_analyses FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_kedi_vision_student ON kedi_ai_vision_analyses(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kedi_vision_hash ON kedi_ai_vision_analyses(student_id, media_hash);

-- Storage: yüklenen fotoğraf/temsili video karesi (bkz. PROFILE_PHOTO_SETUP.sql
-- ile aynı desen — public bucket + herkese açık okuma/anonim yükleme).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('kedi-vision', 'kedi-vision', true, 10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public kedi-vision read" ON storage.objects
    FOR SELECT USING (bucket_id = 'kedi-vision');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "kedi-vision upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'kedi-vision');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "kedi-vision update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'kedi-vision');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "kedi-vision delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'kedi-vision');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Kontrol
SELECT 'kedi_ai_vision_analyses' as tablo, count(*) FROM kedi_ai_vision_analyses;
