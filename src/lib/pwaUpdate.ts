import { registerSW } from "virtual:pwa-register";
import { isPwaInstalled } from "./pwaInstall";

type PwaUpdateListener = () => void;

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

let initialized = false;
let updateAvailable = false;
let applyUpdateFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
const listeners = new Set<PwaUpdateListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function scheduleUpdateChecks(
  registration: ServiceWorkerRegistration | undefined,
) {
  if (!registration) return;

  const checkForUpdate = () => {
    void registration.update().catch((error) => {
      console.warn("[pwaUpdate] Update check failed:", error);
    });
  };

  window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkForUpdate();
    }
  });
}

export function initPwaUpdate(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateAvailable = true;
      applyUpdateFn = updateSW;
      notifyListeners();
    },
    onRegisteredSW(_swScriptUrl, registration) {
      scheduleUpdateChecks(registration);
    },
    onRegisterError(error) {
      console.warn("[pwaUpdate] Service worker registration failed:", error);
    },
  });
}

export function isPwaUpdateAvailable(): boolean {
  return isPwaInstalled() && updateAvailable;
}

export function applyPwaUpdate(): Promise<void> {
  if (!applyUpdateFn) return Promise.resolve();
  return applyUpdateFn(true);
}

export function subscribePwaUpdate(listener: PwaUpdateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
