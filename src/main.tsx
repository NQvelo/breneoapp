import React from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { PostHogProvider } from "posthog-js/react";
import App from "./App";
import "./index.css";

function isIosWebKitBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webKit = /WebKit/i.test(ua);
  const excluded = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return iOS && webKit && !excluded;
}

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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isIosWebKitBrowser() ? (
      appTree
    ) : (
      <PostHogProvider
        apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
        options={{
          api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
          defaults: "2025-05-24",
          capture_exceptions: true,
          debug: import.meta.env.MODE === "development",
        }}
      >
        {appTree}
      </PostHogProvider>
    )}
  </React.StrictMode>
);