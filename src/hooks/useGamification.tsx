import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HallOfFameEntry {
  id: string;
  post_id: string;
  user_id: string;
  discussion_id: string;
  rank: number;
  likes_count: number;
  week_number: number;
  year: number;
  created_at: string;
  author_name?: string;
  post_content?: string;
  discussion_title?: string;
}

export interface UserGamificationStats {
  karma: number;
  badges: string[];
  topPosts: number;
  top1Posts: number;
  bankedPremiumMonths: number;
  premiumExpiresAt: string | null;
  selectedBadge: string | null;
  isPremium: boolean;
}

export const useHallOfFame = (limit = 10) => {
  return useQuery({
    queryKey: ['hall-of-fame', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hall_of_fame')
        .select('*')
        .order('likes_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      if (!data?.length) return [];

      // Get author names and post content
      const userIds = [...new Set(data.map(e => e.user_id))];
      const postIds = [...new Set(data.map(e => e.post_id))];
      const discussionIds = [...new Set(data.map(e => e.discussion_id))];

      const [profilesRes, postsRes, discussionsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name').in('user_id', userIds),
        supabase.from('discussion_posts').select('id, content').in('id', postIds),
        supabase.from('discussions').select('id, title').in('id', discussionIds),
      ]);

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p.display_name]) || []);
      const postMap = new Map(postsRes.data?.map(p => [p.id, p.content]) || []);
      const discussionMap = new Map(discussionsRes.data?.map(d => [d.id, d.title]) || []);

      return data.map(entry => ({
        ...entry,
        author_name: profileMap.get(entry.user_id) || 'Аноним',
        post_content: postMap.get(entry.post_id) || '',
        discussion_title: discussionMap.get(entry.discussion_id) || '',
      })) as HallOfFameEntry[];
    },
  });
};

export const useTopArgumentOfWeek = () => {
  return useQuery({
    queryKey: ['top-argument-week'],
    queryFn: async () => {
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      const year = now.getFullYear();

      const { data, error } = await supabase
        .from('hall_of_fame')
        .select('*')
        .eq('week_number', weekNumber)
        .eq('year', year)
        .eq('rank', 1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get additional info
      const [profileRes, postRes, discussionRes] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('user_id', data.user_id).single(),
        supabase.from('discussion_posts').select('content').eq('id', data.post_id).single(),
        supabase.from('discussions').select('title').eq('id', data.discussion_id).single(),
      ]);

      return {
        ...data,
        author_name: profileRes.data?.display_name || 'Аноним',
        post_content: postRes.data?.content || '',
        discussion_title: discussionRes.data?.title || '',
      } as HallOfFameEntry;
    },
  });
};

export const useUserGamificationStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['user-gamification', userId],
    queryFn: async () => {
      if (!userId) return null;

      const [profileRes, badgesRes, hallRes] = await Promise.all([
        supabase.from('profiles').select('karma, banked_premium_months, premium_expires_at, custom_badge, is_premium').eq('user_id', userId).single(),
        supabase.from('user_badges').select('badge_type').eq('user_id', userId),
        supabase.from('hall_of_fame').select('rank').eq('user_id', userId),
      ]);

      const topPosts = hallRes.data?.length || 0;
      const top1Posts = hallRes.data?.filter(h => h.rank === 1).length || 0;
      
      // Add 'всевидящий' badge if user is premium
      const badges = badgesRes.data?.map(b => b.badge_type) || [];
      if (profileRes.data?.is_premium && !badges.includes('всевидящий')) {
        badges.push('всевидящий');
      }

      return {
        karma: profileRes.data?.karma || 0,
        badges,
        topPosts,
        top1Posts,
        bankedPremiumMonths: profileRes.data?.banked_premium_months || 0,
        premiumExpiresAt: profileRes.data?.premium_expires_at || null,
        selectedBadge: profileRes.data?.custom_badge || null,
        isPremium: profileRes.data?.is_premium || false,
      } as UserGamificationStats;
    },
    enabled: !!userId,
  });
};

// Helper to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}