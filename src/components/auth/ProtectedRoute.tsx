/**
 * Protected Route Component
 *
 * Wraps routes that require authentication
 * Supports role-based access control (user, academy, admin)
 */

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRole, isRole } from "@/utils/getRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Optional role requirement
   * If specified, only users with this role can access the route
   * Options: 'user', 'academy', 'admin'
   */
  requiredRole?: "user" | "academy" | "admin";
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
  // ✅ FIX: Get auth context - it should always be available if component tree is correct
  const { user, loading } = useAuth();

  const hasApiToken =
    typeof window !== "undefined" && !!localStorage.getItem("authToken");

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-breneo-blue mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
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
    const userRole =
      user?.user_type || localStorage.getItem("userRole") || getRole();

    // ✅ FIX: Direct comparison instead of isRole() to avoid double-calling getRole()
    if (!userRole || userRole !== requiredRole) {
      // User doesn't have required role - silently redirect to their dashboard
      // This is expected behavior, not an error
      if (userRole === "academy") {
        // Academy user trying to access user route - redirect to academy dashboard
        console.log(
          "🔄 ProtectedRoute: Academy user accessing user route, redirecting to /academy/dashboard"
        );
        return <Navigate to="/academy/dashboard" replace />;
      } else if (userRole === "user") {
        // Regular user trying to access academy route - redirect to user dashboard
        console.log(
          "🔄 ProtectedRoute: User accessing academy route, redirecting to /dashboard"
        );
        return <Navigate to="/dashboard" replace />;
      } else {
        // Unknown role or no role - default to user dashboard
        console.log(
          "🔄 ProtectedRoute: Unknown role, redirecting to /dashboard"
        );
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  // User is authenticated and has required role (if specified)
  return <>{children}</>;
}
