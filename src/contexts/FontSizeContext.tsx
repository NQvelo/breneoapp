import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type FontSize = "small" | "medium" | "big";

interface FontSizeContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(undefined);

const FONT_SIZE_STORAGE_KEY = "breneo-font-size";

const FONT_SIZE_MULTIPLIERS: Record<FontSize, number> = {
  small: 0.875, // 14px base (0.875 * 16px)
  medium: 1, // 16px base (default)
  big: 1.125, // 18px base (1.125 * 16px)
};

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    // Load from localStorage or default to medium
    const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    const initialSize = (saved as FontSize) || "medium";
    
    // Apply immediately to avoid flash of unstyled content
    const multiplier = FONT_SIZE_MULTIPLIERS[initialSize];
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--font-size-base", `${multiplier}rem`);
    }
    
    return initialSize;
  });

  useEffect(() => {
    // Apply font size to document root using CSS custom property
    const multiplier = FONT_SIZE_MULTIPLIERS[fontSize];
    document.documentElement.style.setProperty("--font-size-base", `${multiplier}rem`);
    
    // Save to localStorage
    localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
  }, [fontSize]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error("useFontSize must be used within a FontSizeProvider");
  }
  return context;
}

