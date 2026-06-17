-- ══════════════════════════════════════════════════════════════════
-- WEB PUSH NOTIFICATION SİSTEMİ
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
--
-- ÖNEMLİ — çalıştırmadan önce aşağıdaki 2 yeri kendi değerlerinle değiştir:
--   ① url            → canlı sitenin tam adresi + /api/push/send
--                       örnek: https://enes-ozturk.vercel.app/api/push/send
--   ② x-push-secret  → .env.local dosyasındaki PUSH_INTERNAL_SECRET
--                       (ve Vercel ortam değişkenlerine de aynısını ekle)
-- ══════════════════════════════════════════════════════════════════

-- 1) Abonelik tablosu ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid REFERENCES students(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_student ON push_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_role    ON push_subscriptions(role);

-- RLS: projedeki diğer tablolarla aynı açık politika (anon key ile yönetiliyor)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS push_subscriptions_all ON push_subscriptions;
CREATE POLICY push_subscriptions_all ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);

-- 2) pg_net uzantısı — Supabase projelerinde genelde hazır gelir ───
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3) notifications tablosuna her INSERT'te otomatik push tetikle ──
--    Mevcut bildirim merkezi (notifications tablosu) hiç değişmiyor;
--    sadece her yeni satır otomatik olarak /api/push/send'e haber veriyor.
CREATE OR REPLACE FUNCTION trigger_web_push()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://YOUR-DOMAIN.vercel.app/api/push/send',   -- ① burayı değiştir
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-push-secret', 'YOUR_PUSH_INTERNAL_SECRET'    -- ② burayı değiştir
               ),
    body    := jsonb_build_object('notificationId', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- push gönderimi başarısız olsa da bildirim merkezi kaydı asla bozulmasın
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notifications_push_trigger ON notifications;
CREATE TRIGGER notifications_push_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION trigger_web_push();

-- ══════════════════════════════════════════════════════════════════
-- Bu trigger sayesinde lib/db.ts içindeki TÜM mevcut bildirim
-- oluşturma noktaları (yeni randevu, iptal, hediye ders, görev XP,
-- rozet, bekleme listesi, paket süresi, düet onay/red vb.) otomatik
-- olarak push bildirimine dönüşür — kod tarafında ekstra değişiklik
-- gerekmez.
-- ══════════════════════════════════════════════════════════════════
