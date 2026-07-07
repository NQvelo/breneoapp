import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface LearningPathHeaderProps {
  professionTitle: string;
  completedCount?: number;
  totalCount?: number;
  className?: string;
}

export function LearningPathHeader({
  professionTitle,
  completedCount,
  totalCount,
  className,
}: LearningPathHeaderProps) {
  const t = useTranslation();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-medium">
          {professionTitle}
        </Badge>
        {typeof completedCount === "number" && typeof totalCount === "number" ? (
          <span className="text-xs text-muted-foreground">
            {completedCount} / {totalCount}
          </span>
        ) : null}
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {t.atoms.title}
      </h1>
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
        {t.atoms.pathSubtitle}
      </p>
    </div>
  );
}
