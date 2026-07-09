import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  InterviewEvaluation,
  SubmitInterviewResponse,
} from "@/api/interview/types";
import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";

const PASS_THRESHOLD = 75;

export interface InterviewSessionSummary {
  averageScore: number;
  results: SubmitInterviewResponse[];
  totalQuestions: number;
  interviewId?: string;
  questionTextByNumber?: Record<number, string>;
}

interface InterviewReportProps {
  evaluation: InterviewEvaluation;
  onRetake?: () => void;
  sessionSummary?: InterviewSessionSummary;
}

function CircularScore({
  score,
  passed,
}: {
  score: number;
  passed: boolean;
}) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-muted/30"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "transition-all duration-700",
            passed ? "text-emerald-500" : "text-rose-500",
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{clamped}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  score,
  feedback,
}: {
  label: string;
  score: number;
  feedback: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">{clamped}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#01bfff] to-[#0088cc] transition-all duration-700"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {feedback ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {feedback}
        </p>
      ) : null}
    </div>
  );
}

function metricsList(evaluation: InterviewEvaluation) {
  return Object.values(evaluation.metrics ?? {}).filter(
    (m) => m && typeof m.score === "number",
  );
}

export function InterviewReport({
  evaluation,
  onRetake,
  sessionSummary,
}: InterviewReportProps) {
  const displayScore = sessionSummary?.averageScore ?? evaluation.overall_score;
  const passed =
    sessionSummary
      ? displayScore >= PASS_THRESHOLD
      : evaluation.status === "PASSED" || evaluation.overall_score >= PASS_THRESHOLD;
  const metrics = metricsList(evaluation);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-8">
      {sessionSummary ? (
        <Card className="border-[#01bfff]/20 bg-gradient-to-br from-[#01bfff]/5 to-transparent shadow-md">
          <CardContent className="flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:text-left">
            <Trophy className="h-10 w-10 text-[#01bfff]" />
            <div>
              <h2 className="text-xl font-bold">ინტერვიუ დასრულდა</h2>
              <p className="text-sm text-muted-foreground">
                {sessionSummary.results.length} / {sessionSummary.totalQuestions}{" "}
                კითხვაზე საშუალო ქულა: {sessionSummary.averageScore}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="overflow-hidden border-0 shadow-lg lg:col-span-5">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left lg:flex-col lg:text-center">
              <CircularScore score={displayScore} passed={passed} />
              <div className="space-y-2">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
                    passed
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                  )}
                >
                  {passed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {passed ? "გაიარე" : "ვერ გაიარე"}
                </div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  {sessionSummary ? "სესიის შეჯამება" : "AI შეფასების შედეგი"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {sessionSummary
                    ? `საშუალო ქულა: ${displayScore} — საჭირო მინიმუმი ${PASS_THRESHOLD}`
                    : `ზოგადი ქულა: ${evaluation.overall_score} — საჭირო მინიმუმი ${PASS_THRESHOLD}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-[#01bfff]" />
              {sessionSummary ? "მეტრიკები" : "დეტალური მეტრიკები"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {metrics.length > 0 ? (
              metrics.map((metric) => (
                <MetricBar
                  key={metric.label}
                  label={metric.label}
                  score={metric.score}
                  feedback={metric.feedback}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">მეტრიკები არ არის</p>
            )}
          </CardContent>
        </Card>
      </div>

      {sessionSummary ? (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">ყველა კითხვის შედეგი</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {sessionSummary.results.map((result) => {
                const qPassed =
                  result.status === "PASSED" ||
                  result.overall_score >= PASS_THRESHOLD;
                return (
                  <AccordionItem
                    key={`${result.question_number}-${result.user_transcript.slice(0, 24)}`}
                    value={`q-${result.question_number}`}
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 items-center justify-between gap-3 pr-2 text-left">
                        <span className="font-medium">
                          კითხვა {result.question_number}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            qPassed
                              ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                              : "border-rose-500/40 text-rose-700 dark:text-rose-300",
                          )}
                        >
                          {result.overall_score}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                      <div className="space-y-2">
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                            კითხვა
                          </p>
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {sessionSummary.questionTextByNumber?.[
                              result.question_number
                            ] || "კითხვა ვერ მოიძებნა"}
                          </p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/70">
                            პასუხი
                          </p>
                          {result.user_transcript ? (
                            <p className="whitespace-pre-wrap leading-relaxed">
                              {result.user_transcript}
                            </p>
                          ) : (
                            <p>პასუხი არ არის</p>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              ძლიერი მხარეები
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evaluation.strengths.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {evaluation.strengths.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-emerald-500">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">მონაცემები არ არის</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-orange-500/5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-orange-700 dark:text-orange-400">
              <AlertCircle className="h-4 w-4" />
              გასაუმჯობესებელი
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {evaluation.improvements.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {evaluation.improvements.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-orange-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {evaluation.missing_concepts.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  აკლია კონცეფციები
                </p>
                <ul className="space-y-2 text-sm">
                  {evaluation.missing_concepts.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-orange-500">!</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {evaluation.improvements.length === 0 &&
            evaluation.missing_concepts.length === 0 ? (
              <p className="text-sm text-muted-foreground">მონაცემები არ არის</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {evaluation.recommended_answer ? (
        <Card className="border-[#01bfff]/30 bg-gradient-to-br from-[#01bfff]/5 to-transparent shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-[#01bfff]" />
              HR-ის რეკომენდაცია
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {evaluation.recommended_answer}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {onRetake ? (
        <Button
          className="h-12 w-full rounded-2xl bg-gradient-to-br from-[#01bfff] to-[#0088cc] text-base font-medium text-white hover:opacity-90"
          onClick={onRetake}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          თავიდან ცდა
        </Button>
      ) : null}
    </div>
  );
}
