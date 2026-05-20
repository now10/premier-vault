
-- Extend transaction_type enum
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'Bonus';
ALTER TYPE public.transaction_type ADD VALUE IF NOT EXISTS 'Payment';

-- Default reference so simple inserts don't fail
ALTER TABLE public.transactions
  ALTER COLUMN reference SET DEFAULT ('TRV-' || replace(gen_random_uuid()::text,'-',''));

-- bonuses
CREATE TABLE IF NOT EXISTS public.bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'bonus',
  amount numeric(14,2),
  description text NOT NULL,
  message text,
  target text NOT NULL DEFAULT 'all',
  target_user_id uuid,
  expiry_days integer,
  require_confirmation boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  sent_by uuid,
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  claimed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bonuses" ON public.bonuses
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own/broadcast bonuses" ON public.bonuses
  FOR SELECT USING (target_user_id = auth.uid() OR target_user_id IS NULL);
CREATE POLICY "Users claim own bonuses" ON public.bonuses
  FOR UPDATE USING (target_user_id = auth.uid() OR target_user_id IS NULL)
  WITH CHECK (target_user_id = auth.uid() OR target_user_id IS NULL);

-- bills
CREATE TABLE IF NOT EXISTS public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  reason text,
  target_user_id uuid NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  payment_method text,
  sent_by uuid,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bills" ON public.bills
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own bills" ON public.bills
  FOR SELECT USING (target_user_id = auth.uid());
CREATE POLICY "Users pay own bills" ON public.bills
  FOR UPDATE USING (target_user_id = auth.uid())
  WITH CHECK (target_user_id = auth.uid());

-- fines
CREATE TABLE IF NOT EXISTS public.fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'fine',
  amount numeric(14,2) NOT NULL DEFAULT 0,
  reason text NOT NULL,
  target_user_id uuid NOT NULL,
  require_payment boolean NOT NULL DEFAULT false,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage fines" ON public.fines
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own fines" ON public.fines
  FOR SELECT USING (target_user_id = auth.uid());

-- admin_messages
CREATE TABLE IF NOT EXISTS public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'all',
  target_user_id uuid,
  auto_clear_seconds integer,
  has_button boolean NOT NULL DEFAULT false,
  button_text text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage admin_messages" ON public.admin_messages
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own/broadcast admin_messages" ON public.admin_messages
  FOR SELECT USING (target_user_id = auth.uid() OR target_user_id IS NULL);
