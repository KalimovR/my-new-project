-- Удаляем старую политику просмотра комментариев
DROP POLICY IF EXISTS "Anyone can view approved comments" ON public.comments;

-- Создаём новую политику - все могут видеть все комментарии
CREATE POLICY "Anyone can view all comments"
ON public.comments
FOR SELECT
USING (true);

-- Обновляем дефолтное значение is_approved на true (комментарии сразу публикуются)
ALTER TABLE public.comments ALTER COLUMN is_approved SET DEFAULT true;