import { Star } from "@/components/icons";
import type { AtomPathItem } from "@/api/atoms";
import { cn } from "@/lib/utils";

interface AtomPathNodeProps {
  atom: AtomPathItem;
  statusLabels: {
    completed: string;
    available: string;
    locked: string;
  };
  onClick?: () => void;
  className?: string;
}

export function AtomPathNode({
  atom,
  statusLabels,
  onClick,
  className,
}: AtomPathNodeProps) {
  const isLocked = atom.status === "locked";
  const isAvailable = atom.status === "available";
  const isCompleted = atom.status === "completed";
  const isClickable = !isLocked;

  return (
    <button
      type="button"
      disabled={isLocked}
      onClick={onClick}
      className={cn(
        "group flex w-[min(100%,220px)] flex-col items-center gap-1.5 text-center transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4",
        isClickable &&
          "cursor-pointer hover:translate-y-0.5 active:translate-y-[5px]",
        isLocked && "cursor-not-allowed",
        className,
      )}
    >
      <div className="relative flex flex-col items-center pt-7">
        {isAvailable ? (
          <span className="absolute top-0 rounded-lg border-2 border-primary/30 bg-background px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-primary shadow-sm">
            {statusLabels.available}
          </span>
        ) : null}
        <div className="relative">
          <div
            className={cn(
              "relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border-4 transition-all",
              (isCompleted || isAvailable) &&
                "border-breneo-blue bg-breneo-blue text-white shadow-[0_6px_0_#1d4ed8]",
              isAvailable && "animate-pulse motion-reduce:animate-none",
              isClickable &&
                "group-hover:shadow-[0_3px_0_#1d4ed8] group-active:shadow-[0_0px_0_#1d4ed8]",
              isLocked &&
                "border-muted-foreground/20 bg-muted text-muted-foreground shadow-[0_6px_0_#9ca3af]",
            )}
          >
            <Star className="h-9 w-9 fill-current" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="px-2">
        <p
          className={cn(
            "text-sm font-semibold leading-snug",
            isLocked && "text-muted-foreground",
            isAvailable && "text-foreground",
            isCompleted && "text-foreground",
          )}
        >
          {atom.title}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xs font-medium uppercase tracking-wide",
            isCompleted && "text-breneo-blue",
            isAvailable && "hidden",
            isLocked && "text-muted-foreground",
          )}
        >
          {isCompleted
            ? statusLabels.completed
            : isAvailable
              ? statusLabels.available
              : statusLabels.locked}
        </p>
      </div>
    </button>
  );
}
