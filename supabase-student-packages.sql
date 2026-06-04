-- ══════════════════════════════════════════════════════════════
-- PAKET GEÇMİŞİ / YENİLEME SİSTEMİ
-- Supabase SQL Editor'de çalıştırın
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS student_packages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  package_type   text NOT NULL,          -- savasci | sampiyon | efsane
  package_name   text NOT NULL,          -- "Şampiyon Paketi"
  lesson_count   int  NOT NULL,          -- bu pakette kaç ders
  list_price     numeric(10,2) NOT NULL, -- katalog fiyatı
  paid_amount    numeric(10,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'beklemede',
  start_date     date NOT NULL DEFAULT CURRENT_DATE,
  end_date       date,
  notes          text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE student_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_all" ON student_packages;
CREATE POLICY "open_all" ON student_packages
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_student_packages_student
  ON student_packages(student_id, created_at DESC);

NOTIFY pgrst, 'reload schema';

-- Kontrol
SELECT 'student_packages' AS tablo,
       COUNT(*) AS kayit_sayisi
FROM   student_packages;
