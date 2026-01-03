import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  aspectRatio?: 'square' | 'video' | 'wide' | 'portrait' | string;
  priority?: boolean;
}

const aspectRatioClasses: Record<string, string> = {
  square: 'aspect-square',
  video: 'aspect-video',
  wide: 'aspect-[21/9]',
  portrait: 'aspect-[3/4]',
};

export const OptimizedImage = ({
  src,
  alt,
  fallback = '/placeholder.svg',
  aspectRatio,
  priority = false,
  className,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before in view
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  const aspectClass = aspectRatio
    ? aspectRatioClasses[aspectRatio] || `aspect-[${aspectRatio}]`
    : '';

  const imageSrc = hasError ? fallback : src;

  // Generate srcSet for responsive images if it's a remote image
  const generateSrcSet = (url: string) => {
    if (!url.includes('unsplash.com')) return undefined;
    
    // Unsplash supports dynamic resizing
    return `
      ${url}&w=400 400w,
      ${url}&w=800 800w,
      ${url}&w=1200 1200w,
      ${url}&w=1600 1600w
    `.trim();
  };

  return (
    <div
      ref={imgRef}
      className={cn(
        'overflow-hidden bg-secondary/50',
        aspectClass,
        className
      )}
    >
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          srcSet={generateSrcSet(imageSrc)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}
      
      {/* Skeleton loader */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-secondary animate-pulse" />
      )}
    </div>
  );
};
