import { useEffect, useRef, useState } from "react";
import type { InterviewQuestion } from "@/api/interview/types";

export function useInterviewQuestionAudio(
  question: InterviewQuestion | null,
  onFinished: () => void,
  enabled: boolean,
  soundEnabled = true,
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onFinishedRef = useRef(onFinished);
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  onFinishedRef.current = onFinished;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = soundEnabled ? 1 : 0;
    audio.muted = !soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (!enabled || !question) return;

    const audio = new Audio();
    audioRef.current = audio;

    setNeedsManualPlay(false);
    setIsPlaying(false);
    setAudioError(null);

    if (!question.question_audio_url) {
      return () => {
        audio.pause();
        audioRef.current = null;
      };
    }

    audio.src = question.question_audio_url;
    audio.preload = "auto";
    audio.volume = soundEnabled ? 1 : 0;
    audio.muted = !soundEnabled;

    const handleEnded = () => {
      setIsPlaying(false);
      onFinishedRef.current();
    };

    const handleError = () => {
      setIsPlaying(false);
      setAudioError("აუდიო ვერ ჩაიტვირთა.");
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
      audioRef.current = null;
    };
  }, [enabled, question?.id, question?.question_audio_url, soundEnabled]);

  const playAudio = async () => {
    const audio = audioRef.current;
    if (!audio || !question?.question_audio_url) {
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
      setAudioError("ავტომატური დაკვრა ვერ მოხერხდა.");
    }
  };

  const skipWithoutAudio = () => {
    audioRef.current?.pause();
    onFinishedRef.current();
  };

  return {
    isPlaying,
    needsManualPlay,
    audioError,
    playAudio,
    skipWithoutAudio,
    hasAudio: Boolean(question?.question_audio_url),
  };
}
