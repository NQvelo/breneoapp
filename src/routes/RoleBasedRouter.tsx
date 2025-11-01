/**
 * Role-Based Router
 *
 * Handles role-based routing logic
 * Redirects users to appropriate dashboards based on their role
 *
 * ✅ CRITICAL: Uses localStorage role as primary source (most reliable during refresh)
 * This ensures academy users are correctly routed even if user object isn't fully loaded
 */

import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRole } from "@/utils/getRole";

/**
 * RoleBasedRouter Component
 *
 * Automatically redirects authenticated users to their role-specific dashboard
 * - Academy users -> /academy/dashboard
 * - Regular users -> /dashboard
 * - Admins -> /admin/dashboard (if implemented)
 *
 * Role Priority (same as AuthContext and ProtectedRoute):
 * 1. localStorage.getItem('userRole') - Most reliable, set during login
 * 2. user.user_type - From AuthContext (may not be set during early session restoration)
 * 3. getRole() - Utility function that checks localStorage and token
 * 4. "user" - Default fallback
 */
export const RoleBasedRouter = () => {
  const { user, loading } = useAuth();

  // ✅ FIX: Show loading while session restoration is in progress
  // This prevents premature redirects before role is determined
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

  // ✅ FIX: Check for token in addition to user object
  // User object might not be set immediately after refresh, but token exists
  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("authToken");

  if (!user && !hasToken) {
    return <Navigate to="/auth/login" replace />;
  }

  // ✅ CRITICAL FIX: Priority order matches AuthContext and ProtectedRoute
  // 1. localStorage.getItem('userRole') - Check directly first (most reliable)
  // 2. user.user_type - From AuthContext (may be null during restoration)
  // 3. getRole() - Fallback utility (also checks localStorage and token)
  // 4. "user" - Default fallback only if nothing else works
  const storedRole =
    typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
  const role = storedRole || user?.user_type || getRole() || "user";

  console.log("🔄 RoleBasedRouter: Determined role:", {
    storedRole,
    userType: user?.user_type,
    getRoleResult: getRole(),
    finalRole: role,
  });

  // Redirect based on role - completely separated routes
  switch (role) {
    case "academy":
      // Academy users go to academy dashboard
      console.log(
        "🔄 RoleBasedRouter: Redirecting academy user to /academy/dashboard"
      );
      return <Navigate to="/academy/dashboard" replace />;
    // case "admin":
    //   // Admin users (if implemented) go to admin dashboard
    //   console.log("🔄 RoleBasedRouter: Redirecting admin to /admin/dashboard");
    //   return <Navigate to="/admin/dashboard" replace />;
    case "user":
    default:
      // Regular users go to user dashboard
      console.log("🔄 RoleBasedRouter: Redirecting user to /dashboard");
      return <Navigate to="/dashboard" replace />;
  }
};
