import React, { useEffect, useMemo, useState } from "react";
import type {
  InterviewQuestion,
  SubmitInterviewResponse,
} from "@/api/interview/types";
import {
  MeetInterviewerTile,
  MeetQuestionPanel,
  MeetReviewPanel,
  MeetSelfTile,
} from "@/components/interviews/InterviewMeetTiles";
import { setMeetingSoundsEnabled } from "@/components/interviews/interviewMeetingSounds";
import { Button } from "@/components/ui/button";
import { BreneoLogo } from "@/components/common/BreneoLogo";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Mic,
  PhoneOff,
  Play,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

export type MeetingPhase =
  | "setup"
  | "playing_audio"
  | "ready_to_record"
  | "recording_countdown"
  | "recording"
  | "submitting"
  | "question_feedback"
  | "session_complete";

const MIN_RECORDING_MS = 3000;
const NEXT_QUESTION_AUTO_MS = 8000;

interface InterviewMeetingRoomProps {
  phase: MeetingPhase;
  jobPosition: string;
  hasJobContext: boolean;
  isStarting: boolean;
  currentQuestion: InterviewQuestion | null;
  completedCount: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraReady: boolean;
  recordingMs: number;
  recordCountdownSec: number;
  error: string | null;
  lastFeedback: SubmitInterviewResponse | null;
  audioCaption: string;
  isPlayingWelcome: boolean;
  isAudioPlaying: boolean;
  needsManualPlay: boolean;
  onManualPlayAudio: () => void;
  onBeginRecording: () => void;
  onStopRecording: () => void;
  onNextQuestion: () => void;
  onLeave: () => void;
  children?: React.ReactNode;
}

function MeetingProgress({
  current,
  total,
  completed,
}: {
  current: number;
  total: number;
  completed: number;
}) {
  const safeTotal = Math.max(1, total);
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: safeTotal }, (_, i) => {
        const n = i + 1;
        const done = n <= completed;
        const active = n === current;
        return (
          <div
            key={n}
            className={cn(
              "h-1.5 w-4 rounded-full transition-all sm:w-6",
              done ? "bg-emerald-400" : active ? "bg-[#8ab4f8]" : "bg-white/20",
            )}
          />
        );
      })}
    </div>
  );
}

function MeetSplitLayout({
  left,
  right,
  mobileSelfMinimized = false,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  mobileSelfMinimized?: boolean;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col gap-2 p-3 sm:flex-row sm:items-stretch sm:gap-4 sm:p-5 md:p-6">
      <div
        className={cn(
          "flex min-h-0 min-w-0 shrink-0 flex-col gap-2 overflow-y-auto sm:flex-[1.45] sm:gap-3",
          mobileSelfMinimized && "flex-1",
        )}
      >
        {left}
      </div>
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col transition-all duration-500 ease-in-out sm:flex-[1.15] sm:flex-1",
          mobileSelfMinimized
            ? "absolute bottom-3 right-3 z-30 h-[7.5rem] w-[5.5rem] flex-none shadow-lg shadow-black/40 sm:relative sm:bottom-auto sm:right-auto sm:h-auto sm:w-auto sm:shadow-none"
            : "min-h-[200px] flex-1",
        )}
      >
        <div
          className={cn(
            "min-h-[200px] flex-1 transition-all duration-500 ease-in-out",
            mobileSelfMinimized && "min-h-0 h-full",
          )}
        >
          {right}
        </div>
      </div>
    </div>
  );
}

export function InterviewMeetingRoom({
  phase,
  jobPosition,
  hasJobContext,
  isStarting,
  currentQuestion,
  completedCount,
  videoRef,
  cameraReady,
  recordingMs,
  recordCountdownSec,
  error,
  lastFeedback,
  audioCaption,
  isPlayingWelcome,
  isAudioPlaying,
  needsManualPlay,
  onManualPlayAudio,
  onBeginRecording,
  onStopRecording,
  onNextQuestion,
  onLeave,
  children,
}: InterviewMeetingRoomProps) {
  const totalQuestions = currentQuestion?.total_questions ?? 3;
  const inSession = phase !== "setup" && phase !== "session_complete";
  const [nextQuestionSecLeft, setNextQuestionSecLeft] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  const hasNextQuestion =
    phase === "question_feedback" &&
    Boolean(lastFeedback?.next_question && !lastFeedback.interview_complete);

  useEffect(() => {
    if (!hasNextQuestion) {
      setNextQuestionSecLeft(0);
      return;
    }

    const totalSec = Math.ceil(NEXT_QUESTION_AUTO_MS / 1000);
    setNextQuestionSecLeft(totalSec);
    let remaining = totalSec;

    const interval = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        setNextQuestionSecLeft(0);
      } else {
        setNextQuestionSecLeft(remaining);
      }
    }, 1000);

    const timeout = window.setTimeout(onNextQuestion, NEXT_QUESTION_AUTO_MS);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [hasNextQuestion, lastFeedback?.question_number, onNextQuestion]);

  const toggleSound = () => {
    setSoundOn((on) => {
      const next = !on;
      setMeetingSoundsEnabled(next);
      return next;
    });
  };

  const statusLabel = useMemo(() => {
    switch (phase) {
      case "playing_audio":
        if (needsManualPlay) return "დააჭირეთ დასაწყებად";
        return isPlayingWelcome
          ? "ინტერვიუერი გიხსნით..."
          : currentQuestion
            ? `კითხვა ${currentQuestion.question_number} / ${totalQuestions}`
            : "მოისმინეთ";
      case "ready_to_record":
        return currentQuestion
          ? `კითხვა ${currentQuestion.question_number} / ${totalQuestions}`
          : "მზად ხართ პასუხისთვის";
      case "recording_countdown":
        return recordCountdownSec > 0
          ? `პასუხი ${recordCountdownSec} წამში...`
          : "მზადება ჩაწერისთვის";
      case "recording":
        return "ჩაწერა მიმდინარეობს...";
      case "submitting":
        return "AI-ის მიერ პასუხის გაანალიზება...";
      case "question_feedback":
        return "შეფასება";
      default:
        return "ინტერვიუ";
    }
  }, [
    currentQuestion,
    isPlayingWelcome,
    needsManualPlay,
    phase,
    recordCountdownSec,
    totalQuestions,
  ]);

  const isSpeaking = phase === "playing_audio" && isAudioPlaying;
  const showCaptionPanel =
    phase === "playing_audio" ||
    phase === "ready_to_record" ||
    phase === "recording_countdown" ||
    phase === "recording" ||
    phase === "submitting" ||
    phase === "question_feedback";

  const captionText =
    audioCaption ||
    (phase !== "playing_audio" && currentQuestion
      ? currentQuestion.question_text
      : "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!inSession) return;
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      void el.requestFullscreen().catch(() => undefined);
    }
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => undefined);
      }
    };
  }, [inSession]);

  const selfTile = (
    <MeetSelfTile
      videoRef={videoRef}
      cameraReady={cameraReady}
      recordingMs={recordingMs}
      isRecording={phase === "recording"}
      isMinimized={phase === "submitting"}
    />
  );

  if (phase === "session_complete") {
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-background">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur-md">
          <BreneoLogo className="h-6" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-10 w-10 p-0 shrink-0"
            onClick={onLeave}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-4 py-6">{children}</div>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col bg-[#050508]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#8ab4f818,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#4285f412,_transparent_50%)]"
          aria-hidden
        />
        <header className="relative z-10 flex items-center justify-between px-5 py-4">
          <BreneoLogo preferDark className="h-6" />
          <Button
            variant="ghost"
            size="sm"
            className="text-white/70 hover:bg-white/10 hover:text-white"
            onClick={onLeave}
          >
            დახურვა
          </Button>
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-8">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur-xl sm:p-8">
            {!hasJobContext ? (
              <>
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-400" />
                <h1 className="text-xl font-bold text-white">
                  ინტERVიუ სამუშაოს გვერდიდან იწყება
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  გახსენით კონკრეტული სამუშაოს გვერდი და დააჭირეთ „საცდელი
                  ინტერვიუს დაწყება“.
                </p>
                <Button
                  className="mt-6 rounded-2xl bg-white/10 text-white hover:bg-white/20"
                  onClick={onLeave}
                >
                  დაბრუნება
                </Button>
              </>
            ) : isStarting ? (
              <>
                <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-[#8ab4f8]" />
                <h1 className="text-xl font-bold text-white">
                  ინტერვიუს მომზადება...
                </h1>
                <p className="mt-2 text-sm text-white/60">
                  {jobPosition || "..."}
                </p>
              </>
            ) : error ? (
              <>
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-400" />
                <h1 className="text-xl font-bold text-white">
                  ინტერვიუს დაწყება ვერ მოხერხდა
                </h1>
                <p className="mt-2 text-sm text-rose-200">{error}</p>
                <Button
                  className="mt-6 rounded-2xl bg-white/10 text-white hover:bg-white/20"
                  onClick={onLeave}
                >
                  დაბრუნება
                </Button>
              </>
            ) : null}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#202124] text-white">
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-[#1a1a1a] px-4 py-3 sm:px-6">
        <BreneoLogo preferDark className="h-6 shrink-0" />

        <div className="hidden sm:block">
          {currentQuestion ? (
            <MeetingProgress
              current={currentQuestion.question_number}
              total={totalQuestions}
              completed={completedCount}
            />
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            LIVE
          </span>
          {currentQuestion ? (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium tabular-nums sm:hidden">
              {currentQuestion.question_number}/{totalQuestions}
            </span>
          ) : null}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <MeetSplitLayout
          mobileSelfMinimized={phase === "submitting"}
          left={
            <>
              {phase !== "question_feedback" ? (
                <MeetInterviewerTile
                  isSpeaking={isSpeaking}
                  isActive={phase === "playing_audio"}
                >
                  {phase === "submitting" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                      <Loader2 className="mb-3 h-10 w-10 animate-spin text-[#8ab4f8]" />
                      <p className="text-sm font-medium">
                        AI-ის მიერ პასუხის გაანალიზება...
                      </p>
                    </div>
                  ) : null}
                </MeetInterviewerTile>
              ) : null}

              {showCaptionPanel && captionText ? (
                <MeetQuestionPanel
                  questionNumber={
                    isPlayingWelcome
                      ? undefined
                      : currentQuestion?.question_number
                  }
                  questionText={captionText}
                  status={
                    phase === "playing_audio"
                      ? isPlayingWelcome
                        ? "ინტერვიუერი გიხსნით..."
                        : isAudioPlaying
                          ? "მოსმენა..."
                          : "მოისმინეთ"
                      : phase === "ready_to_record"
                        ? "მზად ხართ პასუხისთვის"
                        : phase === "recording_countdown"
                          ? "მზადება..."
                          : phase === "recording"
                            ? "ჩაწერა..."
                            : phase === "submitting"
                              ? "ანალიზი..."
                              : phase === "question_feedback"
                                ? "შეფასება"
                                : undefined
                  }
                  extra={
                    phase === "playing_audio" && needsManualPlay ? (
                      <Button
                        size="sm"
                        className="rounded-lg bg-[#8ab4f8] text-[#202124] hover:bg-[#8ab4f8]/90"
                        onClick={onManualPlayAudio}
                      >
                        <Play className="mr-2 h-4 w-4" />▶ ინტერვიუს დაწყება
                      </Button>
                    ) : null
                  }
                />
              ) : null}

              {phase === "question_feedback" && lastFeedback ? (
                <MeetReviewPanel result={lastFeedback} />
              ) : null}
            </>
          }
          right={selfTile}
        />
      </div>

      <footer className="relative z-20 shrink-0 border-t border-white/5 bg-[#1a1a1a] px-4 py-4 sm:px-6">
        <div className="absolute left-4 top-1/2 hidden max-w-[40%] -translate-y-1/2 sm:block">
            <p className="truncate text-sm font-semibold sm:text-base">
              {jobPosition || "ინტერვიუ"}
            </p>
            <p className="truncate text-xs text-white/50">{statusLabel}</p>
          </div>

        <div className="flex min-h-14 w-full items-center justify-center">
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-14 w-14 shrink-0 rounded-full text-white",
                soundOn
                  ? "bg-[#3c4043] hover:bg-[#4a4d51] hover:text-white"
                  : "bg-[#3c4043] text-white/50 hover:bg-[#4a4d51] hover:text-white",
              )}
              onClick={toggleSound}
              title={soundOn ? "ხმის გამორთვა" : "ხმის ჩართვა"}
            >
              {soundOn ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>

            {phase === "ready_to_record" ? (
              <Button
                className="h-14 min-w-[160px] rounded-full px-8 text-base font-semibold shadow-lg shadow-primary/30"
                onClick={onBeginRecording}
              >
                <Mic className="mr-2 h-5 w-5" />
                პასუხის ჩაწერა
              </Button>
            ) : null}

            {phase === "recording_countdown" ? (
              <Button
                className="h-14 min-w-[160px] rounded-full px-8 text-base font-semibold shadow-lg shadow-primary/30"
                disabled
              >
                <Mic className="mr-2 h-5 w-5" />
                {recordCountdownSec}...
              </Button>
            ) : null}

            {phase === "recording" ? (
              <Button
                className="h-14 min-w-[160px] rounded-full bg-white px-8 text-base font-semibold text-gray-900 hover:bg-white/90"
                disabled={recordingMs < MIN_RECORDING_MS}
                onClick={onStopRecording}
              >
                <Square className="mr-2 h-4 w-4 fill-current" />
                დასრულება
              </Button>
            ) : null}

            {hasNextQuestion ? (
              <Button
                className="h-14 min-w-[160px] rounded-full px-8 text-base font-semibold shadow-lg shadow-primary/30"
                onClick={onNextQuestion}
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                შემდეგი კითხვა
                {nextQuestionSecLeft > 0 ? ` (${nextQuestionSecLeft}წ)` : ""}
              </Button>
            ) : null}

            {phase === "playing_audio" || phase === "submitting" ? (
              <div className="flex h-14 min-w-[160px] items-center justify-center rounded-full bg-white/10 px-6 text-sm text-white/50">
                {phase === "playing_audio"
                  ? needsManualPlay
                    ? "დააჭირეთ ▶"
                    : "მოისმინეთ..."
                  : "დაელოდეთ..."}
              </div>
            ) : null}

            <Button
              size="icon"
              className="h-14 w-14 shrink-0 rounded-full !bg-rose-600 !text-white hover:!bg-rose-800 hover:!text-white focus-visible:ring-rose-500/40 sm:hidden dark:!bg-rose-600 dark:hover:!bg-rose-800 [&_svg]:!text-white"
              onClick={onLeave}
              title="ზარის დასრულება"
            >
              <PhoneOff className="h-5 w-5 !text-white" />
            </Button>
          </div>
        </div>

        <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 sm:block">
          <Button
            size="icon"
            className="h-14 w-14 shrink-0 rounded-full !bg-rose-600 !text-white hover:!bg-rose-800 hover:!text-white focus-visible:ring-rose-500/40 dark:!bg-rose-600 dark:hover:!bg-rose-800 [&_svg]:!text-white"
            onClick={onLeave}
            title="ზარის დასრულება"
          >
            <PhoneOff className="h-5 w-5 !text-white" />
          </Button>
        </div>

        {error ? (
          <div className="mx-auto mt-3 flex max-w-lg items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}
      </footer>
    </div>
  );
}
