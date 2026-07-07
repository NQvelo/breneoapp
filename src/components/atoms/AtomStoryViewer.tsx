import type { Atom, AtomSubmitResult } from "@/api/atoms";
import { StoryContainer } from "./StoryContainer";

interface AtomStoryViewerProps {
  atom: Atom;
  onSubmit: (selectedOptionIndex: 0 | 1 | 2) => Promise<AtomSubmitResult>;
  onComplete: (result: AtomSubmitResult) => void;
  onClose?: () => void;
  className?: string;
}

export function AtomStoryViewer({
  atom,
  onSubmit,
  onComplete,
  onClose,
  className,
}: AtomStoryViewerProps) {
  return (
    <StoryContainer
      cards={atom.content_cards}
      quiz={{
        options: atom.quiz.options,
        question: atom.title,
      }}
      atomTitle={atom.title}
      lessonTitle={atom.profession_title}
      onSubmit={onSubmit}
      onComplete={onComplete}
      onClose={onClose}
      className={className}
    />
  );
}
