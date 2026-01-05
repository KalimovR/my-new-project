import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { NewsCard } from '@/components/news/NewsCard';
import { AdBanner } from '@/components/news/AdBanner';
import { useArticle, useArticles } from '@/hooks/useArticles';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CommentSection } from '@/components/comments/CommentSection';
import { SEOHead } from '@/components/seo/SEOHead';
import { ArticleStructuredData, BreadcrumbStructuredData } from '@/components/seo/StructuredData';
import { AuthorByline } from '@/components/article/AuthorByline';
import { RelatedArticles } from '@/components/article/RelatedArticles';
import { DiscussButton } from '@/components/article/DiscussButton';
import ArticleDisclaimer from '@/components/article/ArticleDisclaimer';
import { useAuth } from '@/hooks/useAuth';
import { Clock, User, Calendar, ArrowLeft, Share2, Loader2, FileText, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Count words in text
const countWords = (text: string): number => {
  return text
    .replace(/[#*>\-\[\]()]/g, '') // Remove markdown symbols
    .split(/\s+/)
    .filter(word => word.length > 0)
    .length;
};

// Remove word count pattern from content for display
const stripWordCount = (content: string): string => {
  return content.replace(/\n?\(Слов:\s*\d+\)\s*$/i, '').trim();
};

// Simple markdown-like renderer
const renderContent = (content: string, hideWordCount: boolean = true) => {
  const processedContent = hideWordCount ? stripWordCount(content) : content;
  const lines = processedContent.trim().split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';

  const flushList = () => {
    if (listItems.length > 0) {
      const ListTag = listType;
      elements.push(
        <ListTag key={elements.length} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} list-inside space-y-1 mb-4 text-muted-foreground`}>
          {listItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Empty line
    if (!trimmedLine) {
      flushList();
      return;
    }

    // Headers
    if (trimmedLine.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={index} className="text-2xl font-bold mt-8 mb-4">
          {trimmedLine.replace('## ', '')}
        </h2>
      );
      return;
    }

    if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-xl font-semibold mt-6 mb-3">
          {trimmedLine.replace('### ', '')}
        </h3>
      );
      return;
    }

    // Blockquote
    if (trimmedLine.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote key={index} className="border-l-4 border-primary pl-4 py-2 my-6 italic text-muted-foreground bg-secondary/50 rounded-r-lg pr-4">
          {trimmedLine.replace('> ', '')}
        </blockquote>
      );
      return;
    }

    // Horizontal rule
    if (trimmedLine === '---') {
      flushList();
      elements.push(<hr key={index} className="my-8 border-border" />);
      return;
    }

    // Unordered list
    if (trimmedLine.startsWith('- ')) {
      if (!inList) {
        flushList();
        inList = true;
        listType = 'ul';
      }
      listItems.push(trimmedLine.replace('- ', ''));
      return;
    }

    // Ordered list
    if (/^\d+\.\s/.test(trimmedLine)) {
      if (!inList) {
        flushList();
        inList = true;
        listType = 'ol';
      }
      listItems.push(trimmedLine.replace(/^\d+\.\s/, ''));
      return;
    }

    // Regular paragraph
    flushList();
    
    // Process inline formatting
    let processedLine = trimmedLine
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

    elements.push(
      <p
        key={index}
        className="text-foreground/90 leading-relaxed mb-4"
        dangerouslySetInnerHTML={{ __html: processedLine }}
      />
    );
  });

  flushList();
  return elements;
};

const Article = () => {
  const { slug } = useParams<{ slug: string }>();
  const { article, isLoading } = useArticle(slug || '');
  const { articles: allArticles } = useArticles();
  const { isAdminOrEditor } = useAuth();

  
  // Get related articles (same category, excluding current)
  const relatedArticles = allArticles
    .filter(a => a.slug !== slug && a.category === article?.category)
    .slice(0, 4)
    .map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt || '',
      content: a.content || '',
      image: a.image_url || '/placeholder.svg',
      category: a.category as 'news' | 'analytics' | 'opinions',
      date: a.published_at || a.created_at,
      author: a.author_name || 'Редакция',
      readTime: a.read_time || '5 мин',
      tags: a.tags || [],
    }));

  // Get daily recommended article - changes every 24 hours
  const dailyRecommendedArticle = useMemo(() => {
    const eligibleArticles = allArticles.filter(a => a.slug !== slug && a.is_published);
    if (eligibleArticles.length === 0) return null;
    
    // Use day of year to pick an article - changes daily
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    const index = dayOfYear % eligibleArticles.length;
    const selected = eligibleArticles[index];
    
    return {
      id: selected.id,
      slug: selected.slug,
      title: selected.title,
      excerpt: selected.excerpt || '',
      content: selected.content || '',
      image: selected.image_url || '/placeholder.svg',
      category: selected.category as 'news' | 'analytics' | 'opinions',
      date: selected.published_at || selected.created_at,
      author: selected.author_name || 'Редакция',
      readTime: selected.read_time || '5 мин',
      tags: selected.tags || [],
    };
  }, [allArticles, slug]);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Загрузка статьи...</p>
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout>
        <div className="container mx-auto py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Статья не найдена</h1>
          <Link to="/" className="text-primary hover:underline">
            Вернуться на главную
          </Link>
        </div>
      </Layout>
    );
  }

  const formattedDate = article.published_at 
    ? format(new Date(article.published_at), 'd MMMM yyyy', { locale: ru })
    : format(new Date(article.created_at), 'd MMMM yyyy', { locale: ru });

  const categoryNames: Record<string, string> = {
    news: 'Новости',
    analytics: 'Аналитика',
    opinions: 'Мнения',
  };

  const handleShare = (platform: string) => {
    // Use the canonical article URL - Vercel middleware handles OG for crawlers
    const url = window.location.href;
    const text = article.title;
    
    const shareUrls: Record<string, string> = {
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text + ' — Контекст')}`,
      vk: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  // Prepare related articles for internal links block
  const inlineRelatedArticles = allArticles
    .filter(a => a.slug !== slug && a.is_published)
    .slice(0, 3)
    .map(a => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      image: a.image_url || '/placeholder.svg',
      category: a.category,
    }));

  return (
    <Layout>
      {/* SEO Meta Tags */}
      <SEOHead
        title={article.title}
        description={article.excerpt || article.content?.slice(0, 155) || ''}
        keywords={article.tags || []}
        image={article.image_url || undefined}
        url={`/article/${article.slug}`}
        type="article"
        article={{
          publishedTime: article.published_at || article.created_at,
          modifiedTime: article.updated_at,
          author: article.author_name || 'Редакция Контекст',
          section: categoryNames[article.category] || article.category,
          tags: article.tags || [],
        }}
      />

      {/* Structured Data */}
      <ArticleStructuredData
        title={article.title}
        description={article.excerpt || ''}
        image={article.image_url || '/placeholder.svg'}
        datePublished={article.published_at || article.created_at}
        dateModified={article.updated_at}
        author={{
          name: article.author_name || 'Редакция Контекст',
          bio: 'Журналист независимого издания Контекст',
        }}
        url={`/article/${article.slug}`}
        section={categoryNames[article.category]}
        keywords={article.tags || []}
      />

      <BreadcrumbStructuredData
        items={[
          { name: 'Главная', url: '/' },
          { name: categoryNames[article.category] || 'Статьи', url: `/${article.category}` },
          { name: article.title, url: `/article/${article.slug}` },
        ]}
      />

      <article className="pb-12">
        {/* Hero Image */}
        <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
          <img
            src={article.image_url || '/placeholder.svg'}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="container mx-auto -mt-32 relative z-10">
          <div className="grid lg:grid-cols-[1fr_320px] gap-8">
            {/* Main content */}
            <div className="max-w-3xl">
              {/* Back Link */}
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад
              </Link>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(article.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-primary/20 text-primary border-0">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-6" style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}>
                {article.title}
              </h1>

              {/* Author Byline */}
              <div className="mb-8 pb-8 border-b border-border">
                <AuthorByline
                  name={article.author_name || 'Редакция Контекст'}
                  bio="Журналист независимого издания Контекст. Пишет о политике, экономике и социальных вопросах."
                  date={formattedDate}
                  readTime={article.read_time || '5 мин'}
                  variant="full"
                />
              </div>

              {/* Content */}
              <div className="prose prose-invert dark:prose-invert max-w-none text-base leading-relaxed" style={{ fontSize: '16px' }}>
                {renderContent(article.content || '', !isAdminOrEditor)}
              </div>

                 {/* Article Disclaimer */}
              <ArticleDisclaimer />

              {/* Word count - only for admins/editors */}
              {isAdminOrEditor && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md w-fit">
                  <FileText className="w-4 h-4" />
                  <span>Слов: {countWords(stripWordCount(article.content || ''))}</span>
                </div>
              )}

              {/* Internal Links Block */}
              {inlineRelatedArticles.length > 0 && (
                <RelatedArticles
                  articles={inlineRelatedArticles}
                  variant="inline"
                />
              )}

              {/* Ad in content */}
              <div className="my-8">
                <AdBanner size="native" />
              </div>

              {/* Share */}
              <div className="flex items-center gap-4 py-8 border-t border-b border-border my-8">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Поделиться:
                </span>
                <div className="flex gap-2">
                  {['telegram', 'twitter', 'vk', 'facebook'].map((platform) => (
                    <Button
                      key={platform}
                      variant="outline"
                      size="sm"
                      onClick={() => handleShare(platform)}
                      className="capitalize"
                    >
                      {platform === 'vk' ? 'VK' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Discuss Button */}
              <div className="my-8">
                <DiscussButton articleId={article.id} />
              </div>

              {/* Comments */}
              <CommentSection articleId={article.id} />
            </div>

            {/* Sidebar with recommended article */}
            <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
              {dailyRecommendedArticle && (
                <div className="bg-card border border-primary/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">Рекомендуем</span>
                  </div>
                  <NewsCard article={dailyRecommendedArticle} variant="compact" />
                </div>
              )}
            </aside>
          </div>
        </div>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="container mx-auto mt-16">
            <h2 className="text-2xl font-bold mb-6" style={{ fontSize: '24px' }}>Читайте также</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedArticles.map((related) => (
                <NewsCard key={related.id} article={related} />
              ))}
            </div>
          </div>
        )}
      </article>
    </Layout>
  );
};

export default Article;
