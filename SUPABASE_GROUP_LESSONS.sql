-- ══════════════════════════════════════════════════════════════════
-- GRUP DERSİ FİNANS MODÜLÜ + DİĞER GELİRLER
-- Supabase Dashboard → SQL Editor → Yapıştır → RUN
--
-- Tamamen EK'tir (additive) — mevcut students/payments/gyms/
-- income_movements tablolarındaki hiçbir kolon silinmez/değiştirilmez.
-- Grup dersi ödemeleri income_movements'a YAZILMAZ (özel ders sisteminden
-- tamamen bağımsız); Finans Merkezi bu tabloları ayrıca okuyup
-- kategorilere göre toplar.
-- ══════════════════════════════════════════════════════════════════

-- 1) Grup Dersleri ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_lessons (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  gym_id                uuid REFERENCES gyms(id) ON DELETE SET NULL,
  trainer_name          text,
  fee_per_student       numeric(10,2) NOT NULL DEFAULT 0,
  share_type            text NOT NULL DEFAULT 'percentage'
                        CHECK (share_type IN ('percentage','fixed_per_lesson','fixed_monthly_rent')),
  gym_percentage        numeric(5,2),   -- share_type='percentage' iken: salon payı % (eğitmen payı = 100 - bu)
  fixed_fee_per_lesson  numeric(10,2),  -- share_type='fixed_per_lesson' iken: ders başı salona ödenecek sabit tutar
  fixed_monthly_rent    numeric(10,2),  -- share_type='fixed_monthly_rent' iken: aylık sabit salon kirası
  max_capacity          integer,        -- opsiyonel — doluluk oranı için (boşsa doluluk gösterilmez)
  start_date            date NOT NULL DEFAULT CURRENT_DATE,
  end_date              date,
  description           text,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE group_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_lessons_all ON group_lessons;
CREATE POLICY group_lessons_all ON group_lessons FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_group_lessons_gym ON group_lessons(gym_id);

-- 2) Grup Dersi Üyeleri ─────────────────────────────────────────────
-- student_id NULLABLE: grup üyesi mutlaka uygulama hesabı olan bir
-- öğrenci olmak zorunda değil (isimle takip edilebilir). Bağlıysa
-- push hatırlatması alabilir, değilse sadece gelir/doluluk sayımına dahildir.
CREATE TABLE IF NOT EXISTS group_lesson_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES group_lessons(id) ON DELETE CASCADE,
  student_id  uuid REFERENCES students(id) ON DELETE SET NULL,
  full_name   text NOT NULL,
  phone       text,
  joined_at   date NOT NULL DEFAULT CURRENT_DATE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE group_lesson_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_lesson_members_all ON group_lesson_members;
CREATE POLICY group_lesson_members_all ON group_lesson_members FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_glm_group   ON group_lesson_members(group_id);
CREATE INDEX IF NOT EXISTS idx_glm_student ON group_lesson_members(student_id);

-- 3) Aylık Aidat Dönemleri ──────────────────────────────────────────
-- Her üye × her ay = 1 satır. Sistem her ay otomatik (sayfa açılınca
-- ensureCurrentMonthPeriods() ile) bu ayın satırını oluşturur.
CREATE TABLE IF NOT EXISTS group_lesson_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   uuid NOT NULL REFERENCES group_lesson_members(id) ON DELETE CASCADE,
  group_id    uuid NOT NULL REFERENCES group_lessons(id) ON DELETE CASCADE,
  period_month text NOT NULL,  -- 'yyyy-MM'
  amount      numeric(10,2) NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'beklemede' CHECK (status IN ('odendi','beklemede','gecikti')),
  paid_at     date,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (member_id, period_month)
);

ALTER TABLE group_lesson_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_lesson_payments_all ON group_lesson_payments;
CREATE POLICY group_lesson_payments_all ON group_lesson_payments FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_glp_group  ON group_lesson_payments(group_id);
CREATE INDEX IF NOT EXISTS idx_glp_member ON group_lesson_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_glp_period ON group_lesson_payments(period_month);

-- 4) Aylık Ders Sayısı (sadece fixed_per_lesson grupları için) ──────
-- Grup + ay başına TEK satır — üye üye tekrar girilmez, tutarsızlık olmaz.
CREATE TABLE IF NOT EXISTS group_lesson_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       uuid NOT NULL REFERENCES group_lessons(id) ON DELETE CASCADE,
  period_month   text NOT NULL,
  session_count  integer NOT NULL DEFAULT 0,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (group_id, period_month)
);

ALTER TABLE group_lesson_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS group_lesson_sessions_all ON group_lesson_sessions;
CREATE POLICY group_lesson_sessions_all ON group_lesson_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_gls_group ON group_lesson_sessions(group_id);

-- 5) Diğer Gelirler (seminer, sponsorluk, ürün satışı vb.) ──────────
CREATE TABLE IF NOT EXISTS other_income (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  income_type  text NOT NULL CHECK (income_type IN
               ('seminer','workshop','sponsorluk','urun_satisi','online_ders','ozel_etkinlik','diger')),
  description  text,
  amount       numeric(10,2) NOT NULL DEFAULT 0,
  income_date  date NOT NULL DEFAULT CURRENT_DATE,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE other_income ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS other_income_all ON other_income;
CREATE POLICY other_income_all ON other_income FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_other_income_date ON other_income(income_date);
