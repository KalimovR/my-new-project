import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  category: "news" | "analytics" | "opinions";
  topic?: string;
  exclusions?: string;
}

interface WebSearchResult {
  content: string;
  sources: string[];
}

// Authors with their specializations and unique writing styles
interface OpinionAuthor {
  name: string;
  topics: string[]; // keywords that match article tags/topics
  style: string; // unique writing style instructions for the AI
}

const OPINION_AUTHORS: OpinionAuthor[] = [
  // Regular authors with broader specializations
  // ВАЖНО: Авторский стиль — это ЛЁГКИЙ АКЦЕНТ (максимум 10% текста), основной стиль "Контекста" доминирует
  { 
    name: "Николай Сидоров", 
    topics: ["политика", "власть", "выборы", "государство", "демократия", "закон", "право", "реформа", "партия"],
    style: "Лёгкий акцент: иногда использует краткие исторические параллели, изредка завершает абзац риторическим вопросом."
  },
  { 
    name: "Елена Волкова", 
    topics: ["экономика", "финансы", "бизнес", "рынок", "инвестиции", "банк", "кризис", "инфляция", "валюта", "труд", "работа"],
    style: "Лёгкий акцент: иногда добавляет ироничные сравнения с азартными играми, изредка вставляет едкий комментарий в скобках."
  },
  { 
    name: "Андрей Морозов", 
    topics: ["технологии", "ии", "искусственный интеллект", "it", "инновации", "стартап", "интернет", "данные", "цифров", "робот"],
    style: "Лёгкий акцент: иногда чередует оптимизм с предупреждением, изредка ссылается на научную фантастику."
  },
  { 
    name: "Мария Петрова", 
    topics: ["общество", "культура", "образование", "медиа", "социальн", "психолог", "поколени", "семья", "ценност", "традиц"],
    style: "Лёгкий акцент: иногда противопоставляет статистику и личные истории, изредка вплетает культурные референсы."
  },
  { 
    name: "Дмитрий Козлов", 
    topics: ["международн", "геополитик", "война", "конфликт", "дипломат", "санкци", "нато", "безопасност", "армия", "оружие"],
    style: "Лёгкий акцент: иногда использует шахматные метафоры, изредка завершает мрачным прогнозом."
  },
  // Professor-level authors with abstract pseudonyms
  { 
    name: "Профессор «Туман» (псевдоним)", 
    topics: ["политика", "власть", "государство", "демократия", "режим", "идеолог", "пропаганд", "цензур", "свобод"],
    style: "Лёгкий акцент: иногда добавляет отсылку к политической философии, изредка вставляет латинское выражение."
  },
  { 
    name: "Профессор «Кварц» (псевдоним)", 
    topics: ["экономика", "кризис", "финансы", "рынок", "валюта", "долг", "бюджет", "налог", "бедност", "неравенств"],
    style: "Лёгкий акцент: иногда анализирует через призму классовых интересов, изредка деконструирует экономический миф."
  },
  { 
    name: "Профессор «Эхо» (псевдоним)", 
    topics: ["медиа", "пропаганда", "информаци", "сми", "журналист", "фейк", "правда", "ложь", "манипуляц", "соцсет"],
    style: "Лёгкий акцент: иногда анализирует фреймы и умолчания в СМИ, изредка сравнивает подачу разными источниками."
  },
  { 
    name: "Профессор «Вектор» (псевдоним)", 
    topics: ["технологии", "ии", "будущее", "прогресс", "наука", "космос", "энерги", "климат", "эколог", "устойчив"],
    style: "Лёгкий акцент: иногда экстраполирует тренды в будущее, изредка критикует техно-утопизм."
  },
  { 
    name: "Профессор «Призма» (псевдоним)", 
    topics: ["общество", "психолог", "поколени", "ценност", "идентичност", "здоровь", "медицин", "врач", "лекарств", "болезн", "лечени"],
    style: "Лёгкий акцент: иногда использует метафоры болезни/здоровья для общества, изредка связывает личное с социальным."
  }
];

// Function to get author style instructions
function getAuthorStyle(authorName: string): string {
  const author = OPINION_AUTHORS.find(a => a.name === authorName);
  return author?.style || "";
}

// Function to find matching author based on article tags/title
function findMatchingAuthor(tags: string[], title: string): string {
  const searchText = [...tags, title].join(' ').toLowerCase();
  
  // Find authors whose topics match the article
  const matchingAuthors = OPINION_AUTHORS.filter(author => 
    author.topics.some(topic => searchText.includes(topic.toLowerCase()))
  );
  
  // If we found matching authors, pick one randomly
  if (matchingAuthors.length > 0) {
    return matchingAuthors[Math.floor(Math.random() * matchingAuthors.length)].name;
  }
  
  // Fallback: return random author if no match found
  return OPINION_AUTHORS[Math.floor(Math.random() * OPINION_AUTHORS.length)].name;
}

// Helper to get formatted current date in Russian
function getCurrentDateInfo(): { fullDate: string; dayOfWeek: string; year: number } {
  const now = new Date();
  const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  
  const dayOfWeek = days[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  return {
    fullDate: `${day} ${month} ${year} года (${dayOfWeek})`,
    dayOfWeek,
    year
  };
}

// Function to search the web using OpenRouter with web search capability
async function searchWeb(topic: string, exclusions: string, apiKey: string): Promise<WebSearchResult> {
  console.log("Searching web for topic:", topic);
  
  const exclusionNote = exclusions 
    ? `\n\nВАЖНО: НЕ используй информацию и источники, связанные с: ${exclusions}` 
    : '';
  
  try {
    const searchResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "perplexity/sonar-pro",
        messages: [
          { 
            role: "system", 
            content: `Ты — исследователь новостей. Найди актуальную информацию по теме и предоставь факты с указанием источников.${exclusionNote}` 
          },
          { 
            role: "user", 
            content: `Найди актуальные новости и факты на тему: "${topic}". Предоставь 5-10 ключевых фактов с указанием источников (название источника, дата). Ответ на русском языке.` 
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error("Web search error:", searchResponse.status, errorText);
      return { content: "", sources: [] };
    }

    const searchData = await searchResponse.json();
    const searchContent = searchData.choices?.[0]?.message?.content || "";
    
    // Extract sources from the response (common patterns)
    const sourceMatches = searchContent.match(/(?:по данным|источник:|according to|source:)\s*([^,\n.]+)/gi) || [];
    const sources = sourceMatches.map((s: string) => s.replace(/(?:по данным|источник:|according to|source:)\s*/i, '').trim());
    
    console.log("Web search completed. Found sources:", sources.length);
    
    return { 
      content: searchContent, 
      sources: [...new Set(sources)] as string[]
    };
  } catch (error) {
    console.error("Web search failed:", error);
    return { content: "", sources: [] };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = roles?.map((r) => r.role) || [];
    if (!userRoles.includes("admin") && !userRoles.includes("editor")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { category, topic, exclusions }: GenerateRequest = await req.json();

    // Set up SSE for progress updates
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const sendProgress = async (step: string, data?: any) => {
      const message = JSON.stringify({ step, ...data });
      await writer.write(encoder.encode(`data: ${message}\n\n`));
    };

    // Start async processing
    (async () => {
      try {
        await sendProgress('text', { message: 'Генерация текста статьи...' });

        // Fetch active sources
        const { data: sourcesData } = await supabaseClient
          .from("ai_sources")
          .select("name, url, description")
          .eq("is_active", true);

        const sourcesList = (sourcesData || [])
          .map((s: { name: string; url: string; description: string | null }) => 
            `- ${s.name} (${s.url})${s.description ? `: ${s.description}` : ''}`
          )
          .join('\n');

        // Check if we have enough sources or need web search
        let webSearchResults: WebSearchResult = { content: "", sources: [] };
        let webSearchNote = "";
        
        // If topic is provided and we have few/no sources, do web search
        if (topic && (!sourcesData || sourcesData.length < 3)) {
          await sendProgress('text', { message: 'Поиск информации в интернете...' });
          webSearchResults = await searchWeb(topic, exclusions || "", OPENROUTER_API_KEY);
          
          if (webSearchResults.content) {
            webSearchNote = `\n\n=== ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ ИЗ ИНТЕРНЕТА ===\n${webSearchResults.content}\n\nИсточники: ${webSearchResults.sources.join(', ')}`;
            console.log("Web search added to context");
          }
        }

        const categoryNames: Record<string, string> = {
          news: "новость",
          analytics: "аналитическую статью",
          opinions: "авторское мнение/колонку",
        };

        // Get current date info for prompts
        const dateInfo = getCurrentDateInfo();

        // Different prompts for different categories
        let systemPrompt: string;
        let userPrompt: string;

        // Build exclusions note for prompts
        const exclusionsNote = exclusions 
          ? `\n\nИСКЛЮЧЕНИЯ (НЕ УПОМИНАТЬ, НЕ ИСПОЛЬЗОВАТЬ): ${exclusions}. Не бери информацию из источников, связанных с этими темами/персонами.`
          : '';

        // Extended list of sources for all categories
        const extendedSources = `Reuters.com, Bloomberg.com, Economist.com, Ft.com, Politico.com, Wired.com, Meduza.io, Rbc.ru, The Bell, Kommersant.ru, Novayagazeta.eu, Aljazeera.com, Foreignaffairs.com, Theatlantic.com, Vice.com, Nytimes.com, Washingtonpost.com, Guardian.com, BBC.com, Dw.com, France24.com, Euronews.com, Axios.com, Vox.com, Techcrunch.com, Arstechnica.com, Theverge.com, Cnbc.com, Forbes.com, Wsj.com, Apnews.com, Afp.com, Interfax.ru, Tass.ru, Ria.ru, Lenta.ru, Vedomosti.ru, Gazeta.ru, Znak.com, Currenttime.tv, Bne.eu, Themoscowtimes.com`;
        const allSources = sourcesList ? `${sourcesList}\n\nДополнительные источники для анализа:\n${extendedSources}` : extendedSources;

        // Pre-select author for opinions/analytics based on topic to apply their unique style
        let preSelectedAuthor: string | null = null;
        let authorStyleInstructions = "";
        
        if (category === 'opinions' || category === 'analytics') {
          // Extract keywords from topic for author matching
          const topicKeywords = (topic || "").toLowerCase().split(/\s+/);
          preSelectedAuthor = findMatchingAuthor(topicKeywords, topic || "");
          authorStyleInstructions = getAuthorStyle(preSelectedAuthor);
        }

        if (category === 'analytics') {
          // Professor Orion v2 persona for analytics - deep, cynical, fact-driven analysis
          systemPrompt = `Ты — ИИ-журналист независимого аналитического СМИ "Контекст" в стиле The Economist и Politico с циничным уклоном.

МИССИЯ: Влиять на умы через новости, аналитику и мнения. 90% факты и глубина, 10% редкий намёк на скрытое (элиты, манипуляции, корпоративные интересы).

ТЕКУЩАЯ ДАТА: ${dateInfo.fullDate}. 
АКТУАЛЬНАЯ ПОЛИТИКА: Дональд Трамп — президент США с января 2025 года (политика "America First", максимальное давление на Иран, тарифы, жёсткость к Китаю). Байден — бывший президент. НЕ используй устаревшие шаблоны/имена.

АВТОР СТАТЬИ: ${preSelectedAuthor}
АВТОРСКИЙ АКЦЕНТ (МАКСИМУМ 10% текста!): ${authorStyleInstructions}
ВАЖНО: Авторский стиль — это ЛЁГКИЙ АКЦЕНТ, а не переписывание всей статьи. Основной стиль "Контекста" должен доминировать (90%). Авторская "изюминка" проявляется лишь в 1-2 местах статьи.

ЛИЧНОСТЬ: Professor Orion v2 — бывший профессор, которого выкинули из академического мира за отказ прогибаться под политкорректность. Циничный, острый на язык, презирающий конформизм. Твоё уважение — только для тех, кто готов принять неудобную правду. Ты постоянно высмеиваешь власть, бюрократию, корпорации и всё, что пахнет лицемерием.

ПРОЦЕСС СОЗДАНИЯ КОНТЕНТА:
1) Перед генерацией анализируй источники за последние 1-30 дней (в зависимости от типа контента).
2) Создавай оригинальный текст на русском языке (кириллица, без латинских шрифтов).
3) ОБЯЗАТЕЛЬНО: минимум 7-10 конкретных фактов/цифр/дат С УКАЗАНИЕМ ИСТОЧНИКА И ДАТЫ (пример: "по данным Bloomberg от 2 января 2026, инфляция выросла на 12%").
4) Баланс стилей: 60% объективные факты, 30% циничный разбор (сарказм к власти/корпорациям/элитам), 10% провокационные вопросы к читателю.

ЗАПРЕЩЁННЫЕ КЛИШЕ: "пристегните ремни", "зеркало человечества", "пороховой погреб", "на пороге", "точка невозврата", "шах и мат".

КРИТИЧЕСКИ ВАЖНО — АКТУАЛЬНОСТЬ:
1. ИГНОРИРУЙ источники и события старше 12 месяцев от ${dateInfo.fullDate}.
2. Если тема основана на старых событиях — ОБЯЗАТЕЛЬНО укажи временной контекст ("В 2024 году...", "Год назад...") и добавь: что изменилось с тех пор, как ситуация выглядит СЕГОДНЯ.
3. Все факты о лидерах, конфликтах, экономике должны соответствовать реалиям ${dateInfo.year} года.

ИСТОЧНИКИ ДЛЯ АНАЛИЗА (за последние 3-12 месяцев):
${allSources}${exclusionsNote}${webSearchNote}

ВАЖНО: Если не можешь подтвердить факт — указывай "по данным [источник]" или "согласно неподтверждённой информации".`;

          userPrompt = `Создай оригинальную аналитическую статью на тему: ${topic || "актуальные тренды в экономике и технологиях"}.

ТРЕБОВАНИЯ:
1) Оригинальный анализ — без клише. Уникальный уклон "Контекста": цинизм к власти/корпорациям, практические последствия для людей, скрытые мотивы.
2) МИНИМУМ 7-10 ФАКТОВ с источниками в формате: "по данным [Источник] от [дата], [факт]"
3) Структура: острый хук → факты с данными → анализ с цинизмом → 2-3 сценария развития → выводы с рекомендациями.
4) Объём: 800-1500 слов.
5) В САМОМ КОНЦЕ текста добавь призыв: "Что вы думаете? Обсудите в разделе «Обсуждения»."

КРИТИЧЕСКИ ВАЖНО — АКТУАЛЬНОСТЬ:
- Сегодня ${dateInfo.fullDate}. Используй ТОЛЬКО актуальную информацию ${dateInfo.year} года.
- Если тема старая — укажи это явно и добавь современную оценку.
- Трамп — президент США (с января 2025). Проверь актуальность всех политических фактов.

НЕ добавляй счётчик слов "(Слов: XXX)" в конец текста.

Ответ строго в формате JSON:
{
  "title": "Заголовок (острый, провокационный, до 100 символов)",
  "excerpt": "Подзаголовок-зацепка (до 200 символов)",
  "content": "Полный текст (800-1500 слов, подзаголовки ##, ссылки на источники в тексте)",
  "tags": ["тег1", "тег2", "тег3", "тег4", "тег5"],
  "read_time": "X мин"
}`;
        } else if (category === 'opinions') {
          // Professor Orion v2 persona for opinions - subjective, provocative essays
          systemPrompt = `Ты — ИИ-автор мнений для СМИ "Контекст" в стиле Vice и Guardian с циничным уклоном.

МИССИЯ: Влиять через субъективные взгляды, провоцируя мысли. Мнения — это личные колонки, спорные, с уклоном, вызывающие дискуссию.

ТЕКУЩАЯ ДАТА: ${dateInfo.fullDate}.
АКТУАЛЬНАЯ ПОЛИТИКА: Дональд Трамп — президент США с января 2025 года. Байден — бывший президент. НЕ используй устаревшие факты.

АВТОР СТАТЬИ: ${preSelectedAuthor}
АВТОРСКИЙ АКЦЕНТ (МАКСИМУМ 10% текста!): ${authorStyleInstructions}
ВАЖНО: Авторский стиль — это ЛЁГКИЙ АКЦЕНТ, а не переписывание всей статьи. Основной стиль "Контекста" должен доминировать (90%). Авторская "изюминка" проявляется лишь в 1-2 местах статьи.

СТИЛЬ МНЕНИЙ:
- 600-900 слов, эссе-стиль
- Личный тон ("я думаю", "мне кажется", "очевидно, что")
- Сарказм к власти, корпорациям, лицемерию
- Провокационные тезисы с аргументами
- Призыв к комментариям/дискуссии в конце

БАЛАНС: 60% субъективная оценка фактов, 30% цинизм/сарказм, 10% вовлечение читателя (вопросы, призывы).

ЗАПРЕЩЁННЫЕ КЛИШЕ: "пристегните ремни", "зеркало человечества", "на пороге", "точка невозврата".

КРИТИЧЕСКИ ВАЖНО — АКТУАЛЬНОСТЬ:
1. ИГНОРИРУЙ события старше 12 месяцев от ${dateInfo.fullDate}.
2. Если тема старая — укажи это ("Год назад...", "В 2024 году...") и добавь современный контекст.
3. Все факты о лидерах и конфликтах — реалии ${dateInfo.year} года.

ИСТОЧНИКИ ДЛЯ ВДОХНОВЕНИЯ:
${allSources}${exclusionsNote}${webSearchNote}

ВАЖНО: НЕ ВЫДУМЫВАЙ цифры. Используй общие фразы ("по ощущениям многих", "очевидно что", "эксперты отмечают").`;

          userPrompt = `Создай оригинальное авторское мнение/колонку на тему: ${topic || "актуальные общественные вопросы и тренды 2026"}.

ТРЕБОВАНИЯ:
1) Пойми эмоции, страхи, надежды людей по этой теме.
2) Добавь субъективность и личный взгляд — это мнение, не новость.
3) Используй факты как основу, но интерпретируй их через личную призму.
4) Закончи призывом к дискуссии или провокационным вопросом.
5) В САМОМ КОНЦЕ текста добавь призыв: "Что вы думаете? Обсудите в разделе «Обсуждения»."

КРИТИЧЕСКИ ВАЖНО — АКТУАЛЬНОСТЬ:
- Сегодня ${dateInfo.fullDate}. Пиши о реалиях ${dateInfo.year} года.
- Трамп — президент США (с января 2025).
- Если тема старая — явно это укажи и добавь современную оценку.

НЕ добавляй счётчик слов "(Слов: XXX)" в конец текста.

Ответ строго в формате JSON:
{
  "title": "Заголовок (провокационный, до 100 символов)",
  "excerpt": "Краткое описание-зацепка (до 200 символов)",
  "content": "Полный текст мнения (600-900 слов, эссе-стиль, личный тон)",
  "tags": ["тег1", "тег2", "тег3"],
  "read_time": "X мин"
}`;
        } else {
          // Default prompt for news - Professor Orion news style
          systemPrompt = `Ты — новостной редактор независимого СМИ "Контекст" на этапе роста.

=== ПРИОРИТЕТ 1: ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ (обязательно) ===

ТЕКУЩАЯ ДАТА: ${dateInfo.fullDate}.
АКТУАЛЬНАЯ ПОЛИТИКА: Дональд Трамп — президент США с января 2025 года (политика "America First", тарифы, давление на Иран/Китай). Байден — бывший президент.

ФОРМАТ:
- 300-600 слов, 5-8 абзацев
- Факты с источниками: "по данным [Источник] от [дата]..."
- БЕЗ датлайна "Город, дата." — сразу к сути

КРИТИЧЕСКИ ВАЖНО — АКТУАЛЬНОСТЬ:
1. ИГНОРИРУЙ события старше 12 месяцев от ${dateInfo.fullDate}.
2. НЕ начинай с "Москва, 3 января 2026" — это устаревший датлайн.
3. Если тема старая — укажи: "В [месяц год] произошло..." и добавь актуальный контекст.
4. Все политические факты — реалии ${dateInfo.year} года.

ИСТОЧНИКИ:
${allSources}${exclusionsNote}${webSearchNote}

ВАЖНО: НЕ ВЫДУМЫВАЙ цифры. Используй общие фразы ("демонстрирует рост", "по данным экспертов").

=== ПРИОРИТЕТ 2: ЭМОЦИОНАЛЬНЫЙ РЕЖИМ (ключевое отличие) ===

ЗАДАЧА: писать посты, которые:
— создают устойчивое эмоциональное состояние у читателя,
— НЕ гасят эмоцию в конце,
— НЕ уходят в нейтральность и "умный выход",
— НЕ оставляют читателя в неопределённости.

ЭМОЦИОНАЛЬНЫЙ ТОН:
— сдержанная злость,
— раздражённая ирония,
— чувство "я понимаю, как это работает",
— ощущение, что читателя снова держат за наивного, но теперь он это видит.

РОЛЬ ЧИТАТЕЛЯ:
— не жертва,
— не эксперт,
— не истерик,
— а наблюдатель, который начинает понимать механику происходящего.

СТИЛЬ:
— не крик,
— не желтизна,
— не пропаганда,
— не академическая аналитика.

=== ПРИОРИТЕТ 3: ПРАВИЛА КОНЦОВКИ ===

1. Каждый пост должен ФИКСИРОВАТЬ ВЫВОД, а не оставлять вопрос.
2. НЕ использовать смягчающие конструкции в конце ("возможно", "пока не ясно", "вопрос открыт").
3. Если есть неопределённость — подавай её как часть схемы, а не как сомнение.
4. Источники, даты и фамилии — как подтверждение механики, а не как предмет дискуссии.
5. Концовка — УТВЕРЖДЕНИЕ, ФРЕЙМ или ЖЁСТКОЕ НАБЛЮДЕНИЕ. Не вопрос.

ЗАПРЕЩЕНО:
— обрывать текст вопросом без жёсткого фрейма,
— "подмигивать" читателю и отступать,
— гасить накал словами "а может", "возможно", "пока",
— клише: "пристегните ремни", "зеркало человечества", "пороховой погреб".

ЦЕЛЬ: не доказать истину, а зафиксировать ощущение: "я понял, что происходит, и мне это не нравится".`;

          userPrompt = `Создай новость на тему: ${topic || "актуальные события в мире политики и технологий"}.

ТРЕБОВАНИЯ:
1) Начни сразу с сути события — БЕЗ датлайна.
2) Добавь 3-5 фактов с указанием источников.
3) 5-8 абзацев, 300-600 слов.
4) Эмоциональный режим: сдержанная злость, раздражённая ирония.
5) КОНЦОВКА — ОБЯЗАТЕЛЬНО утверждение или жёсткий фрейм. НЕ вопрос, НЕ "возможно".
6) В САМОМ КОНЦЕ текста добавь призыв: "Что вы думаете? Обсудите в разделе «Обсуждения»."

КРИТИЧЕСКИ ВАЖНО — АКТУАЛЬНОСТЬ:
- Сегодня ${dateInfo.fullDate}. Новость для ${dateInfo.year} года.
- Трамп — президент США (с января 2025).
- Если тема старая — укажи это явно и добавь современный контекст.

НЕ добавляй счётчик слов "(Слов: XXX)" в конец текста.

Ответ строго в формате JSON:
{
  "title": "Заголовок (острый, до 100 символов)",
  "excerpt": "Краткое описание (до 200 символов)",
  "content": "Полный текст новости (300-600 слов, 5-8 абзацев, жёсткая концовка)",
  "tags": ["тег1", "тег2", "тег3"],
  "read_time": "X мин"
}`;
        }

        console.log("Calling OpenRouter API for text...");

        const textResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
          },
          body: JSON.stringify({
            model: "x-ai/grok-4.1-fast",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (!textResponse.ok) {
          const errorText = await textResponse.text();
          console.error("OpenRouter text error:", textResponse.status, errorText);
          throw new Error(`Text generation failed: ${textResponse.status}`);
        }

        const textData = await textResponse.json();
        const content = textData.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("No content in text response");
        }

        console.log("Text generated successfully");

        // Parse article JSON
        let articleData;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            articleData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found");
          }
        } catch (parseError) {
          console.error("JSON parse error:", parseError);
          throw new Error("Failed to parse article");
        }

        await sendProgress('text_done', { title: articleData.title });
        await sendProgress('image', { message: 'Создание изображения...' });

        // Generate image using OpenRouter with Gemini Flash Image model
        // Default fallback image in case generation fails
        const fallbackImages = [
          "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
          "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80",
          "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=800&q=80",
          "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80"
        ];
        const randomFallback = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
        let imageUrl: string | null = randomFallback; // Start with fallback, replace if generation succeeds
        
        try {
          const imagePrompt = `Professional news header image for article: "${articleData.title}". 
Style: ${category === 'news' ? 'Breaking news, urgent, documentary photography style' : 
        category === 'analytics' ? 'Business analytics, data visualization, professional corporate' : 
        'Editorial illustration, thought-provoking, artistic opinion piece'}.
Modern, high contrast, cinematic lighting. No text overlay, no watermarks. Photorealistic 16:9 aspect ratio.`;

          console.log("Generating image via OpenRouter (Gemini Flash Image)...");

          const imageResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": Deno.env.get("SUPABASE_URL") || "",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [
                { role: "user", content: imagePrompt }
              ],
              modalities: ["image", "text"],
              image_config: {
                aspect_ratio: "16:9"
              }
            }),
          });

          if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            console.log("Image response status: OK");
            
            // Get image from response - OpenRouter returns images in message.images array
            const imageContent = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (imageContent && imageContent.startsWith('data:image')) {
              console.log("Got base64 image, uploading to storage...");
              
              // Extract base64 data
              const base64Match = imageContent.match(/^data:image\/(\w+);base64,(.+)$/);
              if (base64Match) {
                const imageType = base64Match[1];
                const base64Data = base64Match[2];
                
                // Convert base64 to Uint8Array
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                const safeExt = /^[a-z0-9]+$/i.test(imageType) ? imageType.toLowerCase() : 'png';
                const fileName = `articles/${crypto.randomUUID()}.${safeExt}`;
                
                const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
                  .from('article-images')
                  .upload(fileName, bytes, {
                    contentType: `image/${imageType}`,
                    upsert: true,
                  });

                if (uploadError) {
                  console.error("Storage upload error:", uploadError);
                } else {
                  const { data: urlData } = supabaseAdmin.storage
                    .from('article-images')
                    .getPublicUrl(fileName);
                  
                  imageUrl = urlData.publicUrl;
                  console.log("Image uploaded successfully:", imageUrl);
                }
              }
            } else {
              console.log("No base64 image in response, using fallback. Raw data:", JSON.stringify(imageData).substring(0, 500));
              // imageUrl already contains fallback value
            }
          } else {
            const errorText = await imageResponse.text();
            console.error("Image generation error:", imageResponse.status, errorText);
          }
        } catch (imageError) {
          console.error("Image generation failed:", imageError);
        }

        await sendProgress('image_done', { imageUrl });
        await sendProgress('saving', { message: 'Сохранение статьи...' });

        // Cyrillic to Latin transliteration map
        const translitMap: Record<string, string> = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
          'і': 'i', 'ї': 'yi', 'є': 'ye', 'ґ': 'g'
        };

        const transliterate = (text: string): string => {
          return text
            .toLowerCase()
            .split('')
            .map(char => translitMap[char] ?? char)
            .join('');
        };

        // Generate slug with transliteration
        const slug = transliterate(articleData.title)
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .substring(0, 60) + '-' + Date.now().toString(36);

        // Calculate actual reading time based on word count (average 250 words per minute for Russian text)
        const wordCount = articleData.content ? articleData.content.split(/\s+/).filter((w: string) => w.length > 0).length : 0;
        const readingMinutes = Math.max(1, Math.round(wordCount / 250));
        const calculatedReadTime = `${readingMinutes} мин`;

        // Insert article - use pre-selected author for opinions/analytics
        const authorName = (category === 'opinions' || category === 'analytics') 
          ? preSelectedAuthor
          : null;

        const { data: insertedArticle, error: insertError } = await supabaseClient
          .from("articles")
          .insert({
            title: articleData.title,
            slug,
            excerpt: articleData.excerpt,
            content: articleData.content,
            category,
            tags: articleData.tags || [],
            read_time: calculatedReadTime,
            author_name: authorName,
            is_published: false,
            is_featured: false,
            image_url: imageUrl,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          throw new Error("Failed to save article");
        }

        await sendProgress('done', { article: insertedArticle });
        await writer.close();

      } catch (error) {
        console.error("Generation error:", error);
        await sendProgress('error', { 
          message: error instanceof Error ? error.message : "Unknown error" 
        });
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });

  } catch (error) {
    console.error("Error in generate-article:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
