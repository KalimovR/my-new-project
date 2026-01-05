import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';
import { format, formatDistanceToNow, addDays, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, Eye, EyeOff, Trash2, Flag, Check, MessageSquare, Sparkles, Loader2, Wand2, RotateCcw, Clock, Crown } from 'lucide-react';

export const DiscussionsTab = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiIsPremium, setAiIsPremium] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; permanent?: boolean } | null>(null);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    teaser: '',
    tags: '',
    roundHours: 72,
  });

  // AI Generation function
  const handleAIGenerate = async () => {
    setIsGenerating(true);
    setAiDialogOpen(false);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Ошибка', description: 'Требуется авторизация', variant: 'destructive' });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-discussion`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ 
            count: 1,
            topic: aiTopic.trim() || undefined,
            isPremium: aiIsPremium
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Ошибка генерации');
      }

      queryClient.invalidateQueries({ queryKey: ['admin-discussions'] });
      setAiTopic('');
      setAiIsPremium(false);
      toast({
        title: 'AI создал дискуссию!',
        description: result.discussions?.[0]?.title 
          ? `"${result.discussions[0].title.substring(0, 50)}..."` 
          : `Создано: ${result.count} дискуссий`,
      });
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'Ошибка генерации',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch all discussions (admin view) - active ones (not deleted)
  const { data: discussions, isLoading } = useQuery({
    queryKey: ['admin-discussions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussions')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch deleted discussions (trash)
  const { data: trashedDiscussions, isLoading: isLoadingTrash } = useQuery({
    queryKey: ['admin-discussions-trash'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussions')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch reports
  const { data: reports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_reports')
        .select(`
          *,
          discussion_posts (id, content, discussion_id)
        `)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create discussion
  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('discussions')
        .insert({
          title: newDiscussion.title,
          teaser: newDiscussion.teaser || null,
          tags: newDiscussion.tags.split(',').map(t => t.trim()).filter(Boolean),
          round_ends_at: new Date(Date.now() + newDiscussion.roundHours * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussions'] });
      setCreateOpen(false);
      setNewDiscussion({ title: '', teaser: '', tags: '', roundHours: 72 });
      toast({ title: 'Дискуссия создана!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Toggle discussion visibility
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('discussions')
        .update({ is_active: !is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussions'] });
    },
  });

  // Soft delete (move to trash)
  const softDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discussions')
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-discussions-trash'] });
      setDeleteConfirm(null);
      toast({ title: 'Дискуссия перемещена в корзину', description: 'Будет удалена через 3 дня' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Restore from trash
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discussions')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-discussions-trash'] });
      toast({ title: 'Дискуссия восстановлена!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Permanent delete
  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete related data
      await supabase.from('discussion_posts').delete().eq('discussion_id', id);
      await supabase.from('discussion_polls').delete().eq('discussion_id', id);
      await supabase.from('discussion_articles').delete().eq('discussion_id', id);
      
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-discussions-trash'] });
      setDeleteConfirm(null);
      toast({ title: 'Дискуссия полностью удалена' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    },
  });

  // Hide post (from report)
  const hidePostMutation = useMutation({
    mutationFn: async ({ postId, reportId }: { postId: string; reportId: string }) => {
      await supabase
        .from('discussion_posts')
        .update({ is_hidden: true })
        .eq('id', postId);

      await supabase
        .from('discussion_reports')
        .update({ is_resolved: true })
        .eq('id', reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Пост скрыт' });
    },
  });

  // Dismiss report
  const dismissReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await supabase
        .from('discussion_reports')
        .update({ is_resolved: true })
        .eq('id', reportId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({ title: 'Жалоба отклонена' });
    },
  });

  // Calculate days left before permanent deletion
  const getDaysLeft = (deletedAt: string) => {
    const expiryDate = addDays(new Date(deletedAt), 3);
    if (isPast(expiryDate)) return 0;
    return formatDistanceToNow(expiryDate, { locale: ru });
  };

  const trashCount = trashedDiscussions?.length || 0;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="discussions">
        <TabsList>
          <TabsTrigger value="discussions" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Дискуссии
          </TabsTrigger>
          <TabsTrigger value="trash" className="gap-2">
            <Trash2 className="w-4 h-4" />
            Корзина
            {trashCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {trashCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <Flag className="w-4 h-4" />
            Жалобы
            {reports && reports.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {reports.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discussions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Все дискуссии</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAiDialogOpen(true)}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {isGenerating ? 'Генерация...' : 'AI'}
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Создать
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Теги</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создано</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discussions?.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium max-w-xs truncate">{d.title}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {d.tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.is_active ? 'default' : 'secondary'}>
                        {d.is_active ? 'Активно' : 'Скрыто'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(d.created_at), 'd MMM yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleMutation.mutate({ id: d.id, is_active: d.is_active })}
                          title={d.is_active ? 'Скрыть' : 'Показать'}
                        >
                          {d.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm({ id: d.id, title: d.title })}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="В корзину"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="trash" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Корзина</h3>
            <p className="text-sm text-muted-foreground">
              Обсуждения удаляются автоматически через 3 дня
            </p>
          </div>

          {isLoadingTrash ? (
            <Skeleton className="h-64" />
          ) : trashedDiscussions && trashedDiscussions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Теги</TableHead>
                  <TableHead>Удалено</TableHead>
                  <TableHead>Осталось</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trashedDiscussions.map((d) => (
                  <TableRow key={d.id} className="opacity-70">
                    <TableCell className="font-medium max-w-xs truncate">{d.title}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {d.tags?.slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {d.deleted_at && format(new Date(d.deleted_at), 'd MMM yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-warning">
                        <Clock className="w-3 h-3" />
                        {d.deleted_at && getDaysLeft(d.deleted_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => restoreMutation.mutate(d.id)}
                          className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          title="Восстановить"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm({ id: d.id, title: d.title, permanent: true })}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Удалить навсегда"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">Корзина пуста</p>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <h3 className="text-lg font-semibold">Нерассмотренные жалобы</h3>

          {reports && reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report: any) => (
                <div key={report.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="mb-3">
                    <p className="text-sm text-muted-foreground mb-1">Причина:</p>
                    <p className="font-medium">{report.reason}</p>
                  </div>
                  <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Содержимое поста:</p>
                    <p className="text-sm line-clamp-3">{report.discussion_posts?.content}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => hidePostMutation.mutate({ postId: report.post_id, reportId: report.id })}
                    >
                      <EyeOff className="w-4 h-4 mr-1" />
                      Скрыть пост
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dismissReportMutation.mutate(report.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Отклонить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">Нет нерассмотренных жалоб</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.permanent ? 'Удалить навсегда?' : 'Удалить дискуссию?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.permanent 
                ? `Дискуссия "${deleteConfirm?.title}" будет удалена безвозвратно вместе со всеми постами и голосами.`
                : `Дискуссия "${deleteConfirm?.title}" будет перемещена в корзину на 3 дня. Вы сможете восстановить её в любой момент.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirm?.permanent) {
                  permanentDeleteMutation.mutate(deleteConfirm.id);
                } else if (deleteConfirm) {
                  softDeleteMutation.mutate(deleteConfirm.id);
                }
              }}
              className={deleteConfirm?.permanent ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {deleteConfirm?.permanent ? 'Удалить навсегда' : 'В корзину'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Generation Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI-генерация дискуссии
            </DialogTitle>
            <DialogDescription>
              Укажите тему или оставьте пустым — AI сам выберет актуальную тему
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="ai-topic" className="text-sm font-medium">
                Тема обсуждения <span className="text-muted-foreground">(опционально)</span>
              </Label>
              <Textarea
                id="ai-topic"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Например: влияние ИИ на рынок труда, политика Трампа в отношении Китая, климатические изменения..."
                className="mt-2 min-h-24 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                AI проанализирует тему и создаст провокационную дискуссию с опросом
              </p>
            </div>
            
            {/* Premium toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Премиум-дискуссия</p>
                  <p className="text-xs text-muted-foreground">Доступна только для «Всевидящих»</p>
                </div>
              </div>
              <Button
                type="button"
                variant={aiIsPremium ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAiIsPremium(!aiIsPremium)}
                className={aiIsPremium ? 'bg-primary text-primary-foreground' : ''}
              >
                {aiIsPremium ? 'Да' : 'Нет'}
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {aiTopic.trim() ? 'Создать по теме' : 'Создать случайную'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Создать дискуссию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Вопрос / Тема</Label>
              <Input
                value={newDiscussion.title}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, title: e.target.value })}
                placeholder="Почему нейтральность — иллюзия?"
              />
            </div>
            <div>
              <Label>Тизер (опционально)</Label>
              <Textarea
                value={newDiscussion.teaser}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, teaser: e.target.value })}
                placeholder="Краткое описание темы для привлечения внимания..."
                className="min-h-24"
              />
            </div>
            <div>
              <Label>Теги (через запятую)</Label>
              <Input
                value={newDiscussion.tags}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, tags: e.target.value })}
                placeholder="политика, философия, медиа"
              />
            </div>
            <div>
              <Label>Длительность раунда (часов)</Label>
              <Input
                type="number"
                value={newDiscussion.roundHours}
                onChange={(e) => setNewDiscussion({ ...newDiscussion, roundHours: parseInt(e.target.value) || 72 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newDiscussion.title.trim() || createMutation.isPending}
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};