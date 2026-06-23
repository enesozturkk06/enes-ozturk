-- ══════════════════════════════════════════════════════════════════
-- TAKİP MİGRATION — mevcut öğrenci borçlarını Finans Merkezi'ne senkronize et
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
--
-- Sebep: lib/db.ts'teki otomatik gelir kaydı sistemi devreye girmeden
-- ÖNCE oluşturulmuş/güncellenmiş öğrenci borçları (students.amount_due > 0)
-- hiçbir zaman income_movements'a yazılmadı — bu yüzden Finans Merkezi'nde
-- görünmüyorlar. Bu betik her öğrencinin GÜNCEL borcunu "beklemede"
-- durumunda bir gelir hareketi olarak ekler.
--
-- GÜVENLİ: Birden fazla kez çalıştırılabilir — aynı öğrenci için zaten
-- bu betikle eklenmiş bir kayıt varsa tekrar eklenmez.
-- ══════════════════════════════════════════════════════════════════

INSERT INTO income_movements (
  student_id, student_name, payment_type, payment_amount, status,
  payment_date, note
)
SELECT
  s.id, s.full_name, 'ek_odeme', s.amount_due, 'beklemede',
  CURRENT_DATE, 'Mevcut borç (geriye dönük senkronizasyon)'
FROM students s
WHERE s.amount_due > 0
  AND NOT EXISTS (
    SELECT 1 FROM income_movements im
    WHERE im.student_id = s.id
      AND im.note = 'Mevcut borç (geriye dönük senkronizasyon)'
  );
