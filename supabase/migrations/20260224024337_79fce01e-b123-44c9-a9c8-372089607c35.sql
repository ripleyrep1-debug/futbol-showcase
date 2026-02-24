
-- Payment requests table (deposit/withdrawal with manual IBAN)
CREATE TABLE public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  iban TEXT,
  account_holder TEXT,
  admin_note TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own payment requests" ON public.payment_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read all payment requests" ON public.payment_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update payment requests" ON public.payment_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert payment requests" ON public.payment_requests FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Odds overrides table
CREATE TABLE public.odds_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id INTEGER NOT NULL,
  league_name TEXT,
  home_team TEXT,
  away_team TEXT,
  bet_type TEXT NOT NULL,
  bet_value TEXT,
  custom_odd NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.odds_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active odds overrides" ON public.odds_overrides FOR SELECT USING (true);
CREATE POLICY "Admins manage odds overrides" ON public.odds_overrides FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add insert default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('min_stake', '1'),
  ('max_stake', '10000'),
  ('max_payout', '100000'),
  ('commission_rate', '5'),
  ('maintenance_mode', 'false'),
  ('announcement', ''),
  ('min_odds', '1.10'),
  ('max_accumulator', '20')
ON CONFLICT (key) DO NOTHING;

-- Allow admins to delete odds overrides
CREATE POLICY "Admins delete odds overrides" ON public.odds_overrides FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
