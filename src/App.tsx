/**
 * Main App Component
 *
 * Root component that sets up providers and routing
 * Uses the organized route structure from routes/AppRoutes.tsx
 */

import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { PwaPullToRefresh } from "@/components/common/PwaPullToRefresh";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { FontSizeProvider } from "./contexts/FontSizeContext";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { AppRoutes } from "./routes/AppRoutes";

const queryClient = new QueryClient();

function AppShell() {
  return (
    <>
      <PwaPullToRefresh />
      <AppRoutes />
    </>
  );
}

/**
 * App Component
 *
 * Wraps the application with necessary providers:
 * - QueryClientProvider: React Query for data fetching
 * - TooltipProvider: Tooltip context
 * - BrowserRouter: React Router for navigation
 * - AuthProvider: Authentication context
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster position="top-right" richColors closeButton />
      <BrowserRouter>
        <FontSizeProvider>
          <LanguageProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <AppShell />
              </SubscriptionProvider>
            </AuthProvider>
          </LanguageProvider>
        </FontSizeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
