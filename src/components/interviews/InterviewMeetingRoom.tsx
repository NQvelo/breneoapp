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
import { WaitingForHostPanel } from "@/components/interviews/WaitingForHostPanel";
import { setMeetingSoundsEnabled } from "@/components/interviews/interviewMeetingSounds";
import { useInterviewQuestionAudio } from "@/components/interviews/useInterviewQuestionAudio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";

export type MeetingPhase =
  | "setup"
  | "waiting_for_host"
  | "playing_question"
  | "recording_countdown"
  | "recording"
  | "submitting"
  | "question_feedback"
  | "session_complete";

const MIN_RECORDING_MS = 3000;
const NEXT_QUESTION_AUTO_MS = 8000;

const DEFAULT_JOB_POSITIONS = [
  "Python Developer",
  "Frontend Developer",
  "Data Analyst",
  "Product Manager",
  "UX Designer",
];

interface InterviewMeetingRoomProps {
  phase: MeetingPhase;
  jobPosition: string;
  jobPositionInput: string;
  onJobPositionInputChange: (value: string) => void;
  onStartInterview: () => void;
  isStarting: boolean;
  currentQuestion: InterviewQuestion | null;
  completedCount: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraReady: boolean;
  recordingMs: number;
  recordCountdownSec: number;
  error: string | null;
  lastFeedback: SubmitInterviewResponse | null;
  onQuestionAudioFinished: () => void;
  onStopRecording: () => void;
  onNextQuestion: () => void;
  onLeave: () => void;
  onInterviewerJoined: () => void;
  launchingFromJob?: boolean;
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
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-2 p-2 sm:flex-row sm:items-stretch sm:gap-3 sm:p-4">
      <div className="flex min-h-0 min-w-0 shrink-0 flex-col gap-2 overflow-y-auto sm:flex-[1.45] sm:gap-3">
        {left}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:flex-[1.15]">
        <div className="min-h-[200px] flex-1">{right}</div>
      </div>
    </div>
  );
}

export function InterviewMeetingRoom({
  phase,
  jobPosition,
  jobPositionInput,
  onJobPositionInputChange,
  onStartInterview,
  isStarting,
  currentQuestion,
  completedCount,
  videoRef,
  cameraReady,
  recordingMs,
  recordCountdownSec,
  error,
  lastFeedback,
  onQuestionAudioFinished,
  onStopRecording,
  onNextQuestion,
  onLeave,
  onInterviewerJoined,
  launchingFromJob = false,
  children,
}: InterviewMeetingRoomProps) {
  const totalQuestions = currentQuestion?.total_questions ?? 10;
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

  const audio = useInterviewQuestionAudio(
    currentQuestion,
    onQuestionAudioFinished,
    phase === "playing_question",
    soundOn,
  );

  const toggleSound = () => {
    setSoundOn((on) => {
      const next = !on;
      setMeetingSoundsEnabled(next);
      return next;
    });
  };

  const statusLabel = useMemo(() => {
    switch (phase) {
      case "waiting_for_host":
        return "მოლოდინი ინტერვიუერზე";
      case "playing_question":
        return audio.isPlaying ? "ინტერვიუერი საუბრობს" : "მოისმინეთ კითხვა";
      case "recording_countdown":
        return recordCountdownSec > 0
          ? `პასუხი ${recordCountdownSec} წამში...`
          : "მზადება ჩაწერისთვის";
      case "recording":
        return "ჩაწერა მიმდინარეობს";
      case "submitting":
        return "AI ანალიზი...";
      case "question_feedback":
        return "შეფასება";
      default:
        return "ინტერვიუ";
    }
  }, [audio.isPlaying, phase, recordCountdownSec]);

  const isSpeaking = phase === "playing_question" && audio.isPlaying;
  const showQuestion =
    currentQuestion &&
    (phase === "playing_question" ||
      phase === "recording_countdown" ||
      phase === "recording" ||
      phase === "submitting" ||
      phase === "question_feedback");

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
    />
  );

  if (phase === "session_complete") {
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-background">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur-md">
          <BreneoLogo className="h-6" />
          <Button variant="outline" size="sm" onClick={onLeave}>
            დახურვა
          </Button>
        </div>
        <div className="px-4 py-6">{children}</div>
      </div>
    );
  }

  if (phase === "setup") {
    if (launchingFromJob) {
      return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#050508]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#8ab4f818,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#4285f412,_transparent_50%)]"
            aria-hidden
          />
          <header className="relative z-10 flex items-center justify-between px-5 py-4">
            <BreneoLogo className="h-7 brightness-0 invert" />
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
              {isStarting ? (
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
      <div className="fixed inset-0 z-[200] flex flex-col bg-[#050508]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#8ab4f818,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_#4285f412,_transparent_50%)]"
          aria-hidden
        />
        <header className="relative z-10 flex items-center justify-between px-5 py-4">
          <BreneoLogo className="h-7 brightness-0 invert" />
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
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8ab4f8]/20">
                <Video className="h-8 w-8 text-[#8ab4f8]" />
              </div>
              <h1 className="text-2xl font-bold text-white">
                HR Mock ინტერვიუ
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                შედით სრულეკრანიან ვირტუალურ ინტერვიუში — 10 კითხვა, ქართული
                ხმოვანი ინტერვიუერი, ცოცხალი კამერა.
              </p>
            </div>

            <label className="mb-2 block text-sm font-medium text-white/80">
              სამუშაო პოზიცია
            </label>
            <Input
              value={jobPositionInput}
              onChange={(e) => onJobPositionInputChange(e.target.value)}
              placeholder="მაგ: Python Developer"
              list="meeting-job-suggestions"
              className="mb-6 h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/30"
            />
            <datalist id="meeting-job-suggestions">
              {DEFAULT_JOB_POSITIONS.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>

            <Button
              className="h-12 w-full rounded-2xl bg-[#8ab4f8] text-base font-semibold text-[#202124] hover:bg-[#8ab4f8]/90"
              disabled={isStarting}
              onClick={onStartInterview}
            >
              {isStarting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  შეერთება...
                </>
              ) : (
                "შეხვედრაში შესვლა"
              )}
            </Button>
          </div>
        </main>

        {error ? (
          <div className="relative z-10 mx-4 mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#202124] text-white">
      <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-white/5 bg-[#1a1a1a] px-4 py-3 sm:px-6">
        <BreneoLogo className="h-5 shrink-0 brightness-0 invert sm:h-6" />

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
        {phase === "waiting_for_host" ? (
          <MeetSplitLayout
            left={
              <WaitingForHostPanel
                jobPosition={jobPosition}
                onInterviewerJoined={onInterviewerJoined}
              />
            }
            right={selfTile}
          />
        ) : (
          <MeetSplitLayout
            left={
              <>
                {phase !== "question_feedback" ? (
                  <MeetInterviewerTile
                    isSpeaking={isSpeaking}
                    isActive={phase === "playing_question"}
                  >
                    {phase === "submitting" ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                        <Loader2 className="mb-3 h-10 w-10 animate-spin text-[#8ab4f8]" />
                        <p className="text-sm font-medium">AI ანალიზი...</p>
                      </div>
                    ) : null}
                  </MeetInterviewerTile>
                ) : null}

                {showQuestion && currentQuestion ? (
                  <MeetQuestionPanel
                    questionNumber={currentQuestion.question_number}
                    questionText={currentQuestion.question_text}
                    status={
                      phase === "playing_question"
                        ? audio.isPlaying
                          ? "მოსმენა..."
                          : "მოისმინეთ"
                        : phase === "recording_countdown"
                          ? "მზeadება..."
                          : phase === "recording"
                            ? "ჩაწერა..."
                            : phase === "submitting"
                              ? "ანალიზი..."
                              : phase === "question_feedback"
                                ? "შეფასება"
                                : undefined
                    }
                    extra={
                      phase === "playing_question" ? (
                        <div className="flex flex-wrap gap-2">
                          {audio.needsManualPlay && audio.hasAudio ? (
                            <Button
                              size="sm"
                              className="rounded-lg bg-[#8ab4f8] text-[#202124] hover:bg-[#8ab4f8]/90"
                              onClick={() => void audio.playAudio()}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              კითხვის მოსმენა
                            </Button>
                          ) : null}
                          {!audio.hasAudio || audio.needsManualPlay ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-lg border-white/20 bg-transparent text-white hover:bg-white/10"
                              onClick={audio.skipWithoutAudio}
                            >
                              პასუხზე გადასვლა
                            </Button>
                          ) : null}
                          {audio.audioError ? (
                            <p className="w-full text-xs text-amber-300">
                              {audio.audioError}
                            </p>
                          ) : null}
                        </div>
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
        )}
      </div>

      <footer className="relative z-20 shrink-0 border-t border-white/5 bg-[#1a1a1a] px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold sm:text-base">
              {jobPosition || "ინტერვიუ"}
            </p>
            <p className="truncate text-xs text-white/50">{statusLabel}</p>
          </div>

          <div className="flex shrink-0 items-center justify-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-14 w-14 rounded-full text-white",
                soundOn
                  ? "bg-[#3c4043] hover:bg-[#4a4d51] hover:text-white"
                  : "bg-[#3c4043] text-white/50 hover:bg-[#4a4d51] hover:text-white",
              )}
              onClick={toggleSound}
              title={soundOn ? "ხმის გამორტვა" : "ხმის ჩარტვა"}
            >
              {soundOn ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </Button>

            {phase === "recording_countdown" ? (
              <Button
                className="h-14 min-w-[160px] rounded-full bg-rose-600 px-8 text-base font-semibold text-white shadow-lg shadow-rose-600/30"
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
                className="h-14 min-w-[160px] rounded-full bg-rose-600 px-8 text-base font-semibold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500"
                onClick={onNextQuestion}
              >
                <ArrowRight className="mr-2 h-5 w-5" />
                შემდეგი კითხვა
                {nextQuestionSecLeft > 0 ? ` (${nextQuestionSecLeft}წ)` : ""}
              </Button>
            ) : null}

            {phase === "waiting_for_host" ||
            phase === "playing_question" ||
            phase === "submitting" ? (
              <div className="flex h-14 min-w-[160px] items-center justify-center rounded-full bg-white/10 px-6 text-sm text-white/50">
                {phase === "waiting_for_host"
                  ? "მოლოდინი..."
                  : phase === "playing_question"
                    ? "მოისმინეთ..."
                    : "დაელოდეთ..."}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-[3.5rem] flex-1 justify-end">
            <Button
              size="icon"
              className="h-14 w-14 rounded-full !bg-rose-600 !text-white hover:!bg-rose-800 hover:!text-white focus-visible:ring-rose-500/40 dark:!bg-rose-600 dark:hover:!bg-rose-800 [&_svg]:!text-white"
              onClick={onLeave}
              title="ზარის დასრულება"
            >
              <PhoneOff className="h-5 w-5 !text-white" />
            </Button>
          </div>
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
