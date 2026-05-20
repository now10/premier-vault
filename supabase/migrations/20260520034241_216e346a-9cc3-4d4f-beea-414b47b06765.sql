
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose text NOT NULL,
  target_user_id uuid NOT NULL,
  input_type text NOT NULL DEFAULT 'code',
  sent_by uuid,
  status text NOT NULL DEFAULT 'pending',
  response text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage approval_requests" ON public.approval_requests
  FOR ALL USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users view own approval_requests" ON public.approval_requests
  FOR SELECT USING (target_user_id = auth.uid());
CREATE POLICY "Users respond to own approval_requests" ON public.approval_requests
  FOR UPDATE USING (target_user_id = auth.uid())
  WITH CHECK (target_user_id = auth.uid());
