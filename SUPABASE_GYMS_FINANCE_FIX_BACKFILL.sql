-- ══════════════════════════════════════════════════════════════════
-- DÜZELTME — geriye dönük borç kayıtlarının eksik payments satırını
-- tamamlar ve güncel salon atamasına göre salon payını yeniden hesaplar
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
--
-- Sebep: Önceki backfill betiği SADECE income_movements'a yazmıştı,
-- payments tablosuna hiç dokunmamıştı. "Bekleyen Öğrenci Borçları"
-- kartı payments tablosundan beslendiği için bu borçları görmüyordu.
-- Ayrıca o sırada öğrenciye henüz salon atanmamış olabilir — şimdi
-- atanmışsa salon payı da burada güncel haliyle yeniden hesaplanır.
--
-- GÜVENLİ: Sadece payment_id'si NULL olan (henüz eşleştirilmemiş)
-- geriye dönük kayıtları işler, tekrar çalıştırmak zarar vermez.
-- ══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
  new_payment_id uuid;
  v_gym_id uuid;
  v_gym_name text;
  v_share_type text;
  v_gym_pct numeric;
  v_override_type text;
  v_override_value numeric;
  v_share numeric;
  v_net numeric;
BEGIN
  FOR r IN
    SELECT im.id, im.student_id, im.student_name, im.payment_amount, im.payment_date
    FROM income_movements im
    WHERE im.note = 'Mevcut borç (geriye dönük senkronizasyon)'
      AND im.payment_id IS NULL
  LOOP
    v_gym_id := NULL; v_gym_name := NULL; v_share_type := NULL; v_gym_pct := NULL;
    v_override_type := NULL; v_override_value := NULL; v_share := 0;

    SELECT s.gym_id, s.gym_share_override_type, s.gym_share_override_value
      INTO v_gym_id, v_override_type, v_override_value
      FROM students s WHERE s.id = r.student_id;

    IF v_gym_id IS NOT NULL THEN
      SELECT g.name, g.share_type, g.gym_percentage
        INTO v_gym_name, v_share_type, v_gym_pct
        FROM gyms g WHERE g.id = v_gym_id;

      IF COALESCE(v_override_type, v_share_type) = 'percentage' THEN
        v_share := r.payment_amount * (
          COALESCE(
            CASE WHEN v_override_type = 'percentage' THEN v_override_value ELSE NULL END,
            v_gym_pct, 0
          ) / 100.0
        );
      END IF;
      -- fixed_per_lesson / no_share → ödeme anında pay 0 kalır (ders bazlı veya hiç)
    END IF;

    v_net := r.payment_amount - v_share;

    INSERT INTO payments (student_id, student_name, amount, paid_at, method, status, notes)
    VALUES (r.student_id, r.student_name, r.payment_amount, r.payment_date, 'nakit', 'beklemede',
            'Mevcut borç (geriye dönük senkronizasyon)')
    RETURNING id INTO new_payment_id;

    UPDATE income_movements
    SET payment_id = new_payment_id,
        gym_id = v_gym_id,
        gym_name = v_gym_name,
        gym_share_amount = v_share,
        trainer_net_amount = v_net
    WHERE id = r.id;
  END LOOP;
END $$;
