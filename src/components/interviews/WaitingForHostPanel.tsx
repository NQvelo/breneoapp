import React, { useEffect, useState } from "react";
import { CheckCircle2, UserRound } from "lucide-react";
import {
  INTERVIEWER_JOIN_DELAY_MS,
  playEnterMeetingSound,
  playParticipantJoinedSound,
  playWaitingTickSound,
  playYouJoinedSound,
} from "@/components/interviews/interviewMeetingSounds";

const WAIT_SECONDS = Math.round(INTERVIEWER_JOIN_DELAY_MS / 1000);

interface WaitingForHostPanelProps {
  jobPosition: string;
  onInterviewerJoined: () => void;
}

function BouncingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-white/70 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

/** Left-panel content while waiting for HR interviewer (split-screen layout). */
export function WaitingForHostPanel({
  jobPosition,
  onInterviewerJoined,
}: WaitingForHostPanelProps) {
  const [secondsLeft, setSecondsLeft] = useState(WAIT_SECONDS);
  const [showJoinedToast, setShowJoinedToast] = useState(false);
  const [interviewerArrived, setInterviewerArrived] = useState(false);
  const onJoinedRef = React.useRef(onInterviewerJoined);
  onJoinedRef.current = onInterviewerJoined;

  useEffect(() => {
    playEnterMeetingSound();
    const toastTimer = window.setTimeout(() => {
      setShowJoinedToast(true);
      playYouJoinedSound();
    }, 400);

    const tickInterval = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 0) return 0;
        playWaitingTickSound();
        return s - 1;
      });
    }, 1000);

    const joinTimer = window.setTimeout(() => {
      playParticipantJoinedSound();
      setInterviewerArrived(true);
      window.setTimeout(() => onJoinedRef.current(), 1400);
    }, INTERVIEWER_JOIN_DELAY_MS);

    return () => {
      window.clearTimeout(toastTimer);
      window.clearInterval(tickInterval);
      window.clearTimeout(joinTimer);
    };
  }, []);

  if (interviewerArrived) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-[#3c4043] ring-2 ring-[#8ab4f8]">
        <div className="animate-in zoom-in-95 fade-in flex flex-col items-center gap-4 duration-500">
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#8ab4f8]/30" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#8ab4f8] bg-gradient-to-br from-[#3c4043] to-[#202124]">
              <UserRound className="h-12 w-12 text-white/90" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">
              HR ინტერვიუერი შეუერთდა
            </p>
            <p className="mt-1 text-sm text-white/60">ინტერვიუ იწყება...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col rounded-xl bg-[#3c4043] ring-1 ring-white/10">
      {showJoinedToast ? (
        <div className="absolute left-3 right-3 top-3 z-10 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#292929]/95 px-3 py-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[#81c995]" />
            <div>
              <p className="text-xs font-semibold text-white">
                შეხვედრაში ხართ
              </p>
              <p className="text-[10px] text-white/50">
                ინტერვიუერი მალე შეუერთდება
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-[#8ab4f8]">
          {jobPosition || "HR ინტერვიუ"}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-white sm:text-xl">
          ინტერვიუერი შეუერთდება
        </h2>
        <p className="mt-1 text-sm text-white/55">
          დაახლოებით {secondsLeft} წამში
        </p>

        <div className="relative my-6 flex h-24 w-24 items-center justify-center">
          <svg className="absolute inset-0 h-full w-full -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="5"
            />
            <circle
              cx="48"
              cy="48"
              r="42"
              fill="none"
              stroke="#8ab4f8"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={
                2 * Math.PI * 42 * (1 - secondsLeft / WAIT_SECONDS)
              }
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <span className="text-3xl font-bold tabular-nums text-white">
            {secondsLeft}
          </span>
        </div>

        <BouncingDots />
      </div>
    </div>
  );
}
