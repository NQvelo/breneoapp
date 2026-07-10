import type { InterviewPlaybackItem } from "@/api/interview/types";

let activeAudio: HTMLAudioElement | null = null;
let interviewAudioMuted = false;
let activeAudioReject: ((error: Error) => void) | null = null;

export function stopActiveAudio(): void {
  if (!activeAudio) return;
  const audio = activeAudio;
  const reject = activeAudioReject;
  activeAudio = null;
  activeAudioReject = null;
  audio.pause();
  audio.removeAttribute("src");
  reject?.(new Error("Audio stopped"));
}

export function setInterviewAudioMuted(muted: boolean): void {
  interviewAudioMuted = muted;
  if (activeAudio) {
    activeAudio.volume = muted ? 0 : 1;
  }
}

export function isInterviewAudioMuted(): boolean {
  return interviewAudioMuted;
}

export function isAutoplayBlockedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: string }).name) : "";
  return name === "NotAllowedError";
}

/** Play a single MP3 URL; resolves when playback ends. */
export function playAudioUrl(
  url: string,
  options?: { volume?: number },
): Promise<void> {
  return new Promise((resolve, reject) => {
    stopActiveAudio();
    const audio = new Audio(url);
    activeAudio = audio;
    audio.volume = interviewAudioMuted ? 0 : (options?.volume ?? 1);

    const cleanup = () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      if (activeAudio === audio) activeAudio = null;
      if (activeAudioReject === rejectPlayback) activeAudioReject = null;
    };

    const rejectPlayback = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onEnded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      rejectPlayback(new Error(`Audio failed: ${url}`));
    };

    activeAudioReject = rejectPlayback;

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch((err) => {
        rejectPlayback(err instanceof Error ? err : new Error("Audio play failed"));
      });
    }
  });
}

/** Play MP3 URLs in order; optional callback when each segment starts. */
export async function playPlaybackSequence(
  items: InterviewPlaybackItem[],
  onSegmentStart?: (item: InterviewPlaybackItem, index: number) => void,
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onSegmentStart?.(item, i);
    if (!item.audio_url) continue;
    await playAudioUrl(item.audio_url);
  }
}
