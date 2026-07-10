export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export type PwaInstallResult =
  | "accepted"
  | "dismissed"
  | "redirected"
  | "ios-share"
  | "unavailable"
  | "already-installed";

type PwaInstallListener = () => void;

const PWA_INSTALL_QUERY = "pwaInstall";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let initialized = false;
const listeners = new Set<PwaInstallListener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    isIosDevice() &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|FxiOS/i.test(ua)
  );
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";

  if (
    /FBAN|FBAV|Instagram|Twitter|LinkedInApp|TikTok|Snapchat|Line\//i.test(ua)
  ) {
    return true;
  }

  if (isIosDevice() && !isIosSafari() && /AppleWebKit/i.test(ua)) {
    return true;
  }

  if (isAndroidDevice() && /; wv\)|WebView/i.test(ua)) {
    return true;
  }

  return false;
}

export function isPwaInstalled(): boolean {
  if (typeof window === "undefined") return false;

  return (
    installed ||
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as NavigatorStandalone).standalone === true
  );
}

export function canInstallPwa(): boolean {
  return Boolean(deferredPrompt) || isInAppBrowser() || isIosSafari();
}

export function subscribePwaInstall(listener: PwaInstallListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function ensureServiceWorkerReady(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.ready;
  } catch (error) {
    console.warn("[pwaInstall] Service worker not ready:", error);
  }
}

function waitForDeferredPrompt(
  timeoutMs = 8000,
): Promise<BeforeInstallPromptEvent | null> {
  if (deferredPrompt) {
    return Promise.resolve(deferredPrompt);
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      resolve(deferredPrompt);
    }, timeoutMs);

    const unsubscribe = subscribePwaInstall(() => {
      if (deferredPrompt) {
        window.clearTimeout(timeoutId);
        unsubscribe();
        resolve(deferredPrompt);
      }
    });
  });
}

function buildInstallReturnUrl(): string {
  const url = new URL(window.location.href);
  url.searchParams.set(PWA_INSTALL_QUERY, "1");
  return url.toString();
}

function redirectToInstallCapableBrowser(): void {
  const targetUrl = buildInstallReturnUrl();

  if (isAndroidDevice()) {
    const path = targetUrl.replace(/^https?:\/\//, "");
    window.location.href = `intent://${path}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }

  if (isIosDevice()) {
    window.location.href = targetUrl.replace(/^https:\/\//, "x-safari-https://");
    return;
  }

  window.location.href = targetUrl;
}

async function promptNativeInstall(
  prompt: BeforeInstallPromptEvent,
): Promise<PwaInstallResult> {
  try {
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    deferredPrompt = null;
    notifyListeners();

    if (outcome === "accepted") {
      installed = true;
      notifyListeners();
      return "accepted";
    }

    return "dismissed";
  } catch (error) {
    console.error("[pwaInstall] Install prompt failed:", error);
    deferredPrompt = null;
    notifyListeners();
    return "unavailable";
  }
}

async function openIosShareSheet(): Promise<PwaInstallResult> {
  if (!navigator.share) {
    return "unavailable";
  }

  try {
    await navigator.share({
      title: document.title || "Breneo",
      text: "Install Breneo",
      url: window.location.href,
    });
    return "ios-share";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "dismissed";
    }
    console.error("[pwaInstall] iOS share sheet failed:", error);
    return "unavailable";
  }
}

function clearInstallQueryParam(): void {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(PWA_INSTALL_QUERY)) return;

  params.delete(PWA_INSTALL_QUERY);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
}

export function initPwaInstall(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (isPwaInstalled()) {
    installed = true;
    return;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    notifyListeners();
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get(PWA_INSTALL_QUERY) === "1") {
    clearInstallQueryParam();
    void (async () => {
      await ensureServiceWorkerReady();
      await installPwa({ fromRedirect: true });
    })();
  }
}

export async function installPwa(options?: {
  fromRedirect?: boolean;
}): Promise<PwaInstallResult> {
  if (isPwaInstalled()) {
    return "already-installed";
  }

  await ensureServiceWorkerReady();

  if (!options?.fromRedirect && isInAppBrowser()) {
    redirectToInstallCapableBrowser();
    return "redirected";
  }

  const prompt = await waitForDeferredPrompt(options?.fromRedirect ? 10000 : 8000);

  if (prompt) {
    return promptNativeInstall(prompt);
  }

  if (isIosSafari()) {
    return openIosShareSheet();
  }

  return "unavailable";
}
