
-- Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portal_username text,
  ADD COLUMN IF NOT EXISTS legacy_data_uploaded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_upload_date timestamptz;

-- Legacy user codes table
CREATE TABLE IF NOT EXISTS public.legacy_user_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_username text NOT NULL UNIQUE,
  code text NOT NULL,
  account_balance numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.legacy_user_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can verify active legacy codes"
  ON public.legacy_user_codes FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins manage legacy codes"
  ON public.legacy_user_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Legacy data uploads audit table
CREATE TABLE IF NOT EXISTS public.legacy_data_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  portal_username text NOT NULL,
  status text NOT NULL DEFAULT 'Processing',
  error_message text,
  uploaded_balance numeric,
  transaction_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.legacy_data_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own uploads"
  ON public.legacy_data_uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own uploads"
  ON public.legacy_data_uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own uploads"
  ON public.legacy_data_uploads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all uploads"
  ON public.legacy_data_uploads FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed test legacy account
INSERT INTO public.legacy_user_codes (portal_username, code, account_balance, active)
VALUES ('User00571J1', 'USER00571J1', 374105567.00, true)
ON CONFLICT (portal_username) DO NOTHING;
