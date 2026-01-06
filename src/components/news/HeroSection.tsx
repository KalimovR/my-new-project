import { Link } from 'react-router-dom';
import { ArrowRight, Send, Shield, Newspaper, Users, MessageSquare, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useArticles } from '@/hooks/useArticles';
import { useAuth } from '@/hooks/useAuth';
import { NewsCard } from './NewsCard';
const ROTATION_MS = 24 * 60 * 60 * 1000; // 24h
const ROTATION_STORAGE_KEY = 'homepage_top_rotation_started_at_v1';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function getRotationStart(): number {
  const raw = localStorage.getItem(ROTATION_STORAGE_KEY);
  const parsed = raw ? Number(raw) : NaN;
  const start = Number.isFinite(parsed) ? parsed : Date.now();
  if (!raw || !Number.isFinite(parsed)) {
    localStorage.setItem(ROTATION_STORAGE_KEY, String(start));
  }
  return start;
}

export const HeroSection = () => {
  const { isAdminOrEditor } = useAuth();
  // Latest articles for the "top" block (lightweight select in hook)
  const { articles, refetch } = useArticles(undefined, 12);
  const [rotationStart, setRotationStart] = useState<number>(() => getRotationStart());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    const end = rotationStart + ROTATION_MS;
    return end - now;
  }, [rotationStart, now]);

  useEffect(() => {
    if (remainingMs > 0) return;

    const nextStart = Date.now();
    localStorage.setItem(ROTATION_STORAGE_KEY, String(nextStart));
    setRotationStart(nextStart);
    refetch();
  }, [remainingMs, refetch]);

  const topArticles = useMemo(() => {
    return (articles || []).slice(0, 3).map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      content: '',
      image: a.image_url || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=600&fit=crop',
      category: a.category as 'news' | 'analytics' | 'opinions',
      date: a.published_at ? new Date(a.published_at).toLocaleDateString('ru-RU') : '',
      author: a.author_name || 'Редакция',
      readTime: a.read_time || '5 мин',
      tags: a.tags || [],
      views: a.views ?? undefined,
    }));
  }, [articles]);

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
                  <div className="text-white/80 text-xs leading-relaxed">Анонимность • Шифрование • Редакционная проверка</div>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-xl p-3 flex-1">
                  <div className="text-white font-bold text-xs uppercase tracking-wide mb-1">Что можно прислать</div>
                  <div className="text-white/80 text-xs leading-relaxed">Документы • Фото/видео • Свидетельства</div>
                </div>
                <div className="bg-white/10 border border-white/20 rounded-xl p-3 flex-1">
                  <div className="text-white font-bold text-xs uppercase tracking-wide mb-1">Ответим быстро</div>
                  <div className="text-white/80 text-xs leading-relaxed">Если оставите контакт — свяжемся в ближайшее время</div>
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

      {/* Rotating Top (refreshes every 24h) */}
{topArticles.length > 0 && (
        <div className="mb-8">
          {isAdminOrEditor && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                Ротация через {formatRemaining(remainingMs)}
              </span>
              <Button 
                variant="ghost" 
                className="text-primary hover:text-primary/80 font-semibold h-9 px-3" 
                onClick={() => {
                  const nextStart = Date.now();
                  localStorage.setItem(ROTATION_STORAGE_KEY, String(nextStart));
                  setRotationStart(nextStart);
                  refetch();
                }}
              >
                Обновить
              </Button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-4 lg:gap-6">
            {topArticles[0] && (
              <div className="lg:row-span-2 h-full">
                <NewsCard article={topArticles[0]} variant="featured" className="h-full" />
              </div>
            )}
            {topArticles[1] && <NewsCard article={topArticles[1]} variant="featured" />}
            {topArticles[2] && <NewsCard article={topArticles[2]} variant="featured" />}
          </div>
        </div>
      )}
    </section>
  );
};
