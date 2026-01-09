import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Article {
  id: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  category: string;
  created_at: string;
  tags: string[] | null;
}

interface DateRange {
  start: string;
  end: string;
  label: string;
}

interface RequestBody {
  articles: Article[];
  dateRange: DateRange;
  exclusions?: string;
}

// Generate SVG infographics
function generateInfographics(articles: Article[], analysis: any): string {
  const newsCount = articles.filter(a => a.category === 'news').length;
  const analyticsCount = articles.filter(a => a.category === 'analytics').length;
  const opinionsCount = articles.filter(a => a.category === 'opinions').length;
  const total = articles.length;

  // Calculate percentages for pie chart
  const newsPercent = (newsCount / total) * 100;
  const analyticsPercent = (analyticsCount / total) * 100;
  const opinionsPercent = (opinionsCount / total) * 100;

  // Pie chart angles
  const newsAngle = (newsPercent / 100) * 360;
  const analyticsAngle = (analyticsPercent / 100) * 360;

  // Create pie chart paths
  const createArc = (startAngle: number, endAngle: number, color: string): string => {
    const cx = 80, cy = 80, r = 60;
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `<path d="M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z" fill="${color}"/>`;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const pieChart = `
    <svg width="160" height="160" viewBox="0 0 160 160">
      ${newsCount > 0 ? createArc(0, newsAngle, '#3b82f6') : ''}
      ${analyticsCount > 0 ? createArc(newsAngle, newsAngle + analyticsAngle, '#8b5cf6') : ''}
      ${opinionsCount > 0 ? createArc(newsAngle + analyticsAngle, 360, '#f59e0b') : ''}
      <circle cx="80" cy="80" r="30" fill="#1a1a2e"/>
      <text x="80" y="85" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${total}</text>
    </svg>
  `;

  return pieChart;
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = (angle - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Generate HTML for PDF
function generatePDFHTML(articles: Article[], dateRange: DateRange, analysis: any): string {
  const newsCount = articles.filter(a => a.category === 'news').length;
  const analyticsCount = articles.filter(a => a.category === 'analytics').length;
  const opinionsCount = articles.filter(a => a.category === 'opinions').length;

  // Extract key themes from articles
  const allTags = articles.flatMap(a => a.tags || []);
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%);
      color: #e4e4e7;
      line-height: 1.6;
      padding: 40px;
      min-height: 100vh;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 50px;
      padding-bottom: 30px;
      border-bottom: 2px solid rgba(139, 92, 246, 0.3);
    }
    
    .logo {
      font-size: 32px;
      font-weight: 700;
      background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }
    
    .subtitle {
      font-size: 14px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .date-range {
      font-size: 20px;
      color: #a78bfa;
      margin-top: 20px;
    }
    
    .section {
      margin-bottom: 40px;
    }
    
    .section-title {
      font-size: 22px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .section-title::before {
      content: '';
      display: block;
      width: 4px;
      height: 24px;
      background: linear-gradient(180deg, #8b5cf6, #a78bfa);
      border-radius: 2px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 36px;
      font-weight: 700;
      color: #8b5cf6;
    }
    
    .stat-label {
      font-size: 12px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 5px;
    }
    
    .content-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 25px;
      margin-bottom: 25px;
    }
    
    .content-box h3 {
      font-size: 16px;
      color: #a78bfa;
      margin-bottom: 15px;
    }
    
    .content-box p {
      color: #a1a1aa;
      font-size: 14px;
      line-height: 1.8;
    }
    
    .content-box ul {
      list-style: none;
      padding: 0;
    }
    
    .content-box li {
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #a1a1aa;
      font-size: 14px;
    }
    
    .content-box li:last-child {
      border-bottom: none;
    }
    
    .content-box li::before {
      content: '→';
      color: #8b5cf6;
      margin-right: 10px;
    }
    
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 15px;
    }
    
    .tag {
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
    }
    
    .scenario-card {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(167, 139, 250, 0.05));
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 16px;
      padding: 25px;
      margin-bottom: 20px;
    }
    
    .scenario-card.positive {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
      border-color: rgba(34, 197, 94, 0.3);
    }
    
    .scenario-card.negative {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05));
      border-color: rgba(239, 68, 68, 0.3);
    }
    
    .scenario-card.neutral {
      background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05));
      border-color: rgba(234, 179, 8, 0.3);
    }
    
    .scenario-title {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 10px;
    }
    
    .footer {
      text-align: center;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .footer p {
      color: #52525b;
      font-size: 12px;
    }
    
    .infographic {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 30px 0;
    }
    
    .chart-legend {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 15px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #a1a1aa;
    }
    
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    
    .legend-dot.news { background: #3b82f6; }
    .legend-dot.analytics { background: #8b5cf6; }
    .legend-dot.opinions { background: #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">КОНТЕКСТ</div>
      <div class="subtitle">Аналитический отчёт</div>
      <div class="date-range">${dateRange.label}</div>
      <p style="color: #71717a; font-size: 13px; margin-top: 8px;">
        ${formatDate(dateRange.start)} — ${formatDate(dateRange.end)}
      </p>
    </header>
    
    <section class="section">
      <h2 class="section-title">Статистика периода</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${articles.length}</div>
          <div class="stat-label">Всего материалов</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${newsCount}</div>
          <div class="stat-label">Новостей</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${analyticsCount + opinionsCount}</div>
          <div class="stat-label">Аналитика и мнения</div>
        </div>
      </div>
      
      <div class="infographic">
        <svg width="160" height="160" viewBox="0 0 160 160">
          ${generatePieChartPaths(newsCount, analyticsCount, opinionsCount)}
          <circle cx="80" cy="80" r="30" fill="#1a1a2e"/>
          <text x="80" y="85" text-anchor="middle" fill="white" font-size="14" font-weight="bold">${articles.length}</text>
        </svg>
      </div>
      <div class="chart-legend">
        <div class="legend-item"><span class="legend-dot news"></span> Новости (${newsCount})</div>
        <div class="legend-item"><span class="legend-dot analytics"></span> Аналитика (${analyticsCount})</div>
        <div class="legend-item"><span class="legend-dot opinions"></span> Мнения (${opinionsCount})</div>
      </div>
    </section>
    
    <section class="section">
      <h2 class="section-title">Ключевые темы периода</h2>
      <div class="content-box">
        <div class="tags-container">
          ${topTags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
    </section>
    
    <section class="section">
      <h2 class="section-title">Обзор событий</h2>
      <div class="content-box">
        <p>${analysis.overview || 'Анализ основных событий периода...'}</p>
      </div>
    </section>
    
    <section class="section">
      <h2 class="section-title">Тренды и тенденции</h2>
      <div class="content-box">
        <ul>
          ${(analysis.trends || ['Анализ трендов...']).map((trend: string) => `<li>${trend}</li>`).join('')}
        </ul>
      </div>
    </section>
    
    <section class="section">
      <h2 class="section-title">Сценарии развития</h2>
      
      <div class="scenario-card positive">
        <div class="scenario-title">🟢 Оптимистичный сценарий</div>
        <p style="color: #a1a1aa; font-size: 14px;">${analysis.scenarios?.positive || 'Позитивное развитие событий...'}</p>
      </div>
      
      <div class="scenario-card neutral">
        <div class="scenario-title">🟡 Базовый сценарий</div>
        <p style="color: #a1a1aa; font-size: 14px;">${analysis.scenarios?.neutral || 'Наиболее вероятное развитие...'}</p>
      </div>
      
      <div class="scenario-card negative">
        <div class="scenario-title">🔴 Пессимистичный сценарий</div>
        <p style="color: #a1a1aa; font-size: 14px;">${analysis.scenarios?.negative || 'Негативное развитие событий...'}</p>
      </div>
    </section>
    
    <section class="section">
      <h2 class="section-title">Прогноз</h2>
      <div class="content-box">
        <p>${analysis.forecast || 'Прогноз на ближайший период...'}</p>
      </div>
    </section>
    
    ${analysis.sources && analysis.sources.length > 0 ? `
    <section class="section">
      <h2 class="section-title">Источники</h2>
      <div class="content-box">
        <ul>
          ${analysis.sources.map((src: string) => `<li>${src}</li>`).join('')}
        </ul>
      </div>
    </section>
    ` : ''}
    
    <footer class="footer">
      <p>Сгенерировано ИИ на основе материалов КОНТЕКСТ</p>
      <p style="margin-top: 5px;">${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </footer>
  </div>
</body>
</html>
  `;
}

function generatePieChartPaths(news: number, analytics: number, opinions: number): string {
  const total = news + analytics + opinions;
  if (total === 0) return '';

  const newsPercent = (news / total) * 360;
  const analyticsPercent = (analytics / total) * 360;

  const cx = 80, cy = 80, r = 60;

  const polarToCartesian = (angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const createArc = (startAngle: number, endAngle: number, color: string): string => {
    if (endAngle - startAngle === 0) return '';
    const start = polarToCartesian(endAngle);
    const end = polarToCartesian(startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `<path d="M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z" fill="${color}"/>`;
  };

  let paths = '';
  if (news > 0) paths += createArc(0, newsPercent, '#3b82f6');
  if (analytics > 0) paths += createArc(newsPercent, newsPercent + analyticsPercent, '#8b5cf6');
  if (opinions > 0) paths += createArc(newsPercent + analyticsPercent, 360, '#f59e0b');

  return paths;
}

async function searchWeb(query: string, exclusions: string): Promise<{ content: string; sources: string[] }> {
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  if (!OPENROUTER_API_KEY) {
    return { content: '', sources: [] };
  }

  try {
    const systemPrompt = exclusions 
      ? `Ты поисковый ассистент. НЕ включай информацию о: ${exclusions}. Отвечай кратко и по существу.`
      : 'Ты поисковый ассистент. Отвечай кратко и по существу.';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'perplexity/sonar-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
      }),
    });

    if (!response.ok) {
      return { content: '', sources: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extract sources from response
    const sourceMatches = content.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g) || [];
    const sources = sourceMatches.map((m: string) => {
      const match = m.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
      return match ? match[2] : '';
    }).filter(Boolean);

    return { content, sources };
  } catch (error) {
    console.error('Web search error:', error);
    return { content: '', sources: [] };
  }
}

async function analyzeWithAI(articles: Article[], dateRange: DateRange, exclusions: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  // Prepare article summaries
  const articleSummaries = articles.slice(0, 30).map(a => ({
    title: a.title,
    excerpt: a.excerpt || '',
    category: a.category,
    tags: a.tags || [],
    date: a.created_at
  }));

  const exclusionsNote = exclusions 
    ? `\n\nВАЖНО: НЕ упоминай и не анализируй следующие темы/персоны/источники: ${exclusions}`
    : '';

  // Search for additional context
  const webSearch = await searchWeb(
    `Главные геополитические и экономические события ${dateRange.label} 2026 года. Прогнозы и тренды.`,
    exclusions
  );

  const systemPrompt = `Ты — аналитик издания "Контекст". Твоя задача — создать глубокий аналитический отчёт на основе материалов за период.

Стиль: профессиональный, но доступный. Никаких общих фраз — только конкретика.

Сейчас январь 2026 года. Учитывай актуальный геополитический контекст.${exclusionsNote}`;

  const userPrompt = `Проанализируй материалы за период "${dateRange.label}" и создай аналитический отчёт.

МАТЕРИАЛЫ ЗА ПЕРИОД:
${JSON.stringify(articleSummaries, null, 2)}

${webSearch.content ? `ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ ИЗ ИНТЕРНЕТА:\n${webSearch.content}` : ''}

Сформируй JSON с полями:
{
  "overview": "Обзор ключевых событий периода (2-3 абзаца)",
  "trends": ["Тренд 1", "Тренд 2", "Тренд 3", "Тренд 4", "Тренд 5"],
  "scenarios": {
    "positive": "Оптимистичный сценарий развития",
    "neutral": "Базовый (наиболее вероятный) сценарий",
    "negative": "Пессимистичный сценарий"
  },
  "forecast": "Прогноз на ближайший период (1-2 абзаца)",
  "sources": ["Источник 1", "Источник 2"]
}

Отвечай ТОЛЬКО валидным JSON без markdown-форматирования.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI API error:', errorText);
    throw new Error('Failed to analyze with AI');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';

  // Parse JSON from response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Add web sources if available
      if (webSearch.sources.length > 0) {
        parsed.sources = [...(parsed.sources || []), ...webSearch.sources];
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse AI response:', e);
  }

  return {
    overview: content,
    trends: [],
    scenarios: {},
    forecast: '',
    sources: webSearch.sources
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articles, dateRange, exclusions }: RequestBody = await req.json();

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No articles provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing ${articles.length} articles for period: ${dateRange.label}`);

    // Analyze with AI
    const analysis = await analyzeWithAI(articles, dateRange, exclusions || '');

    // Generate HTML for PDF
    const html = generatePDFHTML(articles, dateRange, analysis);

    // Convert HTML to PDF using external service or return HTML as base64
    // For now, we'll use a simple approach - encode HTML as PDF-like format
    // In production, you'd want to use a proper PDF generation service
    
    // Using html2pdf approach via data URI
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);
    const base64Html = btoa(String.fromCharCode(...htmlBytes));

    // For actual PDF generation, we can use puppeteer or similar
    // For now, returning HTML that can be printed as PDF
    return new Response(
      JSON.stringify({ 
        pdfBase64: base64Html,
        contentType: 'text/html',
        analysis 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating summary report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});