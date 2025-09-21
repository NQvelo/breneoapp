import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import AuthPage from "./pages/AuthPage";
import InterestsPage from "./pages/InterestsPage";
import SkillTestPage from "./pages/SkillTestPage";
import SkillPathPage from "./pages/SkillPathPage";
import JobsPage from "./pages/JobsPage";
import CoursesPage from "./pages/CoursesPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import AcademyDashboard from "./pages/AcademyDashboard";
import AcademyPage from "./pages/AcademyPage";
import NotFound from "./pages/NotFound";
import EmailConfirmed from "./pages/EmailConfirmed";
import LoginPage from "./pages/LoginPage";

import ResetPasswordPage from "./pages/ResetPasswordPage";
import { Settings } from "lucide-react";
import UserSettings from "./pages/UserSettings";
import AcademyProfilePage from "./pages/AcademyProfilePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* <BrowserRouter> */}
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<AuthPage />} />
          <Route path="/auth" element={<Navigate to="/auth/login" replace />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/email-confirmed" element={<EmailConfirmed />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interests"
            element={
              <ProtectedRoute>
                <InterestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/skill-test"
            element={
              <ProtectedRoute>
                <SkillTestPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/skill-path"
            element={
              <ProtectedRoute>
                <SkillPathPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <ProtectedRoute>
                <JobsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <CoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <UserSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academy/:academySlug"
            element={
              <ProtectedRoute>
                <AcademyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/academy/profile"
            element={
              <ProtectedRoute>
                <AcademyProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* </BrowserRouter> */}
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
