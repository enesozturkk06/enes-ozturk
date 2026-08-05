-- ── Kedi AI Ultra — kalıcı sohbet hafızası + derin hafıza (uzun vadeli gerçekler) ──

CREATE TABLE IF NOT EXISTS kedi_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL CHECK (actor_type IN ('student','admin')),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  mood text,
  created_at timestamptz DEFAULT now()
);

-- Uzun vadeli, kalıcı "öğrenilmiş gerçekler" — ham sohbet geçmişinden ayrı.
-- Her satır tek bir kısa gerçek (hedef, sağlık durumu, tercih, verilmiş tavsiye vb.)
CREATE TABLE IF NOT EXISTS kedi_ai_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type text NOT NULL CHECK (actor_type IN ('student','admin')),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  fact text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kedi_ai_messages_student ON kedi_ai_messages(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_kedi_ai_messages_admin ON kedi_ai_messages(actor_type, created_at);
CREATE INDEX IF NOT EXISTS idx_kedi_ai_memories_student ON kedi_ai_memories(student_id, created_at);
CREATE INDEX IF NOT EXISTS idx_kedi_ai_memories_admin ON kedi_ai_memories(actor_type, created_at);

-- RLS
ALTER TABLE kedi_ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kedi_ai_memories ENABLE ROW LEVEL SECURITY;

-- Tam erişim politikaları (bu dosya tekrar çalıştırılırsa hata vermesin diye önce düşürülür)
DROP POLICY IF EXISTS "open_all" ON kedi_ai_messages;
CREATE POLICY "open_all" ON kedi_ai_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "open_all" ON kedi_ai_memories;
CREATE POLICY "open_all" ON kedi_ai_memories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Kontrol
SELECT 'kedi_ai_messages' as tablo, count(*) FROM kedi_ai_messages
UNION ALL SELECT 'kedi_ai_memories', count(*) FROM kedi_ai_memories;
