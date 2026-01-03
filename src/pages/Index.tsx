import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/news/HeroSection';
import { NewsCard } from '@/components/news/NewsCard';
import { Sidebar } from '@/components/news/Sidebar';
import { AdBanner } from '@/components/news/AdBanner';
import { useArticles } from '@/hooks/useArticles';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { WebsiteStructuredData } from '@/components/seo/StructuredData';
import { Analytics, SearchConsoleVerification } from '@/components/seo/Analytics';
import { ArrowRight, Loader2 } from 'lucide-react';

const Index = () => {
  const { articles: dbArticles, isLoading } = useArticles();
  
  // Map database articles to the format expected by NewsCard
  const mappedDbArticles = dbArticles
    .filter(a => a.is_published)
    .slice(0, 8)
    .map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      content: a.content || '',
      image: a.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
      category: a.category as 'news' | 'analytics' | 'opinions',
      date: a.published_at ? new Date(a.published_at).toLocaleDateString('ru-RU') : '',
      author: a.author_name || 'Редакция',
      readTime: a.read_time || '5 мин',
      tags: a.tags || [],
    }));

  return (
    <Layout>
      {/* SEO */}
      <SEOHead
        title="Главная"
        description="Контекст — независимое издание 2026. Свежие новости, аналитика, расследования и экспертные мнения без корпоративного влияния."
        keywords={['новости', 'аналитика', 'расследования', 'политика', 'экономика', '2026']}
        url="/"
      />
      <WebsiteStructuredData />
      <Analytics />
      <SearchConsoleVerification verificationCode="YOUR_VERIFICATION_CODE" />

      {/* Hero */}
      <HeroSection />

      {/* Ad Banner - hidden on mobile */}
      <div className="container mx-auto mb-6 sm:mb-10 hidden sm:block">
        <AdBanner size="728x90" />
      </div>

      {/* Main Content */}
      <section className="container mx-auto pb-10 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 sm:gap-8 lg:gap-10">
          {/* Articles Grid */}
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center justify-between mb-5 sm:mb-8">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black">Последние новости</h2>
              <Link to="/news">
                <Button variant="ghost" className="text-primary hover:text-primary/80 font-semibold gap-1 sm:gap-2 text-sm sm:text-base px-2 sm:px-4">
                  <span className="hidden sm:inline">Все новости</span>
                  <span className="sm:hidden">Все</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground text-sm sm:text-base">Загрузка новостей...</p>
              </div>
            ) : mappedDbArticles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {mappedDbArticles.map((article, index) => (
                  <div
                    key={article.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <NewsCard article={article} />
                  </div>
                ))}
              </div>
            ) : null}
            
            {/* Load More */}
            {mappedDbArticles.length > 0 && (
              <div className="mt-8 sm:mt-10 text-center">
                <Link to="/news">
                  <Button size="lg" variant="outline" className="font-semibold rounded-xl px-6 sm:px-8 text-sm sm:text-base">
                    Показать больше
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar - appears below on mobile */}
          <div className="min-w-0 overflow-hidden mt-4 lg:mt-0">
            <Sidebar />
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
