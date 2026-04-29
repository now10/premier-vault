-- =========================================================
-- BILLS / PAYMENT REQUESTS
-- =========================================================
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  reason TEXT NOT NULL,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Admins manage bills" ON public.bills
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view their bills" ON public.bills
  FOR SELECT USING (target_user_id = auth.uid());

-- Indexes for efficient querying
CREATE INDEX idx_bills_paid ON public.bills(paid);
CREATE INDEX idx_bills_target_user_paid ON public.bills(target_user_id, paid);
CREATE INDEX idx_bills_created_at ON public.bills(created_at DESC);
