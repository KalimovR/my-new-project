import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Eye, Lock, RefreshCw, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Recommendation {
  discussion_id: string;
  title: string;
  teaser: string;
  reason: string;
  is_premium: boolean;
}

export const AIRecommendations = () => {
  const { user, profile } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['ai-recommendations', user?.id, refreshKey],
    queryFn: async () => {
      if (!user) return { recommendations: [] };

      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { userId: user.id },
      });

      if (error) throw error;
      return data as { recommendations: Recommendation[] };
    },
    enabled: !!user && !!profile?.is_premium,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!profile?.is_premium) return null;

  const handleRefresh = () => {
    setRefreshKey(k => k + 1);
    refetch();
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/5 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI рекомендует
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Персональные темы на основе твоих интересов
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        ) : data?.recommendations && data.recommendations.length > 0 ? (
          data.recommendations.map((rec) => (
            <Link
              key={rec.discussion_id}
              to={`/obsuzhdeniya/${rec.discussion_id}`}
              className="block p-3 rounded-xl border border-border hover:border-primary/50 bg-card/50 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {rec.is_premium && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 gap-1">
                        <Eye className="w-2.5 h-2.5" />
                        <Lock className="w-2 h-2" />
                      </Badge>
                    )}
                    <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {rec.title}
                    </h4>
                  </div>
                  <p className="text-xs text-primary/80 italic">
                    💡 {rec.reason}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-1" />
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Участвуй в обсуждениях, и AI подберёт темы для тебя
          </p>
        )}
      </CardContent>
    </Card>
  );
};
