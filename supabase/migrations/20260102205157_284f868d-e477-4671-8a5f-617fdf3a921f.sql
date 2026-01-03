-- Create AI sources table for admin-managed news sources
CREATE TABLE public.ai_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_sources ENABLE ROW LEVEL SECURITY;

-- Only admins can manage sources
CREATE POLICY "Admins can manage AI sources"
ON public.ai_sources
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active sources (for edge functions)
CREATE POLICY "Anyone can view active sources"
ON public.ai_sources
FOR SELECT
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_sources_updated_at
BEFORE UPDATE ON public.ai_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sources
INSERT INTO public.ai_sources (name, url, description) VALUES
  ('Reuters', 'https://www.reuters.com/', 'Международное новостное агентство'),
  ('BBC News', 'https://www.bbc.com/news', 'Британская вещательная корпорация'),
  ('Bloomberg', 'https://www.bloomberg.com/', 'Финансовые новости и аналитика'),
  ('The Economist', 'https://www.economist.com/', 'Экономика и политика'),
  ('Meduza', 'https://meduza.io/', 'Независимое русскоязычное издание'),
  ('РБК', 'https://www.rbc.ru/', 'Российский бизнес-канал'),
  ('TechCrunch', 'https://techcrunch.com/', 'Технологические стартапы и инновации'),
  ('The Verge', 'https://www.theverge.com/', 'Технологии и культура');