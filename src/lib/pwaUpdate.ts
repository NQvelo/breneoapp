import { isAppVersionNewer } from "./appVersion";
import { isPwaInstalled } from "./pwaInstall";

type PwaUpdateListener = () => void;

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const SERVICE_WORKER_TIMEOUT_MS = 20_000;
const APP_SERVICE_WORKER_URL = "/sw.js";
const APP_SERVICE_WORKER_SCOPE = "/";

let serviceWorkerUpdateAvailable = false;
let remoteVersionAvailable: string | null = null;
let swRegistration: ServiceWorkerRegistration | undefined;
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null =
  null;
let reloadScheduled = false;
const listeners = new Set<PwaUpdateListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function isAppServiceWorkerUrl(scriptUrl: string): boolean {
  try {
    return new URL(scriptUrl, window.location.origin).pathname.endsWith(
      "/sw.js",
    );
  } catch {
    return scriptUrl.includes("/sw.js");
  }
}

function noteWaitingWorker(registration: ServiceWorkerRegistration) {
  if (!registration.waiting || !navigator.serviceWorker.controller) return;
  serviceWorkerUpdateAvailable = true;
  notifyListeners();
}

function watchForWaitingWorker(registration: ServiceWorkerRegistration) {
  noteWaitingWorker(registration);

  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;

    worker.addEventListener("statechange", () => {
      // `installed` while another worker is controlling means the update is
      // waiting. The first install has no controller and activates on its own.
      if (
        worker.state === "installed" &&
        navigator.serviceWorker.controller
      ) {
        serviceWorkerUpdateAvailable = true;
        notifyListeners();
      }
    });
  });
}

function scheduleUpdateChecks(registration: ServiceWorkerRegistration) {
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

function waitForWorker(
  worker: ServiceWorker,
  isDone: (state: ServiceWorkerState) => boolean,
  timeoutMessage: string,
): Promise<void> {
  if (isDone(worker.state)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(timeoutMessage));
    }, SERVICE_WORKER_TIMEOUT_MS);

    const onChange = () => {
      if (worker.state === "redundant") {
        cleanup();
        reject(new Error("Service worker install failed"));
        return;
      }
      if (isDone(worker.state)) {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      worker.removeEventListener("statechange", onChange);
    };

    worker.addEventListener("statechange", onChange);
  });
}

function scheduleReloadOnce() {
  if (reloadScheduled) return;
  reloadScheduled = true;
  // Reload on a later turn. Reloading inside `controllerchange` can still be
  // served by the outgoing worker, which restarts the page on the old build.
  window.setTimeout(() => {
    window.location.reload();
  }, 50);
}

function appWorkerControls(worker: ServiceWorker): boolean {
  const controller = navigator.serviceWorker.controller;
  if (!controller) return true;
  if (controller === worker) return true;
  return (
    swRegistration?.active === worker && controller === swRegistration.active
  );
}

async function waitUntilAppWorkerControls(
  worker: ServiceWorker,
): Promise<void> {
  if (appWorkerControls(worker)) return;

  const tookControl = await new Promise<boolean>((resolve) => {
    const timer = window.setTimeout(() => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      resolve(appWorkerControls(worker));
    }, 2_000);

    const onChange = () => {
      if (!appWorkerControls(worker)) return;
      window.clearTimeout(timer);
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      resolve(true);
    };

    navigator.serviceWorker.addEventListener("controllerchange", onChange);
  });

  if (!tookControl && navigator.serviceWorker.controller) {
    throw new Error("Updated service worker did not take control");
  }
}

async function activateWorker(worker: ServiceWorker): Promise<void> {
  if (worker.state !== "activated" && worker.state !== "activating") {
    await waitForWorker(
      worker,
      (state) => state === "installed" || state === "activating" || state === "activated",
      "App update install timed out",
    );
  }

  if (worker.state === "installed") {
    worker.postMessage({ type: "SKIP_WAITING" });
  }

  await waitForWorker(
    worker,
    (state) => state === "activated",
    "App update activation timed out",
  );
  await waitUntilAppWorkerControls(worker);
  scheduleReloadOnce();
}

async function findUpdateWorker(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorker | null> {
  const ready = registration.waiting ?? registration.installing;
  if (ready) return ready;

  await registration.update().catch((error) => {
    console.warn("[pwaUpdate] Update apply failed:", error);
  });

  const afterCheck = registration.waiting ?? registration.installing;
  if (afterCheck || !remoteVersionAvailable) return afterCheck;

  return new Promise((resolve) => {
    let timer = 0;
    const onFound = () => {
      window.clearTimeout(timer);
      registration.removeEventListener("updatefound", onFound);
      resolve(registration.waiting ?? registration.installing);
    };
    timer = window.setTimeout(onFound, 4_000);
    registration.addEventListener("updatefound", onFound);
  });
}

async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (
    !import.meta.env.PROD ||
    typeof window === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return null;
  }

  const registration = await navigator.serviceWorker.register(
    APP_SERVICE_WORKER_URL,
    {
      scope: APP_SERVICE_WORKER_SCOPE,
      // Always revalidate sw.js. The default cache mode can keep a stale
      // worker for a day, so the prompt reloads and the app never changes.
      updateViaCache: "none",
    },
  );

  swRegistration = registration;
  watchForWaitingWorker(registration);
  scheduleUpdateChecks(registration);
  return registration;
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
  void getPwaServiceWorkerRegistration();
}

/** Registers the app worker and waits for that registration. */
export function getPwaServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !import.meta.env.PROD
  ) {
    return Promise.resolve(null);
  }

  if (!registrationPromise) {
    registrationPromise = registerAppServiceWorker().catch((error) => {
      console.warn("[pwaUpdate] Service worker registration failed:", error);
      registrationPromise = null;
      return null;
    });
  }

  return registrationPromise;
}

/** A newer build is waiting, for the installed app or a normal browser visit. */
export function isAppUpdateReady(): boolean {
  return serviceWorkerUpdateAvailable || remoteVersionAvailable !== null;
}

export function isPwaUpdateAvailable(): boolean {
  return isPwaInstalled() && isAppUpdateReady();
}

export function getRemoteAppVersion(): string | null {
  return remoteVersionAvailable;
}

export async function applyPwaUpdate(): Promise<void> {
  const registration =
    swRegistration ?? (await getPwaServiceWorkerRegistration());

  if (!registration) {
    window.location.reload();
    return;
  }

  const worker = await findUpdateWorker(registration);
  if (worker) {
    await activateWorker(worker);
    return;
  }

  const controller = navigator.serviceWorker.controller;
  const controlledByAppWorker = Boolean(
    controller && isAppServiceWorkerUrl(controller.scriptURL),
  );

  // The network worker is already active and the open page is an older bundle.
  // Reloading now is served by that worker. Reloading while a new worker is
  // still installing is not — that path used to restart onto the old build.
  if (controlledByAppWorker || !controller) {
    scheduleReloadOnce();
    return;
  }

  throw new Error("App update is not ready yet");
}

export function subscribePwaUpdate(listener: PwaUpdateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
