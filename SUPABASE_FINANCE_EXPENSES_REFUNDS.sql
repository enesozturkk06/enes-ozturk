-- ═══════════════════════════════════════════════════════════════════
-- FİNANS MERKEZİ — Gider + İade tabloları + Gelir kategorisi/ödeme
-- yöntemi genişletmesi
--
-- Bu dosyayı Supabase SQL Editor'de ÇALIŞTIRIN.
-- Mevcut hiçbir veriyi SİLMEZ / DEĞİŞTİRMEZ — sadece:
--   1) yeni "expenses" tablosu ekler
--   2) yeni "refunds" tablosu ekler
--   3) mevcut "other_income" tablosuna "payment_method" kolonu ekler
--   4) mevcut "other_income.income_type" kategori listesini genişletir
--      (eski değerler KORUNUR, üstüne yeni değerler eklenir)
--
-- Baştan sona TEKRAR TEKRAR çalıştırılabilir (idempotent) — her adım
-- IF NOT EXISTS / DROP-sonra-CREATE deseniyle yazıldı, ikinci çalıştırma
-- hata vermez ve hiçbir veriyi bozmaz.
--
-- Önceki sürümdeki hata: DO bloğundaki döngü değişkeni "con" ile
-- sorgunun kendi tablo takma adı "con" AYNI isimdeydi — Postgres bu
-- yüzden "record con is not assigned yet" hatası veriyordu. Aşağıda
-- döngü değişkeni "cname" (düz metin) olarak değiştirildi, tablo takma
-- adı "c" oldu — isim çakışması tamamen ortadan kalktı.
-- ═══════════════════════════════════════════════════════════════════

-- 1) GİDERLER ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount         numeric(10,2) NOT NULL CHECK (amount > 0),
  category       text NOT NULL CHECK (category IN
                 ('salon_kirasi','salon_payi','ekipman','reklam','ulasim','fatura','personel','vergi_harc','diger')),
  description    text,
  expense_date   date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text CHECK (payment_method IN ('nakit','kart','havale_eft','diger')),
  gym_id         uuid REFERENCES gyms(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS expenses_all ON expenses;
CREATE POLICY expenses_all ON expenses FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- 2) İADELER ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id   uuid REFERENCES payments(id) ON DELETE SET NULL,
  student_id   uuid REFERENCES students(id) ON DELETE SET NULL,
  student_name text,
  amount       numeric(10,2) NOT NULL CHECK (amount > 0),
  reason       text,
  refund_date  date NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS refunds_all ON refunds;
CREATE POLICY refunds_all ON refunds FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_refunds_date ON refunds(refund_date);

-- 3) DİĞER GELİRLER — ödeme yöntemi kolonu ────────────────────────
ALTER TABLE other_income ADD COLUMN IF NOT EXISTS payment_method text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'other_income'::regclass
      AND conname = 'other_income_payment_method_check'
  ) THEN
    ALTER TABLE other_income ADD CONSTRAINT other_income_payment_method_check
      CHECK (payment_method IN ('nakit','kart','havale_eft','diger'));
  END IF;
END $$;

-- 4) DİĞER GELİRLER — kategori listesini genişlet ─────────────────
-- Eski CHECK constraint'i (adı ne olursa olsun) bulup kaldırır, ardından
-- eski + yeni tüm değerleri kabul eden genişletilmiş bir tane ekler.
-- Mevcut satırlar zaten eski küme içinde olduğu için hiçbiri geçersiz olmaz.
DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(c.conkey)
    WHERE rel.relname = 'other_income' AND att.attname = 'income_type' AND c.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE other_income DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE other_income ADD CONSTRAINT other_income_income_type_check CHECK (income_type IN
  ('seminer','workshop','sponsorluk','urun_satisi','online_ders','ozel_etkinlik','diger',
   'ozel_ders','grup_ders','salon_geliri'));

-- ═══════════════════════════════════════════════════════════════════
-- DOĞRULAMA — aşağıdaki sorguları da çalıştırıp sonuçları kontrol edin.
-- ═══════════════════════════════════════════════════════════════════

-- expenses / refunds tabloları gerçekten var mı (0 satır dönmesi normaldir,
-- önemli olan "relation does not exist" HATASI almamak):
SELECT * FROM expenses LIMIT 1;
SELECT * FROM refunds LIMIT 1;

-- other_income.payment_method kolonu eklendi mi:
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'other_income'
  AND column_name = 'payment_method';

-- other_income.income_type CHECK constraint'i yeni kategorileri
-- (ozel_ders / grup_ders / salon_geliri) gerçekten kabul ediyor mu —
-- tanımın tam metnini gösterir, veri EKLEMEZ/DEĞİŞTİRMEZ:
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'other_income'::regclass
  AND contype = 'c'
  AND conname = 'other_income_income_type_check';
