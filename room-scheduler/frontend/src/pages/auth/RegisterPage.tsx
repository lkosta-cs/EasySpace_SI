import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/auth';
import LanguageSelector from '../../components/LanguageSelector';

const DEPARTMENTS = [
  'DEPARTMENT_CSY',
  'DEPARTMENT_EL',
  'DEPARTMENT_PE',
  'DEPARTMENT_MA',
  'DEPARTMENT_ME',
  'DEPARTMENT_MI',
  'DEPARTMENT_CSC',
  'DEPARTMENT_TE',
  'DEPARTMENT_TEE',
  'DEPARTMENT_GE',
] as const;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const schema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    role: z.enum(['User', 'Assistant', 'Professor']),
    indexNumber: z.string().optional(),
    department: z.string().optional(),
    title: z.string().optional(),
    email: z.string().email(t('validation.emailInvalid')),
    password: z.string().min(8, t('validation.passwordMin')),
    confirmPassword: z.string(),
  })
    .refine((d) => d.password === d.confirmPassword, {
      message: t('validation.passwordsNoMatch'),
      path: ['confirmPassword'],
    })
    .superRefine((d, ctx) => {
      if (d.role === 'User' && !d.indexNumber?.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.indexNumberRequired'),
          path: ['indexNumber'],
        });
      }
      if ((d.role === 'Assistant' || d.role === 'Professor') && !d.department) {
        ctx.addIssue({
          code: 'custom',
          message: t('validation.departmentRequired'),
          path: ['department'],
        });
      }
    });

  type FormData = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { role: 'User' },
  });

  const role = watch('role');

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        indexNumber: data.indexNumber ? parseInt(data.indexNumber, 10) : undefined,
        department: data.department || undefined,
        title: data.title || undefined,
      });
      toast.success(t('toast.accountCreated'));
      navigate('/login');
    } catch {
      toast.error(t('toast.registrationFailed'));
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('auth.createAccount')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('auth.signUpForEasySpace')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* First name + Last name side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.firstName')}
              </label>
              <input {...register('firstName')} className={inputClass} />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.lastName')}
              </label>
              <input {...register('lastName')} className={inputClass} />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.role')}
            </label>
            <select {...register('role')} className={inputClass}>
              <option value="User">{t('role.User')}</option>
              <option value="Assistant">{t('role.Assistant')}</option>
              <option value="Professor">{t('role.Professor')}</option>
            </select>
          </div>

          {/* Student — Index number */}
          {role === 'User' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.indexNumber')}
              </label>
              <input
                {...register('indexNumber')}
                type="number"
                min={1}
                max={9999999}
                className={inputClass}
              />
              {errors.indexNumber && (
                <p className="text-red-500 text-xs mt-1">{errors.indexNumber.message}</p>
              )}
            </div>
          )}

          {/* Assistant / Professor — Department + Title */}
          {(role === 'Assistant' || role === 'Professor') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.department')}
                </label>
                <select {...register('department')} className={inputClass}>
                  <option value="">{t('form.selectDepartment')}</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {t(`department.${d}`)}
                    </option>
                  ))}
                </select>
                {errors.department && (
                  <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.title')}
                </label>
                <input
                  {...register('title')}
                  placeholder="e.g. MSc, PhD"
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.email')}
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className={inputClass}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.password')}
            </label>
            <input {...register('password')} type="password" placeholder="••••••••" className={inputClass} />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.confirmPassword')}
            </label>
            <input {...register('confirmPassword')} type="password" placeholder="••••••••" className={inputClass} />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="text-gray-900 font-medium hover:underline">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
