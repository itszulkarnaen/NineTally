-- ==============================================================================
-- SELF CASH FLOW & NET WORTH TRACKER - COMPLETE POSTGRESQL SCHEMA (SUPABASE)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE unit_type_enum AS ENUM ('EXPENSE', 'INCOME', 'ASSET');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE expense_category_enum AS ENUM (
        'HOLY_THING',
        'LIABILITY',
        'MONTHLY_NEEDS',
        'AKOMODASI',
        'UNPREDICT',
        'SELF_REWARD'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE urgency_level_enum AS ENUM ('HIGHEST', 'HIGH', 'NORMAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE liquidity_tier_enum AS ENUM ('LIQUID', 'SEMI_LIQUID', 'ILLIQUID');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE period_status_enum AS ENUM ('PLANNING', 'ACTIVE', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. TABLES DEFINITION

-- 3.1 Profiles Table (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.2 Assets Table (Portfolio & Net Worth Tracking)
CREATE TABLE IF NOT EXISTS public.assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    liquidity_tier liquidity_tier_enum NOT NULL DEFAULT 'LIQUID',
    main_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
    generating_rate NUMERIC(5, 2) DEFAULT 0.00, -- Persentase return/yield (misal 11.35%)
    start_date DATE,
    income_generated NUMERIC(15, 2) DEFAULT 0,  -- Realisasi imbal hasil / bunga
    total_value NUMERIC(15, 2) GENERATED ALWAYS AS (main_value + income_generated) STORED,
    goal_bucket TEXT, -- e.g. 'Renovasi Rumah', 'Marid', 'Saving Cok'
    is_external BOOLEAN DEFAULT FALSE, -- True jika aset di luar cashflow bulanan (misal BPJS JHT/JP)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 Cashflow Units (Master Data)
CREATE TABLE IF NOT EXISTS public.cashflow_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    unit_type unit_type_enum NOT NULL DEFAULT 'EXPENSE',
    category expense_category_enum, -- Null jika unit_type == 'INCOME'
    default_urgency urgency_level_enum DEFAULT 'NORMAL',
    linked_asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL, -- Diisi jika unit_type == 'ASSET'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.4 Budget Periods Table (Bulanan)
CREATE TABLE IF NOT EXISTS public.budget_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    period_month DATE NOT NULL, -- e.g. '2026-11-01'
    status period_status_enum NOT NULL DEFAULT 'PLANNING',
    salary_budget NUMERIC(15, 2) DEFAULT 0,
    additional_budget NUMERIC(15, 2) DEFAULT 0,
    real_bca_balance NUMERIC(15, 2) DEFAULT 0,
    real_jago_balance NUMERIC(15, 2) DEFAULT 0,
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_period UNIQUE(user_id, period_month)
);

-- 3.5 Budget Period Items (Instansiasi Cashflow Unit di Periode)
CREATE TABLE IF NOT EXISTS public.budget_period_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES public.budget_periods(id) ON DELETE CASCADE,
    cashflow_unit_id UUID NOT NULL REFERENCES public.cashflow_units(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    budget_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Set di Web saat PLANNING
    projection_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Update di Mobile saat ACTIVE
    actual_amount NUMERIC(15, 2) DEFAULT 0, -- Final nominal saat LOCKED
    urgency urgency_level_enum NOT NULL DEFAULT 'NORMAL',
    is_realized BOOLEAN DEFAULT FALSE, -- Toggle status checklist 'V'
    notes TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.6 Wishlists Table
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    target_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    priority INT DEFAULT 1,
    is_bought BOOLEAN DEFAULT FALSE,
    bought_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_period_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own assets"
    ON public.assets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own cashflow units"
    ON public.cashflow_units FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own budget periods"
    ON public.budget_periods FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own budget items"
    ON public.budget_period_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlists"
    ON public.wishlists FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 5. TRIGGERS & BUSINESS LOGIC ENFORCEMENT
-- ==============================================================================

-- 5.1 Enforce Period Lock Immutability
-- Jika status LOCKED, tolak mutasi kecuali ada parameter admin override
CREATE OR REPLACE FUNCTION public.enforce_period_lock_guard()
RETURNS TRIGGER AS $$
DECLARE
    p_status period_status_enum;
BEGIN
    SELECT status INTO p_status FROM public.budget_periods WHERE id = OLD.period_id;
    IF p_status = 'LOCKED' AND current_setting('app.admin_override', true) IS NULL THEN
        RAISE EXCEPTION 'Database Guard: Periode ini sudah LOCKED. Gunakan tombol Unlock di Web Console untuk revisi.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_budget_items_lock ON public.budget_period_items;
CREATE TRIGGER trg_guard_budget_items_lock
    BEFORE UPDATE OR DELETE ON public.budget_period_items
    FOR EACH ROW EXECUTE FUNCTION public.enforce_period_lock_guard();

-- 5.2 Auto-Sync Cashflow Unit (Type: ASSET) to Assets Table
-- Ketika budget_period_items yang terhubung ke linked_asset_id diubah nilainya
CREATE OR REPLACE FUNCTION public.sync_asset_from_cashflow()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_type unit_type_enum;
    v_linked_asset_id UUID;
BEGIN
    SELECT unit_type, linked_asset_id 
    INTO v_unit_type, v_linked_asset_id
    FROM public.cashflow_units 
    WHERE id = NEW.cashflow_unit_id;

    IF v_unit_type = 'ASSET' AND v_linked_asset_id IS NOT NULL THEN
        -- Update nilai aset secara proporsional sesuai projection/realized
        UPDATE public.assets
        SET main_value = main_value + (NEW.projection_amount - OLD.projection_amount),
            updated_at = NOW()
        WHERE id = v_linked_asset_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_asset_cashflow ON public.budget_period_items;
CREATE TRIGGER trg_sync_asset_cashflow
    AFTER UPDATE OF projection_amount ON public.budget_period_items
    FOR EACH ROW EXECUTE FUNCTION public.sync_asset_from_cashflow();

-- ==============================================================================
-- 6. SAMPLE SEED DATA (Based on User's Google Sheet)
-- ==============================================================================
-- Dijalankan secara otomatis jika user_id telah terautentikasi
-- ==============================================================================

