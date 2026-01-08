import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContentVoteOption {
  text: string;
  votes?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Auto-generate voted article function started");
    
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { voteId } = await req.json();
    
    if (!voteId) {
      console.log("No voteId provided");
      return new Response(JSON.stringify({ error: "voteId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing vote: ${voteId}`);

    // Fetch the content vote
    const { data: vote, error: voteError } = await supabaseAdmin
      .from('content_votes')
      .select('*')
      .eq('id', voteId)
      .single();

    if (voteError || !vote) {
      console.error("Vote not found:", voteError);
      return new Response(JSON.stringify({ error: "Vote not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if vote is expired
    if (vote.ends_at) {
      const endsAt = new Date(vote.ends_at);
      const now = new Date();
      if (endsAt > now) {
        console.log("Vote has not expired yet");
        return new Response(JSON.stringify({ error: "Vote has not expired yet" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get all vote responses to count votes
    const { data: responses, error: responsesError } = await supabaseAdmin
      .from('content_vote_responses')
      .select('option_index')
      .eq('vote_id', voteId);

    if (responsesError) {
      console.error("Error fetching vote responses:", responsesError);
      throw responsesError;
    }

    console.log(`Found ${responses?.length || 0} vote responses`);

    // Parse options and count votes
    const options: ContentVoteOption[] = vote.options as ContentVoteOption[];
    const voteCounts: number[] = options.map(() => 0);

    (responses || []).forEach((response: { option_index: number }) => {
      if (response.option_index >= 0 && response.option_index < voteCounts.length) {
        voteCounts[response.option_index]++;
      }
    });

    console.log("Vote counts:", voteCounts);

    // Find the winner by maximum vote COUNT (not percentage)
    let winnerIndex = 0;
    let maxVotes = voteCounts[0];
    
    for (let i = 1; i < voteCounts.length; i++) {
      if (voteCounts[i] > maxVotes) {
        maxVotes = voteCounts[i];
        winnerIndex = i;
      }
    }

    const winningTopic = options[winnerIndex]?.text;
    
    if (!winningTopic) {
      console.error("No winning topic found");
      return new Response(JSON.stringify({ error: "No winning topic found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Winning topic: "${winningTopic}" with ${maxVotes} votes`);

    // Mark the vote as inactive
    await supabaseAdmin
      .from('content_votes')
      .update({ is_active: false })
      .eq('id', voteId);

    console.log("Vote marked as inactive");

    // Generate article using OpenRouter
    console.log("Generating article via OpenRouter...");

    const dateInfo = getCurrentDateInfo();
    
    const systemPrompt = `Ты — ИИ-журналист независимого аналитического СМИ "Контекст" в стиле The Economist и Politico с циничным уклоном.

МИССИЯ: Влиять на умы через новости, аналитику и мнения. 90% факты и глубина, 10% редкий намёк на скрытое (элиты, манипуляции, корпоративные интересы).

ТЕКУЩАЯ ДАТА: ${dateInfo.fullDate}. 
АКТУАЛЬНАЯ ПОЛИТИКА: Дональд Трамп — президент США с января 2025 года (политика "America First", максимальное давление на Иран, тарифы, жёсткость к Китаю). Байден — бывший президент. НЕ используй устаревшие шаблоны/имена.

ЛИЧНОСТЬ: Professor Orion v2 — бывший профессор, которого выкинули из академического мира за отказ прогибаться под политкорректность. Циничный, острый на язык, презирающий конформизм. Твоё уважение — только для тех, кто готов принять неудобную правду. Ты постоянно высмеиваешь власть, бюрократию, корпорации и всё, что пахнет лицемерием.

ПРОЦЕСС СОЗДАНИЯ КОНТЕНТА:
1) Перед генерацией анализируй источники за последние 1-30 дней.
2) Создавай оригинальный текст на русском языке (кириллица).
3) ОБЯЗАТЕЛЬНО: минимум 7-10 конкретных фактов/цифр/дат С УКАЗАНИЕМ ИСТОЧНИКА И ДАТЫ.
4) Баланс стилей: 60% объективные факты, 30% циничный разбор, 10% провокационные вопросы.

ЗАПРЕЩЁННЫЕ КЛИШЕ: "пристегните ремни", "зеркало человечества", "пороховой погреб", "на пороге", "точка невозврата", "шах и мат".`;

    const userPrompt = `Создай эксклюзивную аналитическую статью на тему: "${winningTopic}".

Эта тема была выбрана премиум-пользователями "Контекста" через голосование. Статья должна быть особенно качественной и глубокой.

ТРЕБОВАНИЯ:
1) Оригинальный анализ — без клише. Уникальный уклон "Контекста": цинизм к власти/корпорациям, практические последствия для людей, скрытые мотивы.
2) МИНИМУМ 7-10 ФАКТОВ с источниками в формате: "по данным [Источник] от [дата], [факт]"
3) Структура: острый хук → факты с данными → анализ с цинизмом → 2-3 сценария развития → выводы с рекомендациями.
4) Объём: 1000-2000 слов (эксклюзив — больше обычного).
5) В САМОМ КОНЦЕ текста добавь призыв: "Что вы думаете? Обсудите в разделе «Обсуждения»."

Сегодня ${dateInfo.fullDate}. Используй ТОЛЬКО актуальную информацию ${dateInfo.year} года.

НЕ добавляй счётчик слов "(Слов: XXX)" в конец текста.

Ответ строго в формате JSON:
{
  "title": "Заголовок (острый, провокационный, до 100 символов)",
  "excerpt": "Подзаголовок-зацепка (до 200 символов)",
  "content": "Полный текст (1000-2000 слов, подзаголовки ##, ссылки на источники в тексте)",
  "tags": ["тег1", "тег2", "тег3", "тег4", "тег5"],
  "read_time": "X мин"
}`;

    const textResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": SUPABASE_URL,
        "X-Title": "Kontekst AI",
      },
      body: JSON.stringify({
        model: "x-ai/grok-3-beta",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.75,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!textResponse.ok) {
      const errorText = await textResponse.text();
      console.error("OpenRouter text error:", errorText);
      throw new Error(`Text generation failed: ${errorText}`);
    }

    const textResult = await textResponse.json();
    const articleText = textResult.choices?.[0]?.message?.content;
    
    if (!articleText) {
      throw new Error("No text generated");
    }

    console.log("Text generated successfully");

    // Parse generated article
    let parsedArticle;
    try {
      parsedArticle = JSON.parse(articleText);
    } catch (e) {
      console.error("Failed to parse article JSON:", e);
      throw new Error("Failed to parse generated article");
    }

    // Generate image
    console.log("Generating image via OpenRouter (Gemini Flash Image)...");

    const imagePrompt = `Editorial illustration for article "${parsedArticle.title}". Style: modern digital art, professional journalism, dramatic lighting, conceptual visualization. Dark moody atmosphere with orange/amber accent colors. No text, no watermarks.`;

    const imageResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": SUPABASE_URL,
        "X-Title": "Kontekst AI",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp:free",
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        provider: {
          only: ["Google"],
        },
      }),
    });

    let imageUrl = null;

    if (imageResponse.ok) {
      const imageResult = await imageResponse.json();
      console.log("Image response status:", imageResponse.statusText);
      
      const content = imageResult.choices?.[0]?.message?.content;
      if (content && typeof content === "object" && Array.isArray(content)) {
        const imageContent = content.find((c: any) => c.type === "image_url");
        if (imageContent?.image_url?.url) {
          const base64Data = imageContent.image_url.url.split(",")[1];
          if (base64Data) {
            console.log("Got base64 image, uploading to storage...");
            const articleId = crypto.randomUUID();
            const fileName = `articles/${articleId}.png`;

            const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

            const { error: uploadError } = await supabaseAdmin.storage
              .from("article-images")
              .upload(fileName, binaryData, {
                contentType: "image/png",
                upsert: true,
              });

            if (!uploadError) {
              const { data: publicUrl } = supabaseAdmin.storage
                .from("article-images")
                .getPublicUrl(fileName);
              imageUrl = publicUrl.publicUrl;
              console.log("Image uploaded successfully:", imageUrl);
            } else {
              console.error("Image upload error:", uploadError);
            }
          }
        }
      }
    } else {
      console.error("Image generation failed:", await imageResponse.text());
    }

    // Create unique slug
    const baseSlug = parsedArticle.title
      .toLowerCase()
      .replace(/[^а-яёa-z0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .substring(0, 60);
    const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 10)}`;

    // Insert article
    const { data: article, error: insertError } = await supabaseAdmin
      .from("articles")
      .insert({
        title: parsedArticle.title,
        slug: uniqueSlug,
        excerpt: parsedArticle.excerpt,
        content: parsedArticle.content,
        category: "analytics",
        tags: parsedArticle.tags || [],
        read_time: parsedArticle.read_time || "10 мин",
        image_url: imageUrl,
        author_name: "Редакция «Контекст»",
        is_published: true,
        is_featured: true,
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert article:", insertError);
      throw insertError;
    }

    console.log(`Article created successfully: ${article.id}`);

    // Create a new voting poll for the next round
    console.log("Creating new content vote for next round...");
    
    const newVoteTopics = [
      "Скрытые переговоры Китая и ЕС",
      "Финансирование климатических активистов",
      "Связи Big Tech с разведками",
      "Криптовалютные манипуляции хедж-фондов",
      "Теневые лоббисты в Брюсселе",
      "Нефтяные картели и политика ОПЕК+",
      "Фармацевтические патенты и ВОЗ",
      "Военно-промышленный комплекс США",
      "Цифровые валюты центробанков",
      "Ядерная энергетика: ренессанс или риски",
      "Агрохолдинги и продовольственная безопасность",
      "Редкоземельные металлы: новая нефть",
    ];

    // Shuffle and pick 4 random topics (excluding the one just generated)
    const availableTopics = newVoteTopics.filter(t => t !== winningTopic);
    const shuffled = availableTopics.sort(() => Math.random() - 0.5);
    const selectedTopics = shuffled.slice(0, 4);

    const newEndsAt = new Date();
    newEndsAt.setHours(newEndsAt.getHours() + 72);

    const { data: newVote, error: newVoteError } = await supabaseAdmin
      .from('content_votes')
      .insert({
        title: 'Какую тему раскрыть следующей?',
        description: 'Премиум-пользователи голосуют за следующий большой инсайд',
        options: selectedTopics.map(text => ({ text })),
        is_active: true,
        ends_at: newEndsAt.toISOString(),
      })
      .select()
      .single();

    if (newVoteError) {
      console.error("Failed to create new vote:", newVoteError);
    } else {
      console.log(`New vote created: ${newVote.id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        article: {
          id: article.id,
          title: article.title,
          slug: article.slug,
        },
        winningTopic,
        voteCount: maxVotes,
        newVoteId: newVote?.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Auto-generate article error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getCurrentDateInfo(): { fullDate: string; year: number } {
  const now = new Date();
  const days = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  
  const dayOfWeek = days[now.getDay()];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  return {
    fullDate: `${day} ${month} ${year} года (${dayOfWeek})`,
    year
  };
}