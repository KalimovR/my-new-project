-- Create table for chat blocks
CREATE TABLE public.chat_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.private_chats(id) ON DELETE CASCADE,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(chat_id, blocker_id)
);

-- Enable RLS
ALTER TABLE public.chat_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view blocks in their chats
CREATE POLICY "Users can view blocks in own chats"
ON public.chat_blocks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.private_chats
    WHERE private_chats.id = chat_blocks.chat_id
    AND (private_chats.user1_id = auth.uid() OR private_chats.user2_id = auth.uid())
  )
);

-- Policy: Users can create blocks
CREATE POLICY "Users can create blocks in own chats"
ON public.chat_blocks
FOR INSERT
WITH CHECK (
  auth.uid() = blocker_id
  AND EXISTS (
    SELECT 1 FROM public.private_chats
    WHERE private_chats.id = chat_blocks.chat_id
    AND (private_chats.user1_id = auth.uid() OR private_chats.user2_id = auth.uid())
  )
);

-- Policy: Users can delete their own blocks (unblock)
CREATE POLICY "Users can delete own blocks"
ON public.chat_blocks
FOR DELETE
USING (auth.uid() = blocker_id);

-- Policy: Allow users to delete their own chats
CREATE POLICY "Users can delete own chats"
ON public.private_chats
FOR DELETE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Enable realtime for chat_blocks
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_blocks;