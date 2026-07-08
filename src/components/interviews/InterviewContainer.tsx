import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { interviewApi } from "@/api/interview/interviewApi";
import type {
  InterviewQuestion,
  SubmitInterviewResponse,
} from "@/api/interview/types";
import {
  InterviewMeetingRoom,
  type MeetingPhase,
} from "@/components/interviews/InterviewMeetingRoom";
import { InterviewReport } from "@/components/interviews/InterviewReport";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalizedPath } from "@/utils/localeUtils";

const MIN_RECORDING_MS = 3000;
const RECORD_COUNTDOWN_SEC = 3;

function mediaErrorMessage(error: unknown): string {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: string }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "კამერა ან მიკროფონის წვდომა უარყოფილია. გთხოვთ, დაუშვათ უფლებები ბრაუზერის პარამეტრებში.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "კამერა ან მიკროფონი ვერ მოიძებნა. შეამოწმეთ მოწყობილობა.";
  }
  if (name === "NotReadableError") {
    return "კამერა ან მიკროფონი დაკავებულია სხვა აპლიკაციით.";
  }
  return "მედია მოწყობილობის გახსნა ვერ მოხერხდა.";
}

export function InterviewContainer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const returnPath =
    searchParams.get("return")?.trim() ||
    getLocalizedPath("/home", language);
  const presetPosition = searchParams.get("position")?.trim() ?? "";
  const autoStartRequested = presetPosition.length > 0;
  const autoStartTriggeredRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const currentQuestionRef = useRef<InterviewQuestion | null>(null);
  const handleSubmitRecordingRef = useRef<() => Promise<void>>(async () => {});
  const beginActualRecordingRef = useRef<() => void>(() => {});

  const [phase, setPhase] = useState<MeetingPhase>("setup");
  const [jobPosition, setJobPosition] = useState("");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<InterviewQuestion | null>(null);
  const [perQuestionResults, setPerQuestionResults] = useState<
    SubmitInterviewResponse[]
  >([]);
  const [lastFeedback, setLastFeedback] =
    useState<SubmitInterviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [recordCountdownSec, setRecordCountdownSec] = useState(0);

  currentQuestionRef.current = currentQuestion;

  const stopMedia = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  const leaveMeeting = useCallback(() => {
    stopMedia();
    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined);
    }
    navigate(returnPath);
  }, [navigate, returnPath, stopMedia]);

  useEffect(() => () => stopMedia(), [stopMedia]);

  useEffect(() => {
    if (phase !== "recording") {
      setRecordingMs(0);
      return;
    }
    const startedAt = recordingStartedAtRef.current ?? Date.now();
    const tick = () => setRecordingMs(Date.now() - startedAt);
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  const attachStream = useCallback(async () => {
    setError(null);
    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: true,
        });
      }
      setCameraReady(true);
    } catch (e) {
      setCameraReady(false);
      setError(mediaErrorMessage(e));
      throw e;
    }
  }, []);

  const bindVideoElement = useCallback(() => {
    const stream = mediaStreamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return;
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      void video.play().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (
      phase === "setup" ||
      phase === "session_complete"
    ) {
      return;
    }
    const id = window.requestAnimationFrame(() => bindVideoElement());
    return () => window.cancelAnimationFrame(id);
  }, [phase, currentQuestion?.id, bindVideoElement]);

  const resetSession = useCallback(() => {
    stopMedia();
    setInterviewId(null);
    setCurrentQuestion(null);
    setPerQuestionResults([]);
    setLastFeedback(null);
    chunksRef.current = [];
    setPhase("setup");
    setError(null);
  }, [stopMedia]);

  const handleStartInterview = async (positionOverride?: string) => {
    const position = (positionOverride ?? jobPosition).trim();
    if (!position) {
      setError("გთხოვთ, მიუთითოთ სამუშაო პოზიცია.");
      return;
    }

    setJobPosition(position);
    setIsStarting(true);
    setError(null);
    setPerQuestionResults([]);
    setLastFeedback(null);

    try {
      await attachStream();
      const response = await interviewApi.startInterview(position);
      setInterviewId(response.interview.id);
      setCurrentQuestion(response.question);
      setPhase("waiting_for_host");
    } catch (e) {
      stopMedia();
      setError(
        e instanceof Error
          ? e.message
          : "ინტერვიუს დაწყება ვერ მოხერხდა.",
      );
      if (autoStartRequested) {
        setPhase("setup");
      }
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!autoStartRequested || autoStartTriggeredRef.current) return;
    autoStartTriggeredRef.current = true;
    setJobPosition(presetPosition);
    void handleStartInterview(presetPosition);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for URL preset
  }, [autoStartRequested, presetPosition]);

  const handleQuestionAudioFinished = useCallback(() => {
    setPhase("recording_countdown");
  }, []);

  const handleInterviewerJoined = useCallback(() => {
    setPhase("playing_question");
  }, []);

  const beginActualRecording = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      setError("კამერა არ არის მზად. გთხოვთ, ხელახლა სცადოთ.");
      setPhase("recording_countdown");
      return;
    }

    chunksRef.current = [];

    const audioTracks = stream.getAudioTracks();
    const recordStream =
      audioTracks.length > 0 ? new MediaStream(audioTracks) : stream;

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : MediaRecorder.isTypeSupported("video/webm")
            ? "video/webm"
            : "";

    const recorder = mimeType
      ? new MediaRecorder(recordStream, { mimeType })
      : new MediaRecorder(recordStream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      void handleSubmitRecordingRef.current();
    };

    mediaRecorderRef.current = recorder;
    recordingStartedAtRef.current = Date.now();
    recorder.start(250);
    setPhase("recording");
  }, []);
  beginActualRecordingRef.current = beginActualRecording;

  useEffect(() => {
    if (phase !== "recording_countdown") return;

    setRecordCountdownSec(RECORD_COUNTDOWN_SEC);
    let remaining = RECORD_COUNTDOWN_SEC;

    const interval = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(interval);
        beginActualRecordingRef.current();
      } else {
        setRecordCountdownSec(remaining);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [phase, currentQuestion?.id]);

  const handleStopRecording = () => {
    const elapsed = recordingStartedAtRef.current
      ? Date.now() - recordingStartedAtRef.current
      : 0;
    if (elapsed < MIN_RECORDING_MS) {
      setError(
        `ჩანაწერი ძალიან მოკლეა. სცადეთ მინიმუმ ${MIN_RECORDING_MS / 1000} წამი.`,
      );
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  };

  const handleSubmitRecording = async () => {
    const question = currentQuestionRef.current;
    if (!question) return;

    const blob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || "audio/webm",
    });

    if (!blob.size) {
      setError("ჩანაწერი ცარიელია. სცადეთ ხელახლა.");
      setPhase("recording_countdown");
      return;
    }

    if (blob.size < 1024) {
      setError(
        "ჩანაწერი ძალიან მცირეა. სცადეთ ხელახლა და ილაპარაკეთ მინიმუმ 3 წამი.",
      );
      setPhase("recording_countdown");
      return;
    }

    setPhase("submitting");
    setError(null);

    try {
      const result = await interviewApi.submitInterviewAudio(question.id, blob);
      setPerQuestionResults((prev) => [...prev, result]);
      setLastFeedback(result);

      if (result.interview_complete) {
        stopMedia();
        if (document.fullscreenElement) {
          void document.exitFullscreen?.().catch(() => undefined);
        }
        setPhase("session_complete");
      } else {
        setPhase("question_feedback");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "პასუხის გაგზავნა ვერ მოხერხდა.",
      );
      setPhase("recording_countdown");
    }
  };
  handleSubmitRecordingRef.current = handleSubmitRecording;

  const handleNextQuestion = useCallback(() => {
    if (!lastFeedback?.next_question) return;
    setCurrentQuestion(lastFeedback.next_question);
    setLastFeedback(null);
    chunksRef.current = [];
    setPhase("playing_question");
  }, [lastFeedback]);

  const sessionReport =
    phase === "session_complete" && lastFeedback ? (
      <InterviewReport
        evaluation={lastFeedback}
        onRetake={resetSession}
        sessionSummary={{
          averageScore: Math.round(
            perQuestionResults.reduce((sum, r) => sum + r.overall_score, 0) /
              Math.max(perQuestionResults.length, 1),
          ),
          results: perQuestionResults,
          totalQuestions: lastFeedback.total_questions,
          interviewId: interviewId ?? undefined,
        }}
      />
    ) : null;

  return (
    <InterviewMeetingRoom
      phase={phase}
      jobPosition={jobPosition}
      jobPositionInput={jobPosition}
      onJobPositionInputChange={setJobPosition}
      onStartInterview={() => void handleStartInterview()}
      isStarting={isStarting}
      currentQuestion={currentQuestion}
      completedCount={perQuestionResults.length}
      videoRef={videoRef}
      cameraReady={cameraReady}
      recordingMs={recordingMs}
      recordCountdownSec={recordCountdownSec}
      error={error}
      lastFeedback={lastFeedback}
      onQuestionAudioFinished={handleQuestionAudioFinished}
      onStopRecording={handleStopRecording}
      onNextQuestion={handleNextQuestion}
      onLeave={leaveMeeting}
      onInterviewerJoined={handleInterviewerJoined}
      launchingFromJob={autoStartRequested}
    >
      {sessionReport}
    </InterviewMeetingRoom>
  );
}
