import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export interface ChatRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  from_user_name?: string;
  to_user_name?: string;
}

export interface PrivateChat {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  last_message_at: string | null;
  other_user_name?: string;
  other_user_id?: string;
  unread_count?: number;
  is_blocked_by_me?: boolean;
  is_blocked_by_other?: boolean;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

export interface ChatBlock {
  id: string;
  chat_id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

// Hook for chat requests
export const useChatRequests = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for chat requests
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'premium_chat_requests',
          filter: `to_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-requests'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return useQuery({
    queryKey: ['chat-requests', user?.id],
    queryFn: async () => {
      if (!user) return { incoming: [], outgoing: [] };

      // Get incoming requests
      const { data: incoming, error: inErr } = await supabase
        .from('premium_chat_requests')
        .select('*')
        .eq('to_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (inErr) throw inErr;

      // Get outgoing requests
      const { data: outgoing, error: outErr } = await supabase
        .from('premium_chat_requests')
        .select('*')
        .eq('from_user_id', user.id)
        .order('created_at', { ascending: false });

      if (outErr) throw outErr;

      // Enrich with user names
      const userIds = [
        ...new Set([
          ...(incoming || []).map(r => r.from_user_id),
          ...(outgoing || []).map(r => r.to_user_id),
        ])
      ];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      return {
        incoming: (incoming || []).map(r => ({
          ...r,
          from_user_name: nameMap.get(r.from_user_id) || 'Аноним',
        })) as ChatRequest[],
        outgoing: (outgoing || []).map(r => ({
          ...r,
          to_user_name: nameMap.get(r.to_user_id) || 'Аноним',
        })) as ChatRequest[],
      };
    },
    enabled: !!user,
  });
};

// Hook for private chats list
export const usePrivateChats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['private-chats', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: chats, error } = await supabase
        .from('private_chats')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Get other user names and unread counts
      const otherUserIds = (chats || []).map(c => 
        c.user1_id === user.id ? c.user2_id : c.user1_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', otherUserIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      // Get blocks for all chats
      const chatIds = (chats || []).map(c => c.id);
      const { data: blocks } = await supabase
        .from('chat_blocks')
        .select('*')
        .in('chat_id', chatIds);

      // Get unread counts and block status
      const enrichedChats = await Promise.all((chats || []).map(async (chat) => {
        const otherId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;
        
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .neq('sender_id', user.id)
          .eq('is_read', false);

        const chatBlocks = (blocks || []).filter(b => b.chat_id === chat.id);
        const isBlockedByMe = chatBlocks.some(b => b.blocker_id === user.id);
        const isBlockedByOther = chatBlocks.some(b => b.blocker_id === otherId);

        return {
          ...chat,
          other_user_id: otherId,
          other_user_name: nameMap.get(otherId) || 'Аноним',
          unread_count: count || 0,
          is_blocked_by_me: isBlockedByMe,
          is_blocked_by_other: isBlockedByOther,
        };
      }));

      return enrichedChats as PrivateChat[];
    },
    enabled: !!user,
  });
};

// Hook for chat messages
export const useChatMessages = (chatId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for messages
  useEffect(() => {
    if (!chatId || !user) return;

    const channel = supabase
      .channel(`chat-messages-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user, queryClient]);

  return useQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: async () => {
      if (!chatId) return [];

      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender names
      const senderIds = [...new Set((messages || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', senderIds);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      return (messages || []).map(m => ({
        ...m,
        sender_name: nameMap.get(m.sender_id) || 'Аноним',
      })) as ChatMessage[];
    },
    enabled: !!chatId,
  });
};

// Hook for chat block status
export const useChatBlockStatus = (chatId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription for block changes
  useEffect(() => {
    if (!chatId || !user) return;

    const channel = supabase
      .channel(`chat-blocks-${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_blocks',
          filter: `chat_id=eq.${chatId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['chat-block-status', chatId] });
          queryClient.invalidateQueries({ queryKey: ['private-chats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user, queryClient]);

  return useQuery({
    queryKey: ['chat-block-status', chatId],
    queryFn: async () => {
      if (!chatId || !user) return { isBlockedByMe: false, isBlockedByOther: false };

      const { data: chat } = await supabase
        .from('private_chats')
        .select('user1_id, user2_id')
        .eq('id', chatId)
        .single();

      if (!chat) return { isBlockedByMe: false, isBlockedByOther: false };

      const otherId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;

      const { data: blocks } = await supabase
        .from('chat_blocks')
        .select('*')
        .eq('chat_id', chatId);

      const isBlockedByMe = (blocks || []).some(b => b.blocker_id === user.id);
      const isBlockedByOther = (blocks || []).some(b => b.blocker_id === otherId);

      return { isBlockedByMe, isBlockedByOther };
    },
    enabled: !!chatId && !!user,
  });
};

// Send chat request
export const useSendChatRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (toUserId: string) => {
      const { error } = await supabase
        .from('premium_chat_requests')
        .insert({ to_user_id: toUserId, from_user_id: (await supabase.auth.getUser()).data.user?.id });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Запрос уже отправлен');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-requests'] });
      toast({ title: 'Запрос отправлен!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};

// Respond to chat request
export const useRespondToChatRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      if (!user) throw new Error('Необходимо войти');

      // Update request status
      const { data: request, error: updateError } = await supabase
        .from('premium_chat_requests')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', requestId)
        .select()
        .single();

      if (updateError) throw updateError;

      // If accepted, create private chat
      if (accept && request) {
        const { error: chatError } = await supabase
          .from('private_chats')
          .insert({
            user1_id: request.from_user_id,
            user2_id: request.to_user_id,
          });

        if (chatError && chatError.code !== '23505') throw chatError;
      }

      return { accepted: accept };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat-requests'] });
      queryClient.invalidateQueries({ queryKey: ['private-chats'] });
      toast({ 
        title: data.accepted ? 'Запрос принят!' : 'Запрос отклонён',
        description: data.accepted ? 'Теперь вы можете общаться' : undefined,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};

// Send message
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ chatId, content }: { chatId: string; content: string }) => {
      if (!user) throw new Error('Необходимо войти');

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content,
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['private-chats'] });
    },
  });
};

// Mark messages as read
export const useMarkMessagesRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (chatId: string) => {
      if (!user) return;

      await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .neq('sender_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-chats'] });
    },
  });
};

// Block user in chat
export const useBlockUserInChat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ chatId, blockedUserId }: { chatId: string; blockedUserId: string }) => {
      if (!user) throw new Error('Необходимо войти');

      const { error } = await supabase
        .from('chat_blocks')
        .insert({
          chat_id: chatId,
          blocker_id: user.id,
          blocked_id: blockedUserId,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Пользователь уже заблокирован');
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-block-status', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['private-chats'] });
      toast({ title: 'Пользователь заблокирован', description: 'Он больше не сможет отправлять вам сообщения в этом чате' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};

// Unblock user in chat
export const useUnblockUserInChat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ chatId }: { chatId: string }) => {
      if (!user) throw new Error('Необходимо войти');

      const { error } = await supabase
        .from('chat_blocks')
        .delete()
        .eq('chat_id', chatId)
        .eq('blocker_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat-block-status', variables.chatId] });
      queryClient.invalidateQueries({ queryKey: ['private-chats'] });
      toast({ title: 'Пользователь разблокирован' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};

// Delete chat
export const useDeleteChat = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase
        .from('private_chats')
        .delete()
        .eq('id', chatId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-chats'] });
      toast({ title: 'Чат удалён' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};