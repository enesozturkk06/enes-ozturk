-- ══════════════════════════════════════════════════════════════════
-- FİNANS MERKEZİ + SALON GELİR PAYLAŞIMI SİSTEMİ
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
--
-- Bu migration TAMAMEN EK'tir (additive) — mevcut payments/students
-- tablolarındaki hiçbir kolon silinmez/yeniden adlandırılmaz. Mevcut
-- "Salon Sahipleri" (salon_owners) sistemine HİÇ DOKUNULMAZ, o ayrı
-- bir gözlemci-hesabı sistemi ve bununla ilgisi yok.
-- ══════════════════════════════════════════════════════════════════

-- 1) Salonlar (gelir paylaşımlı iş ortaklıkları) ───────────────────
CREATE TABLE IF NOT EXISTS gyms (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  share_type         text NOT NULL DEFAULT 'no_share'
                      CHECK (share_type IN ('fixed_per_lesson','percentage','no_share')),
  fixed_lesson_fee   numeric(10,2),   -- share_type='fixed_per_lesson' iken kullanılır
  gym_percentage     numeric(5,2),    -- share_type='percentage' iken kullanılır (0-100)
  trainer_percentage numeric(5,2),    -- bilgi amaçlı (100 - gym_percentage)
  is_active          boolean NOT NULL DEFAULT true,
  notes              text,
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gyms_all ON gyms;
CREATE POLICY gyms_all ON gyms FOR ALL USING (true) WITH CHECK (true);

-- 2) Öğrenciye salon ataması + özel anlaşma override ───────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES gyms(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gym_share_override_type  text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS gym_share_override_value numeric(10,2);

CREATE INDEX IF NOT EXISTS idx_students_gym ON students(gym_id);

-- 3) Gelir Hareketleri (her ödeme + her ders-tamamlama otomatik buraya düşer) ──
CREATE TABLE IF NOT EXISTS income_movements (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid REFERENCES students(id) ON DELETE SET NULL,
  student_name       text NOT NULL,
  payment_id         uuid REFERENCES payments(id) ON DELETE SET NULL,
  payment_type       text NOT NULL
                      CHECK (payment_type IN ('yeni_paket','paket_yenileme','ek_odeme','ders_tamamlama')),
  payment_amount     numeric(10,2) NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'odendi'
                      CHECK (status IN ('odendi','beklemede','gecikti')),
  payment_date       date NOT NULL DEFAULT CURRENT_DATE,
  package_type       text,
  gym_id             uuid REFERENCES gyms(id) ON DELETE SET NULL,
  gym_name           text,
  gym_share_amount   numeric(10,2) NOT NULL DEFAULT 0,
  trainer_net_amount numeric(10,2) NOT NULL DEFAULT 0,
  note               text,
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE income_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS income_movements_all ON income_movements;
CREATE POLICY income_movements_all ON income_movements FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_income_movements_student ON income_movements(student_id);
CREATE INDEX IF NOT EXISTS idx_income_movements_gym     ON income_movements(gym_id);
CREATE INDEX IF NOT EXISTS idx_income_movements_date    ON income_movements(payment_date);

-- 4) Geriye dönük uyumluluk — mevcut payments kayıtlarını backfill et ──
-- gym_id=NULL, gym_share=0, trainer_net=tam tutar (eski kayıtlarda salon
-- ataması hiç yoktu, bu doğru ve güvenli varsayılan). method='paket' olan
-- kayıtlar paket_yenileme, diğerleri ek_odeme olarak sınıflanır.
INSERT INTO income_movements (
  student_id, student_name, payment_id, payment_type,
  payment_amount, payment_date, gym_share_amount, trainer_net_amount, note, created_at
)
SELECT
  p.student_id, p.student_name, p.id,
  CASE WHEN p.method = 'paket' THEN 'paket_yenileme' ELSE 'ek_odeme' END,
  p.amount, p.paid_at, 0, p.amount, p.notes, p.created_at
FROM payments p
WHERE p.status = 'odendi'
  AND NOT EXISTS (SELECT 1 FROM income_movements im WHERE im.payment_id = p.id);

-- ══════════════════════════════════════════════════════════════════
-- Bundan sonra lib/db.ts'teki addPayment/renewStudentPackage çağrıları
-- her yeni ödemede otomatik income_movements satırı oluşturur;
-- completeAppointmentWithAttendance ders-başı salonlarda ders
-- tamamlanınca otomatik salon payı tahakkuku ekler.
-- ══════════════════════════════════════════════════════════════════
