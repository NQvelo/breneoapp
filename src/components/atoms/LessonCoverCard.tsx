import { cn } from "@/lib/utils";

interface LessonCoverCardProps {
  title: string;
  className?: string;
}

export function LessonCoverCard({ title, className }: LessonCoverCardProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[inherit] flex-col items-center justify-center px-4 py-10 text-center",
        className,
      )}
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Lesson
      </p>
      <h2 className="text-2xl font-bold leading-tight text-foreground md:text-3xl">
        {title}
      </h2>
    </div>
  );
}
