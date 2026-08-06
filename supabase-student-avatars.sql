-- ── Kedi Avatar Sistemi — öğrenci kişiselleştirilebilir 2D avatar ───
-- Supabase SQL Editor'da çalıştır. İdempotent — tekrar çalıştırılabilir.
--
-- Bir satır = bir öğrencinin avatar kişiselleştirme seçimleri. Evrim
-- kademesi (XP'ye göre) ve kozmetik açılımlar (rozetlere göre) BURADA
-- SAKLANMAZ — mevcut lib/xp.ts ve lib/badges.ts'ten her seferinde türetilir
-- (bkz. lib/avatarEvolution.ts), aynı türetilmiş-veri felsefesi.

CREATE TABLE IF NOT EXISTS student_avatars (
  student_id         uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  gender             text NOT NULL DEFAULT 'male',
  skin_tone          text NOT NULL DEFAULT 'tone-3',
  eye_color          text NOT NULL DEFAULT 'brown',
  hair_style         text NOT NULL DEFAULT 'short-1',
  hair_color         text NOT NULL DEFAULT 'black',
  eyebrow_style      text NOT NULL DEFAULT 'neutral',
  beard_style        text NOT NULL DEFAULT 'none',
  body_type          text NOT NULL DEFAULT 'athletic',
  outfit_id          text NOT NULL DEFAULT 'starter-kit',
  glove_color        text NOT NULL DEFAULT 'red',
  shoe_id            text NOT NULL DEFAULT 'starter',
  tattoo_id          text,
  equipped_cosmetics jsonb NOT NULL DEFAULT '{}',
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

ALTER TABLE student_avatars ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "open_all" ON student_avatars FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Kontrol
SELECT 'student_avatars' as tablo, count(*) FROM student_avatars;
