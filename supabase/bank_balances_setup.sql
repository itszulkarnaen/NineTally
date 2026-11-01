-- ==============================================================================
-- NINETALLY: BANK ACCOUNTS & HISTORICAL MONTHLY BANK BALANCES
-- ==============================================================================

-- 1. Table: bank_accounts (Master Data Rekening Bank)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id TEXT PRIMARY KEY,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT,
  color TEXT DEFAULT '#2196F3',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Table: monthly_bank_balances (Historical Saldo Bulanan per Rekening)
CREATE TABLE IF NOT EXISTS public.monthly_bank_balances (
  id TEXT PRIMARY KEY,
  period_month TEXT NOT NULL, -- Format 'YYYY-MM'
  bank_account_id TEXT REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  balance NUMERIC(15,2) DEFAULT 0 NOT NULL,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT unique_period_bank UNIQUE(period_month, bank_account_id)
);

-- 3. Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_bank_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read bank_accounts" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public write bank_accounts" ON public.bank_accounts FOR ALL USING (true);

CREATE POLICY "Allow public read monthly_bank_balances" ON public.monthly_bank_balances FOR SELECT USING (true);
CREATE POLICY "Allow public write monthly_bank_balances" ON public.monthly_bank_balances FOR ALL USING (true);

-- 4. Enable Realtime Replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monthly_bank_balances;

-- 5. Seed Initial Bank Accounts (Clean master data, initial balance = 0)
INSERT INTO public.bank_accounts (id, bank_name, account_name, account_number, color, is_active, sort_order) VALUES
('bank-bca', 'BCA', 'BCA Utama Operasional', '1234567890', '#2196F3', TRUE, 1),
('bank-jago', 'Bank Jago', 'Jago Pocket Pengeluaran', '9876543210', '#90CAF9', TRUE, 2)
ON CONFLICT (id) DO NOTHING;
