// Vercel Edge Middleware for crawler detection
// Works with Vite projects on Vercel

const CRAWLER_USER_AGENTS = [
  'TelegramBot',
  'Twitterbot',
  'facebookexternalhit',
  'LinkedInBot',
  'WhatsApp',
  'Slackbot',
  'vkShare',
  'Discordbot',
];

export const config = {
  matcher: '/article/:path*',
};

export default function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Check if request is from a crawler
  const isCrawler = CRAWLER_USER_AGENTS.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );
  
  if (isCrawler) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const slug = pathname.replace('/article/', '');
    
    // Redirect crawlers to OG meta generator API
    const ogUrl = new URL('/api/og', url.origin);
    ogUrl.searchParams.set('slug', slug);
    
    return fetch(ogUrl.toString());
  }
  
  // Regular users continue to the SPA
  return;
}
