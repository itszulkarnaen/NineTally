-- ==============================================================================
-- SELF-LOAN FEATURE UPGRADE FOR SUPABASE
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> Run!
-- Aman dijalankan ulang (idempotent).
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.self_loans (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES public.assets(id) ON DELETE SET NULL,
    asset_name TEXT NOT NULL,
    title TEXT NOT NULL,
    principal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    disbursed_units NUMERIC(15, 4),
    returned_units NUMERIC(15, 4),
    target_bank TEXT NOT NULL DEFAULT 'BCA',
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    loan_date DATE NOT NULL,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.self_loan_payments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL REFERENCES public.self_loans(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    units_restored NUMERIC(15, 4),
    source_bank TEXT NOT NULL DEFAULT 'BCA',
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.self_loans TO anon, authenticated;
GRANT ALL ON TABLE public.self_loan_payments TO anon, authenticated;

ALTER TABLE public.self_loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_self_loans" ON public.self_loans;
CREATE POLICY "allow_all_self_loans" ON public.self_loans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.self_loan_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_self_loan_payments" ON public.self_loan_payments;
CREATE POLICY "allow_all_self_loan_payments" ON public.self_loan_payments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.self_loans;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.self_loan_payments;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
END $$;
