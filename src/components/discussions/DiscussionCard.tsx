import { Link } from 'react-router-dom';
import { MessageCircle, Tag, Lock, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Discussion } from '@/hooks/useDiscussions';
import { RoundTimer } from './RoundTimer';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DiscussionCardProps {
  discussion: Discussion;
}

export const DiscussionCard = ({ discussion }: DiscussionCardProps) => {
  const endDate = discussion.round_ends_at ? new Date(discussion.round_ends_at) : null;

  return (
    <Link
      to={`/obsuzhdeniya/${discussion.id}`}
      className="group block bg-card border border-border rounded-2xl p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      {/* Premium Badge + Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {discussion.is_premium && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white border-0 text-xs font-semibold px-2.5 py-1 gap-1.5">
                  <div className="relative flex items-center">
                    <Eye className="w-3.5 h-3.5" />
                    <Lock className="w-2.5 h-2.5 absolute -bottom-0.5 -right-1" />
                  </div>
                  Премиум
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Эксклюзив для подписчиков «Всевидящий»</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {discussion.tags && discussion.tags.length > 0 && (
          discussion.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </Badge>
          ))
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
        {discussion.title}
      </h3>

      {/* Teaser */}
      {discussion.teaser && (
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
          {discussion.teaser}
        </p>
      )}

      {/* Meta with mini timer */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <span>{discussion.posts_count || 0} реплик</span>
        </div>
        
        <RoundTimer endDate={endDate} variant="mini" />
      </div>

      {/* Image overlay if present */}
      {discussion.image_url && (
        <div className="mt-4 -mx-6 -mb-6 h-32 overflow-hidden rounded-b-2xl">
          <img
            src={discussion.image_url}
            alt=""
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
          />
        </div>
      )}
    </Link>
  );
};
