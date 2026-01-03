import { Link } from 'react-router-dom';
import { ArrowRight, Send, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useArticles } from '@/hooks/useArticles';
import { NewsCard } from './NewsCard';

export const HeroSection = () => {
  const { articles } = useArticles();
  
  // Get featured articles for hero
  const featuredArticles = articles
    .filter(a => a.is_featured && a.is_published)
    .slice(0, 3)
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
    <section className="pt-2 sm:pt-4">
      {/* Big Orange CTA Banner - Meduza style */}
      <div className="bg-gradient-hero rounded-xl sm:rounded-2xl p-5 sm:p-8 md:p-12 mb-6 sm:mb-8 relative overflow-hidden min-h-[35vh] sm:min-h-0 flex items-center">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 sm:w-64 h-32 sm:h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <span className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wide">Анонимно и безопасно</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 sm:mb-4 leading-tight">
            Сообщите важную информацию
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-5 sm:mb-8 leading-relaxed">
            Независимые новости нуждаются в вашей поддержке. Отправьте документы, информацию о коррупции или нарушениях — мы гарантируем анонимность.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link to="/contact" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 font-bold text-sm sm:text-base px-6 sm:px-8 h-12 sm:h-14 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Send className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Отправить информацию
              </Button>
            </Link>
            <Link to="/about" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                variant="outline"
                className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/10 font-bold text-sm sm:text-base px-6 sm:px-8 h-12 sm:h-14"
              >
                Узнать больше
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Articles Grid */}
      {featuredArticles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Main Featured */}
          {featuredArticles[0] && (
            <div className="lg:row-span-2">
              <NewsCard article={featuredArticles[0]} variant="featured" />
            </div>
          )}
          
          {/* Secondary Featured */}
          <div className="space-y-6">
            {featuredArticles.slice(1, 3).map((article) => (
              <NewsCard key={article.id} article={article} variant="featured" />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
