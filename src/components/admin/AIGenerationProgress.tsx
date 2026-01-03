import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Loader2, Sparkles, Image, Database, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIGenerationProgressProps {
  isOpen: boolean;
  currentStep: 'idle' | 'text' | 'image' | 'saving' | 'done' | 'error';
  category: 'news' | 'analytics' | 'opinions';
  articleTitle?: string;
  error?: string;
}

const categoryLabels = {
  news: 'новость',
  analytics: 'аналитику',
  opinions: 'мнение',
};

const steps = [
  { id: 'text', label: 'Генерация текста', icon: FileText },
  { id: 'image', label: 'Создание изображения', icon: Image },
  { id: 'saving', label: 'Сохранение в базу данных', icon: Database },
];

export const AIGenerationProgress = ({
  isOpen,
  currentStep,
  category,
  articleTitle,
  error,
}: AIGenerationProgressProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (currentStep === 'idle') {
      setProgress(0);
    } else if (currentStep === 'text') {
      setProgress(15);
      const timer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 40));
      }, 200);
      return () => clearInterval(timer);
    } else if (currentStep === 'image') {
      setProgress(45);
      const timer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 1, 75));
      }, 300);
      return () => clearInterval(timer);
    } else if (currentStep === 'saving') {
      setProgress(80);
      const timer = setInterval(() => {
        setProgress((prev) => Math.min(prev + 2, 95));
      }, 100);
      return () => clearInterval(timer);
    } else if (currentStep === 'done') {
      setProgress(100);
    } else if (currentStep === 'error') {
      // Keep current progress on error
    }
  }, [currentStep]);

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['text', 'image', 'saving', 'done'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(stepId);

    if (currentStep === 'error') {
      if (stepIndex < currentIndex) return 'completed';
      if (stepIndex === currentIndex) return 'error';
      return 'pending';
    }

    if (stepIndex < currentIndex || currentStep === 'done') return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Генерация AI {categoryLabels[category]}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">{progress}%</p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step) => {
              const status = getStepStatus(step.id);
              const Icon = step.icon;

              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg transition-all',
                    status === 'active' && 'bg-primary/10 border border-primary/20',
                    status === 'completed' && 'bg-green-500/10',
                    status === 'error' && 'bg-destructive/10',
                    status === 'pending' && 'opacity-50'
                  )}
                >
                  <div className="flex-shrink-0">
                    {status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : status === 'active' ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : status === 'error' ? (
                      <Circle className="w-5 h-5 text-destructive" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon className={cn(
                      'w-4 h-4',
                      status === 'active' && 'text-primary',
                      status === 'completed' && 'text-green-500',
                      status === 'error' && 'text-destructive'
                    )} />
                    <span className={cn(
                      'font-medium',
                      status === 'active' && 'text-primary',
                      status === 'completed' && 'text-green-500'
                    )}>
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Article title preview */}
          {articleTitle && currentStep !== 'text' && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Заголовок:</p>
              <p className="font-medium text-sm">{articleTitle}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Success message */}
          {currentStep === 'done' && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium text-green-600">Статья успешно создана!</p>
              <p className="text-sm text-muted-foreground">Добавлена как черновик</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
