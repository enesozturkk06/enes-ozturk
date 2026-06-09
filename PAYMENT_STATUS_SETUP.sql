-- ════════════════════════════════════════════════════════════════════
-- Ödeme Takibi — Status kolonu ekle
-- Supabase SQL Editor'da çalıştır
-- ════════════════════════════════════════════════════════════════════

-- 1) Status kolonu ekle (mevcut kayıtlar 'odendi' olarak güncellenir)
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'odendi'
  CHECK (status IN ('odendi', 'beklemede', 'gecikti'));

-- 2) Sonuç kontrolü
SELECT
  status,
  COUNT(*)  AS adet,
  SUM(amount) AS toplam
FROM payments
GROUP BY status
ORDER BY status;
