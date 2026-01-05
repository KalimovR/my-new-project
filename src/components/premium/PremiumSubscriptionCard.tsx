import { useState } from 'react';
import { Crown, MessageSquare, Sparkles, Award, TrendingUp, Loader2, Check, Eye, Ban, Vote, Users, XCircle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PremiumSubscriptionCardProps {
  isPremium?: boolean;
}

export const PremiumSubscriptionCard = ({ isPremium }: PremiumSubscriptionCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { toast } = useToast();
  const { refetchProfile, profile } = useAuth();
  
  const benefits = [
    { icon: MessageSquare, text: 'Безлимит реплик (до 1000 слов)' },
    { icon: Sparkles, text: 'Эксклюзивные темы и инсайды' },
    { icon: Award, text: 'Бейдж «Всевидящий»' },
    { icon: TrendingUp, text: 'Приоритет в топ-5' },
    { icon: Ban, text: 'Без рекламы' },
    { icon: Users, text: 'Приватные чаты с участниками' },
    { icon: Vote, text: 'Голосование за будущий контент' },
  ];

  // Check if subscription is cancelled but still active
  const profileData = profile as any;
  const isCancelled = profileData?.subscription_cancelled === true;
  const expiresAt = profileData?.premium_expires_at ? new Date(profileData.premium_expires_at) : null;
  const isStillActive = expiresAt && expiresAt > new Date();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: 'Требуется авторизация',
          description: 'Войдите в аккаунт для оформления подписки',
          variant: 'destructive',
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-yookassa-payment', {
        body: { 
          returnUrl: `${window.location.origin}/profile?payment=success` 
        },
      });

      if (error) {
        throw error;
      }

      if (data?.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else {
        throw new Error('No confirmation URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Ошибка оплаты',
        description: 'Не удалось создать платёж. Попробуйте позже.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      if (!profile) {
        throw new Error('Профиль не найден');
      }

      // Mark subscription as cancelled but keep premium active until expiry
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_cancelled: true
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Автопродление отменено',
        description: expiresAt 
          ? `Подписка будет активна до ${format(expiresAt, 'd MMMM yyyy', { locale: ru })}`
          : 'Подписка будет активна до конца оплаченного периода',
      });

      // Refresh profile data
      refetchProfile?.();
    } catch (error) {
      console.error('Cancel subscription error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отменить подписку. Попробуйте позже.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setIsLoading(true);
    try {
      if (!profile) {
        throw new Error('Профиль не найден');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_cancelled: false
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: 'Автопродление включено',
        description: 'Подписка будет автоматически продлеваться',
      });

      refetchProfile?.();
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось возобновить подписку.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Active premium state
  if (isPremium) {
    return (
      <Card className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-primary/15 via-card to-amber-500/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-amber-500/10 opacity-60" />
        <CardContent className="relative p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <Eye className="w-6 h-6 text-white" />
              <Crown className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 drop-shadow-md" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-primary">Ты — Всевидящий!</h3>
              {isCancelled && expiresAt ? (
                <p className="text-sm text-amber-500">
                  Активна до {format(expiresAt, 'd MMMM yyyy', { locale: ru })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Премиум-подписка активна</p>
              )}
            </div>
          </div>

          {/* Cancelled notice */}
          {isCancelled && expiresAt && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Автопродление отменено</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Подписка будет активна до {format(expiresAt, 'd MMMM yyyy', { locale: ru })}. 
                После этого премиум-статус будет отключён.
              </p>
            </div>
          )}
          
          <ul className="space-y-3 mb-6">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <span className="text-foreground">{benefit.text}</span>
              </li>
            ))}
          </ul>

          {/* Reactivate or Cancel button */}
          {isCancelled ? (
            <Button 
              variant="outline" 
              className="w-full border-primary/50 text-primary hover:bg-primary/10"
              onClick={handleReactivateSubscription}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Возобновление...
                </>
              ) : (
                <>
                  <Crown className="w-4 h-4 mr-2" />
                  Возобновить автопродление
                </>
              )}
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Отменить подписку
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Отменить автопродление?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2">
                    <p>
                      Подписка останется активной до конца оплаченного периода
                      {expiresAt && ` (${format(expiresAt, 'd MMMM yyyy', { locale: ru })})`}.
                    </p>
                    <p className="mt-2">После этого вы потеряете доступ к:</p>
                    <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                      <li>Безлимитным репликам (до 1000 слов)</li>
                      <li>Эксклюзивным темам и инсайдам</li>
                      <li>Бейджу «Всевидящий»</li>
                      <li>Приватным чатам с участниками</li>
                      <li>Голосованию за будущий контент</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Оставить подписку</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleCancelSubscription}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Отмена...
                      </>
                    ) : (
                      'Отменить автопродление'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    );
  }

  // Non-premium state - upsell
  return (
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-br from-background via-primary/5 to-amber-500/10">
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-amber-500/5" />
      
      <CardContent className="relative p-6">
        {/* Header with icon */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg shadow-primary/25">
            <Eye className="w-7 h-7 text-white" />
            <Crown className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 drop-shadow-md" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-foreground">Стань Всевидящим</h3>
            <p className="text-sm text-muted-foreground">Премиум-подписка</p>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          Безлимитные реплики, эксклюзивные дискуссии, приоритет в топе.
        </p>

        {/* Benefits list with orange icons */}
        <ul className="space-y-3 mb-6">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <benefit.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-foreground">{benefit.text}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <Button 
          size="lg" 
          className="w-full bg-gradient-to-r from-primary via-primary to-amber-500 hover:from-primary/90 hover:via-primary/90 hover:to-amber-500/90 text-white font-bold text-base h-13 shadow-lg shadow-primary/30"
          onClick={handleSubscribe}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Создание платежа...
            </>
          ) : (
            <>
              <Crown className="w-5 h-5 mr-2" />
              Оформить за 99 ₽/мес
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground text-center mt-3">
          Отмена в любой момент
        </p>
      </CardContent>
    </Card>
  );
};
