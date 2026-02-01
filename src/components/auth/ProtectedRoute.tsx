import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { AccessLevel } from '@/types/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Legacy: require one of these roles when resourceKey is not used */
  requiredRoles?: ('admin' | 'manager' | 'user')[];
  /** Resource key for permission check (e.g. manage_users, rbac_system) */
  resourceKey?: string;
  /** Minimum access level to view this route; none -> redirect to /access-denied */
  requiredLevel?: 'view' | 'full';
}

export function ProtectedRoute({
  children,
  requiredRoles,
  resourceKey,
  requiredLevel = 'view',
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, canAccess } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Permission-based: check resourceKey
  if (resourceKey) {
    // Admin users bypass all permission checks
    if (user?.role === 'admin') {
      return <>{children}</>;
    }
    const access: AccessLevel = canAccess(resourceKey);
    if (access === 'none') {
      return <Navigate to="/access-denied" replace />;
    }
    return <>{children}</>;
  }

  // Legacy: role-based check
  // Admin users bypass role checks
  if (requiredRoles && user && user.role !== 'admin' && !requiredRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
