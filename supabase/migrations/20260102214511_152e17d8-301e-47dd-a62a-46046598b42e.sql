-- Создаем таблицу закладок
CREATE TABLE public.bookmarks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, article_id)
);

-- Включаем RLS
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои закладки
CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks
FOR SELECT
USING (auth.uid() = user_id);

-- Пользователи могут добавлять закладки
CREATE POLICY "Users can insert own bookmarks"
ON public.bookmarks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Пользователи могут удалять свои закладки
CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks
FOR DELETE
USING (auth.uid() = user_id);