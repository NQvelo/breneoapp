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

import React from "react";
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
import SavedPage from "@/pages/user/SavedPage";
import UserSettings from "@/pages/user/UserSettings";
import JobsPage from "@/pages/user/JobsPage";
import JobSearchResultsPage from "@/pages/user/JobSearchResultsPage";
import JobDetailPage from "@/pages/user/JobDetailPage";
import CompanyJobsPage from "@/pages/user/CompanyJobsPage";
import CoursesPage from "@/pages/CoursesPage";
import CoursePage from "@/pages/CoursePage";
import SkillTestPage from "@/pages/user/SkillTestPage";
import SkillPathPage from "@/pages/user/SkillPathPage";
import SkillPathDetailPage from "@/pages/user/SkillPathDetailPage";
import InterestsPage from "@/pages/user/InterestsPage";
import UserNotificationsPage from "@/pages/NotificationsPage";

// Academy pages (Academy-only)
import AcademyDashboard from "@/pages/academy/AcademyDashboard";
import AcademyHomePage from "@/pages/academy/AcademyHomePage";
import AcademyCoursesPage from "@/pages/academy/AcademyCoursesPage";
import AcademyProfile from "@/pages/academy/AcademyProfilePage";
import AcademySettings from "@/pages/academy/AcademySettings";
import AcademyPage from "@/pages/academy/AcademyPage";
import AcademyRegistrationPage from "@/pages/academy/AcademyRegistrationPage";
import AddCoursePage from "@/pages/academy/AddCoursePage";

// Common pages (Available to all authenticated users)
import TermsOfUse from "@/pages/TermsOfUse";
import HelpCenter from "@/pages/HelpCenter";
import SubscriptionPage from "@/pages/SubscriptionPage";
import NotFound from "@/pages/NotFound";
import WebinarsPage from "@/pages/user/WebinarsPage";
import PaymentSuccessPage from "@/pages/PaymentSuccessPage";
import PaymentFailurePage from "@/pages/PaymentFailurePage";

/**
 * Helper component to create routes with language prefixes
 */
const createLocalizedRoute = (path: string, element: React.ReactElement) => {
  // Auth routes don't get language prefix
  if (path.startsWith("/auth") || path === "/") {
    return <Route key={path} path={path} element={element} />;
  }

  // For other routes, create both /en and /ka versions
  return (
    <React.Fragment key={path}>
      <Route path={`/en${path}`} element={element} />
      <Route path={`/ka${path}`} element={element} />
      <Route path={path} element={element} />
    </React.Fragment>
  );
};

/**
 * Main application routes component
 * Routes are completely separated by role to prevent mixing
 * Supports language prefixes: /en and /ka
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
      {createLocalizedRoute(
        "/home",
        <ProtectedRoute requiredRole="user">
          <UserDashboard />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/dashboard",
        <ProtectedRoute requiredRole="user">
          <UserDashboard />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/profile",
        <ProtectedRoute requiredRole="user">
          <UserProfile />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/saved",
        <ProtectedRoute requiredRole="user">
          <SavedPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/settings",
        <ProtectedRoute requiredRole="user">
          <UserSettings />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/notifications",
        <ProtectedRoute requiredRole="user">
          <UserNotificationsPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/interests",
        <ProtectedRoute requiredRole="user">
          <InterestsPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/skill-test",
        <ProtectedRoute requiredRole="user">
          <SkillTestPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/skill-path/:skillName",
        <ProtectedRoute requiredRole="user">
          <SkillPathDetailPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/skill-path",
        <ProtectedRoute requiredRole="user">
          <SkillPathPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/jobs",
        <ProtectedRoute requiredRole="user">
          <JobsPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/jobs/search",
        <ProtectedRoute requiredRole="user">
          <JobSearchResultsPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/jobs/:jobId",
        <ProtectedRoute requiredRole="user">
          <JobDetailPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/jobs/company/:companyName",
        <ProtectedRoute requiredRole="user">
          <CompanyJobsPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/courses",
        <ProtectedRoute requiredRole="user">
          <CoursesPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/course/:courseId",
        <ProtectedRoute requiredRole="user">
          <CoursePage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/webinars",
        <ProtectedRoute requiredRole="user">
          <WebinarsPage />
        </ProtectedRoute>
      )}

      {/* ==========================================
          ACADEMY-ONLY ROUTES - Require role "academy"
          ========================================== */}
      <Route path="/academy/register" element={<AcademyRegistrationPage />} />
      {createLocalizedRoute(
        "/academy/home",
        <ProtectedRoute requiredRole="academy">
          <AcademyHomePage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/academy/dashboard",
        <ProtectedRoute requiredRole="academy">
          <AcademyHomePage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/academy/courses",
        <ProtectedRoute requiredRole="academy">
          <AcademyCoursesPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/academy/profile",
        <ProtectedRoute requiredRole="academy">
          <AcademyProfile />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/academy/settings",
        <ProtectedRoute requiredRole="academy">
          <AcademySettings />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/academy/courses/add",
        <ProtectedRoute requiredRole="academy">
          <AddCoursePage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/academy/courses/edit/:courseId",
        <ProtectedRoute requiredRole="academy">
          <AddCoursePage />
        </ProtectedRoute>
      )}

      {/* ==========================================
          COMMON ROUTES - Available to all authenticated users
          ========================================== */}
      {/* Academy public view page - accessible to all authenticated users
          Accepts academy_id (UUID) or slug as parameter
          Displays academy profile and courses from Supabase */}
      {createLocalizedRoute(
        "/academy/:academySlug",
        <ProtectedRoute>
          <AcademyPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/terms-of-use",
        <ProtectedRoute>
          <TermsOfUse />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/help",
        <ProtectedRoute>
          <HelpCenter />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/subscription",
        <ProtectedRoute>
          <SubscriptionPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/success",
        <ProtectedRoute>
          <PaymentSuccessPage />
        </ProtectedRoute>
      )}
      {createLocalizedRoute(
        "/failure",
        <ProtectedRoute>
          <PaymentFailurePage />
        </ProtectedRoute>
      )}

      {/* ==========================================
          404 - Not Found
          ========================================== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
