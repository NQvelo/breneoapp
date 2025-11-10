import { useState, useEffect } from "react";
import {
  extractDominantColor,
  isDarkColor,
  adjustColorBrightness,
} from "@/utils/imageColorUtils";

interface UseAcademyColorResult {
  backgroundColor: string | null;
  textColor: string;
  isLoading: boolean;
}

/**
 * Hook to extract dominant color from academy logo/profile picture
 * and determine appropriate text color
 */
export const useAcademyColor = (
  imageUrl: string | null | undefined
): UseAcademyColorResult => {
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [textColor, setTextColor] = useState<string>("text-gray-900");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!imageUrl) {
      setBackgroundColor(null);
      setTextColor("text-gray-900");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setBackgroundColor(null);

    // Extract color from image URL
    extractDominantColor(imageUrl)
      .then((color) => {
        if (color) {
          // Lighten the color for better readability as background
          const lightenedColor = adjustColorBrightness(color, 40);
          setBackgroundColor(lightenedColor);

          // Determine text color based on background lightness
          const dark = isDarkColor(lightenedColor);
          setTextColor(dark ? "text-white" : "text-gray-900");
        }
        setIsLoading(false);
      })
      .catch(() => {
        // Silent fail - fallback color will be used
        setIsLoading(false);
      });
  }, [imageUrl]);

  return { backgroundColor, textColor, isLoading };
};

