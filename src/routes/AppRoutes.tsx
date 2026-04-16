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

import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth pages (Public)
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const SignupPage = lazy(() => import("@/pages/auth/AuthPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const EmailVerification = lazy(() => import("@/pages/auth/EmailVerification"));
const EmailConfirmed = lazy(() => import("@/pages/auth/EmailConfirmed"));

// User pages (User-only)
const UserDashboard = lazy(() => import("@/pages/user/UserHome"));
const UserProfile = lazy(() => import("@/pages/user/ProfilePage"));
const SavedPage = lazy(() => import("@/pages/user/SavedPage"));
const UserSettings = lazy(() => import("@/pages/user/UserSettings"));
const JobsPage = lazy(() => import("@/pages/user/JobsPage"));
const JobSearchResultsPage = lazy(() => import("@/pages/user/JobSearchResultsPage"));
const JobDetailPage = lazy(() => import("@/pages/user/JobDetailPage"));
const CompanyJobsPage = lazy(() => import("@/pages/user/CompanyJobsPage"));
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const CoursePage = lazy(() => import("@/pages/CoursePage"));
const SkillTestPage = lazy(() => import("@/pages/user/SkillTestPage"));
const SkillPathPage = lazy(() => import("@/pages/user/SkillPathPage"));
const SkillPathDetailPage = lazy(() => import("@/pages/user/SkillPathDetailPage"));
const InterestsPage = lazy(() => import("@/pages/user/InterestsPage"));
const UserNotificationsPage = lazy(() => import("@/pages/NotificationsPage"));

// Academy pages (Academy-only)
const AcademyHomePage = lazy(() => import("@/pages/academy/AcademyHomePage"));
const AcademyCoursesPage = lazy(() => import("@/pages/academy/AcademyCoursesPage"));
const AcademyProfile = lazy(() => import("@/pages/academy/AcademyProfilePage"));
const AcademySettings = lazy(() => import("@/pages/academy/AcademySettings"));
const AcademyPage = lazy(() => import("@/pages/academy/AcademyPage"));
const AcademyRegistrationPage = lazy(() => import("@/pages/academy/AcademyRegistrationPage"));
const AddCoursePage = lazy(() => import("@/pages/academy/AddCoursePage"));
const EmployerRegistrationPage = lazy(() => import("@/pages/employer/EmployerRegistrationPage"));
const EmployerDashboardPage = lazy(() => import("@/pages/employer/EmployerDashboardPage"));
const EmployerJobsPage = lazy(() => import("@/pages/employer/EmployerJobsPage"));
const EmployerAddJobPage = lazy(() => import("@/pages/employer/EmployerAddJobPage"));
const EmployerProfilePage = lazy(() => import("@/pages/employer/EmployerProfilePage"));
const EmployerMembersPage = lazy(() => import("@/pages/employer/EmployerMembersPage"));

// Common pages (Available to all authenticated users)
const TermsOfUse = lazy(() => import("@/pages/TermsOfUse"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const WebinarsPage = lazy(() => import("@/pages/user/WebinarsPage"));
const PaymentSuccessPage = lazy(() => import("@/pages/PaymentSuccessPage"));
const PaymentFailurePage = lazy(() => import("@/pages/PaymentFailurePage"));

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
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
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
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/dashboard",
        <ProtectedRoute requiredRole="user">
          <UserDashboard />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/profile",
        <ProtectedRoute requiredRole="user">
          <UserProfile />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/saved",
        <ProtectedRoute requiredRole="user">
          <SavedPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/settings",
        <ProtectedRoute requiredRole="user">
          <UserSettings />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/notifications",
        <ProtectedRoute requiredRole="user">
          <UserNotificationsPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/interests",
        <ProtectedRoute requiredRole="user">
          <InterestsPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/skill-test",
        <ProtectedRoute requiredRole="user">
          <SkillTestPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/skill-path/:skillName",
        <ProtectedRoute requiredRole="user">
          <SkillPathDetailPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/skill-path",
        <ProtectedRoute requiredRole="user">
          <SkillPathPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/jobs",
        <ProtectedRoute requiredRole="user">
          <JobsPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/jobs/search",
        <ProtectedRoute requiredRole="user">
          <JobSearchResultsPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/jobs/:jobId",
        <ProtectedRoute requiredRole="user">
          <JobDetailPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/jobs/company/:companyName",
        <ProtectedRoute requiredRole="user">
          <CompanyJobsPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/courses",
        <ProtectedRoute requiredRole="user">
          <CoursesPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/course/:courseId",
        <ProtectedRoute requiredRole="user">
          <CoursePage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/webinars",
        <ProtectedRoute requiredRole="user">
          <WebinarsPage />
        </ProtectedRoute>,
      )}

      {/* ==========================================
          ACADEMY-ONLY ROUTES - Require role "academy"
          ========================================== */}
      <Route path="/academy/register" element={<AcademyRegistrationPage />} />
      <Route path="/employer/register" element={<EmployerRegistrationPage />} />
      {createLocalizedRoute(
        "/employer/dashboard",
        <ProtectedRoute requiredRole="employer">
          <EmployerDashboardPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/employer/home",
        <ProtectedRoute requiredRole="employer">
          <EmployerDashboardPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/employer/jobs",
        <ProtectedRoute requiredRole="employer">
          <EmployerJobsPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/employer/jobs/add",
        <ProtectedRoute requiredRole="employer">
          <EmployerAddJobPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/employer/jobs/edit/:jobId",
        <ProtectedRoute requiredRole="employer">
          <EmployerAddJobPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/employer/profile",
        <ProtectedRoute requiredRole="employer">
          <EmployerProfilePage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/employer/members",
        <ProtectedRoute requiredRole="employer">
          <EmployerMembersPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/employer/settings",
        <ProtectedRoute requiredRole="employer">
          <UserSettings />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/academy/home",
        <ProtectedRoute requiredRole="academy">
          <AcademyHomePage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/academy/dashboard",
        <ProtectedRoute requiredRole="academy">
          <AcademyHomePage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/academy/courses",
        <ProtectedRoute requiredRole="academy">
          <AcademyCoursesPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/academy/profile",
        <ProtectedRoute requiredRole="academy">
          <AcademyProfile />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/academy/settings",
        <ProtectedRoute requiredRole="academy">
          <AcademySettings />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/academy/courses/add",
        <ProtectedRoute requiredRole="academy">
          <AddCoursePage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/academy/courses/edit/:courseId",
        <ProtectedRoute requiredRole="academy">
          <AddCoursePage />
        </ProtectedRoute>,
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
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/terms-of-use",
        <ProtectedRoute>
          <TermsOfUse />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/help",
        <ProtectedRoute>
          <HelpCenter />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/success",
        <ProtectedRoute>
          <PaymentSuccessPage />
        </ProtectedRoute>,
      )}
      {createLocalizedRoute(
        "/failure",
        <ProtectedRoute>
          <PaymentFailurePage />
        </ProtectedRoute>,
      )}

      {/* ==========================================
          404 - Not Found
          ========================================== */}
      <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};
