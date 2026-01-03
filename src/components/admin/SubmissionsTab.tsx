import { useState, useEffect } from 'react';
import { Trash2, Mail, MailOpen, Clock, Loader2, Shield, User, ChevronDown, ChevronUp, Paperclip, FileImage, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Submission {
  id: string;
  email: string | null;
  message: string;
  is_anonymous: boolean;
  is_read: boolean;
  created_at: string;
  attachments: string[] | null;
}

export const SubmissionsTab = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from('contact_submissions')
      .update({ is_read: !currentState })
      .eq('id', id);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      fetchSubmissions();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить обращение?')) return;

    const { error } = await supabase
      .from('contact_submissions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Обращение удалено' });
      fetchSubmissions();
    }
  };

  const unreadCount = submissions.filter(s => !s.is_read).length;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Обращения ({submissions.length})
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} новых</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Сообщения, отправленные через форму обратной связи
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Нет обращений
          </p>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => {
              const isExpanded = expandedId === submission.id;
              const messagePreview = submission.message.length > 60 
                ? submission.message.substring(0, 60) + '...' 
                : submission.message;

              return (
                <div
                  key={submission.id}
                  className={`border rounded-lg transition-colors ${
                    submission.is_read 
                      ? 'border-border bg-background' 
                      : 'border-primary/50 bg-primary/5'
                  }`}
                >
                  {/* Header - clickable */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : submission.id);
                      if (!submission.is_read) {
                        handleMarkRead(submission.id, false);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {submission.is_anonymous ? (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Анонимно
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {submission.email || 'Без email'}
                            </Badge>
                          )}
                          <Badge variant={submission.is_read ? 'secondary' : 'default'}>
                            {submission.is_read ? 'Прочитано' : 'Новое'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true, locale: ru })}
                          </span>
                        </div>
                        {!isExpanded && (
                          <p className="text-sm text-muted-foreground truncate">{messagePreview}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border">
                      <div className="pt-4">
                        <p className="text-sm whitespace-pre-wrap mb-4">{submission.message}</p>
                        
                        {/* Attachments */}
                        {submission.attachments && submission.attachments.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium mb-2 flex items-center gap-1">
                              <Paperclip className="w-4 h-4" />
                              Вложения ({submission.attachments.length})
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {submission.attachments.map((url, index) => {
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                return (
                                  <a
                                    key={index}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border border-border rounded-lg overflow-hidden hover:border-primary transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {isImage ? (
                                      <img 
                                        src={url} 
                                        alt={`Вложение ${index + 1}`}
                                        className="w-full h-24 object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-24 flex items-center justify-center bg-secondary">
                                        <FileText className="w-8 h-8 text-muted-foreground" />
                                      </div>
                                    )}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(submission.id, submission.is_read);
                            }}
                          >
                            {submission.is_read ? (
                              <>
                                <Mail className="w-4 h-4 mr-2" />
                                Отметить непрочитанным
                              </>
                            ) : (
                              <>
                                <MailOpen className="w-4 h-4 mr-2" />
                                Отметить прочитанным
                              </>
                            )}
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(submission.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Удалить
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
