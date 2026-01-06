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

    const { articleId } = await req.json();

    if (!articleId) {
      throw new Error("Не указан ID статьи");
    }

    // Fetch the article
    const { data: article, error: articleError } = await supabaseAdmin
      .from("articles")
      .select("title, content, excerpt, author_name, category")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      throw new Error("Статья не найдена");
    }

    if (!article.content) {
      throw new Error("У статьи нет содержимого");
    }

    console.log("Shortening article for Telegram:", article.title);

    const systemPrompt = `Ты — редактор новостного канала "Контекст" в Telegram.

Твоя задача: сократить статью до 50-150 слов, сохраняя:
- Авторский стиль и тон оригинала
- Ключевую информацию и факты
- Циничный/саркастический уклон издания (если есть в оригинале)
- Ощущение завершённости текста

Правила:
1. НЕ ДОБАВЛЯЙ хештеги, эмодзи или ссылки
2. НЕ НАЧИНАЙ с "Краткое содержание:" или подобных вводных
3. Сохрани заголовок статьи в начале (жирным через ** если нужно)
4. Текст должен быть готов к копированию в Telegram как есть
5. Строго 50-150 слов (не считая заголовок)

Формат ответа:
**Заголовок статьи**

Сокращённый текст статьи...`;

    const userPrompt = `Сократи эту статью для Telegram-канала:

Заголовок: ${article.title}
Автор: ${article.author_name || "Редакция"}
Категория: ${article.category}

Содержание:
${article.content}`;

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
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter error:", response.status, errorText);
      throw new Error(`Ошибка API: ${response.status}`);
    }

    const aiResponse = await response.json();
    const shortenedText = aiResponse.choices?.[0]?.message?.content;

    if (!shortenedText) {
      throw new Error("Пустой ответ от AI");
    }

    console.log("Successfully shortened article");

    return new Response(
      JSON.stringify({
        success: true,
        originalTitle: article.title,
        shortenedText: shortenedText.trim(),
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