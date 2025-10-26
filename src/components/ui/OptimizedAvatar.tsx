import React, { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OptimizedAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  loading?: "lazy" | "eager";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-32 w-32",
};

// Image cache to store loaded images
const imageCache = new Map<string, boolean>();

export const OptimizedAvatar: React.FC<OptimizedAvatarProps> = ({
  src,
  alt = "Profile photo",
  fallback = "U",
  className,
  size = "md",
  loading = "lazy",
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Check if image is already cached
  const isImageCached = src ? imageCache.has(src) : false;

  useEffect(() => {
    if (!src) {
      setImageLoaded(false);
      setImageError(false);
      setIsLoading(false);
      return;
    }

    // If image is cached, mark as loaded immediately
    if (isImageCached) {
      setImageLoaded(true);
      setImageError(false);
      setIsLoading(false);
      return;
    }

    // Reset states for new image
    setImageLoaded(false);
    setImageError(false);
    setIsLoading(true);

    // Preload the image
    const img = new Image();

    img.onload = () => {
      // Cache the successful load
      imageCache.set(src, true);
      setImageLoaded(true);
      setImageError(false);
      setIsLoading(false);
    };

    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
      setIsLoading(false);
    };

    // Set loading priority based on prop
    img.loading = loading;

    // Add crossOrigin for better caching
    img.crossOrigin = "anonymous";

    // Start loading
    img.src = src;

    return () => {
      // Cleanup
      img.onload = null;
      img.onerror = null;
    };
  }, [src, isImageCached, loading]);

  // Show skeleton while loading
  if (isLoading && !isImageCached) {
    return (
      <div
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full",
          sizeClasses[size],
          className
        )}
      >
        <Skeleton className="h-full w-full rounded-full" />
      </div>
    );
  }

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {src && !imageError && (
        <AvatarImage
          ref={imgRef}
          src={src}
          alt={alt}
          className={cn(
            "aspect-square h-full w-full transition-opacity duration-200",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          loading={loading}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      <AvatarFallback className="bg-breneo-blue/10 text-breneo-blue text-sm font-medium">
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
};

// Hook to preload images
export const useImagePreloader = () => {
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (imageCache.has(src)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        imageCache.set(src, true);
        resolve();
      };
      img.onerror = reject;
      img.crossOrigin = "anonymous";
      img.src = src;
    });
  }, []);

  const preloadImages = useCallback(async (srcs: string[]): Promise<void> => {
    const promises = srcs.map((src) => preloadImage(src));
    await Promise.allSettled(promises);
  }, [preloadImage]);

  return { preloadImage, preloadImages };
};

export default OptimizedAvatar;
