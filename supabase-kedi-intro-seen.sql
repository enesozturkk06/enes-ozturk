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

-- Kontrol
SELECT column_name FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'kedi_intro_seen';
