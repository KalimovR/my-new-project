import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Crown } from 'lucide-react';

interface PremiumBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
  showTooltip?: boolean;
}

export const PremiumBadge = ({ size = 'md', className, showTooltip = true }: PremiumBadgeProps) => {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const iconSize = size === 'sm' ? 14 : 16;
  
  const badge = (
    <div 
      className={cn(
        "flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-orange-600 flex-shrink-0",
        sizeClasses,
        className
      )}
    >
      <Crown size={iconSize - 4} className="text-white" strokeWidth={2.5} />
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="bg-card border-primary/30 text-sm max-w-[220px] text-center p-3"
      >
        <p className="font-semibold text-primary mb-0.5">Всевидящий</p>
        <p className="text-muted-foreground text-xs">
          Премиум: безлимитные обсуждения и эксклюзивы
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
