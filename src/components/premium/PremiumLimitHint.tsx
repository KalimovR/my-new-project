import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PremiumLimitHintProps {
  wordCount: number;
  wordLimit: number;
  isSubscriber: boolean;
}

export const PremiumLimitHint = ({ wordCount, wordLimit, isSubscriber }: PremiumLimitHintProps) => {
  // Show when user is at 80% of limit or over
  const threshold = wordLimit * 0.8;
  const shouldShow = !isSubscriber && wordCount >= threshold;

  if (!shouldShow) return null;

  const isOverLimit = wordCount > wordLimit;

  return (
    <Link 
      to="/profile"
      className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors group mt-2"
    >
      <Sparkles className="w-3 h-3" />
      <span>
        {isOverLimit 
          ? 'Лимит исчерпан. Хочешь без лимитов и эксклюзивы? Оформи премиум'
          : 'Хочешь без лимитов и эксклюзивы? Оформи премиум'
        }
      </span>
      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
};