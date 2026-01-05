-- Add karma field to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS karma INTEGER NOT NULL DEFAULT 0;

-- Add "top_argumentator" badge type
-- Badge types: cynic, debater, analyst, provocateur, top_argumentator
-- user_badges table already exists, just need to use it

-- Create hall_of_fame table for tracking all-time top posts
CREATE TABLE IF NOT EXISTS public.hall_of_fame (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),
  likes_count INTEGER NOT NULL DEFAULT 0,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, week_number, year)
);

-- Enable RLS on hall_of_fame
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;

-- Anyone can read hall of fame
CREATE POLICY "Hall of fame is viewable by everyone"
ON public.hall_of_fame FOR SELECT
USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage hall of fame"
ON public.hall_of_fame FOR ALL
USING (public.is_admin_or_editor(auth.uid()));

-- Add index for faster queries
CREATE INDEX idx_hall_of_fame_rank ON public.hall_of_fame(rank);
CREATE INDEX idx_hall_of_fame_week ON public.hall_of_fame(year, week_number);
CREATE INDEX idx_hall_of_fame_user ON public.hall_of_fame(user_id);