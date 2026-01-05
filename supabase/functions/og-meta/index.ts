import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SITE_URL = 'https://news-kontekst.ru';
const SITE_NAME = 'Контекст';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug');
  
  if (!slug) {
    return new Response('Missing slug parameter', { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch article by slug
  const { data: article, error } = await supabase
    .from('articles')
    .select('title, excerpt, image_url, category, published_at, author_name, tags')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !article) {
    // Return default meta
    return new Response(JSON.stringify({
      title: SITE_NAME,
      description: 'Независимые новости и аналитика 2026',
      image: DEFAULT_IMAGE,
      url: SITE_URL,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const categoryNames: Record<string, string> = {
    news: 'Новости',
    analytics: 'Аналитика',
    opinions: 'Мнения',
  };

  const title = `${article.title} | ${SITE_NAME}`;
  const description = article.excerpt || 'Читайте на Контекст';
  const image = article.image_url || DEFAULT_IMAGE;
  const articleUrl = `${SITE_URL}/article/${slug}`;

  // Generate HTML page with proper meta tags for crawlers
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHtml(articleUrl)}">
  <meta property="og:locale" content="ru_RU">
  ${article.published_at ? `<meta property="article:published_time" content="${article.published_at}">` : ''}
  ${article.author_name ? `<meta property="article:author" content="${escapeHtml(article.author_name)}">` : ''}
  <meta property="article:section" content="${categoryNames[article.category] || article.category}">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  
  <!-- Redirect to actual page -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(articleUrl)}">
  <link rel="canonical" href="${escapeHtml(articleUrl)}">
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(articleUrl)}">${escapeHtml(title)}</a>...</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}