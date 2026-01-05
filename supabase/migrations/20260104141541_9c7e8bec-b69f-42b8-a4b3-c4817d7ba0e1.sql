-- Create discussions table
CREATE TABLE public.discussions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  teaser TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}'::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  round_ends_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for discussion-article links
CREATE TABLE public.discussion_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(discussion_id, article_id)
);

-- Create discussion posts table
CREATE TABLE public.discussion_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discussion post votes table
CREATE TABLE public.discussion_post_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create discussion reports table for complaints
CREATE TABLE public.discussion_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.discussion_posts(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, reported_by)
);

-- Create polls table
CREATE TABLE public.discussion_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id UUID NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll votes table
CREATE TABLE public.discussion_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.discussion_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

-- Create user badges table
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Enable RLS on all tables
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Discussions policies
CREATE POLICY "Anyone can view active discussions" ON public.discussions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins and editors can view all discussions" ON public.discussions
  FOR SELECT USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Admins and editors can manage discussions" ON public.discussions
  FOR ALL USING (is_admin_or_editor(auth.uid())) WITH CHECK (is_admin_or_editor(auth.uid()));

-- Discussion articles policies
CREATE POLICY "Anyone can view discussion articles" ON public.discussion_articles
  FOR SELECT USING (true);

CREATE POLICY "Admins and editors can manage discussion articles" ON public.discussion_articles
  FOR ALL USING (is_admin_or_editor(auth.uid())) WITH CHECK (is_admin_or_editor(auth.uid()));

-- Discussion posts policies
CREATE POLICY "Anyone can view non-hidden posts" ON public.discussion_posts
  FOR SELECT USING (is_hidden = false OR is_admin_or_editor(auth.uid()));

CREATE POLICY "Authenticated users can create posts" ON public.discussion_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.discussion_posts
  FOR UPDATE USING (auth.uid() = user_id OR is_admin_or_editor(auth.uid()));

CREATE POLICY "Admins can delete posts" ON public.discussion_posts
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Discussion post votes policies
CREATE POLICY "Anyone can view votes" ON public.discussion_post_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.discussion_post_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change own vote" ON public.discussion_post_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove own vote" ON public.discussion_post_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Discussion reports policies
CREATE POLICY "Users can view own reports" ON public.discussion_reports
  FOR SELECT USING (auth.uid() = reported_by OR is_admin_or_editor(auth.uid()));

CREATE POLICY "Authenticated users can report posts" ON public.discussion_reports
  FOR INSERT WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Admins can manage reports" ON public.discussion_reports
  FOR ALL USING (is_admin_or_editor(auth.uid())) WITH CHECK (is_admin_or_editor(auth.uid()));

-- Polls policies
CREATE POLICY "Anyone can view polls" ON public.discussion_polls
  FOR SELECT USING (true);

CREATE POLICY "Admins and editors can manage polls" ON public.discussion_polls
  FOR ALL USING (is_admin_or_editor(auth.uid())) WITH CHECK (is_admin_or_editor(auth.uid()));

-- Poll votes policies
CREATE POLICY "Anyone can view poll votes" ON public.discussion_poll_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote in polls" ON public.discussion_poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change poll vote" ON public.discussion_poll_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- User badges policies
CREATE POLICY "Anyone can view badges" ON public.user_badges
  FOR SELECT USING (true);

CREATE POLICY "System can manage badges" ON public.user_badges
  FOR ALL USING (is_admin_or_editor(auth.uid())) WITH CHECK (is_admin_or_editor(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_discussions_updated_at
  BEFORE UPDATE ON public.discussions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discussion_posts_updated_at
  BEFORE UPDATE ON public.discussion_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for discussions
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_posts;