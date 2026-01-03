import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageCircle, ThumbsUp, ThumbsDown, ChevronDown, Clock, Reply, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { z } from 'zod';

const commentSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Имя должно быть минимум 2 символа')
    .max(50, 'Имя слишком длинное'),
  content: z.string()
    .trim()
    .min(3, 'Комментарий слишком короткий')
    .max(2000, 'Комментарий слишком длинный'),
});

interface Comment {
  id: string;
  article_id: string;
  parent_id: string | null;
  author_name: string;
  content: string;
  likes: number;
  dislikes: number;
  created_at: string;
  replies?: Comment[];
}

interface CommentSectionProps {
  articleId: string;
}

const INITIAL_COMMENTS = 5;
const LOAD_MORE_COUNT = 15;

// Generate a simple fingerprint for anonymous voting
const getFingerprint = () => {
  let fingerprint = localStorage.getItem('comment_fingerprint');
  if (!fingerprint) {
    fingerprint = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('comment_fingerprint', fingerprint);
  }
  return fingerprint;
};

export const CommentSection = ({ articleId }: CommentSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyName, setReplyName] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [visibleCount, setVisibleCount] = useState(INITIAL_COMMENTS);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [votedComments, setVotedComments] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchComments();
    loadVotedComments();
  }, [articleId]);

  const loadVotedComments = () => {
    const fingerprint = getFingerprint();
    const voted = localStorage.getItem(`voted_${fingerprint}`);
    if (voted) {
      setVotedComments(new Set(JSON.parse(voted)));
    }
  };

  const saveVotedComment = (commentId: string) => {
    const fingerprint = getFingerprint();
    const newVoted = new Set(votedComments);
    newVoted.add(commentId);
    setVotedComments(newVoted);
    localStorage.setItem(`voted_${fingerprint}`, JSON.stringify([...newVoted]));
  };

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('article_id', articleId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Organize comments into tree structure
      const commentsMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      (data || []).forEach((comment) => {
        commentsMap.set(comment.id, { ...comment, replies: [] });
      });

      commentsMap.forEach((comment) => {
        if (comment.parent_id && commentsMap.has(comment.parent_id)) {
          commentsMap.get(comment.parent_id)!.replies!.push(comment);
        } else if (!comment.parent_id) {
          rootComments.push(comment);
        }
      });

      // Sort replies by date
      rootComments.forEach((comment) => {
        comment.replies?.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      setComments(rootComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();
    
    const authorName = parentId ? replyName : name;
    const commentContent = parentId ? replyContent : content;

    // Validate input
    const validation = commentSchema.safeParse({ name: authorName, content: commentContent });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          article_id: articleId,
          parent_id: parentId,
          author_name: authorName.trim(),
          content: commentContent.trim(),
        });

      if (error) throw error;

      toast.success('Комментарий отправлен на модерацию');
      
      if (parentId) {
        setReplyName('');
        setReplyContent('');
        setReplyTo(null);
      } else {
        setName('');
        setContent('');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Ошибка при отправке комментария');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, voteType: 'like' | 'dislike') => {
    if (votedComments.has(commentId)) {
      toast.info('Вы уже голосовали за этот комментарий');
      return;
    }

    const fingerprint = getFingerprint();

    try {
      // Insert vote
      const { error: voteError } = await supabase
        .from('comment_votes')
        .insert({
          comment_id: commentId,
          user_fingerprint: fingerprint,
          vote_type: voteType,
        });

      if (voteError) {
        if (voteError.code === '23505') {
          toast.info('Вы уже голосовали за этот комментарий');
          return;
        }
        throw voteError;
      }

      // Update comment count
      const column = voteType === 'like' ? 'likes' : 'dislikes';
      const comment = comments.find(c => c.id === commentId) || 
        comments.flatMap(c => c.replies || []).find(c => c.id === commentId);
      
      if (comment) {
        await supabase
          .from('comments')
          .update({ [column]: (comment[column] || 0) + 1 })
          .eq('id', commentId);
      }

      saveVotedComment(commentId);
      fetchComments();
    } catch (error) {
      console.error('Error voting:', error);
      toast.error('Ошибка при голосовании');
    }
  };

  const toggleReplies = (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
    } else {
      newExpanded.add(commentId);
    }
    setExpandedReplies(newExpanded);
  };

  const visibleComments = comments.slice(0, visibleCount);
  const hasMoreComments = comments.length > visibleCount;

  const renderReplyForm = (commentId: string) => (
    <form onSubmit={(e) => handleSubmit(e, commentId)} className="mt-4 space-y-3">
      <Input
        placeholder="Ваше имя"
        value={replyName}
        onChange={(e) => setReplyName(e.target.value)}
        className="bg-secondary border-border"
      />
      <Textarea
        placeholder="Ваш ответ..."
        value={replyContent}
        onChange={(e) => setReplyContent(e.target.value)}
        className="bg-secondary border-border min-h-[80px]"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ответить'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
          Отмена
        </Button>
      </div>
    </form>
  );

  const renderComment = (comment: Comment, isReply = false): React.ReactNode => {
    const timeAgo = formatDistanceToNow(new Date(comment.created_at), { 
      addSuffix: true, 
      locale: ru 
    });
    
    const visibleReplies = expandedReplies.has(comment.id) 
      ? comment.replies 
      : comment.replies?.slice(0, 5);
    const hasMoreReplies = (comment.replies?.length || 0) > 5 && !expandedReplies.has(comment.id);

    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-border pl-4' : ''}`}>
        <div className="py-4 border-b border-border last:border-b-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">{comment.author_name}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo}
            </span>
          </div>
          
          <p className="text-foreground/90 mb-3">{comment.content}</p>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => handleVote(comment.id, 'like')}
              disabled={votedComments.has(comment.id)}
              className={`flex items-center gap-1 text-sm transition-colors ${
                votedComments.has(comment.id) 
                  ? 'text-muted-foreground cursor-not-allowed' 
                  : 'text-muted-foreground hover:text-green-500'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{comment.likes || 0}</span>
            </button>
            
            <button
              onClick={() => handleVote(comment.id, 'dislike')}
              disabled={votedComments.has(comment.id)}
              className={`flex items-center gap-1 text-sm transition-colors ${
                votedComments.has(comment.id) 
                  ? 'text-muted-foreground cursor-not-allowed' 
                  : 'text-muted-foreground hover:text-red-500'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>{comment.dislikes || 0}</span>
            </button>

            <button
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Reply className="w-4 h-4" />
              Ответить
            </button>
          </div>

          {/* Reply Form */}
          {replyTo === comment.id && renderReplyForm(comment.id)}
        </div>

        {/* Replies */}
        {visibleReplies && visibleReplies.length > 0 && (
          <div className="mt-2">
            {visibleReplies.map((reply) => renderComment(reply, true))}
            {hasMoreReplies && (
              <button
                onClick={() => toggleReplies(comment.id)}
                className="flex items-center gap-1 text-sm text-primary hover:underline mt-2 ml-8"
              >
                <ChevronDown className="w-4 h-4" />
                Показать ещё {(comment.replies?.length || 0) - 5} ответов
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-12">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <MessageCircle className="w-5 h-5" />
        Комментарии ({comments.length})
      </h3>
      
      {/* Comment Form */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <form onSubmit={(e) => handleSubmit(e, null)}>
          <div className="grid gap-4 mb-4">
            <Input
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary border-border"
            />
            <Textarea
              placeholder="Ваш комментарий..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-secondary border-border min-h-[100px]"
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Отправить комментарий
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Комментарии проходят модерацию перед публикацией
          </p>
        </form>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          Пока нет комментариев. Будьте первым!
        </p>
      ) : (
        <div className="bg-card rounded-xl border border-border p-6">
          {visibleComments.map((comment) => renderComment(comment))}
          
          {hasMoreComments && (
            <Button
              variant="ghost"
              onClick={() => setVisibleCount(prev => prev + LOAD_MORE_COUNT)}
              className="w-full mt-4"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              Показать ещё {Math.min(LOAD_MORE_COUNT, comments.length - visibleCount)} комментариев
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
