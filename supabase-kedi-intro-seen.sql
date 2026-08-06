-- ── Kedi AI Ultra — tek seferlik tanıtım ekranı ─────────────────────
-- Supabase SQL Editor'da çalıştır. İdempotent — tekrar çalıştırılabilir.
--
-- Öğrenci tarafı: students.kedi_intro_seen (hesap bazlı, students tablosunda
-- zaten var olan rules_accepted ile AYNI desen).
-- Admin tarafı: ayrı bir "admin kullanıcı" tablosu olmadığı için mevcut
-- app_settings (key/value) tablosundaki 'kedi_intro_seen_admin' anahtarı
-- kullanılır (bkz. lib/db.ts getAppSetting/setAppSetting) — yeni tablo
-- GEREKMİYOR, app_settings zaten mevcut.

ALTER TABLE students ADD COLUMN IF NOT EXISTS kedi_intro_seen boolean NOT NULL DEFAULT false;

-- BULUNAN GERÇEK BUG (production smoke test ile tespit edildi): app_settings
-- tablosu PROFILE_PHOTO_SETUP.sql'de oluşturulurken RLS için hiç policy
-- eklenmemiş — o dosyadaki INSERT satırı sadece SQL Editor'ün (owner/service
-- role) RLS'i atlaması sayesinde çalışmıştı. Anon anahtarla admin tarafından
-- yapılan setAppSetting() çağrısı (admin intro "Başlayalım") bu yüzden
-- "new row violates row-level security policy" ile 401 veriyordu. Diğer tüm
-- Kedi tablolarıyla AYNI open_all policy deseni ekleniyor:
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "open_all" ON app_settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Kontrol
SELECT column_name FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'kedi_intro_seen';
SELECT tablename, policyname FROM pg_policies WHERE tablename = 'app_settings';
