-- Добавляем колонку для хранения URL файлов
ALTER TABLE public.contact_submissions 
ADD COLUMN attachments text[] DEFAULT '{}';

-- Создаём bucket для вложений обращений
INSERT INTO storage.buckets (id, name, public)
VALUES ('submission-attachments', 'submission-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Политика: любой может загружать файлы
CREATE POLICY "Anyone can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'submission-attachments');

-- Политика: любой может читать файлы
CREATE POLICY "Anyone can view attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'submission-attachments');

-- Политика: админы могут удалять файлы
CREATE POLICY "Admins can delete attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'submission-attachments' AND public.has_role(auth.uid(), 'admin'::app_role));