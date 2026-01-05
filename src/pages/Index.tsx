import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/news/HeroSection';
import { NewsCard } from '@/components/news/NewsCard';
import { NewsCardSkeleton } from '@/components/news/NewsCardSkeleton';
import { Sidebar } from '@/components/news/Sidebar';
import { AdBanner } from '@/components/news/AdBanner';
import { ArgumentOfTheWeek } from '@/components/discussions/ArgumentOfTheWeek';
import { useArticles } from '@/hooks/useArticles';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { WebsiteStructuredData } from '@/components/seo/StructuredData';
import { Analytics, SearchConsoleVerification } from '@/components/seo/Analytics';
import { ArrowRight } from 'lucide-react';

const Index = () => {
  // Limit to 8 articles for homepage, using cached query
  const { articles: dbArticles, isLoading } = useArticles(undefined, 8);
  
  // Map database articles to the format expected by NewsCard
  // Exclude featured materials so they never "съезжают" в блок "Последние новости"
  const mappedDbArticles = dbArticles
    .filter(a => a.is_published && !a.is_featured)
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
        {/* Argument of the Week */}
        <ArgumentOfTheWeek />

        {/* News Layout - Grid with proper alignment */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
          {/* Articles Grid - Left column */}
          <div className="min-w-0">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <NewsCardSkeleton key={index} />
                ))}
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

          {/* Sidebar - Right column with sticky positioning */}
          <aside className="min-w-0 lg:sticky lg:top-24 order-2 lg:order-none mt-4 lg:mt-0">
            <Sidebar />
          </aside>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
