import { useState } from 'react';
import { useUserGamificationStats } from '@/hooks/useGamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Eye, Flame, Award, Bird, Crown, Calendar, Check, Search, Sparkles, Moon, Zap, ThumbsDown, Heart, Clock, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface GamificationSectionProps {
  userId: string;
}

const badgeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cynic: { label: 'Циник', icon: <Award className="w-3 h-3" />, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  debater: { label: 'Полемист', icon: <Award className="w-3 h-3" />, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  analyst: { label: 'Аналитик', icon: <Award className="w-3 h-3" />, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  provocateur: { label: 'Провокатор', icon: <Award className="w-3 h-3" />, color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  top_argumentator: { label: 'Топ-аргументатор', icon: <Eye className="w-3 h-3" />, color: 'bg-primary/10 text-primary border-primary/20' },
  'всевидящий': { label: 'Всевидящий', icon: <Crown className="w-3 h-3" />, color: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-500 border-yellow-500/30' },
  // New badges
  truth_seeker: { label: 'Искатель правды', icon: <Search className="w-3 h-3" />, color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' },
  conspiracy_master: { label: 'Мастер заговоров', icon: <Sparkles className="w-3 h-3" />, color: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30' },
  night_owl: { label: 'Ночной аналитик', icon: <Moon className="w-3 h-3" />, color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  first_blood: { label: 'Первопроходец', icon: <Zap className="w-3 h-3" />, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  skeptic: { label: 'Скептик', icon: <ThumbsDown className="w-3 h-3" />, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  influencer: { label: 'Инфлюенсер', icon: <Heart className="w-3 h-3" />, color: 'bg-pink-500/10 text-pink-500 border-pink-500/20' },
  veteran: { label: 'Ветеран', icon: <Clock className="w-3 h-3" />, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  insider: { label: 'Инсайдер', icon: <Shield className="w-3 h-3" />, color: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30' },
};

export const GamificationSection = ({ userId }: GamificationSectionProps) => {
  const { data: stats, isLoading } = useUserGamificationStats(userId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSelectBadge = async (badgeType: string) => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    const newValue = stats?.selectedBadge === badgeType ? null : badgeType;
    
    const { error } = await supabase
      .from('profiles')
      .update({ custom_badge: newValue })
      .eq('user_id', userId);
    
    setIsUpdating(false);
    
    if (error) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } else {
      queryClient.invalidateQueries({ queryKey: ['user-gamification', userId] });
      toast({ 
        title: newValue ? 'Бейдж выбран!' : 'Бейдж снят',
        description: newValue ? `Теперь "${badgeLabels[newValue]?.label}" будет отображаться рядом с вашим именем` : 'Бейдж больше не отображается'
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border animate-pulse">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Достижения
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Достижения
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Karma */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Star className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Карма</p>
              <p className="text-2xl font-bold text-primary">{stats.karma.toLocaleString()}</p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>+1000 за топ-1</p>
            <p>+500 за топ-5</p>
          </div>
        </div>

        {/* Premium Bank - only show if there are banked months */}
        {stats.bankedPremiumMonths > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border border-yellow-500/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center">
                <Bird className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">Копилка премиума</p>
                  <Crown className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-yellow-500">{stats.bankedPremiumMonths} мес.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  🎁 Бесплатные месяцы за попадание в топ-5
                </p>
              </div>
            </div>
            {stats.premiumExpiresAt && (
              <div className="mt-3 pt-3 border-t border-yellow-500/20 flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>Активируется после {format(new Date(stats.premiumExpiresAt), 'd MMMM yyyy', { locale: ru })}</span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
            <Flame className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.top1Posts}</p>
            <p className="text-xs text-muted-foreground">Топ-1 постов</p>
          </div>
          <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
            <Trophy className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.topPosts}</p>
            <p className="text-xs text-muted-foreground">В топ-5</p>
          </div>
        </div>

        {/* Badges */}
        {stats.badges.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Бейджи</p>
              <p className="text-xs text-muted-foreground">Нажмите, чтобы выбрать активный</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {stats.badges.map((badge) => {
                const info = badgeLabels[badge];
                if (!info) return null;
                const isSelected = stats.selectedBadge === badge;
                return (
                  <Badge
                    key={badge}
                    variant="outline"
                    onClick={() => handleSelectBadge(badge)}
                    className={`${info.color} py-1.5 px-3 cursor-pointer transition-all hover:scale-105 ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                    } ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {isSelected && <Check className="w-3 h-3 mr-1" />}
                    {info.icon}
                    <span className="ml-1.5">{info.label}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {stats.badges.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Участвуйте в дискуссиях, чтобы получить бейджи!
          </p>
        )}
      </CardContent>
    </Card>
  );
};
