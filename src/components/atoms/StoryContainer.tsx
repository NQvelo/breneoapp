import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { AtomSubmitResult, ContentCard } from "@/api/atoms";
import { useTranslation } from "@/contexts/LanguageContext";
import { StoryCard } from "./StoryCard";
import { LessonCoverCard } from "./LessonCoverCard";
import { QuizAnnouncementCard } from "./QuizAnnouncementCard";
import { QuizCard } from "./QuizCard";
import { TinderCardDeck, type DeckSlide } from "./TinderCardDeck";
import { SlidePreview } from "./SlidePreview";
import { cn } from "@/lib/utils";

interface StoryQuiz {
  options: [string, string, string];
  question?: string;
}

interface StoryContainerProps {
  cards: ContentCard[];
  quiz: StoryQuiz;
  atomTitle: string;
  lessonTitle: string;
  onSubmit: (selectedOptionIndex: 0 | 1 | 2) => Promise<AtomSubmitResult>;
  onComplete: (result: AtomSubmitResult) => void;
  onClose?: () => void;
  className?: string;
}

export function StoryContainer({
  cards,
  quiz,
  atomTitle,
  lessonTitle,
  onSubmit,
  onComplete,
  onClose,
  className,
}: StoryContainerProps) {
  const t = useTranslation();
  const [direction, setDirection] = useState(1);

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.card_index - b.card_index),
    [cards],
  );

  const coverIndex = 0;
  const contentStartIndex = 1;
  const announcementIndex = contentStartIndex + sortedCards.length;
  const quizIndex = announcementIndex + 1;

  const [activeIndex, setActiveIndex] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);

  const isCoverSlide = activeIndex === coverIndex;
  const isContentSlide =
    activeIndex >= contentStartIndex && activeIndex < announcementIndex;
  const isQuizSlide = activeIndex === quizIndex;

  const canGoBack = activeIndex > coverIndex && !quizAnswered && !isQuizSlide;
  const canGoForward =
    !quizAnswered &&
    !isQuizSlide &&
    activeIndex < quizIndex;

  useEffect(() => {
    setActiveIndex(0);
    setQuizAnswered(false);
    setDirection(1);
  }, [cards, quiz, atomTitle, lessonTitle]);

  const goNext = useCallback(() => {
    if (quizAnswered || isQuizSlide || activeIndex >= quizIndex) return;
    setDirection(1);
    setActiveIndex((prev) => Math.min(prev + 1, quizIndex));
  }, [quizAnswered, isQuizSlide, activeIndex, quizIndex]);

  const goPrev = useCallback(() => {
    if (quizAnswered || isQuizSlide || activeIndex <= coverIndex) return;
    setDirection(-1);
    setActiveIndex((prev) => Math.max(prev - 1, coverIndex));
  }, [quizAnswered, isQuizSlide, activeIndex, coverIndex]);

  const goToQuiz = useCallback(() => {
    if (quizAnswered) return;
    setDirection(1);
    setActiveIndex(quizIndex);
  }, [quizAnswered, quizIndex]);

  const allowsTapNavigation =
    (isCoverSlide || isContentSlide) && !quizAnswered && !isQuizSlide;

  const handleScreenTap = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!allowsTapNavigation) return;

    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, [data-no-tap-nav]")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const isRightTap = event.clientX - rect.left > rect.width / 2;

    if (isRightTap && canGoForward) {
      goNext();
    } else if (!isRightTap && canGoBack) {
      goPrev();
    }
  };

  const handleQuizComplete = (result: AtomSubmitResult) => {
    onComplete(result);
  };

  const handleQuizAnswered = () => {
    setQuizAnswered(true);
  };

  const slides = useMemo((): DeckSlide[] => {
    const items: DeckSlide[] = [
      {
        key: "cover",
        content: <LessonCoverCard title={atomTitle} />,
      },
    ];

    sortedCards.forEach((card) => {
      items.push({
        key: `card-${card.card_index}`,
        content: <StoryCard card={card} />,
      });
    });

    items.push({
      key: "announcement",
      content: (
        <div data-no-tap-nav>
          <QuizAnnouncementCard
            message={t.atoms.quizAnnouncement}
            buttonLabel={t.atoms.startQuiz}
            onContinue={goToQuiz}
          />
        </div>
      ),
    });

    items.push({
      key: "quiz",
      content: (
        <div data-no-tap-nav>
          <QuizCard
            question={quiz.question ?? t.atoms.quizDefaultQuestion}
            options={quiz.options}
            onSubmit={onSubmit}
            onComplete={handleQuizComplete}
            onAnswered={handleQuizAnswered}
          />
        </div>
      ),
    });

    return items;
  }, [
    atomTitle,
    sortedCards,
    t.atoms.quizAnnouncement,
    t.atoms.startQuiz,
    t.atoms.quizDefaultQuestion,
    quiz.question,
    quiz.options,
    onSubmit,
    goToQuiz,
  ]);

  const previewSlides = useMemo((): DeckSlide[] => {
    return slides.map((slide, index) => ({
      key: slide.key,
      content: (
        <SlidePreview
          slideIndex={index}
          contentCards={sortedCards}
          contentStartIndex={contentStartIndex}
          announcementIndex={announcementIndex}
          quizIndex={quizIndex}
          quizQuestion={quiz.question ?? t.atoms.quizDefaultQuestion}
          announcementMessage={t.atoms.quizAnnouncement}
          atomTitle={atomTitle}
        />
      ),
    }));
  }, [
    slides,
    sortedCards,
    contentStartIndex,
    announcementIndex,
    quizIndex,
    quiz.question,
    atomTitle,
    t.atoms.quizAnnouncement,
    t.atoms.quizDefaultQuestion,
  ]);

  const tapHint = isCoverSlide
    ? t.atoms.tapToBegin
    : isContentSlide
      ? t.atoms.tapForNextCard
      : null;

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      <header className="relative shrink-0 px-5 py-5 pr-16 md:px-6 md:py-6 md:pr-20">
        <p className="min-w-0 truncate text-lg font-semibold text-foreground md:text-xl">
          {lessonTitle}
        </p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-300 p-0 text-gray-600 transition-colors hover:bg-gray-400 hover:text-gray-800 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-gray-100 md:right-6 md:top-6"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </button>
        ) : null}
      </header>

      <div
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center px-4",
          allowsTapNavigation && "cursor-pointer",
        )}
        onClick={handleScreenTap}
        role="presentation"
      >
        <TinderCardDeck
          slides={slides}
          previewSlides={previewSlides}
          activeIndex={activeIndex}
          direction={direction}
        />

        {tapHint && !quizAnswered ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {tapHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
