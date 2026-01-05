import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DiscussButtonProps {
  articleId: string;
}

export const DiscussButton = ({ articleId }: DiscussButtonProps) => {
  // Find discussion linked to this article
  const { data: discussionLink } = useQuery({
    queryKey: ['article-discussion', articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussion_articles')
        .select('discussion_id')
        .eq('article_id', articleId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  if (!discussionLink) return null;

  return (
    <Button
      asChild
      className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
    >
      <Link to={`/obsuzhdeniya/${discussionLink.discussion_id}`}>
        <MessageSquare className="w-4 h-4" />
        Обсудить подробно
      </Link>
    </Button>
  );
};
