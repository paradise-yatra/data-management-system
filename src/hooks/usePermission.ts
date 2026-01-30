import { useAuth } from '@/contexts/AuthContext';
import type { AccessLevel } from '@/types/rbac';

export function usePermission(resourceKey: string): {
  access: AccessLevel;
  canView: boolean;
  canManage: boolean;
} {
  const { canAccess, canView, canManage } = useAuth();
  return {
    access: canAccess(resourceKey),
    canView: canView(resourceKey),
    canManage: canManage(resourceKey),
  };
}
