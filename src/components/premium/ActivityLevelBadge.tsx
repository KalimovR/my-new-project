import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Flame, Zap, Star, Trophy, Crown } from 'lucide-react';

interface ActivityLevelBadgeProps {
  level: number;
  points?: number;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
}

const levelConfig = {
  1: { 
    label: 'Новичок', 
    icon: Flame, 
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    border: 'border-gray-400/20',
  },
  2: { 
    label: 'Активист', 
    icon: Zap, 
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  3: { 
    label: 'Полемист', 
    icon: Star, 
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  4: { 
    label: 'Мастер дебатов', 
    icon: Trophy, 
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  5: { 
    label: 'Мастер заговоров', 
    icon: Crown, 
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
  },
};

export const ActivityLevelBadge = ({ level, points, showTooltip = true, size = 'md' }: ActivityLevelBadgeProps) => {
  const config = levelConfig[level as keyof typeof levelConfig] || levelConfig[1];
  const Icon = config.icon;
  
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const iconSize = size === 'sm' ? 10 : 12;

  const badge = (
    <div className={cn(
      "inline-flex items-center gap-1 rounded-full border font-medium",
      config.bg,
      config.border,
      config.color,
      sizeClasses
    )}>
      <Icon size={iconSize} />
      <span>{config.label}</span>
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p className="font-medium">{config.label}</p>
          <p className="text-xs text-muted-foreground">
            Уровень {level} • {points || 0} очков
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
