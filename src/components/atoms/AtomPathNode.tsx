import { Atom, Check, Lock } from "@/components/icons";
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
        "group flex w-[min(100%,220px)] flex-col items-center gap-2 text-center transition-transform duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4",
        isClickable &&
          "cursor-pointer hover:translate-y-0.5 active:translate-y-[5px]",
        isLocked && "cursor-not-allowed",
        className,
      )}
    >
      <div className="relative">
        {isAvailable ? (
          <span className="absolute inset-0 -m-2 animate-pulse rounded-full bg-primary/20" />
        ) : null}
        <div
          className={cn(
            "relative flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all",
            (isCompleted || isAvailable) &&
              "border-breneo-blue bg-breneo-blue text-white shadow-[0_5px_0_#1d4ed8]",
            isClickable &&
              "group-hover:shadow-[0_3px_0_#1d4ed8] group-active:shadow-[0_0px_0_#1d4ed8]",
            isLocked &&
              "border-muted-foreground/20 bg-muted text-muted-foreground shadow-[0_4px_0_#9ca3af]",
          )}
        >
          {isCompleted ? (
            <Check className="h-7 w-7" strokeWidth={3} />
          ) : isLocked ? (
            <Lock className="h-6 w-6" />
          ) : (
            <Atom className="h-7 w-7" />
          )}
        </div>
        <span
          className={cn(
            "absolute -bottom-1 left-1/2 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center rounded-full px-1.5 text-xs font-bold",
            isCompleted &&
              "bg-breneo-blue text-white shadow-[0_2px_0_#1d4ed8]",
            isAvailable && "bg-white text-primary dark:bg-zinc-900",
            isLocked && "bg-muted text-muted-foreground",
          )}
        >
          {atom.sequence_order}
        </span>
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
            isAvailable && "text-primary",
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
