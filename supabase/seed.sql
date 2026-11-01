-- ==============================================================================
-- SELF CASH FLOW & NET WORTH TRACKER - SEED DATA (FROM USER'S GOOGLE SHEET)
-- ==============================================================================

-- Catatan: Ganti '00000000-0000-0000-0000-000000000000' dengan auth.uid() pengguna Anda di Supabase
DO $$
DECLARE
    v_user_id UUID := '00000000-0000-0000-0000-000000000000'; -- Placeholder user id
    v_period_id UUID;
    v_asset_obligasi UUID;
    v_asset_reksa UUID;
    v_asset_emas UUID;
    v_asset_bpjs_sdi UUID;
    v_asset_bpjs_dna UUID;
    
    -- Cashflow units
    v_cf_yappika UUID;
    v_cf_zakat UUID;
    v_cf_mamah UUID;
    v_cf_belanja_barang UUID;
    v_cf_angsuran_rumah UUID;
    v_cf_jajan_sebulan UUID;
    v_cf_icloud UUID;
    v_cf_ganti_oli UUID;
    v_cf_kopi UUID;
    v_cf_yutube UUID;
    v_cf_air_listrik UUID;
    v_cf_belanja_pokok UUID;
    v_cf_pulsa UUID;
    v_cf_cukuran UUID;
    v_cf_bensin UUID;
    v_cf_akomodasi UUID;
BEGIN
    -- Pastikan user terdaftar di profiles jika belum ada
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (v_user_id, 'user@example.com', 'Chief Planner')
    ON CONFLICT (id) DO NOTHING;

    -- 1. SEED ASSETS (Net Worth Tab)
    INSERT INTO public.assets (user_id, name, liquidity_tier, main_value, generating_rate, start_date, income_generated, goal_bucket, is_external)
    VALUES (v_user_id, 'OBLIGASI', 'SEMI_LIQUID', 10000000, 0.90, '2024-01-10', 90000, 'Marid', FALSE)
    RETURNING id INTO v_asset_obligasi;

    INSERT INTO public.assets (user_id, name, liquidity_tier, main_value, generating_rate, start_date, income_generated, goal_bucket, is_external)
    VALUES (v_user_id, 'Reksa Dana', 'SEMI_LIQUID', 28178999, 11.35, '2023-03-05', 3198316, 'Marid', FALSE)
    RETURNING id INTO v_asset_reksa;

    INSERT INTO public.assets (user_id, name, liquidity_tier, main_value, generating_rate, start_date, income_generated, goal_bucket, is_external)
    VALUES (v_user_id, 'Mas ga JAW', 'LIQUID', 7574499, 4.95, NULL, 374938, 'Saving Cok', FALSE)
    RETURNING id INTO v_asset_emas;

    INSERT INTO public.assets (user_id, name, liquidity_tier, main_value, generating_rate, start_date, income_generated, goal_bucket, is_external)
    VALUES (v_user_id, 'BPJS SDI', 'ILLIQUID', 17604680, 0.00, NULL, 0, 'Saving Cok', TRUE)
    RETURNING id INTO v_asset_bpjs_sdi;

    INSERT INTO public.assets (user_id, name, liquidity_tier, main_value, generating_rate, start_date, income_generated, goal_bucket, is_external)
    VALUES (v_user_id, 'BPJS DNA', 'ILLIQUID', 14738056, 0.00, NULL, 0, 'Saving Cok', TRUE)
    RETURNING id INTO v_asset_bpjs_dna;

    -- 2. SEED MASTER CASHFLOW UNITS
    -- Holy Thing
    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-H01', 'Yappika', 'EXPENSE', 'HOLY_THING', 'HIGHEST') RETURNING id INTO v_cf_yappika;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-H02', 'Zakat', 'EXPENSE', 'HOLY_THING', 'HIGHEST') RETURNING id INTO v_cf_zakat;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-H03', 'Mamah', 'EXPENSE', 'HOLY_THING', 'HIGH') RETURNING id INTO v_cf_mamah;

    -- Liability
    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-L01', 'Belanja Barang', 'EXPENSE', 'LIABILITY', 'HIGH') RETURNING id INTO v_cf_belanja_barang;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-L02', 'Angsuran Rumah', 'EXPENSE', 'LIABILITY', 'HIGH') RETURNING id INTO v_cf_angsuran_rumah;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-L03', 'Jatah Jajan Sebulan', 'EXPENSE', 'LIABILITY', 'NORMAL') RETURNING id INTO v_cf_jajan_sebulan;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-L04', 'iCloud', 'EXPENSE', 'LIABILITY', 'NORMAL') RETURNING id INTO v_cf_icloud;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-L05', 'Ganti Oli', 'EXPENSE', 'LIABILITY', 'HIGH') RETURNING id INTO v_cf_ganti_oli;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-L06', 'Kopi Bro', 'EXPENSE', 'LIABILITY', 'HIGH') RETURNING id INTO v_cf_kopi;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-L07', 'Yutube', 'EXPENSE', 'LIABILITY', 'HIGH') RETURNING id INTO v_cf_yutube;

    -- Monthly Needs
    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-M01', 'Iuran Air + Listrik Perumahan', 'EXPENSE', 'MONTHLY_NEEDS', 'HIGH') RETURNING id INTO v_cf_air_listrik;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-M02', 'Belanja', 'EXPENSE', 'MONTHLY_NEEDS', 'HIGH') RETURNING id INTO v_cf_belanja_pokok;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-M03', 'Pulsa & Internet', 'EXPENSE', 'MONTHLY_NEEDS', 'HIGH') RETURNING id INTO v_cf_pulsa;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-M04', 'Cukuran', 'EXPENSE', 'MONTHLY_NEEDS', 'HIGH') RETURNING id INTO v_cf_cukuran;

    -- Akomodasi
    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-A01', 'Bensin', 'EXPENSE', 'AKOMODASI', 'HIGH') RETURNING id INTO v_cf_bensin;

    INSERT INTO public.cashflow_units (user_id, code, name, unit_type, category, default_urgency)
    VALUES (v_user_id, 'CF-A02', 'Akomodasi', 'EXPENSE', 'AKOMODASI', 'HIGH') RETURNING id INTO v_cf_akomodasi;

    -- 3. SEED BUDGET PERIOD BULAN BERJALAN
    INSERT INTO public.budget_periods (user_id, period_month, status, salary_budget, additional_budget, real_bca_balance, real_jago_balance)
    VALUES (v_user_id, '2026-11-01', 'ACTIVE', 10000000, 0, 3976000, 500000)
    RETURNING id INTO v_period_id;

    -- 4. SEED BUDGET PERIOD ITEMS
    -- Holy Thing
    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_yappika, v_user_id, 180000, 180000, 'HIGHEST', FALSE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_zakat, v_user_id, 200000, 200000, 'HIGHEST', FALSE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_mamah, v_user_id, 200000, 200000, 'HIGH', FALSE);

    -- Liability
    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_belanja_barang, v_user_id, 3000000, 3000000, 'HIGH', TRUE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_angsuran_rumah, v_user_id, 1770000, 1770000, 'HIGH', TRUE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_jajan_sebulan, v_user_id, 500000, 500000, 'NORMAL', TRUE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_icloud, v_user_id, 50000, 50000, 'NORMAL', TRUE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_ganti_oli, v_user_id, 100000, 100000, 'HIGH', FALSE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_kopi, v_user_id, 100000, 100000, 'HIGH', FALSE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_yutube, v_user_id, 79000, 79000, 'HIGH', TRUE);

    -- Monthly Needs
    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_air_listrik, v_user_id, 175000, 175000, 'HIGH', TRUE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_belanja_pokok, v_user_id, 2000000, 2000000, 'HIGH', FALSE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_pulsa, v_user_id, 450000, 450000, 'HIGH', TRUE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_cukuran, v_user_id, 30000, 30000, 'HIGH', FALSE);

    -- Akomodasi
    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_bensin, v_user_id, 260000, 260000, 'HIGH', FALSE);

    INSERT INTO public.budget_period_items (period_id, cashflow_unit_id, user_id, budget_amount, projection_amount, urgency, is_realized)
    VALUES (v_period_id, v_cf_akomodasi, v_user_id, 885000, 885000, 'HIGH', FALSE);

    -- 5. SEED WISHLISTS
    INSERT INTO public.wishlists (user_id, item_name, target_amount, priority, is_bought)
    VALUES 
        (v_user_id, 'Rice Cooker', 1000000, 1, FALSE),
        (v_user_id, 'Kulkas', 3000000, 2, FALSE),
        (v_user_id, 'Mesin Cuci', 3000000, 3, FALSE),
        (v_user_id, 'Dispenser', 2500000, 4, FALSE),
        (v_user_id, 'Kompor', 2000000, 5, FALSE);

END $$;

