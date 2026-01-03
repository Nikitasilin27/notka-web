import { useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: React.ReactNode;
}

/**
 * Lazy-loaded image component
 * Uses native browser lazy loading for better performance
 */
export function LazyImage({ src, alt, className, placeholder }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <>
      {!isLoaded && !hasError && placeholder}
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(true);
        }}
        style={{ display: isLoaded ? 'block' : 'none' }}
      />
    </>
  );
}
