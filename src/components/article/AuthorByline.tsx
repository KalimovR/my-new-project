import { User } from 'lucide-react';

interface AuthorBylineProps {
  name: string;
  bio?: string;
  image?: string;
  date?: string;
  readTime?: string;
  variant?: 'default' | 'compact' | 'full';
}

export const AuthorByline = ({
  name,
  bio,
  image,
  date,
  readTime,
  variant = 'default',
}: AuthorBylineProps) => {
  // Generate initials for fallback avatar
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xs font-medium text-primary">{initials}</span>
          )}
        </div>
        <span className="font-medium">{name}</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className="flex items-start gap-4 p-6 bg-secondary/50 rounded-2xl border border-border">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <User className="w-8 h-8 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-lg mb-1">{name}</h4>
          {bio && (
            <p className="text-sm text-muted-foreground leading-relaxed">{bio}</p>
          )}
          {(date || readTime) && (
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
              {date && <span>{date}</span>}
              {date && readTime && <span>•</span>}
              {readTime && <span>{readTime} чтения</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-sm font-medium text-primary">{initials}</span>
        )}
      </div>
      <div>
        <p className="font-medium text-sm">{name}</p>
        {(date || readTime) && (
          <p className="text-xs text-muted-foreground">
            {date}
            {date && readTime && ' • '}
            {readTime && `${readTime} чтения`}
          </p>
        )}
      </div>
    </div>
  );
};
