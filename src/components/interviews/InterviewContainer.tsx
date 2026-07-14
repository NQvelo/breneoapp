import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { interviewApi } from "@/api/interview/interviewApi";
import type {
  InterviewPlaybackItem,
  InterviewQuestion,
  StartInterviewParams,
  SubmitInterviewResponse,
} from "@/api/interview/types";
import {
  InterviewMeetingRoom,
  type MeetingPhase,
} from "@/components/interviews/InterviewMeetingRoom";
import { InterviewReport } from "@/components/interviews/InterviewReport";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLocalizedPath } from "@/utils/localeUtils";
import {
  isAutoplayBlockedError,
  playAudioUrl,
  playPlaybackSequence,
  stopActiveAudio,
} from "@/utils/playAudioSequence";

const MIN_RECORDING_MS = 3000;
const RECORD_COUNTDOWN_SEC = 3;

function isSessionAbortedError(error: unknown): boolean {
  return error instanceof Error && error.message === "Audio stopped";
}

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

function resolveStartParams(
  jobIdRaw: string,
  position: string,
): StartInterviewParams | null {
  const trimmedPosition = position.trim();
  const trimmedId = jobIdRaw.trim();
  if (trimmedId) {
    const numericId = Number(trimmedId);
    if (Number.isFinite(numericId) && trimmedId === String(numericId)) {
      return trimmedPosition
        ? { job_id: numericId, job_position: trimmedPosition }
        : { job_id: numericId };
    }
  }
  if (trimmedPosition) return { job_position: trimmedPosition };
  return null;
}

export function InterviewContainer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const returnPath =
    searchParams.get("return")?.trim() ||
    getLocalizedPath("/home", language);
  const presetJobIdRaw = searchParams.get("job_id")?.trim() ?? "";
  const presetPosition = searchParams.get("position")?.trim() ?? "";
  const startParams = resolveStartParams(presetJobIdRaw, presetPosition);
  const hasJobContext = startParams != null;
  const autoStartTriggeredRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const currentQuestionRef = useRef<InterviewQuestion | null>(null);
  const handleSubmitRecordingRef = useRef<() => Promise<void>>(async () => {});
  const beginActualRecordingRef = useRef<() => void>(() => {});
  const pendingPlaybackRef = useRef<InterviewPlaybackItem[] | null>(null);
  const pendingSingleAudioRef = useRef<string | null>(null);
  const sessionActiveRef = useRef(true);

  const [phase, setPhase] = useState<MeetingPhase>("setup");
  const [jobPosition, setJobPosition] = useState(presetPosition);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<InterviewQuestion | null>(null);
  const [perQuestionResults, setPerQuestionResults] = useState<
    SubmitInterviewResponse[]
  >([]);
  const [questionTextByNumber, setQuestionTextByNumber] = useState<
    Record<number, string>
  >({});
  const [lastFeedback, setLastFeedback] =
    useState<SubmitInterviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [recordingMs, setRecordingMs] = useState(0);
  const [recordCountdownSec, setRecordCountdownSec] = useState(0);
  const [audioCaption, setAudioCaption] = useState("");
  const [isPlayingWelcome, setIsPlayingWelcome] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);

  currentQuestionRef.current = currentQuestion;

  const releaseMedia = useCallback((options?: { abandonRecording?: boolean }) => {
    stopActiveAudio();

    const recorder = mediaRecorderRef.current;
    if (recorder) {
      if (options?.abandonRecording) {
        recorder.onstop = null;
      }
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Ignore stop races while leaving the meeting.
        }
      }
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (sessionActiveRef.current) {
      setCameraReady(false);
      setIsAudioPlaying(false);
      setIsPlayingWelcome(false);
    }
  }, []);

  const stopMedia = useCallback(() => {
    releaseMedia();
  }, [releaseMedia]);

  const leaveMeeting = useCallback(() => {
    sessionActiveRef.current = false;
    pendingPlaybackRef.current = null;
    pendingSingleAudioRef.current = null;
    releaseMedia({ abandonRecording: true });
    if (document.fullscreenElement) {
      void document.exitFullscreen?.().catch(() => undefined);
    }
    navigate(returnPath, { replace: true });
  }, [navigate, returnPath, releaseMedia]);

  useEffect(
    () => () => {
      sessionActiveRef.current = false;
      releaseMedia({ abandonRecording: true });
    },
    [releaseMedia],
  );

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
    if (phase === "setup" || phase === "session_complete") return;
    const id = window.requestAnimationFrame(() => bindVideoElement());
    return () => window.cancelAnimationFrame(id);
  }, [phase, currentQuestion?.id, bindVideoElement]);

  const handlePlaybackSegment = useCallback(
    (item: InterviewPlaybackItem) => {
      setAudioCaption(item.text);
      setIsPlayingWelcome(item.type === "welcome");
    },
    [],
  );

  const runPlaybackSequenceLocal = useCallback(
    async (items: InterviewPlaybackItem[]) => {
      setPhase("playing_audio");
      setNeedsManualPlay(false);
      setIsAudioPlaying(true);
      setError(null);

      try {
        await playPlaybackSequence(items, (item) => {
          if (!sessionActiveRef.current) return;
          handlePlaybackSegment(item);
        });
        if (!sessionActiveRef.current) return;
        pendingPlaybackRef.current = null;
        setIsAudioPlaying(false);
        setIsPlayingWelcome(false);
        setPhase("ready_to_record");
      } catch (e) {
        if (!sessionActiveRef.current || isSessionAbortedError(e)) return;
        setIsAudioPlaying(false);
        if (isAutoplayBlockedError(e)) {
          pendingPlaybackRef.current = items;
          pendingSingleAudioRef.current = null;
          setNeedsManualPlay(true);
          setPhase("playing_audio");
        } else {
          setError(
            e instanceof Error ? e.message : "აუდიოს დაკვრა ვერ მოხერხდა.",
          );
          setPhase("ready_to_record");
        }
      }
    },
    [handlePlaybackSegment],
  );

  const runSingleQuestionAudio = useCallback(
    async (question: InterviewQuestion) => {
      setPhase("playing_audio");
      setNeedsManualPlay(false);
      setIsAudioPlaying(true);
      setIsPlayingWelcome(false);
      setAudioCaption(question.question_text);
      setError(null);

      if (!question.question_audio_url) {
        setIsAudioPlaying(false);
        setPhase("ready_to_record");
        return;
      }

      try {
        await playAudioUrl(question.question_audio_url);
        if (!sessionActiveRef.current) return;
        pendingSingleAudioRef.current = null;
        setIsAudioPlaying(false);
        setPhase("ready_to_record");
      } catch (e) {
        if (!sessionActiveRef.current || isSessionAbortedError(e)) return;
        setIsAudioPlaying(false);
        if (isAutoplayBlockedError(e)) {
          pendingSingleAudioRef.current = question.question_audio_url;
          pendingPlaybackRef.current = null;
          setNeedsManualPlay(true);
          setPhase("playing_audio");
        } else {
          setError(
            e instanceof Error ? e.message : "აუდიოს დაკვრა ვერ მოხერხდა.",
          );
          setPhase("ready_to_record");
        }
      }
    },
    [],
  );

  const handleManualPlayAudio = useCallback(async () => {
    const playback = pendingPlaybackRef.current;
    const singleUrl = pendingSingleAudioRef.current;

    setNeedsManualPlay(false);
    setIsAudioPlaying(true);
    setError(null);

    try {
      if (playback?.length) {
        await playPlaybackSequence(playback, (item) => {
          if (!sessionActiveRef.current) return;
          handlePlaybackSegment(item);
        });
        if (!sessionActiveRef.current) return;
        pendingPlaybackRef.current = null;
        setIsPlayingWelcome(false);
        setPhase("ready_to_record");
      } else if (singleUrl) {
        await playAudioUrl(singleUrl);
        if (!sessionActiveRef.current) return;
        pendingSingleAudioRef.current = null;
        setPhase("ready_to_record");
      } else if (currentQuestionRef.current?.question_audio_url) {
        await playAudioUrl(currentQuestionRef.current.question_audio_url);
        if (!sessionActiveRef.current) return;
        setPhase("ready_to_record");
      }
    } catch (e) {
      if (!sessionActiveRef.current || isSessionAbortedError(e)) return;
      if (isAutoplayBlockedError(e)) {
        setNeedsManualPlay(true);
      } else {
        setError(
          e instanceof Error ? e.message : "აუდიოს დაკვრა ვერ მოხერხდა.",
        );
        setPhase("ready_to_record");
      }
    } finally {
      if (sessionActiveRef.current) {
        setIsAudioPlaying(false);
      }
    }
  }, [handlePlaybackSegment]);

  const handleStartInterview = useCallback(
    async (explicitParams?: StartInterviewParams) => {
      const params =
        explicitParams ?? resolveStartParams(presetJobIdRaw, presetPosition);

      if (!params) {
        setError("ინტერვიუს დასაწყებად გადადით სამუშაოს გვერდზე.");
        return;
      }

      setIsStarting(true);
      setError(null);
      setPerQuestionResults([]);
      setQuestionTextByNumber({});
      setLastFeedback(null);
      setNeedsManualPlay(false);

      try {
        if (!sessionActiveRef.current) return;
        const [, response] = await Promise.all([
          attachStream(),
          interviewApi.startInterview(params),
        ]);
        if (!sessionActiveRef.current) return;
        setInterviewId(response.interview.id);
        setJobPosition(
          response.interview.job_position ||
            response.question.job_position ||
            ("job_position" in params ? params.job_position : "") ||
            presetPosition,
        );
        setCurrentQuestion(response.question);

        const playback =
          response.playback?.length > 0
            ? response.playback
            : [
                ...(response.welcome_audio_url
                  ? [
                      {
                        type: "welcome" as const,
                        text: response.welcome_text,
                        audio_url: response.welcome_audio_url,
                      },
                    ]
                  : []),
                {
                  type: "question" as const,
                  text: response.question.question_text,
                  audio_url: response.question.question_audio_url,
                },
              ];

        const firstSegment = playback[0];
        if (firstSegment) {
          setAudioCaption(firstSegment.text || response.welcome_text);
          setIsPlayingWelcome(firstSegment.type === "welcome");
        }

        setIsStarting(false);
        setPhase("playing_audio");
        await runPlaybackSequenceLocal(playback);
      } catch (e) {
        if (!sessionActiveRef.current || isSessionAbortedError(e)) return;
        stopMedia();
        setError(
          e instanceof Error
            ? e.message
            : "ინტერვიუს დაწყება ვერ მოხერხდა.",
        );
        setPhase("setup");
      } finally {
        if (sessionActiveRef.current) {
          setIsStarting(false);
        }
      }
    },
    [
      attachStream,
      presetJobIdRaw,
      presetPosition,
      runPlaybackSequenceLocal,
      stopMedia,
    ],
  );

  const resetSession = useCallback(() => {
    sessionActiveRef.current = true;
    stopMedia();
    setInterviewId(null);
    setCurrentQuestion(null);
    setPerQuestionResults([]);
    setQuestionTextByNumber({});
    setLastFeedback(null);
    chunksRef.current = [];
    pendingPlaybackRef.current = null;
    pendingSingleAudioRef.current = null;
    setAudioCaption("");
    setNeedsManualPlay(false);
    setPhase("setup");
    setError(null);
    if (startParams) {
      void handleStartInterview(startParams);
    }
  }, [handleStartInterview, startParams, stopMedia]);

  useEffect(() => {
    if (!hasJobContext) return;
    void attachStream().catch(() => undefined);
  }, [attachStream, hasJobContext]);

  useEffect(() => {
    if (!hasJobContext || autoStartTriggeredRef.current || !startParams) {
      return;
    }
    autoStartTriggeredRef.current = true;
    if (presetPosition) setJobPosition(presetPosition);
    void handleStartInterview(startParams);
  }, [hasJobContext, handleStartInterview, presetPosition, startParams]);

  const handleBeginRecording = useCallback(() => {
    setError(null);
    setPhase("recording_countdown");
  }, []);

  const beginActualRecording = useCallback(() => {
    const stream = mediaStreamRef.current;
    if (!stream) {
      setError("კამერა არ არის მზად. გთხოვთ, ხელახლა სცადოთ.");
      setPhase("ready_to_record");
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
      if (!sessionActiveRef.current) return;
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
    if (!sessionActiveRef.current) return;

    const question = currentQuestionRef.current;
    if (!question) return;

    const blob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || "audio/webm",
    });

    if (!blob.size) {
      setError("ჩანაწერი ცარიელია. სცადეთ ხელახლა.");
      setPhase("ready_to_record");
      return;
    }

    if (blob.size < 1024) {
      setError(
        "ჩანაწერი ძალიან მცირეა. სცადეთ ხელახლა და ილაპარაკეთ მინიმუმ 3 წამი.",
      );
      setPhase("ready_to_record");
      return;
    }

    setPhase("submitting");
    setError(null);
    setQuestionTextByNumber((prev) => ({
      ...prev,
      [question.question_number]: question.question_text,
    }));

    try {
      const result = await interviewApi.submitInterviewAudio(question.id, blob);
      if (!sessionActiveRef.current) return;
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
      if (!sessionActiveRef.current) return;
      setError(
        e instanceof Error
          ? e.message
          : "პასუხის გაგზავნა ვერ მოხერხდა.",
      );
      setPhase("ready_to_record");
    }
  };
  handleSubmitRecordingRef.current = handleSubmitRecording;

  const handleNextQuestion = useCallback(async () => {
    if (!sessionActiveRef.current) return;

    const next = lastFeedback?.next_question;
    if (!next) return;

    setCurrentQuestion(next);
    setLastFeedback(null);
    chunksRef.current = [];
    setError(null);
    await runSingleQuestionAudio(next);
  }, [lastFeedback, runSingleQuestionAudio]);

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
          questionTextByNumber,
        }}
      />
    ) : null;

  return (
    <InterviewMeetingRoom
      phase={phase}
      jobPosition={jobPosition}
      hasJobContext={hasJobContext}
      isStarting={isStarting}
      currentQuestion={currentQuestion}
      completedCount={perQuestionResults.length}
      videoRef={videoRef}
      cameraReady={cameraReady}
      recordingMs={recordingMs}
      recordCountdownSec={recordCountdownSec}
      error={error}
      lastFeedback={lastFeedback}
      audioCaption={audioCaption}
      isPlayingWelcome={isPlayingWelcome}
      isAudioPlaying={isAudioPlaying}
      needsManualPlay={needsManualPlay}
      onManualPlayAudio={() => void handleManualPlayAudio()}
      onBeginRecording={handleBeginRecording}
      onStopRecording={handleStopRecording}
      onNextQuestion={() => void handleNextQuestion()}
      onLeave={leaveMeeting}
    >
      {sessionReport}
    </InterviewMeetingRoom>
  );
}
