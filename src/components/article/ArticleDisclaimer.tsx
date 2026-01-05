import { Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const ArticleDisclaimer = () => {
  return (
    <div className="mt-10 mb-6 p-4 bg-muted/30 border border-border/50 rounded-lg">
      {/* Disclaimer */}
      <div className="flex items-start gap-3">
        <Eye className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Это анализ на основе открытых источников. Выводы — субъективное мнение редакции. 
            Ваше мнение в{' '}
            <Link 
              to="/discussions" 
              className="text-primary hover:underline"
            >
              «Обсуждениях»
            </Link>.
          </p>
          
          {/* CTA */}
          <p className="text-sm text-foreground/80 font-medium">
            Что вы думаете?{' '}
            <Link 
              to="/discussions" 
              className="text-primary hover:underline"
            >
              Обсудите в разделе «Обсуждения»
            </Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ArticleDisclaimer;