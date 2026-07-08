import React, { useEffect, useState } from "react";
import type { SubmitInterviewResponse } from "@/api/interview/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";

const PASS_THRESHOLD = 75;
const AUTO_ADVANCE_MS = 3000;

interface InterviewQuestionFeedbackProps {
  result: SubmitInterviewResponse;
  onNext: () => void;
}

export function InterviewQuestionFeedback({
  result,
  onNext,
}: InterviewQuestionFeedbackProps) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(AUTO_ADVANCE_MS / 1000),
  );
  const passed =
    result.status === "PASSED" || result.overall_score >= PASS_THRESHOLD;
  const hasNext = !result.interview_complete && result.next_question;

  useEffect(() => {
    if (!hasNext) return;

    setSecondsLeft(Math.ceil(AUTO_ADVANCE_MS / 1000));
    const interval = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    const timeout = window.setTimeout(onNext, AUTO_ADVANCE_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [hasNext, onNext, result.question_number]);

  const strengthChips = result.strengths.slice(0, 2);
  const improvementChips = result.improvements.slice(0, 2);

  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              კითხვა {result.question_number} / {result.total_questions}
            </p>
            <h3 className="text-lg font-bold">პასუხის შეფასება</h3>
          </div>
          <Badge
            className={cn(
              "px-3 py-1 text-sm font-semibold",
              passed
                ? "bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-rose-500/15 text-rose-700 hover:bg-rose-500/15 dark:text-rose-300",
            )}
          >
            {result.overall_score} ქულა
          </Badge>
        </div>

        {result.requires_retake ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              ეს პასუხი სუსტია — სესიის დასრულების შემდეგ შეგიძლიათ თავიდან
              სცადოთ.
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {strengthChips.map((item) => (
            <Badge
              key={`s-${item}`}
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {item}
            </Badge>
          ))}
          {improvementChips.map((item) => (
            <Badge
              key={`i-${item}`}
              variant="outline"
              className="border-orange-500/30 bg-orange-500/5 text-orange-800 dark:text-orange-200"
            >
              {item}
            </Badge>
          ))}
        </div>

        {hasNext ? (
          <Button
            className="h-12 w-full rounded-2xl bg-gradient-to-br from-[#01bfff] to-[#0088cc] text-base font-medium text-white hover:opacity-90"
            onClick={onNext}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            შემდეგი კითხვა
            {secondsLeft > 0 ? ` (${secondsLeft}წ)` : ""}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
