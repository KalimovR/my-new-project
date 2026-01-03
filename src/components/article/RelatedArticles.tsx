import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  image: string;
  category: string;
  date?: string;
}

interface RelatedArticlesProps {
  articles: RelatedArticle[];
  title?: string;
  variant?: 'grid' | 'list' | 'inline';
}

export const RelatedArticles = ({
  articles,
  title = 'Связанные статьи',
  variant = 'grid',
}: RelatedArticlesProps) => {
  if (articles.length === 0) return null;

  if (variant === 'inline') {
    return (
      <div className="my-8 p-6 bg-secondary/50 rounded-2xl border border-border">
        <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">
          Читайте также
        </h4>
        <ul className="space-y-3">
          {articles.slice(0, 3).map((article) => (
            <li key={article.id}>
              <Link
                to={`/article/${article.slug}`}
                className="group flex items-center gap-2 text-foreground hover:text-primary transition-colors"
              >
                <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-medium group-hover:underline line-clamp-1">
                  {article.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">{title}</h3>
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              to={`/article/${article.slug}`}
              className="group flex gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                  {article.title}
                </h4>
                {article.date && (
                  <p className="text-xs text-muted-foreground mt-2">{article.date}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {articles.map((article) => (
          <Link
            key={article.id}
            to={`/article/${article.slug}`}
            className="group block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all"
          >
            <div className="aspect-[16/10] overflow-hidden">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <h4 className="font-bold text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {article.title}
              </h4>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
