import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://news-kontekst.ru';
const SITE_NAME = 'Контекст';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query;
  
  if (!slug || typeof slug !== 'string') {
    return res.status(400).send('Missing slug parameter');
  }

  const decodedSlug = decodeURIComponent(slug);

  // Fetch article from Supabase
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  const { data: article, error } = await supabase
    .from('articles')
    .select('title, excerpt, image_url, category, published_at, author_name, slug')
    .eq('slug', decodedSlug)
    .eq('is_published', true)
    .single();

  if (error || !article) {
    // Return default meta for missing articles
    const html = generateHtml({
      title: SITE_NAME,
      description: 'Независимые новости и аналитика',
      image: DEFAULT_IMAGE,
      url: SITE_URL,
      type: 'website',
    });
    return res.setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
  }

  const categoryPaths: Record<string, string> = {
    news: 'news',
    analytics: 'analytics',
    opinions: 'opinions',
  };

  const categoryNames: Record<string, string> = {
    news: 'Новости',
    analytics: 'Аналитика',
    opinions: 'Мнения',
  };

  // Build canonical URL with clean path
  const categoryPath = categoryPaths[article.category] || 'article';
  const articleUrl = `${SITE_URL}/${categoryPath}/${article.slug}`;
  
  // Ensure image is a direct public URL
  let imageUrl = article.image_url || DEFAULT_IMAGE;
  
  // If image is from Supabase storage, ensure it's public URL format
  if (imageUrl.includes('supabase.co/storage')) {
    // Convert to public URL format if needed
    imageUrl = imageUrl.replace('/storage/v1/object/sign/', '/storage/v1/object/public/');
  }

  const html = generateHtml({
    title: `${article.title} | ${SITE_NAME}`,
    description: article.excerpt || 'Читайте на Контекст',
    image: imageUrl,
    url: articleUrl,
    type: 'article',
    publishedTime: article.published_at,
    author: article.author_name,
    section: categoryNames[article.category] || article.category,
    redirectUrl: `${SITE_URL}/article/${article.slug}`,
  });

  res
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    .send(html);
}

interface MetaOptions {
  title: string;
  description: string;
  image: string;
  url: string;
  type: 'article' | 'website';
  publishedTime?: string;
  author?: string;
  section?: string;
  redirectUrl?: string;
}

function generateHtml(meta: MetaOptions): string {
  const redirectTag = meta.redirectUrl 
    ? `<meta http-equiv="refresh" content="0; url=${escapeHtml(meta.redirectUrl)}">`
    : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${escapeHtml(meta.url)}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="${meta.type}">
  <meta property="og:site_name" content="${SITE_NAME}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${escapeHtml(meta.url)}">
  <meta property="og:image" content="${escapeHtml(meta.image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:locale" content="ru_RU">
  ${meta.publishedTime ? `<meta property="article:published_time" content="${meta.publishedTime}">` : ''}
  ${meta.author ? `<meta property="article:author" content="${escapeHtml(meta.author)}">` : ''}
  ${meta.section ? `<meta property="article:section" content="${escapeHtml(meta.section)}">` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  <meta name="twitter:image" content="${escapeHtml(meta.image)}">
  
  ${redirectTag}
</head>
<body>
  <p>Перенаправление на <a href="${escapeHtml(meta.redirectUrl || meta.url)}">${escapeHtml(meta.title)}</a>...</p>
</body>
</html>`;
}
