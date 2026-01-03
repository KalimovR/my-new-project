import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronDown, Mail, Lock, User, Save, Bookmark, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useBookmarks } from '@/hooks/useBookmarks';
import { z } from 'zod';

const emailSchema = z.string().email('Некорректный email адрес');
const passwordSchema = z.string().min(6, 'Пароль должен быть минимум 6 символов');

const Profile = () => {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);

  const { bookmarks, isLoading: bookmarksLoading, removeBookmark } = useBookmarks();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = emailSchema.safeParse(newEmail);
    if (!result.success) {
      toast({
        title: 'Ошибка',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Успешно',
        description: 'На новый email отправлено письмо для подтверждения',
      });
      setNewEmail('');
      setEmailOpen(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = passwordSchema.safeParse(newPassword);
    if (!result.success) {
      toast({
        title: 'Ошибка',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Ошибка',
        description: 'Пароли не совпадают',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Успешно',
        description: 'Пароль успешно изменен',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOpen(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Успешно',
        description: 'Профиль обновлен',
      });
      setProfileOpen(false);
    }
  };

  const handleRemoveBookmark = async (articleId: string) => {
    const { error } = await removeBookmark(articleId);
    if (error) {
      toast({
        title: 'Ошибка',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Удалено из закладок',
      });
    }
  };

  return (
    <Layout>
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-2xl">Личный кабинет</CardTitle>
              <p className="text-muted-foreground">{user.email}</p>
            </CardHeader>
          </Card>

          {/* Закладки */}
          <Collapsible open={bookmarksOpen} onOpenChange={setBookmarksOpen}>
            <Card className="bg-card border-border">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bookmark className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Закладки ({bookmarks.length})</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${bookmarksOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {bookmarksLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : bookmarks.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      У вас пока нет закладок
                    </p>
                  ) : (
                    bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        {bookmark.article?.image_url && (
                          <img
                            src={bookmark.article.image_url}
                            alt=""
                            className="w-16 h-12 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/article/${bookmark.article?.slug}`}
                            className="font-medium text-sm hover:text-primary transition-colors line-clamp-1"
                          >
                            {bookmark.article?.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {bookmark.article?.category === 'news' ? 'Новость' : 
                             bookmark.article?.category === 'analytics' ? 'Аналитика' : 'Мнение'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-8 w-8"
                          >
                            <Link to={`/article/${bookmark.article?.slug}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveBookmark(bookmark.article_id)}
                          >
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Изменить имя */}
          <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
            <Card className="bg-card border-border">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Изменить имя</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Отображаемое имя</Label>
                      <Input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ваше имя"
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                  </form>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Изменить email */}
          <Collapsible open={emailOpen} onOpenChange={setEmailOpen}>
            <Card className="bg-card border-border">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Изменить email</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${emailOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <form onSubmit={handleEmailChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentEmail">Текущий email</Label>
                      <Input
                        id="currentEmail"
                        type="email"
                        value={user.email || ''}
                        disabled
                        className="opacity-60"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newEmail">Новый email</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new@email.com"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Сохранение...' : 'Изменить email'}
                    </Button>
                  </form>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Изменить пароль */}
          <Collapsible open={passwordOpen} onOpenChange={setPasswordOpen}>
            <Card className="bg-card border-border">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Lock className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Изменить пароль</CardTitle>
                    </div>
                    <ChevronDown className={`h-5 w-5 transition-transform ${passwordOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Новый пароль</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Минимум 6 символов"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Повторите пароль"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Сохранение...' : 'Изменить пароль'}
                    </Button>
                  </form>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
