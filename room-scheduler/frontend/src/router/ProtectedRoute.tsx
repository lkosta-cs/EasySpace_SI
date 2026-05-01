import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface Props {
  requiredRole?: 'Admin' | 'User' | 'SuperAdmin' | 'Professor' | 'Assistant';
  allowedRoles?: Array<'Admin' | 'User' | 'SuperAdmin' | 'Professor' | 'Assistant'>;
}

export function ProtectedRoute({ requiredRole, allowedRoles }: Props) {
  const { user, token } = useAuthStore();

  if (!token) return <Navigate to="/login" replace />;

  if (requiredRole && user?.role !== requiredRole)
    return <Navigate to="/unauthorized" replace />;

  if (allowedRoles && !allowedRoles.includes(user?.role as any))
    return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}