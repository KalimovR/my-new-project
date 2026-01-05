import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { NewsCard } from '@/components/news/NewsCard';
import { Sidebar } from '@/components/news/Sidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { useArticles } from '@/hooks/useArticles';
import { Search as SearchIcon, Loader2, ArrowLeft } from 'lucide-react';

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(query);
  const { articles, isLoading } = useArticles();

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchParams({ q: searchInput.trim() });
    }
  };

  // Filter articles based on search query (search in title, excerpt, tags, author - not full content for speed)
  const filteredArticles = articles
    .filter(a => {
      if (!query) return false;
      const searchLower = query.toLowerCase();
      return (
        a.title.toLowerCase().includes(searchLower) ||
        a.excerpt?.toLowerCase().includes(searchLower) ||
        a.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        a.author_name?.toLowerCase().includes(searchLower)
      );
    })
    .map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      content: '', // Not needed for display
      image: a.image_url || '/placeholder.svg',
      category: a.category as 'news' | 'analytics' | 'opinions',
      date: a.published_at ? new Date(a.published_at).toLocaleDateString('ru-RU') : '',
      author: a.author_name || 'Редакция',
      readTime: a.read_time || '5 мин',
      tags: a.tags || [],
    }));

  return (
    <Layout>
      <SEOHead
        title={query ? `Поиск: ${query}` : 'Поиск'}
        description={`Результаты поиска${query ? ` по запросу "${query}"` : ''} на сайте Контекст`}
        keywords={['поиск', 'новости', 'статьи', query].filter(Boolean)}
        url={`/search${query ? `?q=${encodeURIComponent(query)}` : ''}`}
      />

      <div className="container mx-auto py-8 md:py-12">
        {/* Back link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          На главную
        </Link>

        {/* Search Form */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Поиск</h1>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-xl">
            <Input
              type="search"
              placeholder="Введите запрос..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-12 bg-secondary border-border rounded-xl"
            />
            <Button type="submit" size="lg" className="h-12 px-6 rounded-xl">
              <SearchIcon className="w-5 h-5" />
            </Button>
          </form>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Поиск...</p>
              </div>
            ) : !query ? (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium mb-2">Введите поисковый запрос</p>
                <p className="text-muted-foreground">
                  Поиск по заголовкам, текстам и тегам статей
                </p>
              </div>
            ) : filteredArticles.length > 0 ? (
              <>
                <p className="text-muted-foreground mb-6">
                  Найдено: {filteredArticles.length} {
                    filteredArticles.length === 1 ? 'результат' :
                    filteredArticles.length < 5 ? 'результата' : 'результатов'
                  }
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredArticles.map((article, index) => (
                    <div
                      key={article.id}
                      className="animate-slide-up"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <NewsCard article={article} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl font-medium mb-2">Ничего не найдено</p>
                <p className="text-muted-foreground">
                  По запросу «{query}» нет результатов. Попробуйте другой запрос.
                </p>
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

export default Search;
