import React from "react";
import type { SubmitInterviewResponse } from "@/api/interview/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  UserRound,
} from "lucide-react";

const PASS_THRESHOLD = 75;
/** Interviewer-side panel background (lighter grey on dark meeting canvas). */
const INTERVIEWER_PANEL_BG = "bg-[#3c4043]";

export function MeetSelfTile({
  videoRef,
  cameraReady,
  recordingMs,
  isRecording,
  isMinimized = false,
  className,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  cameraReady: boolean;
  recordingMs: number;
  isRecording: boolean;
  isMinimized?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-full min-h-[200px] w-full flex-1 overflow-hidden rounded-3xl bg-[#202124] transition-all duration-500 ease-in-out",
        isRecording ? "ring-2 ring-rose-500" : "ring-1 ring-white/10",
        isMinimized &&
          "max-sm:min-h-0 max-sm:shadow-md max-sm:ring-2 max-sm:ring-white/20",
        className,
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "h-full w-full -scale-x-100 object-cover",
          !cameraReady && "opacity-30",
        )}
      />
      {!cameraReady ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
          <Loader2 className="h-8 w-8 animate-spin text-white/40" />
        </div>
      ) : null}
      <div
        className={cn(
          "absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white",
          isMinimized && "bottom-1 left-1 px-1.5 py-0.5 text-[9px] sm:bottom-2 sm:left-2 sm:px-2 sm:py-1 sm:text-xs",
        )}
      >
        თქვენ
      </div>
      {isRecording ? (
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          REC {(recordingMs / 1000).toFixed(0)}წ
        </div>
      ) : null}
    </div>
  );
}

export function MeetInterviewerTile({
  isSpeaking,
  isActive,
  children,
}: {
  isSpeaking: boolean;
  isActive: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[180px] flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl",
        INTERVIEWER_PANEL_BG,
        isActive || isSpeaking
          ? "ring-2 ring-[#8ab4f8]"
          : "ring-1 ring-white/10",
      )}
    >
      <div className="relative flex flex-col items-center justify-center py-6">
        {isSpeaking ? (
          <>
            <span className="absolute h-28 w-28 animate-ping rounded-full bg-[#8ab4f8]/20" />
            <span className="absolute h-32 w-32 animate-pulse rounded-full bg-[#8ab4f8]/10" />
          </>
        ) : null}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#3c4043] to-[#1a1a1a] sm:h-28 sm:w-28">
          <UserRound className="h-12 w-12 text-white/85 sm:h-14 sm:w-14" />
        </div>
        {isSpeaking ? (
          <div className="mt-3 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-1 animate-pulse rounded-full bg-[#8ab4f8]"
                style={{
                  height: `${10 + (i % 2) * 8}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
        HR ინტერვიუერი
      </div>
      {children}
    </div>
  );
}

export function MeetQuestionPanel({
  questionNumber,
  questionText,
  status,
  extra,
}: {
  questionNumber?: number;
  questionText: string;
  status?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className={cn("shrink-0 rounded-3xl p-4 ring-1 ring-white/10", INTERVIEWER_PANEL_BG)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8ab4f8]">
          {questionNumber != null ? `კითხვა ${questionNumber}` : "მოხსენება"}
        </p>
        {status ? (
          <span className="text-xs text-white/50">{status}</span>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-white/90 sm:text-base">
        {questionText}
      </p>
      {extra ? <div className="mt-3">{extra}</div> : null}
    </div>
  );
}

export function MeetReviewPanel({
  result,
}: {
  result: SubmitInterviewResponse;
}) {
  const passed =
    result.status === "PASSED" || result.overall_score >= PASS_THRESHOLD;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col animate-in fade-in slide-in-from-bottom-2 rounded-3xl p-4 ring-1 ring-white/10", INTERVIEWER_PANEL_BG)}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">პასუხის შეფასება</p>
        <Badge
          className={cn(
            "border-0 font-bold",
            passed
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-rose-500/20 text-rose-300",
          )}
        >
          {result.overall_score}
        </Badge>
      </div>

      {result.requires_retake ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>სუსტი პასუხი — სესიის შემდეგ შეგიძლიათ თავიდან სცადოთ.</span>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {result.strengths.slice(0, 2).map((item) => (
          <span
            key={`s-${item}`}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-200"
          >
            <CheckCircle2 className="h-3 w-3" />
            {item}
          </span>
        ))}
        {result.improvements.slice(0, 2).map((item) => (
          <span
            key={`i-${item}`}
            className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] text-orange-200"
          >
            {item}
          </span>
        ))}
      </div>

      {result.user_transcript ? (
        <p className="line-clamp-4 text-xs text-white/50 sm:text-sm">
          „{result.user_transcript}"
        </p>
      ) : null}
    </div>
  );
}
