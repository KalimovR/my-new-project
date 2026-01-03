-- Таблица для банов/мутов пользователей на комментарии
CREATE TABLE public.comment_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_fingerprint text NOT NULL,
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  banned_until timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Таблица для обращений через форму контактов
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  message text NOT NULL,
  is_anonymous boolean NOT NULL DEFAULT false,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS для comment_bans
ALTER TABLE public.comment_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and editors can manage bans"
ON public.comment_bans
FOR ALL
USING (is_admin_or_editor(auth.uid()))
WITH CHECK (is_admin_or_editor(auth.uid()));

CREATE POLICY "Anyone can check bans"
ON public.comment_bans
FOR SELECT
USING (true);

-- RLS для contact_submissions
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and editors can view submissions"
ON public.contact_submissions
FOR SELECT
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Admins and editors can update submissions"
ON public.contact_submissions
FOR UPDATE
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Admins can delete submissions"
ON public.contact_submissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert submissions"
ON public.contact_submissions
FOR INSERT
WITH CHECK (true);

-- Добавим политику DELETE для comment_bans администраторам
CREATE POLICY "Admins can delete bans"
ON public.comment_bans
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));