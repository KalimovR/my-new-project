import { Flame, HelpCircle, Archive } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { differenceInDays, differenceInHours, differenceInMilliseconds, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface RoundTimerProps {
  endDate: Date | null;
  variant?: 'large' | 'mini';
  showHint?: boolean;
}

export const RoundTimer = ({ endDate, variant = 'large', showHint = true }: RoundTimerProps) => {
  const now = new Date();
  const isActive = endDate && endDate > now;
  
  if (!endDate) return null;

  const daysLeft = differenceInDays(endDate, now);
  const hoursLeft = differenceInHours(endDate, now) % 24;
  const formattedEndDate = format(endDate, "d MMMM в HH:mm", { locale: ru });
  
  // Calculate progress (72 hours = 259200000 ms)
  const totalRoundMs = 72 * 60 * 60 * 1000;
  const msLeft = differenceInMilliseconds(endDate, now);
  const progressValue = isActive ? Math.max(0, Math.min(100, ((totalRoundMs - msLeft) / totalRoundMs) * 100)) : 100;

  // Mini variant for cards
  if (variant === 'mini') {
    if (!isActive) {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted rounded-full text-xs text-muted-foreground">
          <Archive className="w-3.5 h-3.5" />
          <span>Архив</span>
        </div>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/15 rounded-full cursor-help">
              <Flame className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span className="text-xs font-semibold text-primary">
                {daysLeft > 0 ? `${daysLeft}д ${hoursLeft}ч` : `${hoursLeft}ч`}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-3 bg-card border-border">
            <p className="font-semibold text-foreground mb-1">🔥 Горячий раунд</p>
            <p className="text-xs text-muted-foreground">
              До {formattedEndDate}. Раунд длится 72 часа: пишите реплики, голосуйте. 
              По окончании фиксируется топ-5 лучших аргументов, дискуссия архивируется для чтения.
              Новый раунд запускается через неделю.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Large variant for discussion page
  if (!isActive) {
    return (
      <div className="bg-muted/50 border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Archive className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Раунд завершён</p>
            <p className="text-sm text-muted-foreground">Топ-5 зафиксирован, дискуссия в архиве</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-primary/15 via-primary/10 to-amber-500/10 border border-primary/30 rounded-xl p-4">
      {/* Timer header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary animate-pulse" />
          </div>
          <div>
            <p className="font-bold text-primary text-lg">
              Горячий раунд: {daysLeft > 0 ? `${daysLeft}д ${hoursLeft}ч` : `${hoursLeft}ч`}
            </p>
            <p className="text-xs text-muted-foreground">До {formattedEndDate}</p>
          </div>
        </div>

        {/* Help tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-sm p-4 bg-card border-border">
              <p className="font-semibold text-foreground mb-2">🔥 Правила раунда</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Раунд длится 72 часа: пишите реплики, голосуйте. 
                По окончании фиксируется топ-5 лучших аргументов, 
                дискуссия архивируется для чтения. 
                Новый раунд запускается через неделю.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <Progress 
          value={progressValue} 
          className="h-2.5 bg-muted/50"
        />
      </div>

      {/* Hint text */}
      {showHint && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          72 часа на споры и голоса. Потом топ-5 фиксируется, новый раунд — скоро.
        </p>
      )}
    </div>
  );
};
