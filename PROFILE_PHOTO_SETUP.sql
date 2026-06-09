-- ════════════════════════════════════════════════════════════
-- Profil Fotoğrafı ve App Settings Kurulum
-- Supabase SQL Editor'da çalıştır
-- ════════════════════════════════════════════════════════════

-- 1) students tablosuna avatar_url kolonu ekle
ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2) Uygulama ayarları tablosu
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

-- Varsayılan ayarlar
INSERT INTO app_settings (key, value)
VALUES ('activity_feed_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

-- 3) Supabase Storage: Supabase Dashboard > Storage > New Bucket
--    Bucket adı: avatars
--    Public bucket: AÇIK (public: true)
--    Allowed MIME types: image/*
--    Max file size: 5 MB
--
-- Alternatif olarak bu SQL ile de oluşturabilirsiniz:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 4) Storage RLS policies (anonim yükleme + okuma)
-- Herkes okuyabilir:
CREATE POLICY "Public avatar read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Öğrenciler kendi klasörlerine yükleyebilir (anonim key ile):
CREATE POLICY "Student avatar upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Student avatar update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

CREATE POLICY "Student avatar delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars');

-- 5) Sonuç kontrolü
SELECT column_name FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'avatar_url';

SELECT key, value FROM app_settings;
