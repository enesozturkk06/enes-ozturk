-- ══════════════════════════════════════════════════════════════════
-- SALON SAHİBİ / GÖZLEMCİ SİSTEMİ
-- Supabase SQL Editor'de çalıştırın
-- ══════════════════════════════════════════════════════════════════

-- 1. salon_owners tablosu
CREATE TABLE IF NOT EXISTS salon_owners (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  access_code text    UNIQUE NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  notes       text,
  created_at  timestamptz DEFAULT now()
);

-- 2. salon_owner_students — hangi öğrenciler görülebilir
CREATE TABLE IF NOT EXISTS salon_owner_students (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_owner_id uuid NOT NULL REFERENCES salon_owners(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id)     ON DELETE CASCADE,
  created_at     timestamptz DEFAULT now(),
  UNIQUE (salon_owner_id, student_id)
);

-- 3. RLS
ALTER TABLE salon_owners         ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_owner_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all" ON salon_owners
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "open_all" ON salon_owner_students
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. Schema cache yenile
NOTIFY pgrst, 'reload schema';

-- 5. Kontrol
SELECT tablename, (
  SELECT count(*) FROM information_schema.columns c
  WHERE c.table_name = t.tablename AND c.table_schema = 'public'
) AS kolon_sayisi
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN ('salon_owners','salon_owner_students')
ORDER BY tablename;
