import { useState } from 'react';
import { DiscussionPoll as PollType, useVotePoll } from '@/hooks/useDiscussions';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Check, Vote, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscussionPollProps {
  poll: PollType;
  discussionId: string;
}

export const DiscussionPoll = ({ poll, discussionId }: DiscussionPollProps) => {
  const { user } = useAuth();
  const votePoll = useVotePoll();
  const [showResults, setShowResults] = useState(false);

  const totalVotes = poll.votes?.reduce((sum, v) => sum + v.count, 0) || 0;
  const hasVoted = poll.user_vote !== undefined;
  const shouldShowResults = hasVoted || showResults;

  const handleVote = (optionIndex: number) => {
    if (!user) return;
    votePoll.mutate({ pollId: poll.id, discussionId, optionIndex });
  };

  // Pluralize "человек"
  const pluralize = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return 'человек';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'человека';
    return 'человек';
  };

  return (
    <div className="bg-primary/5 border border-primary/30 rounded-xl p-4 sm:p-5">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-primary">Опрос</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {totalVotes} {pluralize(totalVotes)}
        </span>
      </div>

      {/* Options - Stack on mobile, 2 cols on tablet+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {poll.options.map((option, index) => {
          // Handle both string options and object options {text, votes}
          const optionText = typeof option === 'string' ? option : (option as any)?.text || '';
          const voteCount = poll.votes?.find(v => v.option_index === index)?.count || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = poll.user_vote === index;

          if (shouldShowResults) {
            return (
              <div 
                key={index} 
                className={cn(
                  "relative p-3 rounded-lg border overflow-hidden transition-all min-h-[60px]",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border/50 bg-background/50"
                )}
              >
                {/* Progress bar */}
                <div 
                  className="absolute inset-y-0 left-0 bg-primary/30 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
                
                {/* Content */}
                <div className="relative z-10 flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-medium flex items-center gap-1.5 text-foreground flex-1 line-clamp-2">
                    {isSelected && <Check className="w-3 h-3 text-primary shrink-0" />}
                    {optionText}
                  </span>
                  <span className="text-lg font-bold text-primary shrink-0">{percentage}%</span>
                </div>
              </div>
            );
          }

          return (
            <Button
              key={index}
              variant="outline"
              className="h-auto min-h-[48px] py-3 px-4 rounded-lg border-border/50 bg-background/50 hover:border-primary hover:bg-primary/10 transition-all text-left justify-start whitespace-normal"
              onClick={() => handleVote(index)}
              disabled={!user || votePoll.isPending}
            >
              <span className="text-sm font-medium leading-tight">{optionText}</span>
            </Button>
          );
        })}
      </div>

      {/* Large Results Button */}
      <div className="flex items-center justify-between">
        {!hasVoted && !showResults && (
          <Button
            variant="default"
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
            onClick={() => setShowResults(true)}
          >
            <BarChart3 className="w-5 h-5" />
            Показать результаты
          </Button>
        )}
        
        {showResults && !hasVoted && (
          <Button
            variant="outline"
            size="lg"
            className="w-full border-primary text-primary hover:bg-primary/10 font-semibold gap-2"
            onClick={() => setShowResults(false)}
          >
            <Vote className="w-5 h-5" />
            Проголосовать
          </Button>
        )}

        {hasVoted && (
          <p className="text-xs text-muted-foreground text-center w-full">
            ✓ Ваш голос учтён. Аргументируйте позицию ниже!
          </p>
        )}

        {!user && !showResults && (
          <p className="text-xs text-muted-foreground text-center w-full">
            Войдите, чтобы проголосовать
          </p>
        )}
      </div>
    </div>
  );
};
