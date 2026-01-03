import { useState, useEffect } from 'react';
import { Trash2, Check, Ban, Clock, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Comment {
  id: string;
  article_id: string;
  author_name: string;
  content: string;
  likes: number;
  dislikes: number;
  is_approved: boolean;
  created_at: string;
  article?: { title: string; slug: string };
}

interface CommentBan {
  id: string;
  user_fingerprint: string;
  reason: string | null;
  banned_until: string;
  created_at: string;
}

export const ModerationTab = () => {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [bans, setBans] = useState<CommentBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedFingerprint, setSelectedFingerprint] = useState('');
  const [banDuration, setBanDuration] = useState('1d');
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    fetchComments();
    fetchBans();
  }, []);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, articles:article_id(title, slug)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(comment => ({
        ...comment,
        article: comment.articles ? { title: comment.articles.title, slug: comment.articles.slug } : undefined
      }));
      
      setComments(transformedData);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBans = async () => {
    try {
      const { data, error } = await supabase
        .from('comment_bans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBans(data || []);
    } catch (error) {
      console.error('Error fetching bans:', error);
    }
  };

  const handleApprove = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .update({ is_approved: true })
      .eq('id', commentId);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Комментарий одобрен' });
      fetchComments();
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Удалить комментарий?')) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Комментарий удалён' });
      fetchComments();
    }
  };

  const getDurationMs = (duration: string) => {
    const durations: Record<string, number> = {
      '5m': 5 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
      '5y': 5 * 365 * 24 * 60 * 60 * 1000,
    };
    return durations[duration] || durations['1d'];
  };

  const handleBan = async () => {
    if (!selectedFingerprint) return;

    const bannedUntil = new Date(Date.now() + getDurationMs(banDuration));

    const { error } = await supabase
      .from('comment_bans')
      .insert({
        user_fingerprint: selectedFingerprint,
        reason: banReason || null,
        banned_until: bannedUntil.toISOString(),
      });

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Бан установлен' });
      setBanDialogOpen(false);
      setSelectedFingerprint('');
      setBanReason('');
      fetchBans();
    }
  };

  const handleUnban = async (banId: string) => {
    if (!confirm('Снять бан?')) return;

    const { error } = await supabase
      .from('comment_bans')
      .delete()
      .eq('id', banId);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Бан снят' });
      fetchBans();
    }
  };

  const openBanDialog = (fingerprint: string) => {
    setSelectedFingerprint(fingerprint);
    setBanDialogOpen(true);
  };

  const activeBans = bans.filter(b => new Date(b.banned_until) > new Date());

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Комментарии ({comments.length})
          </CardTitle>
          <CardDescription>
            Все комментарии пользователей. Одобряйте или удаляйте.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Нет комментариев для модерации
            </p>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-4 border rounded-lg ${
                    comment.is_approved ? 'border-border' : 'border-primary/50 bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{comment.author_name}</span>
                        <Badge variant={comment.is_approved ? 'default' : 'secondary'}>
                          {comment.is_approved ? 'Одобрен' : 'На модерации'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ru })}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{comment.content}</p>
                      {comment.article && (
                        <p className="text-xs text-muted-foreground">
                          К статье: {comment.article.title}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>👍 {comment.likes || 0}</span>
                        <span>👎 {comment.dislikes || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!comment.is_approved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(comment.id)}
                          title="Одобрить"
                        >
                          <Check className="w-4 h-4 text-green-500" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openBanDialog(comment.author_name)}
                        title="Забанить"
                      >
                        <Ban className="w-4 h-4 text-orange-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(comment.id)}
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Bans */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5" />
            Активные баны ({activeBans.length})
          </CardTitle>
          <CardDescription>
            Пользователи с ограничением на комментарии
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeBans.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Нет активных банов
            </p>
          ) : (
            <div className="space-y-3">
              {activeBans.map((ban) => (
                <div
                  key={ban.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{ban.user_fingerprint}</p>
                    {ban.reason && (
                      <p className="text-sm text-muted-foreground">Причина: {ban.reason}</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      До: {new Date(ban.banned_until).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnban(ban.id)}
                  >
                    Снять бан
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Забанить пользователя</DialogTitle>
            <DialogDescription>
              Установите ограничение на комментарии для {selectedFingerprint}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Длительность бана</Label>
              <Select value={banDuration} onValueChange={setBanDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5 минут</SelectItem>
                  <SelectItem value="1h">1 час</SelectItem>
                  <SelectItem value="1d">1 день</SelectItem>
                  <SelectItem value="7d">7 дней</SelectItem>
                  <SelectItem value="30d">30 дней</SelectItem>
                  <SelectItem value="1y">1 год</SelectItem>
                  <SelectItem value="5y">5 лет</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Причина (необязательно)</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Укажите причину бана..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleBan} className="bg-destructive hover:bg-destructive/90">
              Забанить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
