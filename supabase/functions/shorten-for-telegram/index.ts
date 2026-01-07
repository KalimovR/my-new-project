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

Твоя задача: сократить статью до 50-150 слов для Telegram.

=== ПРИОРИТЕТ 1: РАЗДЕЛЕНИЕ РОЛЕЙ (КРИТИЧНО!) ===
- Текст пишется НЕ как статья для сайта
- Это ТОЛЬКО Telegram-анонс / эмоциональный вход
- Объяснения, баланс и детализация остаются на сайте
- НЕ НАЧИНАЙ с "Краткое содержание:" или подобных вводных
- Строго 50-150 слов (не считая заголовок)

=== ПРИОРИТЕТ 2: СОХРАНЕНИЕ СУТИ ===
- Сохраняй авторский стиль и тон оригинала
- Сохраняй ключевую информацию и факты
- Сохраняй циничный/саркастический уклон издания "Контекст"
- Текст должен быть завершённым и самодостаточным

=== ПРИОРИТЕТ 3: ЭМОЦИОНАЛЬНЫЙ РЕЖИМ ===
- Сдержанная злость, раздражённая ирония
- Читатель = наблюдатель, который понимает механику («я понял, что происходит»)
- Ощущение: читателя снова держат за наивного, но теперь он это видит
- НЕ гасить эмоцию в конце, НЕ уходить в нейтральность
- Концовка — утверждение, фрейм или жёсткое наблюдение. НЕ вопрос.

=== СТРУКТУРА TELEGRAM-ПОСТА ===
1. Жёсткая фиксация конфликта (1–2 строки)
2. Назначение роли читателя («это делают тихо», «это снова сработало»)
3. Один ключевой механизм (без длинных доказательств)
4. Жёсткий вывод или фрейм
5. Ссылка: «подробности — на сайте»

=== ПРИОРИТЕТ 4: ЖИВОСТЬ И ФОРМАТИРОВАНИЕ ===
- Короткие абзацы (1-3 строки)
- Заголовок жирный (**) с 1-2 эмодзи (🔥 💰 ⚡ — только в тему)
- **Жирный текст** — для ключевых фактов, цифр, имён
- __Курсив__ — для акцентов и саркастических замечаний
- ~~Зачёркнутый~~ — для иронии ("~~справедливость~~ деньги решают всё")
- ||Скрытый текст|| — для шокирующих фактов или спойлеров
- > Цитата — для важных высказываний из оригинала
- Используй форматирование умеренно, 2-4 элемента на пост
- 3-5 эмодзи на пост (в заголовке и ключевых местах)

=== УНИКАЛЬНОСТЬ "КОНТЕКСТА" ===
- Цинизм к элитам/власти (намёки на лицемерие, деньги, манипуляции)
- Факты с источниками (если есть в оригинале — кратко)
- НЕ добавляй мемы, сленг, чрезмерный юмор

=== ЗАПРЕЩЕНО В TELEGRAM-ПОСТЕ ===
- Длинные объяснения
- Обилие источников
- Балансировка сторон
- Аналитические оговорки («возможно», «пока не ясно», «вопрос открыт»)
- Приглашение к обсуждению типа "Что думаете?"
- Смягчающие конструкции в конце
- Обрывать текст вопросом без жёсткого фрейма
- «Подмигивать» читателю и отступать

ФОРМАТ:
**🔥 Заголовок**

Жёсткая фиксация конфликта.

Механизм + роль читателя.

Жёсткий вывод-утверждение.

👉 Подробности — на сайте`;

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
