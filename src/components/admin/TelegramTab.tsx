import { useState } from 'react';
import { Loader2, Send, Copy, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Article {
  id: string;
  title: string;
  category: string;
  is_published: boolean;
  created_at: string;
}

interface TelegramTabProps {
  articles: Article[];
}

export const TelegramTab = ({ articles }: TelegramTabProps) => {
  const { toast } = useToast();
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [shortenedText, setShortenedText] = useState('');
  const [copied, setCopied] = useState(false);

  const publishedArticles = articles.filter(a => a.is_published);

  const handleGenerate = async () => {
    if (!selectedArticleId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите статью для сокращения',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setShortenedText('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Требуется авторизация');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shorten-for-telegram`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ articleId: selectedArticleId }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Не удалось сократить статью');
      }

      setShortenedText(result.shortenedText);
      toast({
        title: 'Готово!',
        description: 'Текст для Telegram создан',
      });
    } catch (error) {
      console.error('Error generating telegram post:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать текст',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortenedText);
      setCopied(true);
      toast({
        title: 'Скопировано!',
        description: 'Текст скопирован в буфер обмена',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать текст',
        variant: 'destructive',
      });
    }
  };

  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Посты для Telegram
        </CardTitle>
        <CardDescription>
          Сокращение статей до 50-150 слов для публикации в Telegram-канале
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Article Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Выберите статью</label>
          <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите опубликованную статью..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {publishedArticles.length === 0 ? (
                <SelectItem value="none" disabled>
                  Нет опубликованных статей
                </SelectItem>
              ) : (
                publishedArticles.map((article) => (
                  <SelectItem key={article.id} value={article.id}>
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[400px]">{article.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {article.category}
                      </Badge>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Article Info */}
        {selectedArticle && (
          <div className="p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{selectedArticle.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedArticle.created_at).toLocaleDateString('ru-RU')} • {selectedArticle.category}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate} 
          disabled={!selectedArticleId || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Создать пост для Telegram
            </>
          )}
        </Button>

        {/* Result */}
        {shortenedText && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Результат</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Копировать
                  </>
                )}
              </Button>
            </div>
            <Textarea
              value={shortenedText}
              onChange={(e) => setShortenedText(e.target.value)}
              rows={8}
              className="font-mono text-sm"
              placeholder="Сокращённый текст появится здесь..."
            />
            <p className="text-xs text-muted-foreground text-right">
              ~{shortenedText.split(/\s+/).filter(Boolean).length} слов
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};