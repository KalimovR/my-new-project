import { NextRequest, NextResponse } from 'next/server';

// Crawler user agents that need OG tags
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

export default function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Check if request is from a crawler
  const isCrawler = CRAWLER_USER_AGENTS.some(bot => 
    userAgent.toLowerCase().includes(bot.toLowerCase())
  );
  
  if (isCrawler) {
    // Extract slug from path
    const pathname = request.nextUrl.pathname;
    const slug = pathname.replace('/article/', '');
    
    // Redirect crawlers to OG meta generator API
    const ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('slug', slug);
    
    return NextResponse.rewrite(ogUrl);
  }
  
  // Regular users get the SPA
  return NextResponse.next();
}
