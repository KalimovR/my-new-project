import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePost } from '@/hooks/useDiscussions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Link } from 'react-router-dom';
import { Send, AlertCircle, Crown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PremiumLimitHint } from '@/components/premium/PremiumLimitHint';
import { PremiumUpsellPopup } from '@/components/premium/PremiumUpsellPopup';

interface DiscussionPostFormProps {
  discussionId: string;
  parentId?: string;
  onSuccess?: () => void;
  isMobile?: boolean;
}

export const DiscussionPostForm = ({ discussionId, parentId, onSuccess, isMobile }: DiscussionPostFormProps) => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUpsellPopup, setShowUpsellPopup] = useState(false);
  const createPost = useCreatePost();

  // Check subscription status from user profile
  const isSubscriber = profile?.is_premium ?? false;
  const wordLimit = isSubscriber ? 1000 : 300;
  
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isOverLimit = wordCount > wordLimit;
  const isCompact = !!parentId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isOverLimit) return;

    createPost.mutate(
      { discussionId, content: content.trim(), parentId },
      {
        onSuccess: () => {
          setContent('');
          setIsExpanded(false);
          // Trigger upsell popup for non-subscribers after first reply
          if (!isSubscriber && !parentId) {
            setShowUpsellPopup(true);
          }
          onSuccess?.();
        },
      }
    );
  };

  // Mobile sticky variant
  if (isMobile) {
    if (!user) {
      return (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Войдите, чтобы участвовать</p>
          <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 px-6">
            <Link to="/auth">Войти</Link>
          </Button>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Collapsed state - just a button */}
        {!isExpanded && !content && (
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 justify-start text-muted-foreground border-primary/30 hover:border-primary hover:bg-primary/5"
            onClick={() => setIsExpanded(true)}
          >
            <Send className="w-4 h-4 mr-2 text-primary" />
            Твой аргумент...
          </Button>
        )}

        {/* Expanded state */}
        {(isExpanded || content) && (
          <>
            <div className="relative">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Твой аргумент... Убеди остальных."
                className="min-h-20 max-h-32 resize-none border-primary/30 focus:border-primary bg-card text-base"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 text-muted-foreground"
                onClick={() => {
                  if (!content) setIsExpanded(false);
                }}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className={cn(
                  "text-xs",
                  isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
                )}>
                  {wordCount}/{wordLimit}
                </span>
                <PremiumLimitHint wordCount={wordCount} wordLimit={wordLimit} isSubscriber={isSubscriber} />
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={!content.trim() || isOverLimit || createPost.isPending}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 h-12 text-base font-semibold"
              >
                <Send className="w-5 h-5" />
                {createPost.isPending ? 'Отправка...' : 'Отправить'}
              </Button>
            </div>
          </>
        )}
        
        <PremiumUpsellPopup trigger={showUpsellPopup} />
      </form>
    );
  }

  // Standard (non-mobile) variant
  if (!user) {
    return (
      <div className={cn(
        "bg-card border border-border rounded-2xl text-center",
        isCompact ? "p-4" : "p-6"
      )}>
        <AlertCircle className="w-6 h-6 text-primary mx-auto mb-2" />
        <p className="text-muted-foreground mb-3 text-sm">Войдите, чтобы участвовать</p>
        <Button asChild size={isCompact ? "sm" : "default"} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/auth">Войти</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn(
      "bg-card border border-border rounded-2xl",
      isCompact ? "p-4" : "p-6"
    )}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? "Ваш ответ..." : "Твой аргумент... Убеди остальных."}
        className={cn(
          "resize-none border-0 bg-transparent p-0 focus-visible:ring-0 text-foreground placeholder:text-muted-foreground",
          isCompact ? "min-h-20 text-sm" : "min-h-28 text-base"
        )}
      />

      <div className={cn(
        "flex flex-col border-t border-border",
        isCompact ? "mt-3 pt-3" : "mt-4 pt-4"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm",
              isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
            )}>
              {wordCount}/{wordLimit} слов
            </span>
            {!isSubscriber && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Crown className="w-3 h-3 text-primary" />
                1000 для подписчиков
              </span>
            )}
          </div>

          <Button
            type="submit"
            size={isCompact ? "sm" : "default"}
            disabled={!content.trim() || isOverLimit || createPost.isPending}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="w-4 h-4" />
            {createPost.isPending ? 'Отправка...' : 'Отправить'}
          </Button>
        </div>
        
        <PremiumLimitHint wordCount={wordCount} wordLimit={wordLimit} isSubscriber={isSubscriber} />
      </div>
      
      <PremiumUpsellPopup trigger={showUpsellPopup} />
    </form>
  );
};
