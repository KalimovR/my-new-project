import { Link } from 'react-router-dom';
import { useHallOfFame } from '@/hooks/useGamification';
import { Crown, Eye, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export const HallOfFameSidebar = () => {
  const { data: hallOfFame, isLoading } = useHallOfFame(5);

  if (isLoading) {
    return (
      <div className="bg-card border border-primary/20 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Зал славы</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!hallOfFame?.length) {
    return null;
  }

  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">Зал славы</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Лучшие аргументы всех времён
      </p>
      <div className="space-y-3">
        {hallOfFame.map((entry, index) => (
          <Link
            key={entry.id}
            to={`/obsuzhdeniya/${entry.discussion_id}`}
            className="block p-3 rounded-lg bg-background/50 border border-border/50 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`
                w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                ${index === 0 ? 'bg-yellow-500/20 text-yellow-500' : ''}
                ${index === 1 ? 'bg-gray-400/20 text-gray-400' : ''}
                ${index === 2 ? 'bg-amber-600/20 text-amber-600' : ''}
                ${index > 2 ? 'bg-muted text-muted-foreground' : ''}
              `}>
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {entry.author_name}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                    <Eye className="w-2.5 h-2.5 mr-0.5" />
                    Топ
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {entry.post_content}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-primary">👍 {entry.likes_count}</span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {entry.discussion_title}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
