import { useAuth } from '@/hooks/useAuth';

interface AdBannerProps {
  size?: '728x90' | '300x250' | 'native';
  className?: string;
  isEmpty?: boolean;
}

export const AdBanner = ({ size = '728x90', className = '', isEmpty = true }: AdBannerProps) => {
  const { isAdminOrEditor } = useAuth();

  // Если баннер пустой и пользователь не админ/редактор — не показываем
  if (isEmpty && !isAdminOrEditor) {
    return null;
  }

  const sizeClasses = {
    '728x90': 'h-[90px] max-w-[728px]',
    '300x250': 'h-[250px] max-w-[300px]',
    'native': 'min-h-[100px]',
  };

  return (
    <div className={`w-full mx-auto ${className}`}>
      <div
        className={`${sizeClasses[size]} w-full bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl flex items-center justify-center transition-all duration-300 hover:border-primary/50 hover:bg-primary/10`}
      >
        <div className="text-center">
          <span className="text-sm text-primary/70 font-medium">
            Реклама {size === 'native' ? '(нативный блок)' : size}
          </span>
          {isEmpty && isAdminOrEditor && (
            <p className="text-xs text-primary/50 mt-1">(видно только админам)</p>
          )}
        </div>
      </div>
    </div>
  );
};
