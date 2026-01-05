-- Premium Chat Requests (для запросов на общение)
CREATE TABLE public.premium_chat_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (from_user_id, to_user_id)
);

ALTER TABLE public.premium_chat_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat requests"
ON public.premium_chat_requests FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Premium users can create chat requests"
ON public.premium_chat_requests FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update requests they received"
ON public.premium_chat_requests FOR UPDATE
USING (auth.uid() = to_user_id);

-- Private Chats (активные чаты между пользователями)
CREATE TABLE public.private_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (user1_id, user2_id)
);

ALTER TABLE public.private_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats"
ON public.private_chats FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create chats"
ON public.private_chats FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Chat Messages (сообщения в чатах)
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.private_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat participants can view messages"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.private_chats 
    WHERE id = chat_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

CREATE POLICY "Chat participants can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.private_chats 
    WHERE id = chat_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

CREATE POLICY "Users can mark messages as read"
ON public.chat_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.private_chats 
    WHERE id = chat_id AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

-- Content Votes (голосования за будущие темы)
CREATE TABLE public.content_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.content_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active content votes"
ON public.content_votes FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage content votes"
ON public.content_votes FOR ALL
USING (is_admin_or_editor(auth.uid()))
WITH CHECK (is_admin_or_editor(auth.uid()));

-- Content Vote Responses (ответы пользователей на голосования)
CREATE TABLE public.content_vote_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vote_id UUID NOT NULL REFERENCES public.content_votes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (vote_id, user_id)
);

ALTER TABLE public.content_vote_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vote responses"
ON public.content_vote_responses FOR SELECT
USING (true);

CREATE POLICY "Premium users can vote"
ON public.content_vote_responses FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User Activity Levels (уровни активности для геймификации)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS activity_level INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS activity_points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS custom_badge TEXT,
ADD COLUMN IF NOT EXISTS is_anonymous_allowed BOOLEAN NOT NULL DEFAULT false;

-- Enable realtime for chats
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.premium_chat_requests;

-- Trigger for updating last_message_at
CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.private_chats
  SET last_message_at = NEW.created_at
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_chat_last_message_trigger
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_last_message();

-- Trigger for updating activity points on post
CREATE OR REPLACE FUNCTION public.update_user_activity_on_post()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    activity_points = activity_points + 10,
    activity_level = CASE 
      WHEN activity_points + 10 >= 1000 THEN 5
      WHEN activity_points + 10 >= 500 THEN 4
      WHEN activity_points + 10 >= 200 THEN 3
      WHEN activity_points + 10 >= 50 THEN 2
      ELSE 1
    END
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_activity_on_post_trigger
AFTER INSERT ON public.discussion_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_user_activity_on_post();