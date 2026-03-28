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

const fallbackTextClasses: Record<"sm" | "md" | "lg" | "xl", string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
  xl: "text-2xl",
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
  // Simplified: just use the AvatarImage component directly
  // The browser and Avatar component will handle loading naturally
  return (
    <Avatar
      className={cn(
        "relative flex h-full w-full min-h-0 min-w-0 shrink-0 overflow-hidden rounded-full",
        className,
      )}
    >
      {src && (
        <AvatarImage
          src={src}
          alt={alt}
          className="absolute inset-0 z-[1] h-full w-full object-cover object-center"
          loading={loading}
        />
      )}
      <AvatarFallback
        className={cn(
          "absolute inset-0 z-0 flex h-full w-full min-h-0 min-w-0 items-center justify-center bg-[#AAF0FF] text-[#099DBC] font-semibold rounded-full",
          fallbackTextClasses[size],
        )}
      >
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
      // Only add crossOrigin for external URLs
      if (
        !src.includes("supabase.co") &&
        !src.includes(window.location.origin)
      ) {
        img.crossOrigin = "anonymous";
      }
      img.src = src;
    });
  }, []);

  const preloadImages = useCallback(
    async (srcs: string[]): Promise<void> => {
      const promises = srcs.map((src) => preloadImage(src));
      await Promise.allSettled(promises);
    },
    [preloadImage]
  );

  return { preloadImage, preloadImages };
};

export default OptimizedAvatar;
