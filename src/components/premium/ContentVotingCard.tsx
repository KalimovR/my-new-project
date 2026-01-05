import { useState, useEffect, useRef } from 'react';
import { useContentVotes, useVoteOnContent, ContentVote } from '@/hooks/useContentVotes';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Vote, Crown, CheckCircle2, Lock, Clock, Flame, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ContentVotingCardProps {
  vote: ContentVote;
}

const formatTimeRemaining = (endDate: Date): string => {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  
  if (diff <= 0) return 'Завершено';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}д ${remainingHours}ч`;
  }
  
  return `${hours}ч ${minutes}м`;
};

export const ContentVotingCard = ({ vote }: ContentVotingCardProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const voteOnContent = useVoteOnContent();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [progress, setProgress] = useState(100);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationTriggeredRef = useRef(false);
  
  const isPremium = profile?.is_premium;
  const hasVoted = vote.user_vote !== undefined;
  const totalVotes = vote.total_votes || 0;
  const isExpired = vote.ends_at ? new Date(vote.ends_at) < new Date() : false;

  // Find the winning option (by vote count, not percentage)
  const winningOption = vote.options.reduce<{ text: string; votes: number; index: number }>((max, opt, idx) => {
    const currentVotes = opt.votes || 0;
    if (currentVotes > max.votes) {
      return { text: opt.text, index: idx, votes: currentVotes };
    }
    return max;
  }, { text: '', votes: 0, index: 0 });

  // Auto-trigger article generation when vote expires
  useEffect(() => {
    if (!isExpired || generationTriggeredRef.current || totalVotes === 0) return;

    const triggerGeneration = async () => {
      // Check if this vote was already processed (article generated)
      // We'll use the is_active field - if it's still active and expired, trigger generation
      const { data: currentVote } = await supabase
        .from('content_votes')
        .select('is_active')
        .eq('id', vote.id)
        .single();

      if (!currentVote?.is_active) {
        console.log('Vote already processed, skipping generation');
        return;
      }

      generationTriggeredRef.current = true;
      setIsGenerating(true);

      console.log(`Vote expired, triggering article generation for: ${winningOption.text}`);

      try {
        const response = await supabase.functions.invoke('auto-generate-voted-article', {
          body: { voteId: vote.id },
        });

        if (response.error) {
          console.error('Generation error:', response.error);
          toast({
            title: 'Ошибка генерации',
            description: 'Не удалось создать статью автоматически',
            variant: 'destructive',
          });
        } else {
          console.log('Article generated:', response.data);
          toast({
            title: 'Статья создана!',
            description: `Эксклюзивная статья на тему "${winningOption.text}" опубликована`,
          });
        }
      } catch (error) {
        console.error('Failed to trigger generation:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    // Small delay to ensure vote data is fully updated
    const timeout = setTimeout(triggerGeneration, 2000);
    return () => clearTimeout(timeout);
  }, [isExpired, vote.id, winningOption.text, totalVotes, toast]);

  useEffect(() => {
    if (!vote.ends_at) return;
    
    const endDate = new Date(vote.ends_at);
    const startDate = new Date(vote.created_at);
    const totalDuration = endDate.getTime() - startDate.getTime();
    
    const updateTimer = () => {
      const now = new Date();
      const remaining = endDate.getTime() - now.getTime();
      const progressValue = Math.max(0, (remaining / totalDuration) * 100);
      
      setTimeRemaining(formatTimeRemaining(endDate));
      setProgress(progressValue);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [vote.ends_at, vote.created_at]);

  const handleVote = (optionIndex: number) => {
    if (!isPremium || hasVoted || isExpired) return;
    voteOnContent.mutate({ voteId: vote.id, optionIndex });
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" />
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              Эксклюзивное голосование
            </Badge>
          </div>
          {vote.ends_at && (
            <div className="flex items-center gap-1.5 text-xs">
              {isExpired ? (
                isGenerating ? (
                  <span className="flex items-center gap-1 text-primary">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Создаём статью...
                  </span>
                ) : (
                  <span className="text-muted-foreground">Завершено</span>
                )
              ) : (
                <>
                  <Flame className="h-3.5 w-3.5 text-primary animate-pulse" />
                  <span className="text-primary font-medium">{timeRemaining}</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Timer progress bar */}
        {vote.ends_at && !isExpired && (
          <div className="mb-2">
            <Progress value={progress} className="h-1 bg-muted" />
          </div>
        )}
        
        <CardTitle className="text-lg">{vote.title}</CardTitle>
        {vote.description && (
          <p className="text-sm text-muted-foreground">{vote.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {vote.options.map((option, index) => {
          const percentage = totalVotes > 0 ? (option.votes || 0) / totalVotes * 100 : 0;
          const isSelected = vote.user_vote === index;
          const isWinner = isExpired && index === winningOption.index && totalVotes > 0;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={!isPremium || hasVoted || isExpired}
              className={cn(
                "w-full text-left p-3 rounded-xl border transition-all",
                isSelected 
                  ? "border-primary bg-primary/10" 
                  : isWinner
                    ? "border-green-500 bg-green-500/10"
                    : "border-border hover:border-primary/50",
                (!isPremium || hasVoted || isExpired) && "cursor-default",
                isExpired && !isWinner && "opacity-70"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "font-medium text-sm flex items-center gap-2",
                  isWinner && "text-green-500"
                )}>
                  {option.text}
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  {isWinner && !isSelected && <Crown className="h-4 w-4 text-green-500" />}
                </span>
                {(hasVoted || !isPremium || isExpired) && (
                  <span className={cn(
                    "text-xs",
                    isWinner ? "text-green-500 font-medium" : "text-muted-foreground"
                  )}>
                    {option.votes} ({percentage.toFixed(0)}%)
                  </span>
                )}
              </div>
              {(hasVoted || !isPremium || isExpired) && (
                <Progress 
                  value={percentage} 
                  className={cn("h-1.5", isWinner && "[&>div]:bg-green-500")}
                />
              )}
            </button>
          );
        })}

        {!isPremium && !isExpired && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4 p-3 bg-muted/50 rounded-lg">
            <Lock className="h-4 w-4" />
            <span>Голосование доступно только премиум-пользователям</span>
          </div>
        )}

        {isExpired && totalVotes > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-500 mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <Crown className="h-4 w-4" />
            <span>Победила тема: <strong>{winningOption.text}</strong> ({winningOption.votes} голосов)</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          {totalVotes} {totalVotes === 1 ? 'голос' : totalVotes < 5 ? 'голоса' : 'голосов'}
        </p>
      </CardContent>
    </Card>
  );
};

// Wrapper component to fetch and display all content votes
export const ContentVotingSection = () => {
  const { data: votes, isLoading } = useContentVotes();

  if (isLoading || !votes || votes.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Vote className="h-5 w-5 text-primary" />
        <h3 className="font-bold">Влияй на контент</h3>
      </div>
      {votes.map((vote) => (
        <ContentVotingCard key={vote.id} vote={vote} />
      ))}
    </div>
  );
};