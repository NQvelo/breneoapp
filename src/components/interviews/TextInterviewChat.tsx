import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { interviewApi } from "@/api/interview/interviewApi";
import type {
  StartInterviewParams,
  SubmitInterviewResponse,
} from "@/api/interview/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LocalizedLink } from "@/components/routing/LocalizedLink";
import { NotificationCountBadge } from "@/components/notifications/NotificationCountBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage, useTranslation } from "@/contexts/LanguageContext";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { useUserXp } from "@/hooks/useUserXp";
import { isOnboardingRoleId } from "@/onboarding/onboardingAnswers";
import { getRole } from "@/utils/getRole";
import { ArrowLeft, Bell, Loader2, Mic, Moon, Send, Sun, Zap } from "@/components/icons";
import { useTheme } from "next-themes";

type ChatMessage =
  | { id: string; from: "ai"; kind: "text"; text: string }
  | { id: string; from: "user"; kind: "text"; text: string }
  | { id: string; from: "ai"; kind: "review"; result: SubmitInterviewResponse }
  | { id: string; from: "ai"; kind: "status"; text: string };

function recordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
  return "";
}

function resolveTextStartParams(
  roleRaw: string,
  jobIdRaw: string,
  positionRaw: string,
): StartInterviewParams | null {
  const role = roleRaw.trim();
  if (role) return { role, mode: "text" };
  const jobId = Number(jobIdRaw);
  if (jobIdRaw.trim() && Number.isFinite(jobId)) {
    return { job_id: jobId, mode: "text" };
  }
  const position = positionRaw.trim();
  if (position) return { job_position: position, mode: "text" };
  return null;
}

export function TextInterviewChat() {
  const t = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnPath = searchParams.get("return")?.trim() || "/courses";
  const presetRole = searchParams.get("role")?.trim() ?? "";
  const roleTitle = isOnboardingRoleId(presetRole)
    ? t.onboarding.roles[presetRole]
    : searchParams.get("position")?.trim() || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [recordingAudio, setRecordingAudio] = useState<AudioContext | null>(null);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const shouldWarnOnLeaveRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  const isRegularUser = getRole() === "user";
  const { xp } = useUserXp(!!user && isRegularUser, user?.id);
  const { count: unreadNotificationCount } = useUnreadNotificationCount();
  const notificationsPath =
    getRole() === "employer" ? "/employer/notifications" : "/notifications";
  const interviewTitle = roleTitle || t.courses.interviews;

  shouldWarnOnLeaveRef.current = Boolean(questionId) && !finished;

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      recorder?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const writeTranscript = (transcript: string) => {
    const spoken = transcript.trim();
    if (!spoken) {
      setError(t.courses.textChatVoiceError);
      return;
    }
    setDraft((current) => {
      const base = current.trim();
      return base ? `${base} ${spoken}` : spoken;
    });
  };

  const transcribeRecording = async (blob: Blob) => {
    if (!blob.size) {
      setError(t.courses.textChatVoiceError);
      return;
    }
    setTranscribing(true);
    setError(null);
    try {
      const transcript = await interviewApi.transcribeInterviewAudio(
        blob,
        language === "ka" ? "ka" : "en",
      );
      writeTranscript(transcript);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.courses.textChatVoiceError);
    } finally {
      setTranscribing(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t.courses.textChatVoiceUnsupported);
      return;
    }
    const audioContext = new AudioContext();
    void audioContext.resume();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = recordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void audioContext.close();
        setRecordingAudio(null);
        setRecordingStream(null);
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        setRecording(false);
        void transcribeRecording(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingAudio(audioContext);
      setRecordingStream(stream);
      setRecording(true);
      setError(null);
    } catch {
      void audioContext.close();
      setError(t.courses.textChatVoiceError);
    }
  };

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarnOnLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const goBack = () => {
    if (!shouldWarnOnLeaveRef.current) {
      navigate(returnPath);
      return;
    }
    window.location.assign(returnPath);
  };

  const nextId = () => {
    idRef.current += 1;
    return `m-${idRef.current}`;
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => {
    const params = resolveTextStartParams(
      presetRole,
      searchParams.get("job_id") ?? "",
      searchParams.get("position") ?? "",
    );
    if (!params) {
      setError("აირჩიე როლი ინტერვიუს დასაწყებად.");
      setBusy(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await interviewApi.startInterview(params);
        if (cancelled) return;
        const opening: ChatMessage[] = [];
        if (response.welcome_text?.trim()) {
          opening.push({
            id: nextId(),
            from: "ai",
            kind: "text",
            text: response.welcome_text.trim(),
          });
        }
        opening.push({
          id: nextId(),
          from: "ai",
          kind: "text",
          text: response.question.question_text,
        });
        setMessages(opening);
        setQuestionId(response.question.id);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "ინტერვიუ ვერ დაიწყო.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Start once from the URL the user opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendAnswer = async () => {
    const text = draft.trim();
    if (!text || !questionId || busy || finished || sendingRef.current) return;
    sendingRef.current = true;
    const currentQuestionId = questionId;
    setDraft("");
    setBusy(true);
    setError(null);
    const statusId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), from: "user", kind: "text", text },
      {
        id: statusId,
        from: "ai",
        kind: "status",
        text: t.courses.textChatReviewing,
      },
    ]);

    try {
      const result = await interviewApi.submitInterviewText(
        currentQuestionId,
        text,
      );
      const followUp: ChatMessage[] = [
        { id: nextId(), from: "ai", kind: "review", result },
      ];
      if (result.interview_complete || !result.next_question) {
        followUp.push({
          id: nextId(),
          from: "ai",
          kind: "text",
          text: t.courses.textChatComplete,
        });
        setFinished(true);
        setQuestionId(null);
      } else {
        followUp.push({
          id: nextId(),
          from: "ai",
          kind: "text",
          text: result.next_question.question_text,
        });
        setQuestionId(result.next_question.id);
      }
      setMessages((prev) => [
        ...prev.filter((message) => message.id !== statusId),
        ...followUp,
      ]);
    } catch (e) {
      setMessages((prev) => prev.filter((message) => message.id !== statusId));
      setDraft(text);
      setError(e instanceof Error ? e.message : "პასუხის შეფასება ვერ მოხერხდა.");
    } finally {
      sendingRef.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-white text-foreground dark:bg-[#242424]">
      <header className="fixed inset-x-0 top-0 z-50 flex items-center gap-3 bg-[#F3F3F4]/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl backdrop-saturate-150 dark:bg-[#181818]/80 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goBack}
          aria-label={t.common.back}
          className="h-10 w-10 shrink-0 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700 dark:bg-border/50 dark:text-gray-400 dark:hover:bg-border/70 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="min-w-0 truncate text-base font-semibold text-foreground">
          {interviewTitle}
        </h1>
      </header>
      <header className="hidden shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6 md:flex">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={goBack}
            className="h-10 shrink-0 rounded-full bg-gray-200 px-3 text-sm font-medium text-gray-500 hover:bg-gray-300 hover:text-gray-700 dark:bg-border/50 dark:text-gray-400 dark:hover:bg-border/70 dark:hover:text-gray-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t.common.back}</span>
          </Button>
          <h1 className="truncate text-lg font-semibold text-foreground">
            {interviewTitle}
          </h1>
        </div>
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {isRegularUser ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-full bg-gray-200 px-3 text-sm font-medium text-gray-500 hover:bg-gray-300 hover:text-gray-700 dark:bg-border/50 dark:text-gray-400 dark:hover:bg-border/70 dark:hover:text-gray-200"
            >
              <Zap className="h-4 w-4" />
              <span>{xp} XP</span>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-10 w-10 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700 dark:bg-border/50 dark:text-gray-400 dark:hover:bg-border/70 dark:hover:text-gray-200"
          >
            {themeMounted && theme === "dark" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
          <LocalizedLink to={notificationsPath}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 rounded-full bg-gray-200 text-gray-500 hover:bg-gray-300 hover:text-gray-700 dark:bg-border/50 dark:text-gray-400 dark:hover:bg-border/70 dark:hover:text-gray-200"
            >
              <Bell className="h-5 w-5" />
              <NotificationCountBadge count={unreadNotificationCount} />
            </Button>
          </LocalizedLink>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-28 sm:px-6 md:pb-5">
        <div className="flex w-full flex-col gap-2">
          {busy && messages.length === 0 ? <TypingRow /> : null}
          {messages.map((message, index) => (
            <ChatBubble
              key={message.id}
              message={message}
              showAvatar={showBreneoAvatar(messages, index)}
              apart={index > 0 && messages[index - 1].from !== message.from}
            />
          ))}
          {error ? (
            <p className="pl-11 text-sm text-rose-600 dark:text-rose-300">{error}</p>
          ) : null}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        className="fixed inset-x-0 bottom-0 z-40 shrink-0 border-t border-gray-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700 dark:bg-[#242424] md:static md:inset-auto md:z-auto md:bg-transparent md:px-6 md:pb-3 dark:md:bg-transparent"
        onSubmit={(event) => {
          event.preventDefault();
          void sendAnswer();
        }}
      >
        <div className="flex w-full items-center gap-2">
          {recording && recordingStream && recordingAudio ? (
            <>
              <VoiceWave
                stream={recordingStream}
                audioContext={recordingAudio}
                className="md:hidden"
              />
              <div className="hidden h-[3.2rem] min-w-0 flex-1 items-center overflow-hidden rounded-md border border-input bg-input md:flex">
                <VoiceWave
                  stream={recordingStream}
                  audioContext={recordingAudio}
                  embedded
                />
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendAnswer();
                    }
                  }}
                  placeholder={t.courses.textChatPlaceholder}
                  disabled={busy || finished || !questionId || transcribing}
                  rows={1}
                  className="h-full min-h-0 flex-1 resize-none border-0 bg-transparent py-3 text-sm shadow-none"
                />
              </div>
            </>
          ) : (
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendAnswer();
                }
              }}
              placeholder={t.courses.textChatPlaceholder}
              disabled={busy || finished || !questionId || transcribing}
              rows={1}
              className="h-[3.2rem] min-h-[3.2rem] max-h-36 resize-none py-3 text-base md:text-sm"
            />
          )}
          <Button
            type="button"
            size="icon"
            variant="secondary"
            disabled={busy || finished || !questionId || transcribing}
            aria-label={
              recording ? t.courses.textChatStopRecording : t.courses.textChatRecord
            }
            aria-pressed={recording}
            onClick={() => {
              void toggleRecording();
            }}
            className={`h-[3.2rem] w-[3.2rem] shrink-0 rounded-md ${
              recording
                ? "bg-rose-500 text-white hover:bg-rose-500/90"
                : "bg-[#E6E7EB] text-black hover:bg-[#E6E7EB]/90 dark:bg-[#4A4A4A] dark:text-white dark:hover:bg-[#4A4A4A]/90"
            }`}
          >
            {transcribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mic className={`h-4 w-4 ${recording ? "animate-pulse" : ""}`} />
            )}
          </Button>
          <Button
            type="submit"
            size="icon"
            disabled={busy || finished || !questionId || !draft.trim()}
            aria-label={t.courses.textChatSend}
            className="h-[3.2rem] w-[3.2rem] shrink-0 rounded-md bg-breneo-blue text-white hover:bg-breneo-blue/90"
          >
            {busy && messages.length > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

const VOICE_BAR_COUNT = 28;

function VoiceWave({
  stream,
  audioContext,
  embedded = false,
  className = "",
}: {
  stream: MediaStream;
  audioContext: AudioContext;
  embedded?: boolean;
  className?: string;
}) {
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const clock = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.65;
    source.connect(analyser);
    const levels = new Uint8Array(analyser.frequencyBinCount);
    let frame = 0;

    const paint = () => {
      analyser.getByteFrequencyData(levels);
      barsRef.current.forEach((bar, index) => {
        if (!bar) return;
        const level = levels[index % levels.length] / 255;
        bar.style.transform = `scaleY(${0.2 + level * 0.8})`;
      });
      frame = window.requestAnimationFrame(paint);
    };
    frame = window.requestAnimationFrame(paint);

    return () => {
      window.cancelAnimationFrame(frame);
      source.disconnect();
    };
  }, [audioContext, stream]);

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return (
    <div
      className={`flex items-center gap-2 overflow-hidden ${
        embedded
          ? "h-full w-[42%] max-w-xs shrink-0 border-r border-input px-3"
          : "h-[3.2rem] min-w-0 flex-1 rounded-md border border-input bg-input px-3"
      } ${className}`}
    >
      <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-rose-500" />
      <span className="w-10 shrink-0 text-sm tabular-nums text-rose-500">
        {minutes}:{remainder.toString().padStart(2, "0")}
      </span>
      <div className="flex h-5 min-w-0 flex-1 items-center gap-px overflow-hidden">
        {Array.from({ length: VOICE_BAR_COUNT }, (_, index) => (
          <span
            key={index}
            ref={(node) => {
              barsRef.current[index] = node;
            }}
            className="h-full min-w-px flex-1 origin-center rounded-full bg-foreground/70"
            style={{ transform: "scaleY(0.2)" }}
          />
        ))}
      </div>
    </div>
  );
}

function showBreneoAvatar(messages: ChatMessage[], index: number) {
  const message = messages[index];
  if (!message || message.from !== "ai") return false;
  const previous = messages[index - 1];
  if (!previous || previous.from !== "ai") return true;
  const userHasReplied = messages
    .slice(0, index)
    .some((item) => item.from === "user");
  return !userHasReplied && message.kind === "text";
}

function BreneoAvatar() {
  return (
    <img
      src="/pwa/icon-96.png"
      alt="Breneo"
      className="h-9 w-9 shrink-0 rounded-full bg-white object-cover ring-1 ring-black/5 dark:bg-[#242424] dark:ring-white/10"
    />
  );
}

function TypingDots() {
  return (
    <span className="flex h-5 items-end gap-1 px-0.5" aria-hidden>
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"
          style={{ animationDelay: `${dot * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}

function TypingRow() {
  return (
    <div className="flex w-full min-w-0 items-end gap-2 md:w-1/2 md:max-w-[50%] md:pr-6">
      <BreneoAvatar />
      <div className="w-fit max-w-full rounded-[1.25rem] rounded-bl-md bg-[#F2F3F5] px-4 py-3 shadow-sm dark:bg-[#333333]">
        <TypingDots />
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  showAvatar,
  apart,
}: {
  message: ChatMessage;
  showAvatar: boolean;
  apart: boolean;
}) {
  const isUser = message.from === "user";

  if (isUser && message.kind === "text") {
    return (
      <div className={`ml-auto flex w-full min-w-0 justify-end md:w-1/2 md:max-w-[50%] md:pl-6 ${apart ? "mt-4" : ""}`}>
        <div className="w-fit max-w-full whitespace-pre-wrap rounded-[1.25rem] rounded-br-md bg-[#E7E9ED] px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm dark:bg-[#3a3a3a]">
          {message.text}
        </div>
      </div>
    );
  }

  const bubble =
    message.kind === "status" ? (
      <div className="w-fit max-w-full rounded-[1.25rem] rounded-bl-md bg-[#F2F3F5] px-4 py-3 shadow-sm dark:bg-[#333333]">
        <TypingDots />
      </div>
    ) : message.kind === "review" ? (
      <ReviewBubble result={message.result} />
    ) : (
      <div className="w-fit max-w-full whitespace-pre-wrap rounded-[1.25rem] rounded-bl-md bg-[#F2F3F5] px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-sm dark:bg-[#333333]">
        {message.kind === "text" ? message.text : ""}
      </div>
    );

  return (
    <div className={`flex w-full min-w-0 items-end gap-2 md:w-1/2 md:max-w-[50%] md:pr-6 ${apart ? "mt-4" : ""}`}>
      {showAvatar ? <BreneoAvatar /> : <span className="w-9 shrink-0" />}
      <div className="min-w-0 flex-1">
        {showAvatar ? (
          <p className="mb-1 text-xs font-medium text-muted-foreground">Breneo Ai</p>
        ) : null}
        {bubble}
      </div>
    </div>
  );
}

function ReviewBubble({ result }: { result: SubmitInterviewResponse }) {
  const t = useTranslation();
  return (
    <div className="w-fit max-w-full rounded-[1.25rem] rounded-bl-md bg-[#F2F3F5] px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm dark:bg-[#333333]">
      <p className="font-semibold">
        {t.courses.textChatScore}: {result.overall_score}
      </p>
      {result.strengths.length > 0 ? (
        <p className="mt-2">
          <span className="font-medium">{t.courses.textChatStrengths}: </span>
          {result.strengths.slice(0, 2).join(" ")}
        </p>
      ) : null}
      {result.improvements.length > 0 ? (
        <p className="mt-1">
          <span className="font-medium">{t.courses.textChatImprovements}: </span>
          {result.improvements.slice(0, 2).join(" ")}
        </p>
      ) : null}
      {result.recommended_answer ? (
        <p className="mt-2 text-muted-foreground">
          <span className="font-medium text-foreground">
            {t.courses.textChatRecommended}:{" "}
          </span>
          {result.recommended_answer}
        </p>
      ) : null}
    </div>
  );
}
