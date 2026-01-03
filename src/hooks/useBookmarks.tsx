import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Bookmark {
  id: string;
  user_id: string;
  article_id: string;
  created_at: string;
  article?: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    image_url: string | null;
    category: string;
    published_at: string | null;
    author_name: string | null;
    read_time: string | null;
    tags: string[] | null;
    is_published: boolean;
  };
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchBookmarks = useCallback(async () => {
    if (!user) {
      setBookmarks([]);
      setBookmarkedIds(new Set());
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          id,
          user_id,
          article_id,
          created_at,
          article:articles(
            id,
            slug,
            title,
            excerpt,
            image_url,
            category,
            published_at,
            author_name,
            read_time,
            tags,
            is_published
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Фильтруем только опубликованные статьи
      const validBookmarks = (data || []).filter(
        (b) => b.article && b.article.is_published
      ) as Bookmark[];

      setBookmarks(validBookmarks);
      setBookmarkedIds(new Set(validBookmarks.map((b) => b.article_id)));
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const addBookmark = async (articleId: string) => {
    if (!user) return { error: 'Необходимо войти в аккаунт' };

    try {
      const { error } = await supabase.from('bookmarks').insert({
        user_id: user.id,
        article_id: articleId,
      });

      if (error) throw error;

      setBookmarkedIds((prev) => new Set([...prev, articleId]));
      await fetchBookmarks();
      return { error: null };
    } catch (error: any) {
      console.error('Error adding bookmark:', error);
      return { error: error.message || 'Ошибка добавления в закладки' };
    }
  };

  const removeBookmark = async (articleId: string) => {
    if (!user) return { error: 'Необходимо войти в аккаунт' };

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('article_id', articleId);

      if (error) throw error;

      setBookmarkedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(articleId);
        return newSet;
      });
      await fetchBookmarks();
      return { error: null };
    } catch (error: any) {
      console.error('Error removing bookmark:', error);
      return { error: error.message || 'Ошибка удаления из закладок' };
    }
  };

  const toggleBookmark = async (articleId: string) => {
    if (bookmarkedIds.has(articleId)) {
      return removeBookmark(articleId);
    } else {
      return addBookmark(articleId);
    }
  };

  const isBookmarked = (articleId: string) => bookmarkedIds.has(articleId);

  return {
    bookmarks,
    isLoading,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    isBookmarked,
    refetch: fetchBookmarks,
  };
}
