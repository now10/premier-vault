-- Add missing columns to bonuses table for proper messaging and claiming
ALTER TABLE public.bonuses
ADD COLUMN message TEXT DEFAULT '',
ADD COLUMN claimed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN claimed_at TIMESTAMPTZ,
ADD COLUMN claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for efficient querying of unclaimed bonuses
CREATE INDEX idx_bonuses_claimed ON public.bonuses(claimed);
CREATE INDEX idx_bonuses_target_user_claimed ON public.bonuses(target_user_id, claimed);
