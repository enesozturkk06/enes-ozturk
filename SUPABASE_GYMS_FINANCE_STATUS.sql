-- ══════════════════════════════════════════════════════════════════
-- TAKİP MİGRATION — income_movements'a "status" kolonu eklenir
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
--
-- Sebep: Öğrenciler kısmından eklenen ödeme/bekleyen borç artık Gelir
-- Hareketleri'nde de görünüyor. Bunun için her satırın "odendi" mi
-- yoksa "beklemede/gecikti" mi olduğunu bilmemiz gerekiyor — Finans
-- Merkezi'ndeki ciro/net kazanç toplamları SADECE "odendi" satırları
-- sayar, böylece bekleyen para ciroyu şişirmez.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE income_movements
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'odendi'
  CHECK (status IN ('odendi','beklemede','gecikti'));

-- Mevcut satırlar zaten sadece "odendi" ödemelerden backfill edilmişti,
-- bu yüzden default 'odendi' değeri hepsi için doğru — ek bir UPDATE'e
-- gerek yok.
