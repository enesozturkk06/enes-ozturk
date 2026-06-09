-- ════════════════════════════════════════════════════════════════════
-- Arena Düello Sistemi — Supabase SQL Editor'da çalıştır
-- ════════════════════════════════════════════════════════════════════

-- 1) Arena düello tablosu
CREATE TABLE IF NOT EXISTS arena_duels (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  challenger_name  text NOT NULL,
  opponent_id      uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  opponent_name    text NOT NULL,
  wager_xp         int  NOT NULL DEFAULT 100,
  reward_xp        int,
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','accepted','rejected','active','completed','cancelled')),
  winner_id        uuid REFERENCES students(id),
  admin_note       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  accepted_at      timestamptz,
  completed_at     timestamptz,
  -- Aynı çift arasında aynı anda birden fazla aktif düello olamaz
  CONSTRAINT no_duplicate_active CHECK (true)
);

CREATE INDEX IF NOT EXISTS idx_arena_challenger ON arena_duels(challenger_id);
CREATE INDEX IF NOT EXISTS idx_arena_opponent   ON arena_duels(opponent_id);
CREATE INDEX IF NOT EXISTS idx_arena_status     ON arena_duels(status);

-- 2) RLS: öğrenciler kendi düellolarını okuyabilir
ALTER TABLE arena_duels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Arena duels select" ON arena_duels
  FOR SELECT USING (true);

CREATE POLICY "Arena duels insert" ON arena_duels
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Arena duels update" ON arena_duels
  FOR UPDATE USING (true);

-- 3) Düello tamamlanmayı engelleyen trigger (çift sonuçlandırma koruması)
CREATE OR REPLACE FUNCTION check_duel_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Bu düello zaten sonuçlandırıldı.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_double_complete
  BEFORE UPDATE ON arena_duels
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION check_duel_completion();

-- 4) Sonuç kontrolü
SELECT COUNT(*) AS arena_duels_created FROM arena_duels;
