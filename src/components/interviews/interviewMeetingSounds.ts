let sharedCtx: AudioContext | null = null;
let meetingSoundsEnabled = true;

export function setMeetingSoundsEnabled(enabled: boolean) {
  meetingSoundsEnabled = enabled;
}

export function isMeetingSoundsEnabled(): boolean {
  return meetingSoundsEnabled;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx) sharedCtx = new Ctx();
  if (sharedCtx.state === "suspended") {
    void sharedCtx.resume().catch(() => undefined);
  }
  return sharedCtx;
}

function playTone(
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  if (!meetingSoundsEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** Soft chime when the user joins the call (Google Meet–style). */
export function playYouJoinedSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(523.25, t, 0.35, 0.12);
  playTone(659.25, t + 0.12, 0.45, 0.1);
}

/** Two-note chime when another participant joins. */
export function playParticipantJoinedSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(440, t, 0.2, 0.1);
  playTone(554.37, t + 0.08, 0.25, 0.09);
  playTone(659.25, t + 0.16, 0.35, 0.08);
}

/** Subtle tick during waiting countdown. */
export function playWaitingTickSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  playTone(320, t, 0.08, 0.04, "triangle");
}

/** Gentle rising whoosh when the meeting room opens. */
export function playEnterMeetingSound() {
  if (!meetingSoundsEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(420, t + 0.35);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.45);
}

export const INTERVIEWER_JOIN_DELAY_MS = 5000;
