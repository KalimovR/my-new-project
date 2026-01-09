import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, EyeOff, Users, FileText, Sparkles, Loader2, Link2, ExternalLink, MessageSquare, Mail, Search, Crown, Send } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AIGenerationProgress } from '@/components/admin/AIGenerationProgress';
import { ModerationTab } from '@/components/admin/ModerationTab';
import { SubmissionsTab } from '@/components/admin/SubmissionsTab';
import { DiscussionsTab } from '@/components/admin/DiscussionsTab';
import { DiscussionModerationTab } from '@/components/admin/DiscussionModerationTab';
import { OnlineUsersIndicator } from '@/components/admin/OnlineUsersIndicator';
import { TelegramTab } from '@/components/admin/TelegramTab';

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  tags: string[];
  author_name: string | null;
  read_time: string | null;
  is_featured: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: 'admin' | 'editor' | 'user';
  is_premium: boolean;
}

interface AISource {
  id: string;
  name: string;
  url: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

type GenerationStep = 'idle' | 'text' | 'image' | 'saving' | 'done' | 'error';

const Admin = () => {
  const { user, isAdminOrEditor, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [articles, setArticles] = useState<Article[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [sources, setSources] = useState<AISource[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiExclusions, setAiExclusions] = useState('');
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiCategory, setAiCategory] = useState<'news' | 'analytics' | 'opinions'>('news');
  
  // Progress tracking state
  const [generationStep, setGenerationStep] = useState<GenerationStep>('idle');
  const [generatedTitle, setGeneratedTitle] = useState<string>('');
  const [generationError, setGenerationError] = useState<string>('');
  
  // Source management state
  const [editingSource, setEditingSource] = useState<AISource | null>(null);
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    name: '',
    url: '',
    description: '',
    is_active: true,
  });

  // Articles filtering state
  const [articlesSearchQuery, setArticlesSearchQuery] = useState('');
  const [articlesCategoryFilter, setArticlesCategoryFilter] = useState<'all' | 'news' | 'analytics' | 'opinions'>('all');
  // Article form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image_url: '',
    category: 'news',
    tags: '',
    author_name: '',
    read_time: '5 мин',
    is_featured: false,
    is_published: false,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    } else if (!isLoading && !isAdminOrEditor) {
      navigate('/');
      toast({
        title: 'Доступ запрещён',
        description: 'У вас нет прав для доступа к админ-панели',
        variant: 'destructive',
      });
    }
  }, [user, isAdminOrEditor, isLoading, navigate, toast]);

  useEffect(() => {
    if (isAdminOrEditor) {
      fetchArticles();
      if (isAdmin) {
        fetchUsers();
        fetchSources();
      }
    }
  }, [isAdminOrEditor, isAdmin]);

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить статьи',
        variant: 'destructive',
      });
    } else {
      setArticles(data || []);
    }
    setIsLoadingData(false);
  };

  const fetchUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*');

    if (rolesError) {
      console.error('Error fetching roles:', rolesError);
      return;
    }

    const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
      const userRole = roles?.find((r) => r.user_id === profile.user_id);
      return {
        ...profile,
        role: (userRole?.role || 'user') as 'admin' | 'editor' | 'user',
        is_premium: profile.is_premium || false,
      };
    });

    setUsers(usersWithRoles);
  };

  const fetchSources = async () => {
    const { data, error } = await supabase
      .from('ai_sources')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching sources:', error);
    } else {
      setSources(data || []);
    }
  };

  const resetSourceForm = () => {
    setSourceForm({
      name: '',
      url: '',
      description: '',
      is_active: true,
    });
    setEditingSource(null);
  };

  const handleCreateOrUpdateSource = async () => {
    if (!sourceForm.name || !sourceForm.url) {
      toast({
        title: 'Ошибка',
        description: 'Название и URL обязательны',
        variant: 'destructive',
      });
      return;
    }

    const sourceData = {
      name: sourceForm.name,
      url: sourceForm.url,
      description: sourceForm.description || null,
      is_active: sourceForm.is_active,
    };

    if (editingSource) {
      const { error } = await supabase
        .from('ai_sources')
        .update(sourceData)
        .eq('id', editingSource.id);

      if (error) {
        toast({
          title: 'Ошибка',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Источник обновлён' });
        fetchSources();
        setSourceDialogOpen(false);
        resetSourceForm();
      }
    } else {
      const { error } = await supabase.from('ai_sources').insert(sourceData);

      if (error) {
        toast({
          title: 'Ошибка',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Источник добавлен' });
        fetchSources();
        setSourceDialogOpen(false);
        resetSourceForm();
      }
    }
  };

  const handleEditSource = (source: AISource) => {
    setEditingSource(source);
    setSourceForm({
      name: source.name,
      url: source.url,
      description: source.description || '',
      is_active: source.is_active,
    });
    setSourceDialogOpen(true);
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Удалить источник?')) return;

    const { error } = await supabase.from('ai_sources').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Источник удалён' });
      fetchSources();
    }
  };

  const handleToggleSourceActive = async (source: AISource) => {
    const { error } = await supabase
      .from('ai_sources')
      .update({ is_active: !source.is_active })
      .eq('id', source.id);

    if (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      fetchSources();
    }
  };

  const generateSlug = (title: string) => {
    // Cyrillic to Latin transliteration map
    const translitMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      // Ukrainian specific
      'і': 'i', 'ї': 'yi', 'є': 'ye', 'ґ': 'g'
    };

    const transliterate = (text: string): string => {
      return text
        .toLowerCase()
        .split('')
        .map(char => translitMap[char] ?? char)
        .join('');
    };

    return transliterate(title)
      .replace(/[^a-z0-9\s-]/g, '') // Keep only ASCII letters, numbers, spaces, hyphens
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Remove duplicate hyphens
      .replace(/^-|-$/g, '')        // Trim hyphens from start/end
      .substring(0, 60) + '-' + Date.now().toString(36);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      image_url: '',
      category: 'news',
      tags: '',
      author_name: '',
      read_time: '5 мин',
      is_featured: false,
      is_published: false,
    });
    setEditingArticle(null);
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.title) {
      toast({
        title: 'Ошибка',
        description: 'Заголовок обязателен',
        variant: 'destructive',
      });
      return;
    }

    const articleData = {
      title: formData.title,
      slug: formData.slug || generateSlug(formData.title),
      excerpt: formData.excerpt || null,
      content: formData.content || null,
      image_url: formData.image_url || null,
      category: formData.category,
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
      author_name: formData.author_name || null,
      read_time: formData.read_time || '5 мин',
      is_featured: formData.is_featured,
      is_published: formData.is_published,
      published_at: formData.is_published ? new Date().toISOString() : null,
    };

    if (editingArticle) {
      const { error } = await supabase
        .from('articles')
        .update(articleData)
        .eq('id', editingArticle.id);

      if (error) {
        toast({
          title: 'Ошибка',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Статья обновлена' });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        fetchArticles();
        setIsDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from('articles').insert(articleData);

      if (error) {
        toast({
          title: 'Ошибка',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Статья создана' });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        fetchArticles();
        setIsDialogOpen(false);
        resetForm();
      }
    }
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || '',
      content: article.content || '',
      image_url: article.image_url || '',
      category: article.category,
      tags: article.tags?.join(', ') || '',
      author_name: article.author_name || '',
      read_time: article.read_time || '5 мин',
      is_featured: article.is_featured || false,
      is_published: article.is_published || false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить статью?')) return;

    const { error } = await supabase.from('articles').delete().eq('id', id);

    if (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Статья удалена' });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      fetchArticles();
    }
  };

  const handleTogglePublish = async (article: Article) => {
    const { error } = await supabase
      .from('articles')
      .update({
        is_published: !article.is_published,
        published_at: !article.is_published ? new Date().toISOString() : null,
      })
      .eq('id', article.id);

    if (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      fetchArticles();
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'editor' | 'user') => {
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      toast({
        title: 'Ошибка',
        description: deleteError.message,
        variant: 'destructive',
      });
      return;
    }

    const { error: insertError } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: newRole });

    if (insertError) {
      toast({
        title: 'Ошибка',
        description: insertError.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Роль обновлена' });
      fetchUsers();
    }
  };

  const handleTogglePremium = async (userItem: UserWithRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: !userItem.is_premium })
      .eq('user_id', userItem.user_id);

    if (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ 
        title: userItem.is_premium ? 'Премиум отозван' : 'Премиум выдан',
        description: `Пользователь ${userItem.display_name || userItem.email}`,
      });
      fetchUsers();
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setGenerationStep('text');
    setGeneratedTitle('');
    setGenerationError('');
    setAiDialogOpen(false);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-article`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            category: aiCategory,
            topic: aiTopic || undefined,
            exclusions: aiExclusions || undefined,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.step === 'text') {
                setGenerationStep('text');
              } else if (data.step === 'text_done') {
                setGeneratedTitle(data.title || '');
              } else if (data.step === 'image') {
                setGenerationStep('image');
              } else if (data.step === 'image_done') {
                // Image completed
              } else if (data.step === 'saving') {
                setGenerationStep('saving');
              } else if (data.step === 'done') {
                setGenerationStep('done');
                const article = data.article;
                if (article) {
                  setGeneratedTitle(article.title);
                  setTimeout(() => {
                    toast({
                      title: 'Статья создана!',
                      description: `"${article.title}" добавлена как черновик`,
                    });
                    setIsGenerating(false);
                    setGenerationStep('idle');
                    setAiTopic('');
                    setAiExclusions('');
                    fetchArticles();
                  }, 2000);
                }
              } else if (data.step === 'error') {
                setGenerationStep('error');
                setGenerationError(data.message || 'Неизвестная ошибка');
                setTimeout(() => {
                  setIsGenerating(false);
                  setGenerationStep('idle');
                }, 3000);
              }
            } catch (e) {
              console.error('SSE parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('AI generation error:', error);
      setGenerationStep('error');
      setGenerationError(error instanceof Error ? error.message : 'Не удалось создать статью');
      toast({
        title: 'Ошибка генерации',
        description: error instanceof Error ? error.message : 'Не удалось создать статью',
        variant: 'destructive',
      });
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationStep('idle');
      }, 3000);
    }
  };

  if (isLoading || isLoadingData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!isAdminOrEditor) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold">Админ-панель</h1>
              <p className="text-muted-foreground">Управление контентом сайта</p>
            </div>
            <OnlineUsersIndicator />
          </div>
          <div className="flex items-center gap-2">
            {/* AI Generation Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Статья
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { setAiCategory('news'); setAiDialogOpen(true); }}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  + Новая AI Новость
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setAiCategory('analytics'); setAiDialogOpen(true); }}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  + Новая AI Аналитика
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setAiCategory('opinions'); setAiDialogOpen(true); }}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  + Новое AI Мнение
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Новая статья
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingArticle ? 'Редактировать статью' : 'Новая статья'}</DialogTitle>
                <DialogDescription>
                  Заполните поля для {editingArticle ? 'редактирования' : 'создания'} статьи
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Заголовок *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Заголовок статьи"
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL (slug)</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="Оставьте пустым для автогенерации"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="news">Новости</SelectItem>
                        <SelectItem value="analytics">Аналитика</SelectItem>
                        <SelectItem value="opinions">Мнения</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Время чтения</Label>
                    <Input
                      value={formData.read_time}
                      onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                      placeholder="5 мин"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Краткое описание</Label>
                  <Textarea
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="Краткое описание для карточки"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Содержание</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Полный текст статьи (поддерживает Markdown)"
                    rows={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL изображения</Label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Автор</Label>
                    <Input
                      value={formData.author_name}
                      onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                      placeholder="Имя автора"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Теги (через запятую)</Label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="политика, экономика"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                    />
                    <Label>Показывать в топе</Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_published}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                    />
                    <Label>Опубликовать</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleCreateOrUpdate}>
                  {editingArticle ? 'Сохранить' : 'Создать'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>

          {/* AI Generation Dialog */}
          <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Создать AI {aiCategory === 'news' ? 'Новость' : aiCategory === 'analytics' ? 'Аналитику' : 'Мнение'}
                </DialogTitle>
                <DialogDescription>
                  ИИ Grok создаст статью на основе темы
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-topic">Тема (необязательно)</Label>
                  <Input
                    id="ai-topic"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Оставьте пустым для автовыбора темы"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ai-exclusions">Исключения (необязательно)</Label>
                  <Textarea
                    id="ai-exclusions"
                    value={aiExclusions}
                    onChange={(e) => setAiExclusions(e.target.value)}
                    placeholder="Что НЕ упоминать: темы, персоны, источники (через запятую)"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">
                    ИИ не будет использовать информацию и источники, связанные с указанными темами
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={handleGenerateAI} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Создать
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="w-4 h-4" />
              Статьи
            </TabsTrigger>
            <TabsTrigger value="moderation" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Модерация
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <Mail className="w-4 h-4" />
              Предложка
            </TabsTrigger>
            <TabsTrigger value="discussions" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Обсуждения
            </TabsTrigger>
            <TabsTrigger value="discussion-moderation" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Мод. реплик
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Пользователи
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="sources" className="gap-2">
                <Link2 className="w-4 h-4" />
                Источники AI
              </TabsTrigger>
            )}
            <TabsTrigger value="telegram" className="gap-2">
              <Send className="w-4 h-4" />
              Telegram
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Все статьи</CardTitle>
                    <CardDescription>Управление статьями, новостями и аналитикой</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Поиск по заголовку..."
                        value={articlesSearchQuery}
                        onChange={(e) => setArticlesSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-[250px]"
                      />
                    </div>
                    <Select value={articlesCategoryFilter} onValueChange={(v) => setArticlesCategoryFilter(v as any)}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Категория" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="news">Новости</SelectItem>
                        <SelectItem value="analytics">Аналитика</SelectItem>
                        <SelectItem value="opinions">Мнения</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const filteredArticles = articles.filter((article) => {
                    const matchesSearch = article.title.toLowerCase().includes(articlesSearchQuery.toLowerCase());
                    const matchesCategory = articlesCategoryFilter === 'all' || article.category === articlesCategoryFilter;
                    return matchesSearch && matchesCategory;
                  });
                  
                  if (filteredArticles.length === 0) {
                    return (
                      <p className="text-center text-muted-foreground py-8">
                        {articles.length === 0 ? 'Статьи не найдены. Создайте первую статью!' : 'Нет статей по заданным фильтрам'}
                      </p>
                    );
                  }
                  
                  return (
                    <div className="space-y-4">
                      {filteredArticles.map((article) => (
                      <div
                        key={article.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{article.title}</h3>
                            <Badge variant={article.is_published ? 'default' : 'secondary'}>
                              {article.is_published ? 'Опубликовано' : 'Черновик'}
                            </Badge>
                            <Badge variant="outline">{article.category}</Badge>
                            {article.is_featured && (
                              <Badge variant="outline" className="text-primary border-primary">
                                В топе
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {article.excerpt || 'Нет описания'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(article.created_at).toLocaleDateString('ru-RU')}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePublish(article)}
                            title={article.is_published ? 'Снять с публикации' : 'Опубликовать'}
                          >
                            {article.is_published ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(article)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(article.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="moderation">
            <ModerationTab />
          </TabsContent>

          <TabsContent value="submissions">
            <SubmissionsTab />
          </TabsContent>

          <TabsContent value="discussions">
            <Card>
              <CardHeader>
                <CardTitle>Управление обсуждениями</CardTitle>
                <CardDescription>Создание дискуссий и модерация постов</CardDescription>
              </CardHeader>
              <CardContent>
                <DiscussionsTab />
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Пользователи</CardTitle>
                  <CardDescription>Управление ролями пользователей</CardDescription>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Пользователи не найдены
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{u.display_name || u.email}</p>
                                {u.is_premium && (
                                  <Badge variant="outline" className="border-primary/50 text-primary">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Премиум
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              variant={u.is_premium ? "destructive" : "outline"}
                              size="sm"
                              onClick={() => handleTogglePremium(u)}
                              className={u.is_premium ? "" : "border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"}
                            >
                              <Crown className="w-4 h-4 mr-1" />
                              {u.is_premium ? 'Отозвать' : 'Выдать премиум'}
                            </Button>
                            <Select
                              value={u.role}
                              onValueChange={(value) =>
                                handleRoleChange(u.user_id, value as 'admin' | 'editor' | 'user')
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Пользователь</SelectItem>
                                <SelectItem value="editor">Редактор</SelectItem>
                                <SelectItem value="admin">Админ</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="discussion-moderation">
            <DiscussionModerationTab />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="sources">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Источники для AI</CardTitle>
                    <CardDescription>Управление источниками новостей для генерации статей</CardDescription>
                  </div>
                  <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetSourceForm}>
                        <Plus className="w-4 h-4 mr-2" />
                        Добавить источник
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingSource ? 'Редактировать источник' : 'Новый источник'}</DialogTitle>
                        <DialogDescription>
                          Добавьте источник новостей для использования AI при генерации статей
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Название *</Label>
                          <Input
                            value={sourceForm.name}
                            onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                            placeholder="Reuters, BBC News..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>URL *</Label>
                          <Input
                            value={sourceForm.url}
                            onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })}
                            placeholder="https://www.reuters.com/"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Описание</Label>
                          <Textarea
                            value={sourceForm.description}
                            onChange={(e) => setSourceForm({ ...sourceForm, description: e.target.value })}
                            placeholder="Международное новостное агентство"
                            rows={2}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={sourceForm.is_active}
                            onCheckedChange={(checked) => setSourceForm({ ...sourceForm, is_active: checked })}
                          />
                          <Label>Активен</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setSourceDialogOpen(false)}>
                          Отмена
                        </Button>
                        <Button onClick={handleCreateOrUpdateSource}>
                          {editingSource ? 'Сохранить' : 'Добавить'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {sources.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Источники не найдены. Добавьте первый источник!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sources.map((source) => (
                        <div
                          key={source.id}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                            source.is_active ? 'border-border hover:bg-secondary/50' : 'border-border/50 bg-muted/30 opacity-60'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium">{source.name}</h3>
                              <Badge variant={source.is_active ? 'default' : 'secondary'}>
                                {source.is_active ? 'Активен' : 'Отключён'}
                              </Badge>
                            </div>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              {source.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            {source.description && (
                              <p className="text-sm text-muted-foreground mt-1">{source.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleSourceActive(source)}
                              title={source.is_active ? 'Отключить' : 'Включить'}
                            >
                              {source.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSource(source)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteSource(source.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="telegram">
            <TelegramTab articles={articles} />
          </TabsContent>
        </Tabs>

        {/* AI Generation Progress Dialog */}
        <AIGenerationProgress
          isOpen={isGenerating}
          currentStep={generationStep}
          category={aiCategory}
          articleTitle={generatedTitle}
          error={generationError}
        />
      </div>
    </Layout>
  );
};

export default Admin;
