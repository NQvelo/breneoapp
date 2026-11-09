import { useState } from "react";
import { ImageIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type AuthCoverImageProps = {
  src: string;
  alt?: string;
};

export function AuthCoverImage({ src, alt = "" }: AuthCoverImageProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const ready = loadedSrc === src;
  const failed = failedSrc === src;

  const markReady = (image: HTMLImageElement) => {
    if (image.getAttribute("src") === src && image.naturalWidth > 0) {
      setLoadedSrc(src);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-gray-200 dark:bg-[#242424]">
      <img
        src={src}
        alt={alt}
        decoding="async"
        fetchPriority="high"
        onLoad={(event) => markReady(event.currentTarget)}
        onError={() => setFailedSrc(src)}
        ref={(node) => {
          if (node?.complete) markReady(node);
        }}
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out",
          ready && !failed ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 transition-opacity duration-700 ease-out dark:from-[#242424] dark:to-[#2a2a2a]",
          ready && !failed ? "opacity-0" : "opacity-100",
        )}
      />
      {failed ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="h-16 w-16 text-gray-400 dark:text-gray-600" />
        </div>
      ) : null}
    </div>
  );
}
