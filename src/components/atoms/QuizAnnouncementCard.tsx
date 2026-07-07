import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuizAnnouncementCardProps {
  message: string;
  buttonLabel: string;
  onContinue: () => void;
  className?: string;
}

export function QuizAnnouncementCard({
  message,
  buttonLabel,
  onContinue,
  className,
}: QuizAnnouncementCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 py-4 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary md:h-16 md:w-16">
        <Brain className="h-7 w-7 md:h-8 md:w-8" />
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Quiz
        </p>
        <h2 className="text-lg font-semibold leading-snug text-foreground md:text-xl">
          {message}
        </h2>
      </div>
      <Button className="w-full" onClick={onContinue}>
        {buttonLabel}
      </Button>
    </div>
  );
}
