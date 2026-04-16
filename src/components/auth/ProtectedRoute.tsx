/**
 * Protected Route Component
 *
 * Wraps routes that require authentication
 * Supports role-based access control (user, academy, admin)
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRole } from "@/utils/getRole";
import { getLocalizedPath, getLanguageFromPath } from "@/utils/localeUtils";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional role requirement
   * If specified, only users with this role can access the route
   * Options: 'user', 'academy', 'employer', 'admin'
   */
  requiredRole?: "user" | "academy" | "employer" | "admin";
  /**
   * Redirect path if unauthorized (default: /auth/login)
   */
  redirectTo?: string;
}

/**
 * ProtectedRoute - Protects routes that require authentication
 *
 * Features:
 * - Checks if user is authenticated
 * - Optionally checks if user has required role
 * - Shows loading state during auth check
 * - Redirects to login if not authenticated
 *
 * @example
 * // Protect route for all authenticated users
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * @example
 * // Protect route for academy users only
 * <ProtectedRoute requiredRole="academy">
 *   <AcademyDashboard />
 * </ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/auth/login",
}: ProtectedRouteProps) {
  const normalizeRole = (
    raw: string | null | undefined,
  ): "user" | "academy" | "employer" | "admin" => {
    const role = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (
      role === "user" ||
      role === "academy" ||
      role === "employer" ||
      role === "admin"
    ) {
      return role;
    }
    return "user";
  };

  const redirectIfNeeded = (target: string) => {
    const current = window.location.pathname;
    if (target === current) return <>{children}</>;
    return <Navigate to={target} replace />;
  };

  // ✅ FIX: Get auth context - it should always be available if component tree is correct
  const { user, loading } = useAuth();
  const language =
    getLanguageFromPath(window.location.pathname) ||
    (localStorage.getItem("appLanguage") as "en" | "ka") ||
    "en";

  const hasApiToken =
    typeof window !== "undefined" && !!localStorage.getItem("authToken");

  // Debug logging
  // console.log("🔒 ProtectedRoute check:", {
  //   loading,
  //   hasUser: !!user,
  //   hasApiToken,
  //   requiredRole,
  //   userRole: user?.user_type || localStorage.getItem("userRole"),
  // });

  // Show loading screen while checking authentication
  // Only show loading if auth is actually loading, not if user is just null with a token
  // (user might be null temporarily during session restoration, but loading flag handles that)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-breneo-lightgray dark:bg-[#181818]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-breneo-blue mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user && !hasApiToken) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role requirement if specified
  if (requiredRole) {
    // ✅ CRITICAL FIX: Get role with priority order:
    // 1. user.user_type (from AuthContext - most reliable)
    // 2. localStorage.getItem('userRole') (stored during login/restoration)
    // 3. getRole() utility (checks token and localStorage)
    // This ensures we always have the correct role even during session restoration
    const userRole = normalizeRole(
      user?.user_type || localStorage.getItem("userRole") || getRole(),
    );

    // console.log("🔒 ProtectedRoute role check:", {
    //   requiredRole,
    //   userRole,
    //   matches: userRole === requiredRole,
    // });

    // ✅ FIX: Direct comparison instead of isRole() to avoid double-calling getRole()
    if (userRole !== requiredRole) {
      if (userRole === "employer") {
        const employerPath = getLocalizedPath("/employer/jobs", language);
        return redirectIfNeeded(employerPath);
      }
      if (requiredRole === "employer") {
        if (userRole === "academy") {
          const academyPath = getLocalizedPath("/academy/dashboard", language);
          return redirectIfNeeded(academyPath);
        }
        const homePath = getLocalizedPath("/home", language);
        return redirectIfNeeded(homePath);
      }
      if (userRole === "academy") {
        const academyPath = getLocalizedPath("/academy/dashboard", language);
        return redirectIfNeeded(academyPath);
      } else {
        const homePath = getLocalizedPath("/home", language);
        return redirectIfNeeded(homePath);
      }
    }
  }

  // User is authenticated and has required role (if specified)
  // console.log("✅ ProtectedRoute: Allowing access to route");
  return <>{children}</>;
}
