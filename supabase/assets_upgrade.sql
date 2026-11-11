-- ==============================================================================
-- ASSETS PORTFOLIO UPGRADE: Platform & Unit/Gramasi Support (Emas Digital Pluang, dll)
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor jika tabel assets sudah ada
-- ==============================================================================

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS unit_name TEXT,
  ADD COLUMN IF NOT EXISTS unit_quantity NUMERIC(15, 4),
  ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC(15, 2);

