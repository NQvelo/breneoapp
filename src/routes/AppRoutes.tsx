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

import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { EmployerDashboardShell } from "@/layouts/employer/EmployerDashboardShell";
import { DashboardShell } from "@/layouts/DashboardShell";

// Auth pages (Public)
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const SignupPage = lazy(() => import("@/pages/auth/AuthPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const EmailVerification = lazy(() => import("@/pages/auth/EmailVerification"));
const EmailConfirmed = lazy(() => import("@/pages/auth/EmailConfirmed"));
const OnboardingPage = lazy(() => import("@/pages/auth/OnboardingPage"));

// User pages (User-only)
const UserDashboard = lazy(() => import("@/pages/user/UserHome"));
const UserProfile = lazy(() => import("@/pages/user/ProfilePage"));
const SavedPage = lazy(() => import("@/pages/user/SavedPage"));
const UserSettings = lazy(() => import("@/pages/user/UserSettings"));
const JobsPage = lazy(() => import("@/pages/user/JobsPage"));
const JobSearchResultsPage = lazy(
  () => import("@/pages/user/JobSearchResultsPage"),
);
const JobDetailPage = lazy(() => import("@/pages/user/JobDetailPage"));
const CompanyPage = lazy(() => import("@/pages/user/CompanyPage"));
const CoursesPage = lazy(() => import("@/pages/CoursesPage"));
const CoursePage = lazy(() => import("@/pages/CoursePage"));
const SkillTestPage = lazy(() => import("@/pages/user/SkillTestPage"));
const SkillPathPage = lazy(() => import("@/pages/user/SkillPathPage"));
const SkillPathDetailPage = lazy(
  () => import("@/pages/user/SkillPathDetailPage"),
);
const InterestsPage = lazy(() => import("@/pages/user/InterestsPage"));
const UserNotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const CvViewsPage = lazy(() => import("@/pages/user/CvViewsPage"));

// Academy pages (Academy-only)
const AcademyHomePage = lazy(() => import("@/pages/academy/AcademyHomePage"));
const AcademyCoursesPage = lazy(
  () => import("@/pages/academy/AcademyCoursesPage"),
);
const AcademyProfile = lazy(() => import("@/pages/academy/AcademyProfilePage"));
const AcademyPage = lazy(() => import("@/pages/academy/AcademyPage"));
const AcademyRegistrationPage = lazy(
  () => import("@/pages/academy/AcademyRegistrationPage"),
);
const AddCoursePage = lazy(() => import("@/pages/academy/AddCoursePage"));
const EmployerRegistrationPage = lazy(
  () => import("@/pages/employer/EmployerRegistrationPage"),
);
const EmployerDashboardPage = lazy(
  () => import("@/pages/employer/EmployerDashboardPage"),
);
const EmployerJobsPage = lazy(
  () => import("@/pages/employer/EmployerJobsPage"),
);
const EmployerAddJobPage = lazy(
  () => import("@/pages/employer/EmployerAddJobPage"),
);
const EmployerJobStatsPage = lazy(
  () => import("@/pages/employer/EmployerJobStatsPage"),
);
const AcademyCourseStatsPage = lazy(
  () => import("@/pages/academy/AcademyCourseStatsPage"),
);
const EmployerProfilePage = lazy(
  () => import("@/pages/employer/EmployerProfilePage"),
);
const EmployerMembersPage = lazy(
  () => import("@/pages/employer/EmployerMembersPage"),
);
const EmployerJoinCompanyPage = lazy(
  () => import("@/pages/employer/EmployerJoinCompanyPage"),
);
const EmployerAcceptInvitePage = lazy(
  () => import("@/pages/employer/EmployerAcceptInvitePage"),
);
const EmployerPendingApprovalPage = lazy(
  () => import("@/pages/employer/EmployerPendingApprovalPage"),
);
const EmployerNotificationsPage = lazy(
  () => import("@/pages/employer/EmployerNotificationsPage"),
);

// Common pages (Available to all authenticated users)
const TermsOfUse = lazy(() => import("@/pages/TermsOfUse"));
const HelpCenter = lazy(() => import("@/pages/HelpCenter"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const WebinarsPage = lazy(() => import("@/pages/user/WebinarsPage"));
const InterviewsPage = lazy(() => import("@/pages/user/InterviewsPage"));
const PaymentSuccessPage = lazy(() => import("@/pages/PaymentSuccessPage"));
const PaymentFailurePage = lazy(() => import("@/pages/PaymentFailurePage"));

const preloadCommonChunks = [
  () => import("@/pages/user/UserHome"),
  () => import("@/pages/user/JobsPage"),
  () => import("@/pages/CoursesPage"),
  () => import("@/pages/user/ProfilePage"),
];

const preloadEmployerChunks = [
  () => import("@/pages/employer/EmployerJobsPage"),
  () => import("@/pages/employer/EmployerAddJobPage"),
  () => import("@/pages/employer/EmployerJobStatsPage"),
  () => import("@/pages/employer/EmployerProfilePage"),
];

const preloadAcademyChunks = [
  () => import("@/pages/academy/AcademyHomePage"),
  () => import("@/pages/academy/AcademyCoursesPage"),
  () => import("@/pages/academy/AcademyCourseStatsPage"),
  () => import("@/pages/academy/AcademyProfilePage"),
];

const RouteLoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      <p className="text-sm">Loading page...</p>
    </div>
  </div>
);

/**
 * Helper to create routes with language prefixes (/en, /ka, and unprefixed).
 * Returns an array (not Fragment) so dev tooling does not attach invalid props to Fragment.
 */
const createLocalizedRoute = (
  path: string,
  element: React.ReactElement,
): React.ReactElement | React.ReactElement[] => {
  // Auth routes don't get language prefix
  if (path.startsWith("/auth") || path === "/") {
    return <Route key={path} path={path} element={element} />;
  }

  return [
    <Route key={`en${path}`} path={`/en${path}`} element={element} />,
    <Route key={`ka${path}`} path={`/ka${path}`} element={element} />,
    <Route key={path} path={path} element={element} />,
  ];
};

/** Employer dashboard pages share one layout so AppSidebar does not remount on nav. */
const createEmployerDashboardRoutes = (
  routes: Array<{ path: string; element: React.ReactElement }>,
): React.ReactElement[] => {
  const prefixes = ["", "/en", "/ka"] as const;
  return prefixes.map((prefix) => (
    <Route
      key={`employer-shell${prefix || "root"}`}
      element={<EmployerDashboardShell />}
    >
      {routes.map(({ path, element }) => (
        <Route
          key={`${prefix}${path}`}
          path={`${prefix}${path}`}
          element={element}
        />
      ))}
    </Route>
  ));
};

/** Job seeker and academy dashboard pages share one layout so the sidebar and mobile tab bar do not remount on nav. */
const createDashboardShellRoutes = (
  routes: Array<{ path: string; element: React.ReactElement }>,
): React.ReactElement[] => {
  const prefixes = ["", "/en", "/ka"] as const;
  return prefixes.map((prefix) => (
    <Route
      key={`dashboard-shell${prefix || "root"}`}
      element={<DashboardShell />}
    >
      {routes.map(({ path, element }) => (
        <Route
          key={`${prefix}${path}`}
          path={`${prefix}${path}`}
          element={element}
        />
      ))}
    </Route>
  ));
};

const userOnly = (page: React.ReactElement) => (
  <ProtectedRoute requiredRole="user">{page}</ProtectedRoute>
);

const academyOnly = (page: React.ReactElement) => (
  <ProtectedRoute requiredRole="academy">{page}</ProtectedRoute>
);

/**
 * Main application routes component
 * Routes are completely separated by role to prevent mixing
 * Supports language prefixes: /en and /ka
 */
export const AppRoutes = () => {
  const location = useLocation();

  useEffect(() => {
    const role =
      typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    const preloads =
      role === "employer"
        ? [...preloadCommonChunks, ...preloadEmployerChunks]
        : role === "academy"
          ? [...preloadCommonChunks, ...preloadAcademyChunks]
          : preloadCommonChunks;

    const runPreload = () => {
      preloads.forEach((load) => {
        void load();
      });
    };

    const w = typeof window !== "undefined" ? window : undefined;
    if (!w) return;

    if ("requestIdleCallback" in w) {
      const id = w.requestIdleCallback(runPreload, { timeout: 1500 });
      return () => w.cancelIdleCallback(id);
    }

    const timeoutId = w.setTimeout(runPreload, 300);
    return () => w.clearTimeout(timeoutId);
  }, [location.pathname]);

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* ==========================================
          PUBLIC ROUTES - No authentication required
          ========================================== */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        {createLocalizedRoute("/start", <OnboardingPage />)}
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/email-verification" element={<EmailVerification />} />
        <Route path="/email-confirmed" element={<EmailConfirmed />} />
        <Route path="/auth" element={<Navigate to="/auth/login" replace />} />

        {/* ==========================================
          USER-ONLY ROUTES - Require role "user"
          ========================================== */}
        {createDashboardShellRoutes([
          { path: "/home", element: userOnly(<UserDashboard />) },
          { path: "/dashboard", element: userOnly(<UserDashboard />) },
          { path: "/profile", element: userOnly(<UserProfile />) },
          { path: "/saved", element: userOnly(<SavedPage />) },
          { path: "/settings", element: userOnly(<UserSettings />) },
          {
            path: "/notifications",
            element: userOnly(<UserNotificationsPage />),
          },
          { path: "/cv-views", element: userOnly(<CvViewsPage />) },
          {
            path: "/skill-path/:skillName",
            element: userOnly(<SkillPathDetailPage />),
          },
          { path: "/skill-path", element: userOnly(<SkillPathPage />) },
          { path: "/jobs", element: userOnly(<JobsPage />) },
          { path: "/jobs/search", element: userOnly(<JobSearchResultsPage />) },
          {
            path: "/companies/:companyName",
            element: userOnly(<CompanyPage />),
          },
          {
            path: "/jobs/company/:companyName",
            element: userOnly(<CompanyPage />),
          },
          { path: "/jobs/:jobId", element: userOnly(<JobDetailPage />) },
          { path: "/courses", element: userOnly(<CoursesPage />) },
          { path: "/course/:courseId", element: userOnly(<CoursePage />) },
          { path: "/webinars", element: userOnly(<WebinarsPage />) },
          { path: "/academy/home", element: academyOnly(<AcademyHomePage />) },
          {
            path: "/academy/dashboard",
            element: academyOnly(<AcademyHomePage />),
          },
          {
            path: "/academy/courses",
            element: academyOnly(<AcademyCoursesPage />),
          },
          {
            path: "/academy/profile",
            element: academyOnly(<AcademyProfile />),
          },
          {
            path: "/academy/settings",
            element: academyOnly(<UserSettings />),
          },
          {
            path: "/academy/courses/add",
            element: academyOnly(<AddCoursePage />),
          },
          {
            path: "/academy/courses/edit/:courseId",
            element: academyOnly(<AddCoursePage />),
          },
          {
            path: "/academy/courses/:courseId",
            element: academyOnly(<AcademyCourseStatsPage />),
          },
          // Academy public view (UUID or slug), open to all authenticated users
          {
            path: "/academy/:academySlug",
            element: (
              <ProtectedRoute>
                <AcademyPage />
              </ProtectedRoute>
            ),
          },
        ])}
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
          "/interviews",
          <ProtectedRoute requiredRole="user">
            <InterviewsPage />
          </ProtectedRoute>,
        )}

        {/* ==========================================
          ACADEMY-ONLY ROUTES - Require role "academy"
          ========================================== */}
        <Route path="/academy/register" element={<AcademyRegistrationPage />} />
        <Route
          path="/employer/register"
          element={<EmployerRegistrationPage />}
        />
        {createLocalizedRoute(
          "/employer/join-company",
          <ProtectedRoute requiredRole="employer">
            <EmployerJoinCompanyPage />
          </ProtectedRoute>,
        )}
        {createLocalizedRoute(
          "/employer/accept-invite",
          <EmployerAcceptInvitePage />,
        )}
        {createLocalizedRoute(
          "/employer/pending-approval",
          <ProtectedRoute requiredRole="employer">
            <EmployerPendingApprovalPage />
          </ProtectedRoute>,
        )}
        {createEmployerDashboardRoutes([
          {
            path: "/employer/notifications",
            element: <EmployerNotificationsPage />,
          },
          {
            path: "/employer/dashboard",
            element: <EmployerDashboardPage />,
          },
          { path: "/employer/home", element: <EmployerDashboardPage /> },
          { path: "/employer/jobs", element: <EmployerJobsPage /> },
          { path: "/employer/jobs/add", element: <EmployerAddJobPage /> },
          {
            path: "/employer/jobs/edit/:jobId",
            element: <EmployerAddJobPage />,
          },
          { path: "/employer/jobs/:jobId", element: <EmployerJobStatsPage /> },
          { path: "/employer/profile", element: <EmployerProfilePage /> },
          { path: "/employer/members", element: <EmployerMembersPage /> },
          { path: "/employer/settings", element: <UserSettings /> },
        ])}
        {/* ==========================================
          COMMON ROUTES - Available to all authenticated users
          ========================================== */}
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
