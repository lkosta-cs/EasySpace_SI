import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './router/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import RegisterPage from './pages/auth/RegisterPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import AdminLayout from './pages/admin/AdminLayout';
import UserManagementPage from './pages/admin/UserManagementPage';
import RoomManagementPage from './pages/admin/RoomManagementPage';
import BookingsPage from './pages/admin/BookingsPage';
import AdminCalendarPage from './pages/admin/AdminCalendarPage';

import UserLayout from './pages/user/UserLayout';
import CalendarPage from './pages/user/CalendarPage';
import MyBookingsPage from './pages/user/MyBookingsPage';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Admin routes */}
      <Route element={<ProtectedRoute requiredRole="Admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="rooms" element={<RoomManagementPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="calendar" element={<AdminCalendarPage />} />
        </Route>
      </Route>

      {/* User routes */}
      <Route element={<ProtectedRoute requiredRole="User" />}>
        <Route path="/app" element={<UserLayout />}>
          <Route index element={<CalendarPage />} />
          <Route path="bookings" element={<MyBookingsPage />} />
        </Route>
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}