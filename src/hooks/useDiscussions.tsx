import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Discussion {
  id: string;
  title: string;
  teaser: string | null;
  image_url: string | null;
  tags: string[];
  is_active: boolean;
  is_premium: boolean;
  round_ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  posts_count?: number;
}

export interface DiscussionPost {
  id: string;
  discussion_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  likes: number;
  dislikes: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_badges?: string[];
  author_is_premium?: boolean;
  author_selected_badge?: string | null;
}

export interface DiscussionPoll {
  id: string;
  discussion_id: string;
  question: string;
  options: string[];
  created_at: string;
  votes?: { option_index: number; count: number }[];
  user_vote?: number;
}

export const useDiscussions = () => {
  return useQuery({
    queryKey: ['discussions'],
    queryFn: async () => {
      const { data: discussions, error } = await supabase
        .from('discussions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get posts count for each discussion
      const discussionsWithCounts = await Promise.all(
        (discussions || []).map(async (discussion) => {
          const { count } = await supabase
            .from('discussion_posts')
            .select('*', { count: 'exact', head: true })
            .eq('discussion_id', discussion.id)
            .eq('is_hidden', false);

          return {
            ...discussion,
            posts_count: count || 0,
          };
        })
      );

      return discussionsWithCounts as Discussion[];
    },
  });
};

export const useDiscussion = (id: string | undefined) => {
  return useQuery({
    queryKey: ['discussion', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('discussions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Discussion;
    },
    enabled: !!id,
  });
};

export const useDiscussionPosts = (discussionId: string | undefined) => {
  return useQuery({
    queryKey: ['discussion-posts', discussionId],
    queryFn: async () => {
      if (!discussionId) return [];

      const { data: posts, error } = await supabase
        .from('discussion_posts')
        .select('*')
        .eq('discussion_id', discussionId)
        .eq('is_hidden', false)
        .order('likes', { ascending: false });

      if (error) throw error;

      // Get author names from profiles
      const userIds = [...new Set((posts || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, is_premium, custom_badge')
        .in('user_id', userIds);

      const { data: badges } = await supabase
        .from('user_badges')
        .select('user_id, badge_type')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, { 
        name: p.display_name, 
        isPremium: p.is_premium,
        selectedBadge: p.custom_badge 
      }]) || []);
      const badgeMap = new Map<string, string[]>();
      badges?.forEach(b => {
        const existing = badgeMap.get(b.user_id) || [];
        badgeMap.set(b.user_id, [...existing, b.badge_type]);
      });

      return (posts || []).map(post => {
        const profileData = profileMap.get(post.user_id);
        return {
          ...post,
          author_name: profileData?.name || 'Аноним',
          author_badges: badgeMap.get(post.user_id) || [],
          author_is_premium: profileData?.isPremium || false,
          author_selected_badge: profileData?.selectedBadge || null,
        };
      }) as DiscussionPost[];
    },
    enabled: !!discussionId,
  });
};

export const useDiscussionPoll = (discussionId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['discussion-poll', discussionId, user?.id],
    queryFn: async () => {
      if (!discussionId) return null;

      const { data: poll, error } = await supabase
        .from('discussion_polls')
        .select('*')
        .eq('discussion_id', discussionId)
        .maybeSingle();

      if (error) throw error;
      if (!poll) return null;

      // Get vote counts
      const { data: votes } = await supabase
        .from('discussion_poll_votes')
        .select('option_index')
        .eq('poll_id', poll.id);

      const voteCounts: { option_index: number; count: number }[] = [];
      const options = poll.options as string[];
      options.forEach((_, index) => {
        const count = votes?.filter(v => v.option_index === index).length || 0;
        voteCounts.push({ option_index: index, count });
      });

      // Check user's vote
      let userVote: number | undefined;
      if (user) {
        const { data: userVoteData } = await supabase
          .from('discussion_poll_votes')
          .select('option_index')
          .eq('poll_id', poll.id)
          .eq('user_id', user.id)
          .maybeSingle();
        userVote = userVoteData?.option_index;
      }

      return {
        ...poll,
        options: options,
        votes: voteCounts,
        user_vote: userVote,
      } as DiscussionPoll;
    },
    enabled: !!discussionId,
  });
};

export const useCreatePost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ discussionId, content, parentId }: { discussionId: string; content: string; parentId?: string }) => {
      if (!user) throw new Error('Необходимо войти в систему');

      // Simple profanity filter
      const badWords = ['мат', 'оскорбление']; // Add actual words
      const hasBadWords = badWords.some(word => content.toLowerCase().includes(word));
      if (hasBadWords) {
        throw new Error('Сообщение содержит недопустимые слова');
      }

      const { data, error } = await supabase
        .from('discussion_posts')
        .insert({
          discussion_id: discussionId,
          user_id: user.id,
          content: content.slice(0, 1500), // ~300 words limit
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // If this is a reply to another post, create notification for parent author
      if (parentId) {
        const { data: parentPost } = await supabase
          .from('discussion_posts')
          .select('user_id, content')
          .eq('id', parentId)
          .single();

        if (parentPost && parentPost.user_id !== user.id) {
          // Get discussion title for the notification
          const { data: discussion } = await supabase
            .from('discussions')
            .select('title')
            .eq('id', discussionId)
            .single();

          // Get replier's name
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('user_id', user.id)
            .single();

          const replierName = profile?.display_name || 'Кто-то';

          // Create notification
          await supabase.from('notifications').insert({
            user_id: parentPost.user_id,
            type: 'reply',
            title: `${replierName} ответил на ваш комментарий`,
            message: content.slice(0, 100) + (content.length > 100 ? '...' : ''),
            link: `/obsuzhdeniya/${discussionId}`,
            related_post_id: data.id,
          });
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts', variables.discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      toast({ title: 'Ответ опубликован!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};

export const useVotePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, discussionId, voteType }: { postId: string; discussionId: string; voteType: 'like' | 'dislike' }) => {
      if (!user) throw new Error('Необходимо войти в систему');

      // Check existing vote
      const { data: existing } = await supabase
        .from('discussion_post_votes')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        if (existing.vote_type === voteType) {
          // Remove vote
          await supabase
            .from('discussion_post_votes')
            .delete()
            .eq('id', existing.id);
        } else {
          // Change vote
          await supabase
            .from('discussion_post_votes')
            .update({ vote_type: voteType })
            .eq('id', existing.id);
        }
      } else {
        // New vote
        await supabase
          .from('discussion_post_votes')
          .insert({
            post_id: postId,
            user_id: user.id,
            vote_type: voteType,
          });
      }

      // Update post counts
      const { data: votes } = await supabase
        .from('discussion_post_votes')
        .select('vote_type')
        .eq('post_id', postId);

      const likes = votes?.filter(v => v.vote_type === 'like').length || 0;
      const dislikes = votes?.filter(v => v.vote_type === 'dislike').length || 0;

      await supabase
        .from('discussion_posts')
        .update({ likes, dislikes })
        .eq('id', postId);

      // Check if post entered top-5 and notify author + grant premium for non-premium discussions
      const { data: post } = await supabase
        .from('discussion_posts')
        .select('user_id, discussion_id')
        .eq('id', postId)
        .single();

      if (post) {
        // Get discussion to check if it's premium and if round is still active
        const { data: discussion } = await supabase
          .from('discussions')
          .select('title, is_premium, round_ends_at')
          .eq('id', post.discussion_id)
          .single();

        // Check if the round has expired - no rewards for expired discussions
        const isRoundExpired = discussion?.round_ends_at 
          ? new Date(discussion.round_ends_at) < new Date() 
          : false;

        // Get all posts in this discussion sorted by likes
        const { data: allPosts } = await supabase
          .from('discussion_posts')
          .select('id, likes')
          .eq('discussion_id', post.discussion_id)
          .eq('is_hidden', false)
          .order('likes', { ascending: false })
          .limit(5);

        const isInTop5 = allPosts?.some(p => p.id === postId);
        const rank = allPosts?.findIndex(p => p.id === postId);

        if (isInTop5 && rank !== undefined && rank >= 0 && post.user_id !== user.id) {
          // Check if notification already sent
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', post.user_id)
            .eq('related_post_id', postId)
            .eq('type', 'top5')
            .maybeSingle();

          if (!existingNotif) {
            // Grant 1 month free premium for top-5 in NON-premium AND NON-expired discussions
            if (!discussion?.is_premium && !isRoundExpired) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('is_premium, premium_expires_at, banked_premium_months, karma')
                .eq('user_id', post.user_id)
                .single();

              if (profile) {
                if (profile.is_premium && (profile.banked_premium_months || 0) > 0) {
                  // Already has premium AND banked months - convert to karma
                  const currentKarma = profile.karma || 0;
                  await supabase
                    .from('profiles')
                    .update({ karma: currentKarma + 4000 })
                    .eq('user_id', post.user_id);
                  
                  await supabase.from('notifications').insert({
                    user_id: post.user_id,
                    type: 'karma_bonus',
                    title: '⭐ +4000 кармы!',
                    message: `У тебя уже есть премиум и копилка, поэтому за топ-5 в дискуссии "${discussion?.title || ''}" ты получил 4000 кармы!`,
                    link: '/profile',
                    related_post_id: postId,
                  });
                } else if (profile.is_premium) {
                  // Already premium but no banked months - add to bank
                  await supabase
                    .from('profiles')
                    .update({ banked_premium_months: (profile.banked_premium_months || 0) + 1 })
                    .eq('user_id', post.user_id);
                  
                  await supabase.from('notifications').insert({
                    user_id: post.user_id,
                    type: 'premium_banked',
                    title: '🎁 +1 месяц премиума в копилку!',
                    message: `За топ-5 в дискуссии "${discussion?.title || ''}" ты получил бесплатный месяц премиума. Он активируется после окончания текущей подписки.`,
                    link: '/profile',
                    related_post_id: postId,
                  });
                } else {
                  // Not premium - activate immediately
                  const expiresAt = new Date();
                  expiresAt.setMonth(expiresAt.getMonth() + 1);
                  
                  await supabase
                    .from('profiles')
                    .update({ 
                      is_premium: true, 
                      premium_expires_at: expiresAt.toISOString() 
                    })
                    .eq('user_id', post.user_id);

                  // Add Всевидящий badge
                  await supabase.from('user_badges').upsert({
                    user_id: post.user_id,
                    badge_type: 'всевидящий',
                  }, { onConflict: 'user_id,badge_type' });

                  await supabase.from('notifications').insert({
                    user_id: post.user_id,
                    type: 'premium_granted',
                    title: '🎉 Поздравляем! Ты получил бесплатный премиум!',
                    message: `За топ-5 в дискуссии "${discussion?.title || ''}" ты получил 1 месяц бесплатного премиума!`,
                    link: '/profile',
                    related_post_id: postId,
                  });
                }
              }
            }

            await supabase.from('notifications').insert({
              user_id: post.user_id,
              type: 'top5',
              title: rank === 0 ? '🏆 Твой пост на 1 месте!' : `🎉 Твой пост в топ-5!`,
              message: `Твой аргумент в дискуссии "${discussion?.title || ''}" набирает голоса!`,
              link: `/obsuzhdeniya/${post.discussion_id}`,
              related_post_id: postId,
            });
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts', variables.discussionId] });
    },
  });
};

export const useVotePoll = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ pollId, discussionId, optionIndex }: { pollId: string; discussionId: string; optionIndex: number }) => {
      if (!user) throw new Error('Необходимо войти в систему');

      const { error } = await supabase
        .from('discussion_poll_votes')
        .upsert({
          poll_id: pollId,
          user_id: user.id,
          option_index: optionIndex,
        }, { onConflict: 'poll_id,user_id' });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-poll', variables.discussionId] });
      toast({ title: 'Голос учтён!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};

export const useReportPost = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      if (!user) throw new Error('Необходимо войти в систему');

      const { error } = await supabase
        .from('discussion_reports')
        .insert({
          post_id: postId,
          reported_by: user.id,
          reason,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Вы уже пожаловались на это сообщение');
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: 'Жалоба отправлена', description: 'Модераторы рассмотрят её в ближайшее время' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeletePost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, discussionId }: { postId: string; discussionId: string }) => {
      const { error } = await supabase
        .from('discussion_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      return { discussionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts', data.discussionId] });
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
      toast({ title: 'Сообщение удалено' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};
