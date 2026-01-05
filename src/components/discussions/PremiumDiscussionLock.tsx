import { Link } from 'react-router-dom';
import { Lock, Eye, Crown, Sparkles, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PremiumDiscussionLockProps {
  teaser?: string | null;
  title: string;
}

export const PremiumDiscussionLock = ({ teaser, title }: PremiumDiscussionLockProps) => {
  // Truncate teaser to 50-100 words
  const teaserWords = teaser?.split(/\s+/) || [];
  const truncatedTeaser = teaserWords.slice(0, 80).join(' ') + (teaserWords.length > 80 ? '...' : '');

  return (
    <div className="relative">
      {/* Blurred/grayed content preview */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-10" />
      
      {/* Teaser preview */}
      {teaser && (
        <div className="opacity-30 blur-[2px] pointer-events-none mb-8">
          <p className="text-muted-foreground text-sm leading-relaxed">
            {truncatedTeaser}
          </p>
        </div>
      )}

      {/* Lock overlay */}
      <div className="relative z-20 bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/30 rounded-2xl p-6 sm:p-8 text-center">
        {/* Premium icon */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <Eye className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center shadow-md">
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -bottom-1 -left-1">
              <Lock className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
          Эксклюзивная дискуссия
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm sm:text-base mb-6 max-w-md mx-auto">
          Это эксклюзивная дискуссия для премиум-подписчиков. Оформи подписку, чтобы читать и участвовать в спорах о скрытом.
        </p>

        {/* Benefits */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/50 border border-border/50 rounded-full px-3 py-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-primary" />
            <span>Все реплики</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/50 border border-border/50 rounded-full px-3 py-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>AI рекомендации</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/50 border border-border/50 rounded-full px-3 py-1.5">
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>Приватные чаты</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/50 border border-border/50 rounded-full px-3 py-1.5">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Голосование за контент</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button 
          asChild
          size="lg"
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-bold px-8 py-6 text-base shadow-lg shadow-primary/20"
        >
          <Link to="/profile">
            <Crown className="w-5 h-5 mr-2" />
            Оформить премиум
          </Link>
        </Button>

        <p className="text-xs text-muted-foreground mt-3">
          99 ₽/мес • Отмена в любой момент
        </p>
      </div>
    </div>
  );
};
