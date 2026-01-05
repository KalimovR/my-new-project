import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// Lightweight article type for lists (without content)
export interface ArticlePreview {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  image_url: string | null;
  category: string;
  tags: string[];
  author_name: string | null;
  read_time: string | null;
  is_featured: boolean | null;
  is_published: boolean | null;
  published_at: string | null;
  views: number | null;
}

// Select only necessary fields for list views (excludes heavy content field)
const ARTICLE_LIST_SELECT = 'id,slug,title,excerpt,image_url,category,tags,author_name,read_time,is_featured,is_published,published_at,views';

const fetchArticles = async (category?: string, limit?: number): Promise<ArticlePreview[]> => {
  let query = supabase
    .from('articles')
    .select(ARTICLE_LIST_SELECT)
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }

  return (data || []) as ArticlePreview[];
};

export const useArticles = (category?: string, limit?: number) => {
  const queryClient = useQueryClient();
  
  const { data: articles = [], isLoading, error, refetch } = useQuery({
    queryKey: ['articles', category, limit],
    queryFn: () => fetchArticles(category, limit),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });

  const deleteArticle = async (id: string) => {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting article:', error);
      return { error };
    }
    
    // Invalidate cache to refresh lists
    queryClient.invalidateQueries({ queryKey: ['articles'] });
    return { error: null };
  };

  return { 
    articles: articles as (ArticlePreview & { content?: string | null; created_at?: string; updated_at?: string })[], 
    isLoading, 
    error: error?.message || null, 
    refetch, 
    deleteArticle 
  };
};

const fetchArticleBySlug = async (slug: string): Promise<Article | null> => {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error) {
    console.error('Error fetching article:', error);
    throw error;
  }

  return data as Article;
};

export const useArticle = (slug: string) => {
  const { data: article = null, isLoading, error } = useQuery({
    queryKey: ['article', slug],
    queryFn: () => fetchArticleBySlug(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { article, isLoading, error: error?.message || null };
};

const fetchFeaturedArticles = async (): Promise<ArticlePreview[]> => {
  const { data } = await supabase
    .from('articles')
    .select(ARTICLE_LIST_SELECT)
    .eq('is_published', true)
    .eq('is_featured', true)
    .order('published_at', { ascending: false })
    .limit(5);

  return (data || []) as ArticlePreview[];
};

export const useFeaturedArticles = () => {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles', 'featured'],
    queryFn: fetchFeaturedArticles,
    staleTime: 1000 * 60 * 2,
  });

  return { articles, isLoading };
};
