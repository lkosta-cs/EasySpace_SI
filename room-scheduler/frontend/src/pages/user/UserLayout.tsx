import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import LanguageSelector from '../../components/LanguageSelector';

export default function UserLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    toast.success(t('toast.loggedOut'));
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-lg font-semibold text-gray-900">{t('app.title')}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{t('app.subtitle')}</p>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          <NavLink
            to="/app"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {t('nav.calendar')}
          </NavLink>
          <NavLink
            to="/app/bookings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {t('nav.myBookings')}
          </NavLink>
        </nav>
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <div className="px-3 py-2 mb-1">
            <LanguageSelector />
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            {t('auth.signOut')}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
