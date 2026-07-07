import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const cardShellClassName = cn(
  "absolute inset-x-0 top-0 min-h-[340px] rounded-[1.75rem] border border-border/50 bg-card p-6",
  "shadow-[0_8px_30px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.04]",
  "md:min-h-[400px] md:rounded-[2rem] md:p-8",
  "lg:min-h-[420px]",
  "dark:border-white/15 dark:bg-zinc-900 dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] dark:ring-white/[0.06]",
);

export interface DeckSlide {
  key: string;
  content: React.ReactNode;
}

interface TinderCardDeckProps {
  slides: DeckSlide[];
  previewSlides?: DeckSlide[];
  activeIndex: number;
  direction: number;
  className?: string;
}

const STACK_LAYERS = [
  { offset: 2, scale: 0.94, y: -18, zIndex: 8 },
  { offset: 1, scale: 0.97, y: -9, zIndex: 12 },
] as const;

function BackStackCard({
  slide,
  layer,
}: {
  slide: DeckSlide;
  layer: (typeof STACK_LAYERS)[number];
}) {
  return (
    <motion.div
      key={slide.key}
      initial={{ scale: layer.scale - 0.015, y: layer.y - 4, opacity: 0.6 }}
      animate={{ scale: layer.scale, y: layer.y, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      aria-hidden
      className={cn(
        cardShellClassName,
        "pointer-events-none select-none overflow-hidden",
        "border-border/70 bg-muted dark:border-white/25 dark:bg-zinc-800",
        "shadow-md",
      )}
      style={{ zIndex: layer.zIndex }}
    >
      <div className="h-full overflow-hidden">{slide.content}</div>
    </motion.div>
  );
}

const frontCardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 48 : -48,
    rotate: direction > 0 ? 4 : -4,
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    rotate: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -340 : 340,
    rotate: direction > 0 ? -22 : 22,
    opacity: 0,
    scale: 0.92,
  }),
};

export function TinderCardDeck({
  slides,
  previewSlides,
  activeIndex,
  direction,
  className,
}: TinderCardDeckProps) {
  const stackSlides = previewSlides ?? slides;
  const activeSlide = slides[activeIndex];

  if (!activeSlide) return null;

  return (
    <div
      className={cn(
        "relative mx-auto w-[min(92vw,360px)] md:w-[min(68vw,440px)] lg:w-[480px]",
        className,
      )}
    >
      <div className="relative min-h-[340px] overflow-visible pt-6 md:min-h-[400px] md:pt-7 lg:min-h-[420px]">
        {STACK_LAYERS.map((layer) => {
          const slide = stackSlides[activeIndex + layer.offset];
          if (!slide) return null;
          return (
            <BackStackCard
              key={slide.key}
              slide={slide}
              layer={layer}
            />
          );
        })}

        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={activeSlide.key}
            custom={direction}
            variants={frontCardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              duration: 0.38,
              ease: [0.32, 0.72, 0, 1],
            }}
            className={cn(cardShellClassName, "z-20 bg-card")}
            style={{ originX: 0.5, originY: 0.5 }}
          >
            {activeSlide.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
