
-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL, -- NULL = broadcast
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  link TEXT NULL,
  force_popup BOOLEAN NOT NULL DEFAULT false,
  read BOOLEAN NOT NULL DEFAULT false,
  related_request_id UUID NULL,
  expires_at TIMESTAMPTZ NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_broadcast ON public.notifications(created_at DESC) WHERE user_id IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own and broadcast notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Track per-user read state for broadcast notifications
CREATE TABLE public.notification_reads (
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dismissed BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (notification_id, user_id)
);
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads" ON public.notification_reads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all reads" ON public.notification_reads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- PAYMENT METHODS (admin-managed fee table, region-aware)
-- ============================================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g. 'sepa','ach','wire_us','fps_uk','usdt_trc20'
  display_name TEXT NOT NULL,
  region TEXT NOT NULL, -- 'EU','US','UK','GLOBAL'
  currency TEXT NOT NULL, -- 'EUR','USD','GBP','USDT', etc.
  direction TEXT NOT NULL DEFAULT 'both' CHECK (direction IN ('deposit','withdrawal','both')),
  fee_percent NUMERIC NOT NULL DEFAULT 0,
  fee_flat NUMERIC NOT NULL DEFAULT 0,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  max_amount NUMERIC NULL,
  processing_time TEXT NULL, -- e.g. '1-3 business days'
  instructions TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated views active methods" ON public.payment_methods
  FOR SELECT TO authenticated
  USING (active = true);

CREATE POLICY "Admins manage payment methods" ON public.payment_methods
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- EXTEND deposit_requests & withdrawal_requests
-- ============================================================
ALTER TABLE public.deposit_requests
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN payment_method_id UUID NULL REFERENCES public.payment_methods(id),
  ADD COLUMN region TEXT NULL,
  ADD COLUMN fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN net_amount NUMERIC NULL;

ALTER TABLE public.withdrawal_requests
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN payment_method_id UUID NULL REFERENCES public.payment_methods(id),
  ADD COLUMN region TEXT NULL;

-- ============================================================
-- WITHDRAWAL POPUPS (admin-composed, per-withdrawal)
-- ============================================================
CREATE TABLE public.withdrawal_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_request_id UUID NOT NULL REFERENCES public.withdrawal_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  required_fee NUMERIC NULL,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMPTZ NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_withdrawal_popups_user ON public.withdrawal_popups(user_id, acknowledged);

ALTER TABLE public.withdrawal_popups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawal popups" ON public.withdrawal_popups
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users acknowledge own popups" ON public.withdrawal_popups
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage withdrawal popups" ON public.withdrawal_popups
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_popups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawal_popups REPLICA IDENTITY FULL;

-- ============================================================
-- SEED PAYMENT METHODS
-- ============================================================
INSERT INTO public.payment_methods (code, display_name, region, currency, direction, fee_percent, fee_flat, min_amount, max_amount, processing_time, instructions, display_order) VALUES
  ('sepa',          'SEPA Bank Transfer',     'EU',     'EUR',  'both',       0.5, 0,    50,   500000, '1-2 business days',   'European bank transfer in EUR.', 10),
  ('sepa_instant',  'SEPA Instant',           'EU',     'EUR',  'both',       1.0, 0,    50,   100000, 'Within 10 seconds',   'Instant European transfer (24/7).', 11),
  ('ach',           'ACH Transfer (US)',      'US',     'USD',  'both',       0.5, 0,    50,   250000, '2-3 business days',   'US domestic bank transfer.', 20),
  ('wire_us',       'Wire Transfer (US)',     'US',     'USD',  'both',       0,   25,   500, 1000000, 'Same/next business day','US wire transfer, flat fee $25.', 21),
  ('fps_uk',        'Faster Payments (UK)',   'UK',     'GBP',  'both',       0.3, 0,    50,   250000, 'Within 2 hours',      'UK Faster Payments in GBP.', 30),
  ('swift',         'SWIFT International',    'GLOBAL', 'USD',  'both',       0.8, 30,   200, 1000000, '3-5 business days',   'International wire (any country).', 40),
  ('usdt_trc20',    'USDT (TRC-20)',          'GLOBAL', 'USDT', 'both',       0,   1,    20,  1000000, '~5 minutes',          'Tron network, low fees.', 50),
  ('usdt_erc20',    'USDT (ERC-20)',          'GLOBAL', 'USDT', 'both',       0,   15,   50,  1000000, '~15 minutes',         'Ethereum network.', 51),
  ('btc',           'Bitcoin (BTC)',          'GLOBAL', 'BTC',  'both',       0.5, 0,    50,  1000000, '~30 minutes (3 conf)','On-chain Bitcoin transfer.', 52),
  ('eth',           'Ethereum (ETH)',         'GLOBAL', 'ETH',  'both',       0.5, 0,    50,  1000000, '~5 minutes',          'On-chain Ethereum transfer.', 53);
