import { Skeleton } from '@/components/ui/skeleton';

interface NewsCardSkeletonProps {
  variant?: 'default' | 'featured' | 'compact';
}

export const NewsCardSkeleton = ({ variant = 'default' }: NewsCardSkeletonProps) => {
  if (variant === 'compact') {
    return (
      <div className="flex gap-4 py-4 border-b border-border last:border-0">
        <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    );
  }

  if (variant === 'featured') {
    return (
      <div className="relative block overflow-hidden rounded-2xl bg-card border border-border h-full">
        <Skeleton className="aspect-[16/10] w-full" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-3/4 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3 mb-4" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    );
  }

  // Default card skeleton
  return (
    <div className="overflow-hidden rounded-xl sm:rounded-2xl bg-card border border-border">
      <Skeleton className="h-[150px] sm:h-[180px] md:h-auto md:aspect-[4/3] w-full" />
      <div className="p-4 sm:p-5 md:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
};
