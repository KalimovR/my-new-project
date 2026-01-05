import { Link } from 'react-router-dom';
import { ArrowRight, Send, Shield, Newspaper, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFeaturedArticles } from '@/hooks/useArticles';
import { NewsCard } from './NewsCard';

export const HeroSection = () => {
  // Use featured articles hook with caching, limit to 3
  const { articles } = useFeaturedArticles();
  
  // Map featured articles for display
  const featuredArticles = articles
    .slice(0, 3)
    .map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      content: '', // Not needed for cards
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
      <div className="bg-gradient-hero rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 mb-6 sm:mb-8 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-32 sm:w-64 h-32 sm:h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row gap-6 lg:gap-6 items-stretch min-h-[280px]">
          {/* Left side - Main CTA */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-6 items-start flex-1">
              {/* Main copy */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-white" />
                  <span className="text-white/90 text-xs sm:text-sm font-medium uppercase tracking-wide">Анонимно и безопасно</span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
                  Сообщите важную информацию
                </h2>

                <p className="text-sm sm:text-base md:text-lg text-white/90 mb-5 leading-relaxed">
                  Независимые новости нуждаются в вашей поддержке. Отправьте документы, информацию о коррупции или нарушениях — мы гарантируем анонимность.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/contact" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-white text-primary hover:bg-white/90 font-bold text-sm px-5 h-11 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Отправить информацию
                    </Button>
                  </Link>
                  <Link to="/about" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto border-2 border-white text-white hover:bg-white/10 font-bold text-sm px-5 h-11"
                    >
                      Узнать больше
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Fill empty space (desktop) */}
              <div className="hidden lg:flex flex-col gap-2 h-full">
                <div className="bg-white/10 border border-white/20 rounded-xl p-3 flex-1">
                  <div className="text-white font-bold text-xs uppercase tracking-wide mb-1">Как мы защищаем источник</div>
                  <div className="text-white/80 text-xs leading-relaxed">
                    Анонимность • Шифрование • Редакционная проверка
                  </div>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-xl p-3 flex-1">
                  <div className="text-white font-bold text-xs uppercase tracking-wide mb-1">Что можно прислать</div>
                  <div className="text-white/80 text-xs leading-relaxed">
                    Документы • Фото/видео • Свидетельства
                  </div>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-xl p-3 flex-1">
                  <div className="text-white font-bold text-xs uppercase tracking-wide mb-1">Ответим быстро</div>
                  <div className="text-white/80 text-xs leading-relaxed">
                    Если оставите контакт — свяжемся в ближайшее время
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right side - Stats and Quick Links */}
          <div className="hidden lg:block w-[780px] flex-shrink-0">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
              <h3 className="text-white font-bold text-xs mb-3 uppercase tracking-wide">Контекст в цифрах</h3>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/10 rounded-lg p-2.5 text-center">
                  <Newspaper className="w-4 h-4 text-white mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">100+</div>
                  <div className="text-[10px] text-white/70">Материалов</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2.5 text-center">
                  <Users className="w-4 h-4 text-white mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">1000+</div>
                  <div className="text-[10px] text-white/70">Читателей</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2.5 text-center">
                  <MessageSquare className="w-4 h-4 text-white mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">100+</div>
                  <div className="text-[10px] text-white/70">Комментариев</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2.5 text-center">
                  <TrendingUp className="w-4 h-4 text-white mx-auto mb-1" />
                  <div className="text-lg font-bold text-white">24/7</div>
                  <div className="text-[10px] text-white/70">Обновления</div>
                </div>
              </div>
              
              {/* Quick Links */}
              <div className="space-y-1.5">
                <Link 
                  to="/discussions"
                  className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-lg p-2.5 transition-colors group"
                >
                  <span className="text-white text-sm font-medium">Обсуждения</span>
                  <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </Link>
                <a 
                  href="https://t.me/TheContextRu" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-lg p-2.5 transition-colors group"
                >
                  <span className="text-white text-sm font-medium">Telegram-канал</span>
                  <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Articles Grid - explicit 2-row grid for stable layout */}
      {featuredArticles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-4 lg:gap-6 mb-8">
          {/* Main Featured - spans both rows on desktop */}
          {featuredArticles[0] && (
            <div className="lg:row-span-2 h-full">
              <NewsCard article={featuredArticles[0]} variant="featured" className="h-full" />
            </div>
          )}
          
          {/* Secondary Featured - top right */}
          {featuredArticles[1] && (
            <NewsCard article={featuredArticles[1]} variant="featured" />
          )}
          
          {/* Tertiary Featured - bottom right */}
          {featuredArticles[2] && (
            <NewsCard article={featuredArticles[2]} variant="featured" />
          )}
        </div>
      )}
    </section>
  );
};
