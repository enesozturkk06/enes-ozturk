-- ══════════════════════════════════════════════════════════════
-- ONLINE MAĞAZA — Ürünler Tablosu
-- Supabase SQL Editor'de çalıştırın
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  category    text    NOT NULL,           -- eldiven | bandaj | dislik | ...
  description text,
  price       numeric(10,2),              -- NULL = "Fiyat için iletişime geçiniz"
  image_url   text,                       -- NULL = kategori ikonu
  status      text    NOT NULL DEFAULT 'active',  -- active | coming_soon
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int              DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_all" ON products;
CREATE POLICY "open_all" ON products
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_products_category
  ON products(category, sort_order, created_at DESC);

NOTIFY pgrst, 'reload schema';

SELECT 'products tablosu hazır' AS durum;
