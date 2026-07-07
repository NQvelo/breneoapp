import { Brain, ClipboardList } from "lucide-react";
import type { ContentCard } from "@/api/atoms";
import { StoryCard } from "./StoryCard";
import { LessonCoverCard } from "./LessonCoverCard";
import { cn } from "@/lib/utils";

interface SlidePreviewProps {
  slideIndex: number;
  contentCards: ContentCard[];
  contentStartIndex: number;
  announcementIndex: number;
  quizIndex: number;
  quizQuestion: string;
  announcementMessage: string;
  atomTitle: string;
  className?: string;
}

export function SlidePreview({
  slideIndex,
  contentCards,
  contentStartIndex,
  announcementIndex,
  quizIndex,
  quizQuestion,
  announcementMessage,
  atomTitle,
  className,
}: SlidePreviewProps) {
  if (slideIndex < 0 || slideIndex > quizIndex) return null;

  if (slideIndex === 0) {
    return <LessonCoverCard title={atomTitle} className={className} />;
  }

  if (slideIndex >= contentStartIndex && slideIndex < announcementIndex) {
    const card = contentCards[slideIndex - contentStartIndex];
    return (
      <StoryCard
        card={card}
        className={cn("pointer-events-none select-none", className)}
      />
    );
  }

  if (slideIndex === announcementIndex) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 py-10 text-center",
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Brain className="h-6 w-6" />
        </div>
        <div className="space-y-1 px-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Quiz
          </p>
          <p className="text-base font-semibold leading-snug text-foreground">
            {announcementMessage}
          </p>
        </div>
      </div>
    );
  }

  if (slideIndex === quizIndex) {
    return (
      <div className={cn("space-y-3 py-6", className)}>
        <div className="flex items-center gap-2 text-primary">
          <ClipboardList className="h-5 w-5" />
          <p className="text-xs font-medium uppercase tracking-wide">Quiz</p>
        </div>
        <p className="text-base font-semibold leading-snug text-foreground">
          {quizQuestion}
        </p>
        <div className="space-y-2 pt-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-10 rounded-xl border border-border/60 bg-muted/40"
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
