import { Layout } from '@/components/layout/Layout';
import { NewsCard } from '@/components/news/NewsCard';
import { NewsCardSkeleton } from '@/components/news/NewsCardSkeleton';
import { Sidebar } from '@/components/news/Sidebar';
import { useArticles } from '@/hooks/useArticles';
import { useAuth } from '@/hooks/useAuth';
import { getArticlesByCategory as getStaticArticlesByCategory } from '@/data/articles';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { SEOHead } from '@/components/seo/SEOHead';

const Analytics = () => {
  const { articles: dbArticles, isLoading, deleteArticle } = useArticles('analytics');
  const staticAnalytics = getStaticArticlesByCategory('analytics');
  const { isAdminOrEditor } = useAuth();
  const { toast } = useToast();
  
  const analyticsArticles = dbArticles.length > 0 ? dbArticles.map(a => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt || '',
    content: '', // Not needed for list view
    image: a.image_url || '/placeholder.svg',
    category: a.category as 'news' | 'analytics' | 'opinions',
    date: formatDate(a.published_at || a.created_at || ''),
    author: a.author_name || 'Редакция',
    readTime: a.read_time || '5 мин',
    tags: a.tags || [],
    views: a.views || 0,
  })) : staticAnalytics;

  const handleDeleteArticle = async (id: string) => {
    const { error } = await deleteArticle(id);
    if (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить статью',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Успешно',
        description: 'Статья удалена',
      });
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Аналитика"
        description="Глубокий анализ событий 2026 года. Расследования, экспертные прогнозы и аналитические материалы от независимого издания Контекст."
        keywords={['аналитика', 'расследования', 'прогнозы', 'экспертиза', '2026']}
        url="/analytics"
      />
      <div className="container mx-auto py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Аналитика</h1>
          <p className="text-muted-foreground">
            Глубокий анализ, расследования и прогнозы
          </p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <NewsCardSkeleton key={index} variant="featured" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {analyticsArticles.map((article, index) => (
                  <div
                    key={article.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <NewsCard 
                      article={article} 
                      variant="featured"
                      showDelete={isAdminOrEditor && dbArticles.length > 0}
                      onDelete={handleDeleteArticle}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && analyticsArticles.length === 0 && dbArticles.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Пока нет материалов в этом разделе
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <Sidebar />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;