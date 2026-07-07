import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { AtomSubmitResult } from "@/api/atoms";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuizCardProps {
  question: string;
  options: [string, string, string];
  onSubmit: (selectedOptionIndex: 0 | 1 | 2) => Promise<AtomSubmitResult>;
  onComplete: (result: AtomSubmitResult) => void;
  onAnswered?: () => void;
  className?: string;
}

export function QuizCard({
  question,
  options,
  onSubmit,
  onComplete,
  onAnswered,
  className,
}: QuizCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<0 | 1 | 2 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSelect = (index: 0 | 1 | 2) => {
    if (isSubmitting) return;
    setSelectedIndex(index);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (selectedIndex === null || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const submitResult = await onSubmit(selectedIndex);
      onAnswered?.();
      onComplete(submitResult);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save your answer.";
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <p className="text-xl font-semibold text-gray-800 dark:text-foreground">
        {question}
      </p>

      <div className="space-y-3">
        {options.map((option, index) => {
          const letter = String.fromCharCode(65 + index);
          const isSelected = selectedIndex === index;

          return (
            <button
              key={index}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSelect(index as 0 | 1 | 2)}
              className={cn(
                "w-full rounded-lg border px-5 py-4 text-left transition-all",
                isSelected
                  ? "border-[#00afea] bg-[#00afea]/10 dark:border-[#5AC9F8] dark:bg-[#00afea]/20"
                  : "border-blue-200 bg-[#eff9fc] hover:border-[#00afea]/50 dark:border-border dark:bg-muted dark:hover:border-[#00afea]",
                isSubmitting && "pointer-events-none opacity-70",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px]",
                    isSelected
                      ? "bg-[#00afea] dark:bg-[#5AC9F8]"
                      : "bg-white dark:bg-gray-800",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isSelected
                        ? "text-white"
                        : "text-gray-600 dark:text-gray-300",
                    )}
                  >
                    {letter}
                  </span>
                </div>
                <span
                  className={cn(
                    "flex-1 text-left",
                    isSelected
                      ? "font-medium text-[#00afea] dark:text-[#5AC9F8]"
                      : "text-gray-700 dark:text-foreground",
                  )}
                >
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {submitError ? (
        <p className="text-sm text-destructive">{submitError}</p>
      ) : null}

      <div className="mt-2">
        <Button
          className="h-14 w-full bg-[#00BFFF] px-8 text-white hover:bg-[#00BFFF]/90"
          disabled={selectedIndex === null || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Saving...
            </>
          ) : (
            "Complete & Save"
          )}
        </Button>
      </div>
    </div>
  );
}
