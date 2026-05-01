import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { bookingsApi } from '../../api/bookings';
import { toast } from 'sonner';

export default function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: pendingBookings = [] } = useQuery({
    queryKey: ['pending-bookings'],
    queryFn: bookingsApi.getPending,
    refetchInterval: 30000, // refresh every 30 seconds
  });

  const pendingCount = pendingBookings.length;

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">EasySpace</h1>
          <p className="text-xs text-gray-500 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            Users
          </NavLink>
          <NavLink
            to="/admin/rooms"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            Rooms
          </NavLink>
          <NavLink
            to="/admin/bookings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            Bookings
          </NavLink>
          <NavLink
            to="/admin/pending"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/admin/occasion-settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            Occasion Settings
          </NavLink>
          <NavLink
            to="/admin/calendar"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            Calendar
          </NavLink>
        </nav>
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}