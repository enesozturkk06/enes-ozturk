-- ══════════════════════════════════════════════════════════════════
-- TAKİP MİGRATION — mevcut öğrenci borçlarını Finans Merkezi'ne senkronize et
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
--
-- Sebep: lib/db.ts'teki otomatik gelir kaydı sistemi devreye girmeden
-- ÖNCE oluşturulmuş/güncellenmiş öğrenci borçları (students.amount_due > 0)
-- hiçbir zaman income_movements'a YA DA payments'a yazılmadı — bu yüzden
-- ne Finans Merkezi'nin Gelir Hareketleri listesinde ne de "Bekleyen
-- Öğrenci Borçları" kartında görünüyorlar. Bu betik her öğrencinin
-- GÜNCEL borcu için HEM payments HEM income_movements'a "beklemede"
-- kaydı ekler (salon ataması varsa payı da hesaplar).
--
-- GÜVENLİ: Birden fazla kez çalıştırılabilir — aynı öğrenci için zaten
-- bu betikle eklenmiş bir kayıt varsa tekrar eklenmez.
-- ══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  s RECORD;
  new_payment_id uuid;
  v_gym_name text;
  v_share_type text;
  v_gym_pct numeric;
  v_share numeric;
  v_net numeric;
BEGIN
  FOR s IN
    SELECT std.id, std.full_name, std.amount_due, std.gym_id,
           std.gym_share_override_type, std.gym_share_override_value
    FROM students std
    WHERE std.amount_due > 0
      AND NOT EXISTS (
        SELECT 1 FROM income_movements im
        WHERE im.student_id = std.id
          AND im.note = 'Mevcut borç (geriye dönük senkronizasyon)'
      )
  LOOP
    v_gym_name := NULL; v_share_type := NULL; v_gym_pct := NULL; v_share := 0;

    IF s.gym_id IS NOT NULL THEN
      SELECT g.name, g.share_type, g.gym_percentage
        INTO v_gym_name, v_share_type, v_gym_pct
        FROM gyms g WHERE g.id = s.gym_id;

      IF COALESCE(s.gym_share_override_type, v_share_type) = 'percentage' THEN
        v_share := s.amount_due * (
          COALESCE(
            CASE WHEN s.gym_share_override_type = 'percentage' THEN s.gym_share_override_value ELSE NULL END,
            v_gym_pct, 0
          ) / 100.0
        );
      END IF;
    END IF;

    v_net := s.amount_due - v_share;

    INSERT INTO payments (student_id, student_name, amount, paid_at, method, status, notes)
    VALUES (s.id, s.full_name, s.amount_due, CURRENT_DATE, 'nakit', 'beklemede',
            'Mevcut borç (geriye dönük senkronizasyon)')
    RETURNING id INTO new_payment_id;

    INSERT INTO income_movements (
      student_id, student_name, payment_id, payment_type, payment_amount, status,
      payment_date, gym_id, gym_name, gym_share_amount, trainer_net_amount, note
    ) VALUES (
      s.id, s.full_name, new_payment_id, 'ek_odeme', s.amount_due, 'beklemede',
      CURRENT_DATE, s.gym_id, v_gym_name, v_share, v_net,
      'Mevcut borç (geriye dönük senkronizasyon)'
    );
  END LOOP;
END $$;
