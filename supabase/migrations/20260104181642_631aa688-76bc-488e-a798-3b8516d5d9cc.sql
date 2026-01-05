-- Add is_premium column to discussions table
ALTER TABLE public.discussions 
ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- Insert test premium discussion
INSERT INTO public.discussions (title, teaser, tags, is_premium, is_active, round_ends_at)
VALUES (
  'Элиты и ИИ: заговор или неизбежность?',
  'В 2026 ИИ управляет всем — от Трампа до твоего банка. Элиты используют его для контроля? Факты от Bloomberg, но полный спор — только для Всевидящих.',
  ARRAY['ИИ', 'Элиты', 'Премиум'],
  true,
  true,
  now() + interval '72 hours'
);