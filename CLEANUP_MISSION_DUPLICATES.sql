-- ════════════════════════════════════════════════════════════════════
-- Görev Sistemi Duplicate Temizleme SQL'i
-- Supabase SQL Editor'da çalıştır
-- ════════════════════════════════════════════════════════════════════

-- ── 1) kedi_mission_completions tablosu oluştur (zaten yoksa) ──────
CREATE TABLE IF NOT EXISTS kedi_mission_completions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  mission_key text NOT NULL,
  xp_amount   int  NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, mission_key)
);

-- ── 2) Duplicate xp_adjustments — her (student_id, reason, note)
--    kombinasyonundan sadece en eskiyi tut, gerisini sil ───────────
DELETE FROM xp_adjustments
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, reason, note
        ORDER BY created_at ASC  -- en eski kaydı tut
      ) AS rn
    FROM xp_adjustments
    WHERE reason = 'Görev Tamamlama'
  ) sub
  WHERE rn > 1
);

-- ── 3) Duplicate notifications — "XP Kazandın" bildirimlerini temizle
--    Aynı (student_id, message) çiftinden sadece en eskiyi tut ──────
DELETE FROM notifications
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, message
        ORDER BY created_at ASC  -- en eski kaydı tut
      ) AS rn
    FROM notifications
    WHERE title LIKE '%XP Kazandın%'
  ) sub
  WHERE rn > 1
);

-- ── 4) kedi_mission_completions'ı mevcut xp_adjustments'tan doldur
--    (geçmişte kaydedilmemiş tamamlamaları retroaktif olarak ekle) ──
INSERT INTO kedi_mission_completions (student_id, mission_key, xp_amount, completed_at)
SELECT DISTINCT ON (student_id, note)
  student_id,
  -- note alanı görev title'ı, mission_key'i tam olarak bilemeyiz
  -- 'recovered_' prefix ile işaretliyoruz
  'recovered_' || LOWER(REPLACE(note, ' ', '_')) AS mission_key,
  amount AS xp_amount,
  created_at AS completed_at
FROM xp_adjustments
WHERE reason = 'Görev Tamamlama'
  AND admin_name = 'KEDİ AI'
ON CONFLICT (student_id, mission_key) DO NOTHING;

-- ── 5) Sonuçları kontrol et ────────────────────────────────────────
SELECT
  'xp_adjustments (Görev)' AS tablo,
  COUNT(*) AS kayit_sayisi
FROM xp_adjustments
WHERE reason = 'Görev Tamamlama'
UNION ALL
SELECT
  'kedi_mission_completions',
  COUNT(*)
FROM kedi_mission_completions
UNION ALL
SELECT
  'duplicate notifications temizlendi — kalan',
  COUNT(*)
FROM notifications
WHERE title LIKE '%XP Kazandın%';
