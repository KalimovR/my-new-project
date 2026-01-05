import { useState } from 'react';
import { DiscussionPost, useVotePost, useReportPost, useDeletePost } from '@/hooks/useDiscussions';
import { useAuth } from '@/hooks/useAuth';
import { DiscussionPostForm } from './DiscussionPostForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PremiumBadge } from '@/components/badges/PremiumBadge';
import { ActivityLevelBadge } from '@/components/premium/ActivityLevelBadge';
import { SendChatRequestButton } from '@/components/premium/SendChatRequestButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, MoreHorizontal, Flag, Award, MessageSquare, ChevronDown, ChevronUp, Eye, Crown, Trash2, Search, Sparkles, Moon, Zap, ThumbsDown as ThumbsDownIcon, Heart, Clock, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DiscussionPostCardProps {
  post: DiscussionPost & { author_activity_level?: number; author_selected_badge?: string | null };
  discussionId: string;
  rank?: number;
  replies?: DiscussionPost[];
  allPosts?: DiscussionPost[];
  depth?: number;
}

const badgeLabels: Record<string, { label: string; color: string; icon: string }> = {
  cynic: { label: 'Циник', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: 'award' },
  debater: { label: 'Полемист', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: 'award' },
  analyst: { label: 'Аналитик', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: 'award' },
  provocateur: { label: 'Провокатор', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: 'award' },
  top_argumentator: { label: 'Топ-аргументатор', color: 'bg-primary/10 text-primary border-primary/20', icon: 'eye' },
  'всевидящий': { label: 'Всевидящий', color: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-500 border-yellow-500/30', icon: 'crown' },
  // New badges
  truth_seeker: { label: 'Искатель правды', color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20', icon: 'search' },
  conspiracy_master: { label: 'Мастер заговоров', color: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30', icon: 'sparkles' },
  night_owl: { label: 'Ночной аналитик', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', icon: 'moon' },
  first_blood: { label: 'Первопроходец', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: 'zap' },
  skeptic: { label: 'Скептик', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: 'thumbsdown' },
  influencer: { label: 'Инфлюенсер', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20', icon: 'heart' },
  veteran: { label: 'Ветеран', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: 'clock' },
  insider: { label: 'Инсайдер', color: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30', icon: 'shield' },
};

const getBadgeIcon = (iconType: string) => {
  const className = "w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1";
  switch (iconType) {
    case 'eye': return <Eye className={className} />;
    case 'crown': return <Crown className={className} />;
    case 'search': return <Search className={className} />;
    case 'sparkles': return <Sparkles className={className} />;
    case 'moon': return <Moon className={className} />;
    case 'zap': return <Zap className={className} />;
    case 'thumbsdown': return <ThumbsDownIcon className={className} />;
    case 'heart': return <Heart className={className} />;
    case 'clock': return <Clock className={className} />;
    case 'shield': return <Shield className={className} />;
    default: return <Award className={className} />;
  }
};

const MAX_DEPTH = 4;

export const DiscussionPostCard = ({ 
  post, 
  discussionId, 
  rank, 
  replies = [], 
  allPosts = [],
  depth = 0 
}: DiscussionPostCardProps) => {
  const { user, isAdmin } = useAuth();
  const votePost = useVotePost();
  const reportPost = useReportPost();
  const deletePost = useDeletePost();
  const [reportOpen, setReportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const handleVote = (voteType: 'like' | 'dislike') => {
    if (!user) return;
    votePost.mutate({ postId: post.id, discussionId, voteType });
  };

  const handleReport = () => {
    if (!reportReason.trim()) return;
    reportPost.mutate(
      { postId: post.id, reason: reportReason },
      { onSuccess: () => {
        setReportOpen(false);
        setReportReason('');
      }}
    );
  };

  // Get nested replies for this post
  const nestedReplies = allPosts.filter(p => p.parent_id === post.id);
  const hasReplies = nestedReplies.length > 0;
  const canNest = depth < MAX_DEPTH;

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { locale: ru, addSuffix: true });

  // Determine indentation based on depth - smaller on mobile
  const indentClass = depth > 0 ? 'ml-3 sm:ml-6 border-l-2 border-primary/20 pl-3 sm:pl-4' : '';

  return (
    <>
      <div className={cn(indentClass)}>
        <div className={cn(
          "bg-card border rounded-xl p-4 sm:p-5 transition-all",
          rank && rank <= 3 && "border-primary/30 bg-primary/5",
          depth > 0 && "bg-background/50",
          post.author_is_premium && "border-primary/40 shadow-sm shadow-primary/10"
        )}>
          {/* Premium highlight bar */}
          {post.author_is_premium && (
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/20">
              <Crown className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Премиум-участник</span>
            </div>
          )}
          {/* Header */}
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {rank && (
                <div className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  rank === 1 && "bg-yellow-500/20 text-yellow-500",
                  rank === 2 && "bg-gray-400/20 text-gray-400",
                  rank === 3 && "bg-amber-600/20 text-amber-600",
                  rank > 3 && "bg-muted text-muted-foreground"
                )}>
                  {rank}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  {post.author_is_premium && <PremiumBadge size="sm" />}
                  <span className="font-semibold text-sm sm:text-base text-foreground">{post.author_name}</span>
                  {/* Show only selected badge if user has one, otherwise show all badges */}
                  {post.author_selected_badge ? (
                    (() => {
                      const info = badgeLabels[post.author_selected_badge];
                      return info ? (
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] sm:text-xs px-1.5 sm:px-2", info.color)}
                        >
                          {getBadgeIcon(info.icon)}
                          <span className="hidden sm:inline">{info.label}</span>
                        </Badge>
                      ) : null;
                    })()
                  ) : (
                    post.author_badges?.map((badge) => {
                      const info = badgeLabels[badge];
                      return info ? (
                        <Badge
                          key={badge}
                          variant="outline"
                          className={cn("text-[10px] sm:text-xs px-1.5 sm:px-2", info.color)}
                        >
                          {getBadgeIcon(info.icon)}
                          <span className="hidden sm:inline">{info.label}</span>
                        </Badge>
                      ) : null;
                    })
                  )}
                </div>
                <span className="text-[11px] sm:text-xs text-muted-foreground">{timeAgo}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Chat request button */}
              <SendChatRequestButton 
                toUserId={post.user_id} 
                toUserName={post.author_name}
              />
              
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setReportOpen(true)}>
                      <Flag className="w-4 h-4 mr-2" />
                      Пожаловаться
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Content */}
          <p className="text-sm sm:text-base text-foreground leading-relaxed mb-3 sm:mb-4 whitespace-pre-wrap">{post.content}</p>

          {/* Actions - Larger buttons on mobile for touch */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-9 sm:h-8 px-3 sm:px-2 text-muted-foreground hover:text-green-500 hover:bg-green-500/10"
              onClick={() => handleVote('like')}
              disabled={!user}
            >
              <ThumbsUp className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="text-sm font-medium">{post.likes}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 h-9 sm:h-8 px-3 sm:px-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
              onClick={() => handleVote('dislike')}
              disabled={!user}
            >
              <ThumbsDown className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="text-sm font-medium">{post.dislikes}</span>
            </Button>
            
            {/* Reply button - only if can nest */}
            {canNest && user && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-9 sm:h-8 px-3 sm:px-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <MessageSquare className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="text-sm">Ответить</span>
              </Button>
            )}

            {/* Toggle replies */}
            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-9 sm:h-8 px-3 sm:px-2 text-muted-foreground hover:text-foreground ml-auto"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <span className="text-sm">{nestedReplies.length}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Reply form */}
        {showReplyForm && canNest && (
          <div className="mt-3 ml-3 sm:ml-6">
            <DiscussionPostForm 
              discussionId={discussionId} 
              parentId={post.id} 
              onSuccess={() => setShowReplyForm(false)}
            />
          </div>
        )}

        {/* Nested replies */}
        {showReplies && hasReplies && (
          <div className="mt-3 space-y-3">
            {nestedReplies.map((reply) => (
              <DiscussionPostCard
                key={reply.id}
                post={reply}
                discussionId={discussionId}
                allPosts={allPosts}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="bg-card border-border mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>Пожаловаться на сообщение</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Опишите причину жалобы..."
            className="min-h-24"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleReport}
              disabled={!reportReason.trim() || reportPost.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сообщение?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сообщение будет удалено навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePost.mutate({ postId: post.id, discussionId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
