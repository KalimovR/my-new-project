import { Link } from 'react-router-dom';
import { useTopArgumentOfWeek } from '@/hooks/useGamification';
import { Flame, Eye, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const ArgumentOfTheWeek = () => {
  const { data: topArgument, isLoading } = useTopArgumentOfWeek();

  if (isLoading || !topArgument) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-primary">Аргумент недели</h3>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Eye className="w-3 h-3 mr-1" />
              Топ-аргументатор
            </Badge>
          </div>
          
          <p className="text-foreground leading-relaxed mb-3 line-clamp-3">
            "{topArgument.post_content}"
          </p>
          
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-foreground">{topArgument.author_name}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground truncate">{topArgument.discussion_title}</span>
            <span className="text-green-500">👍 {topArgument.likes_count}</span>
          </div>
        </div>
        
        <Button asChild variant="outline" className="shrink-0 border-primary/30 text-primary hover:bg-primary/10">
          <Link to={`/obsuzhdeniya/${topArgument.discussion_id}`}>
            Читать
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
};
