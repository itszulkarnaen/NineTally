-- DDL Migration for Payroll Settings (NineTally Payday Engine)
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  monthly_salary NUMERIC NOT NULL DEFAULT 10000000,
  payday_day INTEGER NOT NULL DEFAULT 25,
  is_last_day BOOLEAN NOT NULL DEFAULT true,
  target_bank TEXT NOT NULL DEFAULT 'BCA',
  target_unit_id TEXT REFERENCES public.cashflow_units(id) ON DELETE SET NULL,
  auto_post_transaction BOOLEAN NOT NULL DEFAULT true,
  next_month_allocation BOOLEAN NOT NULL DEFAULT true,
  last_posted_period TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS & open policies for public/anon access
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public full access to payroll_settings" ON public.payroll_settings;
CREATE POLICY "Allow public full access to payroll_settings" 
ON public.payroll_settings FOR ALL TO public USING (true) WITH CHECK (true);

-- Insert default record
INSERT INTO public.payroll_settings (id, monthly_salary, payday_day, is_last_day, target_bank, auto_post_transaction, next_month_allocation)
VALUES ('default', 10000000, 25, true, 'BCA', true, true)
ON CONFLICT (id) DO NOTHING;

