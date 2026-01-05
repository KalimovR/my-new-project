import { useState } from 'react';
import { useArticles } from '@/hooks/useArticles';
import { NewsCard } from './NewsCard';
import { AdBanner } from './AdBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, TrendingUp, Mail, CheckCircle } from 'lucide-react';

export const Sidebar = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  // Limit to 5 articles for sidebar, using cached query
  const { articles } = useArticles(undefined, 5);

  // Get popular articles with images (already limited and filtered)
  // Exclude featured materials so they don't duplicate/"съезжают" в сайдбар
  const popularArticles = articles
    .filter(a => a.is_published && !a.is_featured)
    .map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      content: '', // Not needed for compact cards
      image: a.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop',
      category: a.category as 'news' | 'analytics' | 'opinions',
      date: a.published_at ? new Date(a.published_at).toLocaleDateString('ru-RU') : '',
      author: a.author_name || 'Редакция',
      readTime: a.read_time || '5 мин',
      tags: a.tags || [],
    }));

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <aside className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Newsletter - Orange themed */}
      <div className="bg-gradient-hero rounded-xl sm:rounded-2xl p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <h3 className="font-bold text-base sm:text-lg text-white">Рассылка</h3>
          </div>
          <p className="text-xs sm:text-sm text-white/90 mb-3 sm:mb-4">
            Главные новости недели — каждое воскресенье на вашу почту.
          </p>
          {subscribed ? (
            <div className="flex items-center gap-2 text-white bg-white/20 rounded-xl p-3 sm:p-4">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Вы подписаны! Проверьте почту.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2 sm:space-y-3">
              <Input
                type="email"
                placeholder="Ваш email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/60 focus:bg-white/30 h-10 sm:h-11 text-sm"
                required
              />
              <Button 
                type="submit" 
                className="w-full bg-white text-primary hover:bg-white/90 font-bold h-10 sm:h-11 text-sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Подписаться
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Popular - with images */}
      <div className="bg-card rounded-xl sm:rounded-2xl border border-border p-4 sm:p-6 max-w-full overflow-hidden">
        <div className="flex items-center gap-2 mb-4 sm:mb-5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          </div>
          <h3 className="font-bold text-base sm:text-lg">Популярное</h3>
        </div>
        <div className="space-y-0">
          {popularArticles.length > 0 ? (
            popularArticles.map((article) => (
              <NewsCard key={article.id} article={article} variant="compact" />
            ))
          ) : (
            <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
              Загрузка статей...
            </p>
          )}
        </div>
      </div>

      {/* Ad Placeholder - hidden on small mobile */}
      <div className="hidden sm:block">
        <AdBanner size="300x250" />
      </div>
    </aside>
  );
};
