import { Layout } from '@/components/layout/Layout';
import { NewsCard } from '@/components/news/NewsCard';
import { Sidebar } from '@/components/news/Sidebar';
import { useArticles } from '@/hooks/useArticles';
import { useAuth } from '@/hooks/useAuth';
import { getArticlesByCategory as getStaticArticlesByCategory } from '@/data/articles';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { SEOHead } from '@/components/seo/SEOHead';

const Opinions = () => {
  const { articles: dbArticles, isLoading, deleteArticle } = useArticles('opinions');
  const staticOpinions = getStaticArticlesByCategory('opinions');
  const { isAdminOrEditor } = useAuth();
  const { toast } = useToast();
  
  const opinionArticles = dbArticles.length > 0 ? dbArticles.map(a => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt || '',
    content: a.content || '',
    image: a.image_url || '/placeholder.svg',
    category: a.category as 'news' | 'analytics' | 'opinions',
    date: formatDate(a.published_at || a.created_at),
    author: a.author_name || 'Редакция',
    readTime: a.read_time || '5 мин',
    tags: a.tags || [],
    views: a.views || 0,
  })) : staticOpinions;

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
        title="Мнения"
        description="Авторские колонки и экспертные мнения 2026 года. Эссе, комментарии и точки зрения от журналистов издания Контекст."
        keywords={['мнения', 'колонки', 'эссе', 'комментарии', 'эксперты', '2026']}
        url="/opinions"
      />
      <div className="container mx-auto py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Мнения</h1>
          <p className="text-muted-foreground">
            Авторские колонки, эссе и комментарии экспертов
          </p>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {opinionArticles.map((article, index) => (
                  <div
                    key={article.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <NewsCard 
                      article={article}
                      showDelete={isAdminOrEditor && dbArticles.length > 0}
                      onDelete={handleDeleteArticle}
                    />
                  </div>
                ))}
              </div>
            )}
            
            {!isLoading && opinionArticles.length === 0 && dbArticles.length === 0 && (
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

export default Opinions;