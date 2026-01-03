import { Link } from 'react-router-dom';
import { Clock, ArrowUpRight, Trash2, Bookmark, BookmarkCheck, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useBookmarks } from '@/hooks/useBookmarks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ArticleData {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content?: string;
  image: string;
  category: 'news' | 'analytics' | 'opinions';
  date: string;
  author: string;
  readTime: string;
  tags: string[];
  views?: number;
}

interface NewsCardProps {
  article: ArticleData;
  variant?: 'default' | 'featured' | 'compact';
  showDelete?: boolean;
  onDelete?: (id: string) => void;
  showBookmark?: boolean;
}

export const NewsCard = ({ article, variant = 'default', showDelete = false, onDelete, showBookmark = true }: NewsCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const { user, isAdminOrEditor } = useAuth();
  const { toast } = useToast();

  const ViewsIndicator = isAdminOrEditor && article.views !== undefined && (
    <div className="flex items-center gap-1 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md">
      <Eye className="w-3 h-3" />
      <span>{article.views}</span>
    </div>
  );

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(article.id);
    }
    setShowDeleteDialog(false);
  };

  const handleBookmarkClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: 'Необходимо войти',
        description: 'Авторизуйтесь, чтобы добавлять в закладки',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await toggleBookmark(article.id);
    if (error) {
      toast({
        title: 'Ошибка',
        description: error,
        variant: 'destructive',
      });
    } else {
      toast({
        title: isBookmarked(article.id) ? 'Удалено из закладок' : 'Добавлено в закладки',
      });
    }
  };

  const bookmarked = isBookmarked(article.id);

  const BookmarkButton = showBookmark && user && (
    <Button
      variant="ghost"
      size="icon"
      className={`absolute top-3 ${showDelete ? 'right-14' : 'right-3'} z-10 bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg transition-all ${bookmarked ? 'text-primary' : 'text-muted-foreground'}`}
      onClick={handleBookmarkClick}
    >
      {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
    </Button>
  );

  const DeleteButton = (
    <>
      <Button
        variant="destructive"
        size="icon"
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        onClick={handleDeleteClick}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить статью?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Статья "{article.title}" будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.stopPropagation(); confirmDelete(); }}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  if (variant === 'featured') {
    return (
      <Link
        to={`/article/${article.slug}`}
        className="group relative block overflow-hidden rounded-2xl bg-card border border-border hover-glow hover-lift transition-all duration-300 h-full"
      >
        {showDelete && onDelete && DeleteButton}
        {BookmarkButton}
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={article.image}
            alt={`${article.title} — Контекст 2026`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        </div>
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge 
                key={tag} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 font-semibold text-xs px-3 py-1"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <h3 className="text-xl md:text-2xl lg:text-3xl font-black leading-tight mb-3 group-hover:text-primary transition-colors duration-300">
            {article.title}
          </h3>
          <p className="text-muted-foreground text-sm md:text-base line-clamp-2 mb-4">
            {article.excerpt}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium">{article.date}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {article.readTime}
            </span>
            {ViewsIndicator}
          </div>
        </div>
        {!showDelete && (
          <div className="absolute top-4 right-4 w-10 h-10 bg-primary/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-primary">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </div>
        )}
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        to={`/article/${article.slug}`}
        className="group flex gap-4 py-4 border-b border-border last:border-0 hover:bg-secondary/50 -mx-3 px-3 rounded-xl transition-all duration-200"
      >
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src={article.image}
            alt={`${article.title} — Контекст`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors duration-200 line-clamp-2 mb-2">
            {article.title}
          </h4>
          <p className="text-xs text-muted-foreground">{article.date}</p>
        </div>
      </Link>
    );
  }

  // Default card - big image style
  return (
    <Link
      to={`/article/${article.slug}`}
      className="group relative block overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border hover-glow hover-lift transition-all duration-300"
    >
      {showDelete && onDelete && DeleteButton}
      {BookmarkButton}
      <div className="h-[150px] sm:h-[180px] md:h-auto md:aspect-[4/3] overflow-hidden">
        <img
          src={article.image}
          alt={`${article.title} — Контекст 2026`}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center gap-2 mb-2 sm:mb-3">
          {article.tags.slice(0, 2).map((tag) => (
            <Badge 
              key={tag} 
              className="bg-primary/10 text-primary hover:bg-primary hover:text-white border-0 font-medium text-xs transition-colors duration-200"
            >
              {tag}
            </Badge>
          ))}
        </div>
        <h3 className="text-base sm:text-lg md:text-xl font-bold leading-snug sm:leading-tight mb-2 sm:mb-3 group-hover:text-primary transition-colors duration-200">
          {article.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3 mb-3 sm:mb-4">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="font-medium truncate max-w-[100px] sm:max-w-none">{article.author}</span>
            {ViewsIndicator}
          </div>
          <span className="flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
            {article.readTime}
          </span>
        </div>
      </div>
    </Link>
  );
};
