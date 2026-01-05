import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENROUTER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { userId } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log(`Generating AI recommendations for user: ${userId}`);

    // Get user's recent activity
    const { data: userPosts } = await supabase
      .from('discussion_posts')
      .select('content, discussion_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get user's voting activity
    const { data: userVotes } = await supabase
      .from('discussion_post_votes')
      .select('post_id')
      .eq('user_id', userId)
      .limit(20);

    // Get discussions user has participated in
    const discussionIds = [...new Set((userPosts || []).map(p => p.discussion_id))];
    
    const { data: participatedDiscussions } = await supabase
      .from('discussions')
      .select('title, tags')
      .in('id', discussionIds.length > 0 ? discussionIds : ['00000000-0000-0000-0000-000000000000']);

    // Get all active discussions
    const { data: allDiscussions } = await supabase
      .from('discussions')
      .select('id, title, teaser, tags, is_premium')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    // Build user interest profile
    const userInterests = (participatedDiscussions || [])
      .flatMap(d => d.tags || [])
      .filter(Boolean);
    
    const userPostsContent = (userPosts || [])
      .map(p => p.content)
      .join('\n\n')
      .slice(0, 2000);

    const systemPrompt = `Ты — AI-ассистент для платформы политических дискуссий "Контекст". 
Твоя задача — анализировать интересы пользователя и рекомендовать обсуждения.

На основе активности пользователя (темы, в которых он участвовал, его посты) 
порекомендуй 3 обсуждения из списка доступных, которые могут его заинтересовать.

Отвечай ТОЛЬКО в формате JSON:
{
  "recommendations": [
    {
      "discussion_id": "uuid",
      "reason": "Краткое объяснение почему это интересно (1 предложение)"
    }
  ]
}`;

    const userPrompt = `Интересы пользователя (теги): ${userInterests.join(', ') || 'не определены'}

Примеры постов пользователя:
${userPostsContent || 'Нет данных'}

Доступные обсуждения:
${(allDiscussions || []).map(d => `- ID: ${d.id}, Тема: ${d.title}, Теги: ${(d.tags || []).join(', ')}`).join('\n')}

Выбери 3 наиболее подходящих обсуждения для этого пользователя.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'x-ai/grok-3-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenRouter error:', error);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    console.log('AI response:', content);

    // Parse JSON response
    let recommendations = [];
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        recommendations = parsed.recommendations || [];
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: return random discussions
      recommendations = (allDiscussions || []).slice(0, 3).map(d => ({
        discussion_id: d.id,
        reason: 'Рекомендуем на основе популярности',
      }));
    }

    // Enrich with discussion data
    const enrichedRecommendations = recommendations.map((rec: { discussion_id: string; reason: string }) => {
      const discussion = allDiscussions?.find(d => d.id === rec.discussion_id);
      return {
        ...rec,
        title: discussion?.title || '',
        teaser: discussion?.teaser?.slice(0, 100) || '',
        is_premium: discussion?.is_premium || false,
      };
    }).filter((rec: { title: string }) => rec.title);

    return new Response(JSON.stringify({ 
      recommendations: enrichedRecommendations,
      success: true,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [],
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
