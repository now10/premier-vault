-- =========================================================
-- ADMIN FEATURES: Messages, Bonuses, Fines, Approvals
-- =========================================================

-- Enums for new features
CREATE TYPE public.message_target AS ENUM ('all', 'specific');
CREATE TYPE public.bonus_type AS ENUM ('coupon', 'gift', 'token', 'bonus');
CREATE TYPE public.fine_type AS ENUM ('fine', 'fee');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.input_type AS ENUM ('code', 'token', 'key');

-- =========================================================
-- ADMIN MESSAGES
-- =========================================================
CREATE TABLE public.admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target public.message_target NOT NULL DEFAULT 'all',
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_clear_seconds INTEGER DEFAULT 0,
  has_button BOOLEAN NOT NULL DEFAULT false,
  button_text TEXT,
  button_action TEXT,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- BONUSES
-- =========================================================
CREATE TABLE public.bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.bonus_type NOT NULL,
  amount NUMERIC(14,2),
  description TEXT NOT NULL,
  target public.message_target NOT NULL DEFAULT 'all',
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  expiry_days INTEGER DEFAULT 30,
  require_confirmation BOOLEAN NOT NULL DEFAULT false,
  code TEXT UNIQUE,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- FINES
-- =========================================================
CREATE TABLE public.fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.fine_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  reason TEXT NOT NULL,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  require_payment BOOLEAN NOT NULL DEFAULT false,
  paid BOOLEAN NOT NULL DEFAULT false,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fines ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- APPROVAL REQUESTS
-- =========================================================
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose TEXT NOT NULL,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_type public.input_type NOT NULL,
  user_input TEXT,
  status public.approval_status NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ
);
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- admin_messages
CREATE POLICY "Admins manage messages" ON public.admin_messages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view messages for them" ON public.admin_messages
  FOR SELECT USING (target = 'all' OR target_user_id = auth.uid());

-- bonuses
CREATE POLICY "Admins manage bonuses" ON public.bonuses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view bonuses for them" ON public.bonuses
  FOR SELECT USING (target = 'all' OR target_user_id = auth.uid());

-- fines
CREATE POLICY "Admins manage fines" ON public.fines
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view fines for them" ON public.fines
  FOR SELECT USING (target_user_id = auth.uid());

-- approval_requests
CREATE POLICY "Admins manage approval requests" ON public.approval_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own approval requests" ON public.approval_requests
  FOR SELECT USING (target_user_id = auth.uid());
CREATE POLICY "Users update own approval requests" ON public.approval_requests
  FOR UPDATE USING (target_user_id = auth.uid());