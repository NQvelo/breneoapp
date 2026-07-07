import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const cardShellClassName = cn(
  "min-h-[340px] rounded-[1.75rem] border border-border/50 bg-card p-6",
  "shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]",
  "md:min-h-[400px] md:rounded-[2rem] md:p-8",
  "lg:min-h-[420px]",
  "dark:border-white/15 dark:bg-zinc-900 dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)] dark:ring-white/[0.06]",
);

export interface StackPreview {
  key: string;
  content: React.ReactNode;
}

interface CardStackProps {
  children: React.ReactNode;
  previews?: StackPreview[];
  className?: string;
}

const backCardOffsets = [
  {
    zIndex: -10,
    insetX: "inset-x-1.5",
    translateY: "-translate-y-2.5 md:-translate-y-3",
    opacity: "opacity-80",
  },
  {
    zIndex: -20,
    insetX: "inset-x-3",
    translateY: "-translate-y-5 md:-translate-y-6",
    opacity: "opacity-55",
  },
] as const;

function BackCard({
  preview,
  layer,
}: {
  preview: StackPreview;
  layer: 0 | 1;
}) {
  const style = backCardOffsets[layer];

  return (
    <motion.div
      initial={{ opacity: 0, y: layer === 0 ? -6 : -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 overflow-hidden",
        style.insetX,
        style.translateY,
        cardShellClassName,
        style.opacity,
        layer === 0 ? "-z-10" : "-z-20",
      )}
    >
      <div className="h-full overflow-hidden">{preview.content}</div>
    </motion.div>
  );
}

export function CardStack({ children, previews = [], className }: CardStackProps) {
  const nearestPreview = previews[0];
  const furthestPreview = previews[1];

  return (
    <div
      className={cn(
        "relative mx-auto w-[min(92vw,360px)] md:w-[min(68vw,440px)] lg:w-[480px]",
        className,
      )}
    >
      <div className="relative pt-7 md:pt-8">
        <div className="relative">
          {furthestPreview ? (
            <BackCard key={furthestPreview.key} preview={furthestPreview} layer={1} />
          ) : null}
          {nearestPreview ? (
            <BackCard key={nearestPreview.key} preview={nearestPreview} layer={0} />
          ) : null}
          <div className="relative z-0">{children}</div>
        </div>
      </div>
    </div>
  );
}

interface AnimatedCardProps {
  direction: number;
  children: React.ReactNode;
  className?: string;
}

const cardVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.97,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.97,
  }),
};

export function AnimatedCard({
  direction,
  children,
  className,
}: AnimatedCardProps) {
  return (
    <motion.div
      custom={direction}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className={cn(cardShellClassName, className)}
    >
      {children}
    </motion.div>
  );
}
