import { registerSW } from "virtual:pwa-register";
import { isAppVersionNewer } from "./appVersion";
import { isPwaInstalled } from "./pwaInstall";

type PwaUpdateListener = () => void;

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

let initialized = false;
let serviceWorkerUpdateAvailable = false;
let remoteVersionAvailable: string | null = null;
let applyUpdateFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let swRegistration: ServiceWorkerRegistration | undefined;
const listeners = new Set<PwaUpdateListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function scheduleUpdateChecks(
  registration: ServiceWorkerRegistration | undefined,
) {
  if (!registration) return;

  swRegistration = registration;

  const checkForUpdate = () => {
    void registration.update().catch((error) => {
      console.warn("[pwaUpdate] Update check failed:", error);
    });
    void checkRemoteAppVersion();
  };

  window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkForUpdate();
    }
  });

  void checkRemoteAppVersion();
}

export async function checkRemoteAppVersion(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const response = await fetch(`/version.json?_=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return;

    const payload = (await response.json()) as { version?: string };
    const remoteVersion = payload.version?.trim();
    if (!remoteVersion || !isAppVersionNewer(remoteVersion)) {
      return;
    }

    remoteVersionAvailable = remoteVersion;
    notifyListeners();

    if (swRegistration) {
      await swRegistration.update().catch((error) => {
        console.warn("[pwaUpdate] Service worker refresh failed:", error);
      });
    }
  } catch (error) {
    console.warn("[pwaUpdate] Remote version check failed:", error);
  }
}

export function initPwaUpdate(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      serviceWorkerUpdateAvailable = true;
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
  return (
    isPwaInstalled() &&
    (serviceWorkerUpdateAvailable || remoteVersionAvailable !== null)
  );
}

export function getRemoteAppVersion(): string | null {
  return remoteVersionAvailable;
}

async function reloadAfterServiceWorkerActivation(): Promise<void> {
  await new Promise<void>((resolve) => {
    if (!navigator.serviceWorker.controller) {
      resolve();
      return;
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
      once: true,
    });
  });

  window.location.reload();
}

export async function applyPwaUpdate(): Promise<void> {
  if (applyUpdateFn && serviceWorkerUpdateAvailable) {
    await applyUpdateFn(true);
    return;
  }

  if ("serviceWorker" in navigator) {
    const registration =
      swRegistration ?? (await navigator.serviceWorker.getRegistration());

    if (registration) {
      await registration.update().catch((error) => {
        console.warn("[pwaUpdate] Update apply failed:", error);
      });

      const waitingWorker = registration.waiting;
      if (waitingWorker) {
        waitingWorker.postMessage({ type: "SKIP_WAITING" });
        await reloadAfterServiceWorkerActivation();
        return;
      }
    }
  }

  window.location.reload();
}

export function subscribePwaUpdate(listener: PwaUpdateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
