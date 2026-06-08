/**
 * Persistent employer dashboard shell — keeps sidebar/header mounted across nav.
 */
import { Outlet } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { EmployerAccessGate } from "@/components/employer/EmployerAccessGate";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export function EmployerDashboardShell() {
  return (
    <ProtectedRoute requiredRole="employer">
      <EmployerAccessGate>
        <DashboardLayout>
          <Outlet />
        </DashboardLayout>
      </EmployerAccessGate>
    </ProtectedRoute>
  );
}
