import { useState, useEffect } from 'react';
import { Trash2, Eye, EyeOff, Flag, AlertTriangle, Edit3, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DiscussionPost {
  id: string;
  discussion_id: string;
  user_id: string;
  content: string;
  likes: number;
  dislikes: number;
  is_hidden: boolean;
  created_at: string;
  author_name?: string;
  discussion_title?: string;
}

interface DiscussionReport {
  id: string;
  post_id: string;
  reported_by: string;
  reason: string;
  is_resolved: boolean;
  created_at: string;
  post?: DiscussionPost;
  reporter_name?: string;
}

export const DiscussionModerationTab = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [reports, setReports] = useState<DiscussionReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<DiscussionPost | null>(null);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    fetchPosts();
    fetchReports();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data: postsData, error } = await supabase
        .from('discussion_posts')
        .select('*, discussions:discussion_id(title)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get author names
      const userIds = [...new Set((postsData || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      const enrichedPosts = (postsData || []).map(post => ({
        ...post,
        author_name: profileMap.get(post.user_id) || 'Аноним',
        discussion_title: post.discussions?.title || 'Неизвестно',
      }));

      setPosts(enrichedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data: reportsData, error } = await supabase
        .from('discussion_reports')
        .select('*, discussion_posts:post_id(*)')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get reporter names and post authors
      const userIds = [...new Set([
        ...(reportsData || []).map(r => r.reported_by),
        ...(reportsData || []).filter(r => r.discussion_posts).map(r => r.discussion_posts.user_id),
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      const enrichedReports = (reportsData || []).map(report => ({
        ...report,
        reporter_name: profileMap.get(report.reported_by) || 'Аноним',
        post: report.discussion_posts ? {
          ...report.discussion_posts,
          author_name: profileMap.get(report.discussion_posts.user_id) || 'Аноним',
        } : undefined,
      }));

      setReports(enrichedReports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleToggleHidden = async (postId: string, currentHidden: boolean) => {
    const { error } = await supabase
      .from('discussion_posts')
      .update({ is_hidden: !currentHidden })
      .eq('id', postId);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: currentHidden ? 'Пост восстановлен' : 'Пост скрыт' });
      fetchPosts();
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Полностью удалить пост? Это действие необратимо.')) return;

    const { error } = await supabase
      .from('discussion_posts')
      .delete()
      .eq('id', postId);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Пост удалён' });
      fetchPosts();
      fetchReports();
    }
  };

  const handleOpenEdit = (post: DiscussionPost) => {
    setEditingPost(post);
    setEditedContent(post.content);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;

    const { error } = await supabase
      .from('discussion_posts')
      .update({ content: editedContent })
      .eq('id', editingPost.id);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Пост отредактирован' });
      setEditDialogOpen(false);
      setEditingPost(null);
      fetchPosts();
      fetchReports();
    }
  };

  const handleCensorWord = (word: string) => {
    // Replace selected word with [УДАЛЕНО]
    const censored = editedContent.replace(new RegExp(word, 'gi'), '[УДАЛЕНО]');
    setEditedContent(censored);
  };

  const handleResolveReport = async (reportId: string) => {
    const { error } = await supabase
      .from('discussion_reports')
      .update({ is_resolved: true })
      .eq('id', reportId);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Жалоба закрыта' });
      fetchReports();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const unresolvedReportsCount = reports.length;
  const hiddenPosts = posts.filter(p => p.is_hidden);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="reports">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reports" className="relative">
            Жалобы
            {unresolvedReportsCount > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {unresolvedReportsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Все посты</TabsTrigger>
          <TabsTrigger value="hidden">
            Скрытые
            {hiddenPosts.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {hiddenPosts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-destructive" />
                Жалобы на посты ({unresolvedReportsCount})
              </CardTitle>
              <CardDescription>
                Рассмотрите жалобы: отредактируйте, скройте или удалите пост
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Нет активных жалоб
                </p>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{report.reporter_name}</span>
                            {' '}пожаловался{' '}
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: ru })}
                          </p>
                          <p className="text-sm mt-1">
                            <span className="text-muted-foreground">Причина:</span> {report.reason}
                          </p>
                        </div>
                      </div>

                      {report.post && (
                        <div className="bg-card p-4 rounded-lg border border-border mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-sm">{report.post.author_name}</span>
                            {report.post.is_hidden && (
                              <Badge variant="secondary">Скрыт</Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{report.post.content}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {report.post && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(report.post!)}
                              className="gap-1.5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Редактировать
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleHidden(report.post!.id, report.post!.is_hidden)}
                              className="gap-1.5"
                            >
                              {report.post.is_hidden ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  Показать
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  Скрыть
                                </>
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePost(report.post!.id)}
                              className="gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Удалить
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResolveReport(report.id)}
                          className="ml-auto"
                        >
                          Отклонить жалобу
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Posts Tab */}
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Все посты ({posts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {posts.slice(0, 50).map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    onEdit={() => handleOpenEdit(post)}
                    onToggleHidden={() => handleToggleHidden(post.id, post.is_hidden)}
                    onDelete={() => handleDeletePost(post.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hidden Posts Tab */}
        <TabsContent value="hidden" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <EyeOff className="w-5 h-5" />
                Скрытые посты ({hiddenPosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hiddenPosts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Нет скрытых постов
                </p>
              ) : (
                <div className="space-y-3">
                  {hiddenPosts.map((post) => (
                    <PostRow
                      key={post.id}
                      post={post}
                      onEdit={() => handleOpenEdit(post)}
                      onToggleHidden={() => handleToggleHidden(post.id, post.is_hidden)}
                      onDelete={() => handleDeletePost(post.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактирование поста</DialogTitle>
            <DialogDescription>
              Отредактируйте текст или выделите слово и нажмите "Зацензурировать" для замены на [УДАЛЕНО]
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">Автор:</span>{' '}
              <span className="font-medium">{editingPost?.author_name}</span>
            </div>

            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-40"
              placeholder="Содержимое поста..."
            />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const selection = window.getSelection()?.toString();
                  if (selection && selection.trim()) {
                    handleCensorWord(selection.trim());
                  } else {
                    toast({ title: 'Выделите слово для цензуры', variant: 'destructive' });
                  }
                }}
              >
                🚫 Зацензурировать выделенное
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditedContent(editedContent.replace(/\b(мат|оскорбление)\b/gi, '[УДАЛЕНО]'))}
              >
                Авто-фильтр
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit}>
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Helper component for post rows
const PostRow = ({ 
  post, 
  onEdit, 
  onToggleHidden, 
  onDelete 
}: { 
  post: DiscussionPost; 
  onEdit: () => void; 
  onToggleHidden: () => void; 
  onDelete: () => void; 
}) => (
  <div className={`p-4 border rounded-lg ${post.is_hidden ? 'border-muted bg-muted/30' : 'border-border'}`}>
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{post.author_name}</span>
          {post.is_hidden && <Badge variant="secondary">Скрыт</Badge>}
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ru })}
          </span>
        </div>
        <p className="text-sm line-clamp-2">{post.content}</p>
        <p className="text-xs text-muted-foreground mt-1">
          В: {post.discussion_title} • 👍 {post.likes || 0} • 👎 {post.dislikes || 0}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Редактировать">
          <Edit3 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleHidden} title={post.is_hidden ? 'Показать' : 'Скрыть'}>
          {post.is_hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete} title="Удалить">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  </div>
);