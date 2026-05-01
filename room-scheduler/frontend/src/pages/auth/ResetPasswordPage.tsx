import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import LanguageSelector from '../../components/LanguageSelector';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();

  const userId = searchParams.get('userId') ?? '';
  const token = searchParams.get('token') ?? '';

  const schema = z.object({
    newPassword: z.string().min(8, t('validation.passwordMin')),
    confirmPassword: z.string(),
  }).refine((d) => d.newPassword === d.confirmPassword, {
    message: t('validation.passwordsNoMatch'),
    path: ['confirmPassword'],
  });
  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.resetPassword(userId, token, data.newPassword);
      toast.success(t('toast.passwordReset'));
      navigate('/login');
    } catch {
      toast.error(t('toast.resetLinkInvalid'));
    }
  };

  if (!userId || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">{t('auth.invalidResetLink')}</h1>
          <p className="text-sm text-gray-500 mt-2">{t('auth.invalidResetLinkDesc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('auth.resetPassword')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('auth.resetPasswordSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.newPassword')}
            </label>
            <input
              {...register('newPassword')}
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.confirmPassword')}
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('auth.resetting') : t('auth.resetPassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
