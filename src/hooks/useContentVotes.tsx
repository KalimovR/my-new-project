import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface ContentVote {
  id: string;
  title: string;
  description: string | null;
  options: { text: string; votes?: number }[];
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
  user_vote?: number;
  total_votes?: number;
}

export const useContentVotes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['content-votes', user?.id],
    queryFn: async () => {
      const { data: votes, error } = await supabase
        .from('content_votes')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get vote counts and user votes
      const enrichedVotes = await Promise.all((votes || []).map(async (vote) => {
        const { data: responses } = await supabase
          .from('content_vote_responses')
          .select('option_index')
          .eq('vote_id', vote.id);

        // Count votes per option
        const options = (vote.options as { text: string }[]).map((opt, idx) => ({
          text: opt.text,
          votes: responses?.filter(r => r.option_index === idx).length || 0,
        }));

        // Check user's vote
        let userVote: number | undefined;
        if (user) {
          const { data: userResponse } = await supabase
            .from('content_vote_responses')
            .select('option_index')
            .eq('vote_id', vote.id)
            .eq('user_id', user.id)
            .maybeSingle();
          userVote = userResponse?.option_index;
        }

        return {
          ...vote,
          options,
          user_vote: userVote,
          total_votes: responses?.length || 0,
        };
      }));

      return enrichedVotes as ContentVote[];
    },
  });
};

export const useVoteOnContent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ voteId, optionIndex }: { voteId: string; optionIndex: number }) => {
      if (!user) throw new Error('Необходимо войти');
      if (!profile?.is_premium) throw new Error('Голосование доступно только премиум-пользователям');

      const { error } = await supabase
        .from('content_vote_responses')
        .upsert({
          vote_id: voteId,
          user_id: user.id,
          option_index: optionIndex,
        }, { onConflict: 'vote_id,user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-votes'] });
      toast({ title: 'Голос учтён!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });
};
