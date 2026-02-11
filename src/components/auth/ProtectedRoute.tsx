import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { logSecurityEvent } from "@/lib/securityEvents";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ("admin" | "admin_superieur" | "agent" | "validator" | "user" | "prestataire" | "security_engineer")[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, roles, isLoading } = useAuth();
  const location = useLocation();

  const hasAccess = !requiredRoles || requiredRoles.length === 0 || requiredRoles.some((role) => {
    // admin_superieur inherits admin access
    if (role === "admin" && roles.includes("admin_superieur")) return true;
    return roles.includes(role);
  });

  useEffect(() => {
    // Log forbidden access attempts
    if (!isLoading && user && requiredRoles && requiredRoles.length > 0 && !hasAccess) {
      logSecurityEvent("access_denied", "high", {
        attempted_path: location.pathname,
        user_roles: roles,
        required_roles: requiredRoles,
      });
    }
  }, [isLoading, user, hasAccess]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
