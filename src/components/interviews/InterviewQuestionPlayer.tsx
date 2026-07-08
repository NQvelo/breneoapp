import React, { useEffect, useRef, useState } from "react";
import type { InterviewQuestion } from "@/api/interview/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, Play, Volume2 } from "lucide-react";

interface InterviewQuestionPlayerProps {
  question: InterviewQuestion;
  onFinished: () => void;
}

export function InterviewQuestionPlayer({
  question,
  onFinished,
}: InterviewQuestionPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const onFinishedRef = useRef(onFinished);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  onFinishedRef.current = onFinished;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setNeedsManualPlay(false);
    setIsPlaying(false);
    setAudioError(null);

    if (!question.question_audio_url) {
      return;
    }

    audio.src = question.question_audio_url;
    audio.load();

    const handleEnded = () => {
      setIsPlaying(false);
      onFinishedRef.current();
    };

    const handleError = () => {
      setIsPlaying(false);
      setAudioError("აუდიო ვერ ჩაიტვირთა. შეგიძლიათ წაიკითხოთ ტექსტი და გააგრძელოთ.");
      setNeedsManualPlay(true);
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    const tryAutoplay = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setNeedsManualPlay(true);
      }
    };

    void tryAutoplay();

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, [question.id, question.question_audio_url]);

  const playAudio = async () => {
    const audio = audioRef.current;
    if (!audio || !question.question_audio_url) {
      onFinishedRef.current();
      return;
    }
    setAudioError(null);
    try {
      await audio.play();
      setIsPlaying(true);
      setNeedsManualPlay(false);
    } catch {
      setNeedsManualPlay(true);
      setAudioError("ავტომატური დაკვრა ვერ მოხერხდა. დააჭირეთ ღილაკს.");
    }
  };

  const skipWithoutAudio = () => {
    onFinishedRef.current();
  };

  return (
    <Card className="overflow-hidden border-[#01bfff]/25 bg-gradient-to-br from-[#01bfff]/8 to-transparent shadow-md">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <audio ref={audioRef} preload="auto" className="hidden" />

        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#01bfff]/15",
              isPlaying && "animate-pulse",
            )}
          >
            <Volume2 className="h-6 w-6 text-[#01bfff]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#01bfff]">
              {isPlaying ? "ინტერვიუერი კითხულობს..." : "მოისმინეთ კითხვა"}
            </p>
            {isPlaying ? (
              <div className="mt-2 flex h-6 items-end gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-[#01bfff]/70 animate-pulse"
                    style={{
                      height: `${10 + (i % 3) * 8}px`,
                      animationDelay: `${i * 0.12}s`,
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {question.question_text}
        </p>

        {!question.question_audio_url ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-2">
              <p>ხმოვანი ვერსია მიუწვდომელია — გამოიყენეთ ტექსტი.</p>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={skipWithoutAudio}
              >
                პასუხის ჩაწერაზე გადასვლა
              </Button>
            </div>
          </div>
        ) : null}

        {needsManualPlay && question.question_audio_url ? (
          <div className="space-y-2">
            {audioError ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {audioError}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                className="rounded-xl bg-gradient-to-br from-[#01bfff] to-[#0088cc] text-white hover:opacity-90"
                onClick={() => void playAudio()}
              >
                <Play className="mr-2 h-4 w-4" />
                კითხვის მოსმენა
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={skipWithoutAudio}
              >
                გამოტოვება
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
