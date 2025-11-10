/**
 * Extract dominant color from an image URL
 * @param imageUrl - URL of the image
 * @returns Promise that resolves to a hex color string or null if extraction fails
 */
export const extractDominantColor = async (
  imageUrl: string
): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    
    // Try to handle CORS, but don't fail if it doesn't work
    try {
      img.crossOrigin = "anonymous";
    } catch (e) {
      // Ignore CORS errors for same-origin images
    }

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          resolve(null);
          return;
        }

        // Set canvas size (resize for performance)
        const maxSize = 150;
        const ratio = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = Math.max(1, img.width * ratio);
        canvas.height = Math.max(1, img.height * ratio);

        // Draw image to canvas
        try {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        } catch (drawError) {
          // CORS error - image can't be drawn to canvas
          console.debug("Cannot extract color due to CORS:", drawError);
          resolve(null);
          return;
        }

        // Get image data
        let imageData;
        try {
          imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (dataError) {
          console.debug("Cannot read image data:", dataError);
          resolve(null);
          return;
        }

        const data = imageData.data;

        // Sample pixels and count color frequencies
        const colorCounts: Record<string, number> = {};
        const step = 4; // Sample every 4th pixel for performance

        for (let i = 0; i < data.length; i += 4 * step) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Skip transparent or near-transparent pixels
          if (a < 200) continue;

          // Skip very light colors (near white) as they're usually backgrounds
          if (r > 240 && g > 240 && b > 240) continue;

          // Quantize colors to reduce palette size (more granular for better results)
          const quantizedR = Math.round(r / 16) * 16;
          const quantizedG = Math.round(g / 16) * 16;
          const quantizedB = Math.round(b / 16) * 16;

          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
          colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
        }

        // Find the most frequent color
        let maxCount = 0;
        let dominantColor = "128,128,128"; // Default gray

        for (const [color, count] of Object.entries(colorCounts)) {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
          }
        }

        // Convert to hex
        const [r, g, b] = dominantColor.split(",").map(Number);
        const hex = `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
        resolve(hex);
      } catch (error) {
        console.debug("Error extracting color:", error);
        resolve(null);
      }
    };

    img.onerror = () => {
      resolve(null);
    };

    img.src = imageUrl;
  });
};

/**
 * Calculate luminance of a color to determine if text should be light or dark
 * @param hex - Hex color string
 * @returns true if color is dark (should use light text), false if light (should use dark text)
 */
export const isDarkColor = (hex: string): boolean => {
  // Remove # if present
  const color = hex.replace("#", "");

  // Convert to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return true if color is dark (luminance < 0.5)
  return luminance < 0.5;
};

/**
 * Adjust color brightness
 * @param hex - Hex color string
 * @param percent - Percentage to adjust (-100 to 100)
 * @returns Adjusted hex color string
 */
export const adjustColorBrightness = (
  hex: string,
  percent: number
): string => {
  const color = hex.replace("#", "");
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  const adjust = (value: number) => {
    const newValue = Math.max(0, Math.min(255, value + (value * percent) / 100));
    return Math.round(newValue).toString(16).padStart(2, "0");
  };

  return `#${adjust(r)}${adjust(g)}${adjust(b)}`;
};

/**
 * Convert hex color to rgba string
 * @param hex - Hex color string
 * @param alpha - Alpha value (0 to 1)
 * @returns rgba color string
 */
export const hexToRgba = (hex: string, alpha: number): string => {
  const color = hex.replace("#", "");
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

