import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
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

  // If no user and no valid token, redirect to login
  if (!user && !hasApiToken) {
    return <Navigate to="/auth/login" replace />;
  }

  // Otherwise, user can see the page
  return <>{children}</>;
}
