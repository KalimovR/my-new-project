import { Layout } from '@/components/layout/Layout';
import { SEOHead } from '@/components/seo/SEOHead';
import { useDiscussions } from '@/hooks/useDiscussions';
import { useAuth } from '@/hooks/useAuth';
import { DiscussionCard } from '@/components/discussions/DiscussionCard';
import { AIRecommendations } from '@/components/premium/AIRecommendations';
import { ContentVotingSection } from '@/components/premium/ContentVotingCard';
import { AdBanner } from '@/components/news/AdBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Crown, Eye, Sparkles, Ban, Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const Discussions = () => {
  const { data: discussions, isLoading } = useDiscussions();
  const { profile } = useAuth();
  
  const isPremium = profile?.is_premium;

  return (
    <Layout>
      <SEOHead
        title="Обсуждения — Контекст"
        description="Дискуссии о политике, экономике и обществе. Спорьте, аргументируйте, меняйте мнения."
      />

      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Header */}
            <div className="mb-8 sm:mb-12">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-black">Обсуждения</h1>
                {isPremium && (
                  <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white border-0 gap-1">
                    <Eye className="w-3 h-3" />
                    Всевидящий
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl">
                Площадка для тех, кто не боится аргументов. Каждый раунд — 72 часа. 
                Лучшие реплики выходят в топ. Без цензуры, но с модерацией.
              </p>
              
              {/* Premium benefits hint */}
              {isPremium && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-full px-3 py-1.5">
                    <Ban className="w-3 h-3" />
                    <span>Без рекламы</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-full px-3 py-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>AI рекомендации</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-full px-3 py-1.5">
                    <Crown className="w-3 h-3" />
                    <span>Эксклюзивы</span>
                  </div>
                </div>
              )}
            </div>

            {/* Development notice */}
            <div className="mb-6 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10">
              <div className="flex items-start gap-3">
                <Construction className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-500">Раздел в разработке</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Мы активно работаем над функционалом обсуждений. Возможны ошибки и недоработки. 
                    Спасибо за понимание!
                  </p>
                </div>
              </div>
            </div>

            {/* Ad banner for non-premium */}
            {!isPremium && (
              <div className="mb-6">
                <AdBanner size="728x90" isEmpty={true} />
              </div>
            )}

            {/* Discussions Grid */}
            {isLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-2xl" />
                ))}
              </div>
            ) : discussions && discussions.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {discussions.map((discussion) => (
                  <DiscussionCard key={discussion.id} discussion={discussion} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">Пока нет активных обсуждений</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Recommendations for premium */}
            <AIRecommendations />
            
            {/* Content Voting for premium */}
            <ContentVotingSection />
            
            {/* Ad for non-premium */}
            {!isPremium && (
              <AdBanner size="300x250" isEmpty={true} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Discussions;
