-- ==============================================================================
-- SELF CASH FLOW & NET WORTH TRACKER - COMPLETE SUPABASE FULL SETUP SCRIPT
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> Run!
-- ==============================================================================

-- 1. DROP EXISTING TABLES (JIKA ADA) AGAR FRESH & CLEAN
DROP TABLE IF EXISTS public.cashflow_transactions CASCADE;
DROP TABLE IF EXISTS public.budget_period_items CASCADE;
DROP TABLE IF EXISTS public.budget_periods CASCADE;
DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.cashflow_units CASCADE;
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.cashflow_categories CASCADE;

-- 2. CREATE TABLES DEFINITION

-- 2.1 Master Categories
CREATE TABLE public.cashflow_categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0
);

-- 2.2 Assets (Portofolio & Net Worth)
CREATE TABLE public.assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    liquidity_tier TEXT NOT NULL DEFAULT 'LIQUID', -- 'LIQUID', 'SEMI_LIQUID', 'ILLIQUID'
    main_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    generating_rate NUMERIC(5, 2) DEFAULT 0.00,
    start_date DATE,
    income_generated NUMERIC(15, 2) DEFAULT 0,
    total_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    goal_bucket TEXT,
    is_external BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Master Cashflow Units
CREATE TABLE public.cashflow_units (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    unit_type TEXT NOT NULL DEFAULT 'EXPENSE', -- 'EXPENSE', 'INCOME', 'ASSET'
    category TEXT REFERENCES public.cashflow_categories(code) ON DELETE SET NULL,
    default_urgency TEXT DEFAULT 'NORMAL',     -- 'HIGHEST', 'HIGH', 'NORMAL'
    linked_asset_id TEXT REFERENCES public.assets(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Budget Periods (Per Bulan, e.g. '2026-11')
CREATE TABLE public.budget_periods (
    period_month TEXT PRIMARY KEY, -- 'YYYY-MM'
    status TEXT NOT NULL DEFAULT 'PLANNING', -- 'PLANNING', 'ACTIVE', 'LOCKED'
    salary_budget NUMERIC(15, 2) DEFAULT 0,
    additional_budget NUMERIC(15, 2) DEFAULT 0,
    real_bca_balance NUMERIC(15, 2) DEFAULT 0,
    real_jago_balance NUMERIC(15, 2) DEFAULT 0,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Budget Period Items (Item Anggaran per Bulan)
CREATE TABLE public.budget_period_items (
    id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL REFERENCES public.budget_periods(period_month) ON DELETE CASCADE,
    cashflow_unit_id TEXT NOT NULL REFERENCES public.cashflow_units(id) ON DELETE RESTRICT,
    budget_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    realization_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    projection_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    actual_amount NUMERIC(15, 2) DEFAULT 0,
    urgency TEXT NOT NULL DEFAULT 'NORMAL',
    is_realized BOOLEAN DEFAULT FALSE,
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Daily Realization Transactions (Multi-Input per Cashflow Item)
CREATE TABLE public.cashflow_transactions (
    id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL REFERENCES public.budget_periods(period_month) ON DELETE CASCADE,
    cashflow_unit_id TEXT NOT NULL REFERENCES public.cashflow_units(id) ON DELETE RESTRICT,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Wishlists
CREATE TABLE public.wishlists (
    id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    priority INT DEFAULT 1,
    is_bought BOOLEAN DEFAULT FALSE,
    bought_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GRANT PERMISSIONS & ROW LEVEL SECURITY (RLS) POLICIES
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Enable RLS with permissive policies for anon & authenticated
ALTER TABLE public.cashflow_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_categories" ON public.cashflow_categories;
CREATE POLICY "allow_all_categories" ON public.cashflow_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_assets" ON public.assets;
CREATE POLICY "allow_all_assets" ON public.assets FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.cashflow_units ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_units" ON public.cashflow_units;
CREATE POLICY "allow_all_units" ON public.cashflow_units FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.budget_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_periods" ON public.budget_periods;
CREATE POLICY "allow_all_periods" ON public.budget_periods FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.budget_period_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_items" ON public.budget_period_items;
CREATE POLICY "allow_all_items" ON public.budget_period_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.cashflow_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_transactions" ON public.cashflow_transactions;
CREATE POLICY "allow_all_transactions" ON public.cashflow_transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_wishlists" ON public.wishlists;
CREATE POLICY "allow_all_wishlists" ON public.wishlists FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. SEED INITIAL DATA

-- 4.1 Categories
INSERT INTO public.cashflow_categories (id, code, name, color, description, sort_order) VALUES
('cat-1', 'HOLY_THING', 'Holy Thing', '#8B9A6E', 'Sedekah, Zakat, Ortu, dan alokasi kebaikan', 1),
('cat-2', 'LIABILITY', 'Liability', '#C2A382', 'Kosan, WiFi, Listrik, Tagihan, dan kewajiban', 2),
('cat-3', 'MONTHLY_NEEDS', 'Monthly Needs', '#D8A47F', 'Makan siang harian, laundry, belanja kebutuhan rutin', 3),
('cat-4', 'AKOMODASI', 'Akomodasi', '#7E8D85', 'Bensin motor/mobil, tol, parkir, dan mobilitas', 4),
('cat-5', 'UNPREDICT', 'Unpredict', '#B3A394', 'Biaya tak terduga, perbaikan darurat, dan cadangan', 5),
('cat-6', 'SELF_REWARD', 'Self Reward', '#A4B494', 'Jajan santai, ngopi sore, liburan, dan self reward', 6)
ON CONFLICT (id) DO NOTHING;

-- 4.2 Assets
INSERT INTO public.assets (id, name, liquidity_tier, main_value, generating_rate, start_date, income_generated, total_value, goal_bucket, is_external) VALUES
('ast-1', 'Mas ga JAW', 'LIQUID', 7574499, 4.95, NULL, 374938, 7949437, 'Saving Cok', FALSE),
('ast-2', 'OBLIGASI', 'SEMI_LIQUID', 10000000, 0.90, '2024-01-10', 90000, 10090000, 'Marid', FALSE),
('ast-3', 'Reksa Dana', 'SEMI_LIQUID', 28178999, 11.35, '2023-03-05', 3198316, 31377315, 'Marid', FALSE),
('ast-4', 'BPJS SDI', 'ILLIQUID', 17604680, 0.00, NULL, 0, 17604680, 'Saving Cok', TRUE),
('ast-5', 'BPJS DNA', 'ILLIQUID', 14738056, 0.00, NULL, 0, 14738056, 'Saving Cok', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4.3 Cashflow Units
INSERT INTO public.cashflow_units (id, code, name, unit_type, category, default_urgency, linked_asset_id, is_active) VALUES
('cf-1', 'CF-H01', 'Yappika', 'EXPENSE', 'HOLY_THING', 'HIGHEST', NULL, TRUE),
('cf-2', 'CF-H02', 'Zakat', 'EXPENSE', 'HOLY_THING', 'HIGHEST', NULL, TRUE),
('cf-3', 'CF-H03', 'Mamah', 'EXPENSE', 'HOLY_THING', 'HIGH', NULL, TRUE),
('cf-4', 'CF-L01', 'Belanja Barang', 'EXPENSE', 'LIABILITY', 'HIGH', NULL, TRUE),
('cf-5', 'CF-L02', 'Angsuran Rumah', 'EXPENSE', 'LIABILITY', 'HIGH', NULL, TRUE),
('cf-6', 'CF-L03', 'Jatah Jajan Sebulan', 'EXPENSE', 'LIABILITY', 'NORMAL', NULL, TRUE),
('cf-7', 'CF-L04', 'iCloud', 'EXPENSE', 'LIABILITY', 'NORMAL', NULL, TRUE),
('cf-8', 'CF-L05', 'Ganti Oli', 'EXPENSE', 'LIABILITY', 'HIGH', NULL, TRUE),
('cf-9', 'CF-L06', 'Kopi Bro', 'EXPENSE', 'LIABILITY', 'HIGH', NULL, TRUE),
('cf-10', 'CF-L07', 'Yutube', 'EXPENSE', 'LIABILITY', 'HIGH', NULL, TRUE),
('cf-11', 'CF-M01', 'Iuran Air + Listrik Perumahan', 'EXPENSE', 'MONTHLY_NEEDS', 'HIGH', NULL, TRUE),
('cf-12', 'CF-M02', 'Belanja', 'EXPENSE', 'MONTHLY_NEEDS', 'HIGH', NULL, TRUE),
('cf-13', 'CF-M03', 'Pulsa & Internet', 'EXPENSE', 'MONTHLY_NEEDS', 'HIGH', NULL, TRUE),
('cf-14', 'CF-M04', 'Cukuran', 'EXPENSE', 'MONTHLY_NEEDS', 'HIGH', NULL, TRUE),
('cf-15', 'CF-A01', 'Bensin', 'EXPENSE', 'AKOMODASI', 'HIGH', NULL, TRUE),
('cf-16', 'CF-A02', 'Akomodasi', 'EXPENSE', 'AKOMODASI', 'HIGH', NULL, TRUE),
('cf-17', 'CF-AST01', 'Topup Reksa Dana', 'ASSET', NULL, 'NORMAL', 'ast-3', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4.4 Budget Periods
INSERT INTO public.budget_periods (period_month, status, salary_budget, additional_budget, real_bca_balance, real_jago_balance) VALUES
('2026-10', 'LOCKED', 10000000, 0, 3800000, 500000),
('2026-11', 'ACTIVE', 10000000, 0, 3976000, 500000),
('2026-12', 'PLANNING', 10000000, 21000, 0, 0),
('2027-01', 'PLANNING', 10000000, 0, 0, 0)
ON CONFLICT (period_month) DO NOTHING;

-- 4.5 Budget Period Items (November 2026) - Starts with 0 realization
INSERT INTO public.budget_period_items (id, period_id, cashflow_unit_id, budget_amount, realization_amount, projection_amount, actual_amount, urgency, is_realized, sort_order) VALUES
('bi-1', '2026-11', 'cf-1', 180000, 0, 0, 0, 'HIGHEST', FALSE, 1),
('bi-2', '2026-11', 'cf-2', 200000, 0, 0, 0, 'HIGHEST', FALSE, 2),
('bi-3', '2026-11', 'cf-3', 200000, 0, 0, 0, 'HIGH', FALSE, 3),
('bi-4', '2026-11', 'cf-4', 3000000, 0, 0, 0, 'HIGH', FALSE, 4),
('bi-5', '2026-11', 'cf-5', 1770000, 0, 0, 0, 'HIGH', FALSE, 5),
('bi-6', '2026-11', 'cf-6', 500000, 0, 0, 0, 'NORMAL', FALSE, 6),
('bi-7', '2026-11', 'cf-7', 50000, 0, 0, 0, 'NORMAL', FALSE, 7),
('bi-8', '2026-11', 'cf-8', 100000, 0, 0, 0, 'HIGH', FALSE, 8),
('bi-9', '2026-11', 'cf-9', 100000, 0, 0, 0, 'HIGH', FALSE, 9),
('bi-10', '2026-11', 'cf-10', 79000, 0, 0, 0, 'HIGH', FALSE, 10),
('bi-11', '2026-11', 'cf-11', 175000, 0, 0, 0, 'HIGH', FALSE, 11),
('bi-12', '2026-11', 'cf-12', 2000000, 0, 0, 0, 'HIGH', FALSE, 12),
('bi-13', '2026-11', 'cf-13', 450000, 0, 0, 0, 'HIGH', FALSE, 13),
('bi-14', '2026-11', 'cf-14', 30000, 0, 0, 0, 'HIGH', FALSE, 14),
('bi-15', '2026-11', 'cf-15', 260000, 0, 0, 0, 'HIGH', FALSE, 15),
('bi-16', '2026-11', 'cf-16', 885000, 0, 0, 0, 'HIGH', FALSE, 16)
ON CONFLICT (id) DO NOTHING;

-- 4.6 Transactions
INSERT INTO public.cashflow_transactions (id, period_id, cashflow_unit_id, amount, date, notes) VALUES
('tx-1', '2026-11', 'cf-4', 3000000, '2026-11-01', 'Transfer bulanan Mandiri'),
('tx-2', '2026-11', 'cf-5', 1770000, '2026-11-01', 'KPR Rumah Cicilan #42'),
('tx-3', '2026-11', 'cf-7', 50000, '2026-11-01', 'Langganan iCloud 200GB'),
('tx-4', '2026-11', 'cf-10', 79000, '2026-11-02', 'Netflix Subscription'),
('tx-5', '2026-11', 'cf-12', 85000, '2026-11-01', 'Makan Siang Resto'),
('tx-6', '2026-11', 'cf-12', 65000, '2026-11-02', 'Kopi & snack sore'),
('tx-7', '2026-11', 'cf-15', 50000, '2026-11-01', 'Bensin motor Shell')
ON CONFLICT (id) DO NOTHING;

-- 4.7 Wishlists
INSERT INTO public.wishlists (id, item_name, target_amount, priority, is_bought) VALUES
('wl-1', 'Rice Cooker', 1000000, 1, FALSE),
('wl-2', 'Kulkas', 3000000, 2, FALSE),
('wl-3', 'Mesin Cuci', 3000000, 3, FALSE),
('wl-4', 'Dispenser', 2500000, 4, FALSE),
('wl-5', 'Kompor', 2000000, 5, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 5. ENABLE SUPABASE REALTIME REPLICATION (CHANGE DATA CAPTURE / WEBSOCKETS)
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cashflow_transactions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_period_items;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_periods;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cashflow_units;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cashflow_categories;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
END $$;

ALTER TABLE public.cashflow_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.budget_period_items REPLICA IDENTITY FULL;
ALTER TABLE public.budget_periods REPLICA IDENTITY FULL;

