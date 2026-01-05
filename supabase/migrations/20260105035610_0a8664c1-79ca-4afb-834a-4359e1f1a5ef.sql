-- Add subscription_cancelled field to track if user cancelled but still has active time
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_cancelled boolean DEFAULT false;