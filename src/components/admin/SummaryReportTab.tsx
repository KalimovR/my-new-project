import { useState } from 'react';
import { FileText, Loader2, Download, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ru } from 'date-fns/locale';

type DateRangeType = 'week' | 'month' | 'custom' | 'year';

interface GenerationStatus {
  step: 'idle' | 'fetching' | 'analyzing' | 'generating' | 'done' | 'error';
  message: string;
}

export const SummaryReportTab = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRangeType, setDateRangeType] = useState<DateRangeType>('week');
  const [customDays, setCustomDays] = useState('7');
  const [exclusions, setExclusions] = useState('');
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({ step: 'idle', message: '' });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const getDateRange = () => {
    const now = new Date();
    
    switch (dateRangeType) {
      case 'week':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
          label: 'Текущая неделя'
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: 'Текущий месяц'
        };
      case 'year':
        return {
          start: startOfYear(now),
          end: endOfYear(now),
          label: 'Текущий год'
        };
      case 'custom':
        const days = parseInt(customDays) || 7;
        return {
          start: subDays(now, days),
          end: now,
          label: `Последние ${days} дней`
        };
      default:
        return {
          start: subWeeks(now, 1),
          end: now,
          label: 'Последняя неделя'
        };
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setPdfUrl(null);
    setGenerationStatus({ step: 'fetching', message: 'Загрузка статей и аналитики...' });

    try {
      const { start, end, label } = getDateRange();
      
      // Fetch articles from database
      setGenerationStatus({ step: 'fetching', message: 'Загрузка статей за период...' });
      
      const { data: articles, error: articlesError } = await supabase
        .from('articles')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (articlesError) {
        throw new Error(`Ошибка загрузки статей: ${articlesError.message}`);
      }

      if (!articles || articles.length === 0) {
        toast({
          title: 'Нет данных',
          description: 'За выбранный период нет опубликованных статей',
          variant: 'destructive',
        });
        setIsGenerating(false);
        setGenerationStatus({ step: 'idle', message: '' });
        return;
      }

      setGenerationStatus({ step: 'analyzing', message: `Анализ ${articles.length} статей...` });

      // Call edge function to generate PDF
      const { data, error } = await supabase.functions.invoke('generate-summary-report', {
        body: {
          articles,
          dateRange: {
            start: start.toISOString(),
            end: end.toISOString(),
            label
          },
          exclusions
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.pdfBase64) {
        // Convert base64 to blob and create download URL
        const binaryString = atob(data.pdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        
        setGenerationStatus({ step: 'done', message: 'PDF отчёт готов!' });
        toast({
          title: 'Успешно!',
          description: 'PDF отчёт сгенерирован',
        });
      } else {
        throw new Error('Не удалось получить PDF');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      setGenerationStatus({ step: 'error', message: error instanceof Error ? error.message : 'Неизвестная ошибка' });
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сгенерировать отчёт',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const { label } = getDateRange();
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Итоги_${label.replace(/\s/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      link.click();
    }
  };

  const { start, end, label } = getDateRange();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Генерация итогов
        </CardTitle>
        <CardDescription>
          ИИ проанализирует новости и аналитику за выбранный период и создаст стильный PDF-отчёт с инфографикой
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Date Range Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Период анализа</Label>
              <Select value={dateRangeType} onValueChange={(v) => setDateRangeType(v as DateRangeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Текущая неделя</SelectItem>
                  <SelectItem value="month">Текущий месяц</SelectItem>
                  <SelectItem value="year">Текущий год</SelectItem>
                  <SelectItem value="custom">Произвольный период</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRangeType === 'custom' && (
              <div className="space-y-2">
                <Label>Количество дней назад</Label>
                <Select value={customDays} onValueChange={setCustomDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 дня</SelectItem>
                    <SelectItem value="5">5 дней</SelectItem>
                    <SelectItem value="7">7 дней</SelectItem>
                    <SelectItem value="14">14 дней</SelectItem>
                    <SelectItem value="30">30 дней</SelectItem>
                    <SelectItem value="60">60 дней</SelectItem>
                    <SelectItem value="90">90 дней</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                Выбранный период
              </div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">
                {format(start, 'd MMMM yyyy', { locale: ru })} — {format(end, 'd MMMM yyyy', { locale: ru })}
              </p>
            </div>
          </div>

          {/* Exclusions and Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Исключения (необязательно)</Label>
              <Textarea
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
                placeholder="Что НЕ включать в анализ: темы, персоны, события (через запятую)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                ИИ не будет включать указанные темы в итоговый отчёт
              </p>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg">
              <h4 className="font-medium mb-2">PDF-отчёт будет содержать:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Обзор ключевых событий периода</li>
                <li>• Анализ трендов и тенденций</li>
                <li>• Прогноз возможных сценариев</li>
                <li>• Инфографика и визуализации</li>
                <li>• Источники и ссылки</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Generation Status */}
        {generationStatus.step !== 'idle' && generationStatus.step !== 'done' && (
          <div className="p-4 bg-secondary rounded-lg">
            <div className="flex items-center gap-3">
              {generationStatus.step === 'error' ? (
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                  <span className="text-destructive">✕</span>
                </div>
              ) : (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              )}
              <div>
                <p className="font-medium">
                  {generationStatus.step === 'fetching' && 'Загрузка данных...'}
                  {generationStatus.step === 'analyzing' && 'Анализ с помощью ИИ...'}
                  {generationStatus.step === 'generating' && 'Генерация PDF...'}
                  {generationStatus.step === 'error' && 'Ошибка'}
                </p>
                <p className="text-sm text-muted-foreground">{generationStatus.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success - Download Button */}
        {pdfUrl && generationStatus.step === 'done' && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-green-500">PDF готов к скачиванию</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </div>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="w-4 h-4" />
                Скачать PDF
              </Button>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button 
          onClick={handleGenerateReport} 
          disabled={isGenerating}
          className="w-full md:w-auto"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Сгенерировать итоги
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};