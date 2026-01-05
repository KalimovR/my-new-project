-- Add columns to track premium rewards
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS banked_premium_months INTEGER DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.premium_expires_at IS 'When current premium subscription expires';
COMMENT ON COLUMN public.profiles.banked_premium_months IS 'Number of free premium months earned from top-5 but not yet activated';