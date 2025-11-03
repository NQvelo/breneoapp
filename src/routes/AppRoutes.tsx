/**
 * Application Routes
 *
 * Main routing configuration for the application
 * Handles role-based routing with complete separation between user and academy routes
 *
 * Route Structure:
 * - Public routes: Available to everyone (login, signup, etc.)
 * - User routes: Only accessible to users with role "user"
 * - Academy routes: Only accessible to users with role "academy"
 * - Common routes: Available to all authenticated users (terms, help)
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth pages (Public)
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/AuthPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import EmailVerification from "@/pages/auth/EmailVerification";
import EmailConfirmed from "@/pages/auth/EmailConfirmed";

// User pages (User-only)
import UserDashboard from "@/pages/user/UserHome";
import UserProfile from "@/pages/user/ProfilePage";
import UserSettings from "@/pages/user/UserSettings";
import JobsPage from "@/pages/user/JobsPage";
import CoursesPage from "@/pages/CoursesPage";
import CoursePage from "@/pages/CoursePage";
import SkillTestPage from "@/pages/user/SkillTestPage";
import SkillPathPage from "@/pages/user/SkillPathPage";
import InterestsPage from "@/pages/user/InterestsPage";
import UserNotificationsPage from "@/pages/NotificationsPage";

// Academy pages (Academy-only)
import AcademyDashboard from "@/pages/academy/AcademyDashboard";
import AcademyProfile from "@/pages/academy/AcademyProfilePage";
import AcademySettings from "@/pages/academy/AcademySettings";
import AcademyPage from "@/pages/academy/AcademyPage";
import AcademyRegistrationPage from "@/pages/academy/AcademyRegistrationPage";

// Common pages (Available to all authenticated users)
import TermsOfUse from "@/pages/TermsOfUse";
import HelpCenter from "@/pages/HelpCenter";
import NotFound from "@/pages/NotFound";

/**
 * Main application routes component
 * Routes are completely separated by role to prevent mixing
 */
export const AppRoutes = () => {
  return (
    <Routes>
      {/* ==========================================
          PUBLIC ROUTES - No authentication required
          ========================================== */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/signup" element={<SignupPage />} />
      <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
      <Route path="/email-verification" element={<EmailVerification />} />
      <Route path="/email-confirmed" element={<EmailConfirmed />} />
      <Route path="/auth" element={<Navigate to="/auth/login" replace />} />

      {/* ==========================================
          USER-ONLY ROUTES - Require role "user"
          ========================================== */}
      <Route
        path="/home"
        element={
          <ProtectedRoute requiredRole="user">
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="user">
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute requiredRole="user">
            <UserProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredRole="user">
            <UserSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute requiredRole="user">
            <UserNotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interests"
        element={
          <ProtectedRoute requiredRole="user">
            <InterestsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/skill-test"
        element={
          <ProtectedRoute requiredRole="user">
            <SkillTestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/skill-path"
        element={
          <ProtectedRoute requiredRole="user">
            <SkillPathPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute requiredRole="user">
            <JobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute requiredRole="user">
            <CoursesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/course/:courseId"
        element={
          <ProtectedRoute requiredRole="user">
            <CoursePage />
          </ProtectedRoute>
        }
      />

      {/* ==========================================
          ACADEMY-ONLY ROUTES - Require role "academy"
          ========================================== */}
      <Route path="/academy/register" element={<AcademyRegistrationPage />} />
      <Route
        path="/academy/home"
        element={
          <ProtectedRoute requiredRole="academy">
            <AcademyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/academy/dashboard"
        element={
          <ProtectedRoute requiredRole="academy">
            <AcademyDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/academy/profile"
        element={
          <ProtectedRoute requiredRole="academy">
            <AcademyProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/academy/settings"
        element={
          <ProtectedRoute requiredRole="academy">
            <AcademySettings />
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

      {/* ==========================================
          COMMON ROUTES - Available to all authenticated users
          ========================================== */}
      <Route
        path="/terms-of-use"
        element={
          <ProtectedRoute>
            <TermsOfUse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <HelpCenter />
          </ProtectedRoute>
        }
      />

      {/* ==========================================
          404 - Not Found
          ========================================== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
