import type { ContentCard } from "@/api/atoms";
import { ContentRenderer } from "./ContentRenderer";
import { cn } from "@/lib/utils";

interface StoryCardProps {
  card: ContentCard;
  title?: string;
  className?: string;
}

export function StoryCard({ card, title, className }: StoryCardProps) {
  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      {title ? (
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      ) : null}
      <ContentRenderer card={card} />
    </div>
  );
}
