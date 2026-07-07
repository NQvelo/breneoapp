import { cn } from "@/lib/utils";

interface StoryProgressBarProps {
  totalSegments: number;
  activeIndex: number;
  className?: string;
}

export function StoryProgressBar({
  totalSegments,
  activeIndex,
  className,
}: StoryProgressBarProps) {
  return (
    <div
      className={cn("flex w-full gap-1.5", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={totalSegments}
      aria-valuenow={activeIndex + 1}
      aria-label={`Lesson progress, step ${activeIndex + 1} of ${totalSegments}`}
    >
      {Array.from({ length: totalSegments }).map((_, index) => {
        const isCompleted = index < activeIndex;
        const isActive = index === activeIndex;

        return (
          <div
            key={index}
            className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted-foreground/20"
          >
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-300",
                isCompleted && "w-full",
                isActive && "w-full",
                !isCompleted && !isActive && "w-0",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
