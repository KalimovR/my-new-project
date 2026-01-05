import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!openrouterKey) {
      throw new Error("OPENROUTER_API_KEY не настроен");
    }

    // Get auth header and verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Требуется авторизация");
    }

    const supabaseUser = createClient(supabaseUrl, supabaseKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin/editor
    const { data: userData } = await supabaseUser.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) {
      throw new Error("Пользователь не авторизован");
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (!roleData || !["admin", "editor"].includes(roleData.role)) {
      throw new Error("Недостаточно прав");
    }

    const { count = 1, topic, isPremium = false } = await req.json();
    const discussionCount = Math.min(Math.max(count, 1), 2);

    const currentDate = new Date().toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Build user prompt based on whether topic is provided
    let userPrompt: string;
    
    if (topic && topic.trim()) {
      // Topic provided - analyze and create discussion based on it
      userPrompt = `Создай 1 уникальную дискуссию на тему: "${topic}"

Дата: ${currentDate}.

Проанализируй эту тему и создай провокационную дискуссию, которая:
- Разделит аудиторию примерно 50/50
- Учтёт актуальный контекст 2026 года
- Будет связана с предоставленной темой, но сформулирована как острый вопрос

Учитывай:
- Дональд Трамп — президент США с 2025 года
- Активное развитие ИИ и его влияние на рынок труда
- Геополитическая напряжённость
- Климатические изменения и энергетический переход
- Экономическая нестабильность

Выведи ТОЛЬКО валидный JSON без комментариев.`;
    } else {
      // No topic - AI chooses its own topic
      userPrompt = `Создай ${discussionCount} ${discussionCount === 1 ? "новую уникальную дискуссию" : "новые уникальные дискуссии"} на эту неделю (дата: ${currentDate}).

Темы должны быть актуальны для января 2026 года. Сам выбери наиболее провокационную и актуальную тему из текущих событий.

Учитывай:
- Дональд Трамп — президент США с 2025 года
- Активное развитие ИИ и его влияние на рынок труда
- Геополитическая напряжённость
- Климатические изменения и энергетический переход
- Экономическая нестабильность

Выведи ТОЛЬКО валидный JSON без комментариев.`;
    }

    const systemPrompt = `Ты — редактор раздела "Обсуждения" на сайте "Контекст" (независимое СМИ с циничным уклоном).

Твоя задача: создавать уникальные дискуссии для раздела (не привязанные к статьям).

Правила создания:
- Тема должна быть провокационной: разделять аудиторию примерно 50/50, вызывать спор.
- Уклон "Контекста": цинизм к элитам, власти, корпорациям, медиа; вопросы о манипуляции, лицемерии, будущем.
- Актуальность: привязка к событиям 2026 года (политика, ИИ, климат, экономика, геополитика).

Структура дискуссии:
1. Заголовок — вопрос (короткий, острый, с двоеточием если нужно).
2. Тизер (100-200 слов): 70% факты/контекст из свежих источников (Bloomberg, Reuters, Politico, РБК и т.д.), 30% циничный комментарий редакции.
3. Опрос: 4 варианта (короткие):
   - Крайне "да".
   - Крайне "нет".
   - Умеренный/зависит от контекста.
   - Циничный ("привилегия элит", "все врут" и т.п.).

Правила:
- Не скатываться в конспирологию без фактов.
- Не переходить в оскорбления/радикализм.
- Стиль: профессиональный, но с сарказмом и провокацией.

Ответ ОБЯЗАТЕЛЬНО в формате JSON:
{
  "discussions": [
    {
      "title": "Заголовок-вопрос?",
      "teaser": "Тизер 100-200 слов...",
      "tags": ["тег1", "тег2", "тег3"],
      "poll": {
        "question": "Тот же вопрос или уточнённый?",
        "options": ["Вариант 1", "Вариант 2", "Вариант 3", "Вариант 4"]
      }
    }
  ]
}`;

    console.log("Calling OpenRouter API with Grok model...");
    console.log("Topic provided:", topic || "none (AI will choose)");
    console.log("Is premium:", isPremium);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": supabaseUrl,
      },
      body: JSON.stringify({
        model: "x-ai/grok-3-beta",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      throw new Error(`Ошибка API: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Пустой ответ от AI");
    }

    console.log("AI response received:", content.substring(0, 200));

    // Parse JSON from response
    let parsed;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON parse error:", e, "Content:", content);
      throw new Error("Не удалось распарсить ответ AI");
    }

    if (!parsed.discussions || !Array.isArray(parsed.discussions)) {
      throw new Error("Неверный формат ответа");
    }

    // Save discussions to database
    const createdDiscussions = [];

    for (const disc of parsed.discussions) {
      // Create discussion
      const { data: discussion, error: discError } = await supabaseAdmin
        .from("discussions")
        .insert({
          title: disc.title,
          teaser: disc.teaser,
          tags: disc.tags || [],
          round_ends_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          is_premium: isPremium,
        })
        .select()
        .single();

      if (discError) {
        console.error("Error creating discussion:", discError);
        continue;
      }

      // Create poll if present
      if (disc.poll && disc.poll.options) {
        const pollOptions = disc.poll.options.map((opt: string, idx: number) => ({
          text: opt,
          votes: 0,
        }));

        const { error: pollError } = await supabaseAdmin
          .from("discussion_polls")
          .insert({
            discussion_id: discussion.id,
            question: disc.poll.question || disc.title,
            options: pollOptions,
          });

        if (pollError) {
          console.error("Error creating poll:", pollError);
        }
      }

      createdDiscussions.push(discussion);
    }

    console.log(`Created ${createdDiscussions.length} discussions`);

    return new Response(
      JSON.stringify({
        success: true,
        discussions: createdDiscussions,
        count: createdDiscussions.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Неизвестная ошибка",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
