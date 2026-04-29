import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

interface Props {
  requiredRole?: 'Admin' | 'User';
}

export function ProtectedRoute({ requiredRole }: Props) {
  const { user, token } = useAuthStore();

  if (!token) return <Navigate to="/login" replace />;

  if (requiredRole && user?.role !== requiredRole)
    return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}