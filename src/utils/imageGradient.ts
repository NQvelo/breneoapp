import { useEffect, useMemo, useState } from "react";

export type SoftGradient = {
  from: string;
  to: string;
  fromDark: string;
  toDark: string;
};

function mixToward(
  r: number,
  g: number,
  b: number,
  target: number,
  amount: number,
) {
  const mix = (channel: number) =>
    Math.round(channel + (target - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function lighten(r: number, g: number, b: number, amount: number) {
  return mixToward(r, g, b, 255, amount);
}

function darken(r: number, g: number, b: number, amount: number) {
  return mixToward(r, g, b, 22, amount);
}

export function gradientFromSeed(seed: string): SoftGradient {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  }
  const hue = hash % 360;
  const hue2 = (hue + 26 + (hash % 28)) % 360;
  return {
    from: `hsl(${hue} 70% 86%)`,
    to: `hsl(${hue2} 64% 92%)`,
    fromDark: `hsl(${hue} 46% 32%)`,
    toDark: `hsl(${hue2} 34% 18%)`,
  };
}

export function sampleImageGradient(
  image: HTMLImageElement,
): SoftGradient | null {
  const size = 24;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, size, size);

  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, size, size).data;
  } catch {
    return null;
  }

  const colors: { r: number; g: number; b: number; score: number }[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const alpha = pixels[i + 3];
    if (alpha < 140) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const lightness = (r + g + b) / 3;
    if (lightness > 242 || lightness < 16 || saturation < 0.12) continue;
    colors.push({ r, g, b, score: saturation * 2 + (1 - lightness / 255) });
  }
  if (colors.length < 4) return null;

  colors.sort((a, b) => b.score - a.score);
  const primary = colors[0];
  let secondary = colors[Math.min(8, colors.length - 1)];
  let bestDistance = -1;
  for (const color of colors.slice(0, 16)) {
    const distance =
      Math.abs(color.r - primary.r) +
      Math.abs(color.g - primary.g) +
      Math.abs(color.b - primary.b);
    if (distance > bestDistance) {
      bestDistance = distance;
      secondary = color;
    }
  }

  return {
    from: lighten(primary.r, primary.g, primary.b, 0.58),
    to: lighten(secondary.r, secondary.g, secondary.b, 0.74),
    fromDark: darken(primary.r, primary.g, primary.b, 0.42),
    toDark: darken(secondary.r, secondary.g, secondary.b, 0.64),
  };
}

export function coverGradientStyle(
  gradient: SoftGradient,
  mode: "light" | "dark",
): string {
  const from = mode === "dark" ? gradient.fromDark : gradient.from;
  const to = mode === "dark" ? gradient.toDark : gradient.to;
  const fade = mode === "dark" ? "#242424" : "#ffffff";
  return [
    `linear-gradient(to bottom, transparent 62%, ${fade} 100%)`,
    `linear-gradient(265deg, color-mix(in srgb, ${from} 38%, transparent) 0%, ${to} 34%, transparent 100%)`,
  ].join(", ");
}

export function useSoftImageGradient(
  src: string | undefined,
  seed: string,
): SoftGradient {
  const fallback = useMemo(() => gradientFromSeed(seed || "academy"), [seed]);
  const [gradient, setGradient] = useState<SoftGradient>(fallback);

  useEffect(() => {
    setGradient(fallback);
    if (!src) return;
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const sampled = sampleImageGradient(image);
      if (!cancelled && sampled) setGradient(sampled);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  return gradient;
}
