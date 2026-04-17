import React from "react";
import { ThemeProvider } from "next-themes";
import App from "./App";

function isIosWebKitBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webKit = /WebKit/i.test(ua);
  const excluded = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return iOS && webKit && !excluded;
}

type PostHogProviderProps = {
  apiKey: string;
  options?: Record<string, unknown>;
  children: React.ReactNode;
};

const LazyPostHogProvider = React.lazy(async () => {
  const module = await import("posthog-js/react");
  return {
    default: module.PostHogProvider as React.ComponentType<PostHogProviderProps>,
  };
});

const appTree = (
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem={true}
    disableTransitionOnChange
  >
    <div suppressHydrationWarning>
      <App />
    </div>
  </ThemeProvider>
);

export function RootApp() {
  const [shouldLoadPostHog, setShouldLoadPostHog] = React.useState(false);
  const shouldUsePostHog = !isIosWebKitBrowser();

  React.useEffect(() => {
    if (!shouldUsePostHog) return;

    const loadPostHog = () => setShouldLoadPostHog(true);
    const g = globalThis as typeof globalThis & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout?: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
      setTimeout: (callback: () => void, ms?: number) => number;
      clearTimeout: (id: number) => void;
    };

    const scheduler =
      typeof g.requestIdleCallback === "function"
        ? g.requestIdleCallback(loadPostHog, { timeout: 1200 })
        : g.setTimeout(loadPostHog, 400);

    return () => {
      if (typeof g.cancelIdleCallback === "function") {
        g.cancelIdleCallback(scheduler);
      } else {
        g.clearTimeout(scheduler);
      }
    };
  }, [shouldUsePostHog]);

  if (!shouldUsePostHog || !shouldLoadPostHog) {
    return appTree;
  }

  return (
    <React.Suspense fallback={appTree}>
      <LazyPostHogProvider
        apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
        options={{
          api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
          defaults: "2025-05-24",
          capture_exceptions: true,
          debug: import.meta.env.MODE === "development",
        }}
      >
        {appTree}
      </LazyPostHogProvider>
    </React.Suspense>
  );
}
