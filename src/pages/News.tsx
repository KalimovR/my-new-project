import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '@/components/layout/Layout';
import { NewsCard } from '@/components/news/NewsCard';
import { NewsCardSkeleton } from '@/components/news/NewsCardSkeleton';
import { Sidebar } from '@/components/news/Sidebar';
import { useArticles } from '@/hooks/useArticles';
import { useAuth } from '@/hooks/useAuth';
import { articles as staticArticles, getArticlesByCategory as getStaticArticlesByCategory } from '@/data/articles';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, Clock, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { SEOHead } from '@/components/seo/SEOHead';

type SortOption = 'date' | 'popular';
const ITEMS_PER_PAGE = 6;

const News = () => {
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const [useInfiniteScroll, setUseInfiniteScroll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { isAdminOrEditor } = useAuth();
  
  const { articles: dbArticles, isLoading: isDbLoading, deleteArticle } = useArticles('news');
  const staticNews = getStaticArticlesByCategory('news');
  
  // Combine database articles with static articles as fallback
  const newsArticles = dbArticles.length > 0 ? dbArticles.map(a => ({
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
  })) : staticNews;

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
  
  const sortedArticles = [...newsArticles].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedArticles.length / ITEMS_PER_PAGE);
  
  const paginatedArticles = useInfiniteScroll
    ? sortedArticles.slice(0, visibleCount)
    : sortedArticles.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const loadMore = useCallback(() => {
    if (isLoading || visibleCount >= sortedArticles.length) return;
    
    setIsLoading(true);
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, sortedArticles.length));
      setIsLoading(false);
    }, 500);
  }, [isLoading, visibleCount, sortedArticles.length]);

  useEffect(() => {
    if (!useInfiniteScroll) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [useInfiniteScroll, loadMore]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      <SEOHead
        title="Новости"
        description="Актуальные новости 2026 года. Срочные материалы, события дня и оперативная информация от независимого издания Контекст."
        keywords={['новости', 'события', 'срочные новости', 'Россия', '2026']}
        url="/news"
      />
      <div className="container mx-auto py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Новости</h1>
          <p className="text-muted-foreground">
            Актуальные события и срочные материалы
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <span className="text-sm text-muted-foreground">Сортировка:</span>
          <Button
            variant={sortBy === 'date' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('date')}
            className="gap-2 transition-all duration-200"
          >
            <Clock className="w-4 h-4" />
            По дате
          </Button>
          <Button
            variant={sortBy === 'popular' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSortBy('popular')}
            className="gap-2 transition-all duration-200"
          >
            <ArrowUpDown className="w-4 h-4" />
            По популярности
          </Button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {isDbLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <NewsCardSkeleton key={index} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedArticles.map((article, index) => (
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
            
            {!isDbLoading && sortedArticles.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Новости скоро появятся
              </div>
            )}

            {/* Pagination */}
            {!useInfiniteScroll && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="transition-all duration-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="icon"
                    onClick={() => handlePageChange(page)}
                    className="transition-all duration-200"
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="transition-all duration-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Infinite Scroll Loader */}
            {useInfiniteScroll && visibleCount < sortedArticles.length && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <span className="text-sm text-muted-foreground">Загрузка...</span>
                )}
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

export default News;
