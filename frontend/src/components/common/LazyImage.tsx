import React from 'react';
import { useLazyImage } from '../../hooks/useIntersectionObserver';
import { cn } from '../../utils/cn';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
  containerClassName?: string;
  loadingClassName?: string;
  errorClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Lazy loading image component with intersection observer
 */
export function LazyImage({
  src,
  alt,
  placeholder,
  fallback,
  className,
  containerClassName,
  loadingClassName,
  errorClassName,
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const { elementRef, imageSrc, isLoaded, isError } = useLazyImage(src, placeholder);

  React.useEffect(() => {
    if (isLoaded && onLoad) {
      onLoad();
    }
  }, [isLoaded, onLoad]);

  React.useEffect(() => {
    if (isError && onError) {
      onError();
    }
  }, [isError, onError]);

  const renderContent = () => {
    if (isError) {
      return fallback ? (
        <img
          src={fallback}
          alt={alt}
          className={cn(className, errorClassName)}
          {...props}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center bg-gray-200 text-gray-500',
            className,
            errorClassName
          )}
        >
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      );
    }

    if (!isLoaded && placeholder) {
      return (
        <img
          src={placeholder}
          alt=""
          className={cn(className, loadingClassName, 'blur-sm')}
          {...props}
        />
      );
    }

    if (!isLoaded) {
      return (
        <div
          className={cn(
            'animate-pulse bg-gray-200',
            className,
            loadingClassName
          )}
        />
      );
    }

    return (
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          className,
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0'
        )}
        {...props}
      />
    );
  };

  return (
    <div ref={elementRef} className={containerClassName}>
      {renderContent()}
    </div>
  );
}

/**
 * Progressive image component that shows a low-quality placeholder first
 */
export function ProgressiveImage({
  src,
  placeholder,
  alt,
  className,
  ...props
}: LazyImageProps) {
  const [isHighQualityLoaded, setIsHighQualityLoaded] = React.useState(false);
  const { elementRef, isIntersecting } = useLazyImage(src, placeholder);

  React.useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image();
      img.onload = () => setIsHighQualityLoaded(true);
      img.src = src;
    }
  }, [isIntersecting, src]);

  return (
    <div ref={elementRef} className="relative overflow-hidden">
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          className={cn(
            className,
            'absolute inset-0 transition-opacity duration-500',
            isHighQualityLoaded ? 'opacity-0' : 'opacity-100'
          )}
          {...props}
        />
      )}
      {isIntersecting && (
        <img
          src={src}
          alt={alt}
          className={cn(
            className,
            'transition-opacity duration-500',
            isHighQualityLoaded ? 'opacity-100' : 'opacity-0'
          )}
          {...props}
        />
      )}
    </div>
  );
}