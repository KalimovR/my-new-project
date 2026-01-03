import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  tags: string[];
  author_name: string | null;
  read_time: string | null;
  is_featured: boolean | null;
  is_published: boolean | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  views: number | null;
}

export const useArticles = (category?: string) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let query = supabase
      .from('articles')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching articles:', fetchError);
      setError(fetchError.message);
      setArticles([]);
    } else {
      setArticles((data || []) as Article[]);
    }

    setIsLoading(false);
  }, [category]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const deleteArticle = async (id: string) => {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting article:', error);
      return { error };
    }
    
    // Remove from local state
    setArticles(prev => prev.filter(a => a.id !== id));
    return { error: null };
  };

  return { articles, isLoading, error, refetch: fetchArticles, deleteArticle };
};

export const useArticle = (slug: string) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;

      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (fetchError) {
        console.error('Error fetching article:', fetchError);
        setError(fetchError.message);
        setArticle(null);
      } else {
        setArticle(data as Article);
      }

      setIsLoading(false);
    };

    fetchArticle();
  }, [slug]);

  return { article, isLoading, error };
};

export const useFeaturedArticles = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      const { data } = await supabase
        .from('articles')
        .select('*')
        .eq('is_published', true)
        .eq('is_featured', true)
        .order('published_at', { ascending: false })
        .limit(5);

      setArticles((data || []) as Article[]);
      setIsLoading(false);
    };

    fetchFeatured();
  }, []);

  return { articles, isLoading };
};
