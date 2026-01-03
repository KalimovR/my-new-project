import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") || "https://kontekst.news";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "sitemap";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Fetch published articles
    const { data: articles, error } = await supabase
      .from("articles")
      .select("slug, updated_at, published_at, title, image_url, category")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error fetching articles:", error);
      throw error;
    }

    console.log(`Generating ${type} with ${articles?.length || 0} articles`);

    if (type === "news") {
      // Google News Sitemap
      const newsSitemap = generateNewsSitemap(articles || []);
      return new Response(newsSitemap, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // Standard sitemap
    const sitemap = generateSitemap(articles || []);
    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateSitemap(articles: any[]): string {
  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "hourly" },
    { url: "/news", priority: "0.9", changefreq: "hourly" },
    { url: "/analytics", priority: "0.8", changefreq: "daily" },
    { url: "/opinions", priority: "0.8", changefreq: "daily" },
    { url: "/about", priority: "0.5", changefreq: "monthly" },
    { url: "/contact", priority: "0.5", changefreq: "monthly" },
  ];

  const urls = staticPages.map(
    (page) => `
  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  );

  articles.forEach((article) => {
    urls.push(`
  <url>
    <loc>${SITE_URL}/article/${article.slug}</loc>
    <lastmod>${article.updated_at || article.published_at}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>`;
}

function generateNewsSitemap(articles: any[]): string {
  // Only include articles from the last 2 days for news sitemap
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const recentArticles = articles.filter((article) => {
    const publishedDate = new Date(article.published_at);
    return publishedDate >= twoDaysAgo;
  });

  const urls = recentArticles.map(
    (article) => `
  <url>
    <loc>${SITE_URL}/article/${article.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Контекст</news:name>
        <news:language>ru</news:language>
      </news:publication>
      <news:publication_date>${article.published_at}</news:publication_date>
      <news:title><![CDATA[${article.title}]]></news:title>
    </news:news>
    ${article.image_url ? `<image:image><image:loc>${article.image_url}</image:loc></image:image>` : ""}
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("")}
</urlset>`;
}
