import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../api/users';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';

const DEPARTMENTS = [
  'DEPARTMENT_CSY', 'DEPARTMENT_EL', 'DEPARTMENT_PE', 'DEPARTMENT_MA',
  'DEPARTMENT_ME', 'DEPARTMENT_MI', 'DEPARTMENT_CSC', 'DEPARTMENT_TE',
  'DEPARTMENT_TEE', 'DEPARTMENT_GE',
] as const;

interface Props {
  userId: string;
  isSelf: boolean;
  canEditRole: boolean;
  isSuperAdmin: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function EditUserModal({ userId, isSelf, canEditRole, isSuperAdmin, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { updateUser } = useAuthStore();
  const [resetSent, setResetSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const schema = z.object({
    firstName: z.string().min(1, t('validation.firstNameRequired')),
    lastName: z.string().min(1, t('validation.lastNameRequired')),
    email: z.string().email(t('validation.emailInvalid')),
    role: z.string().optional(),
    indexNumber: z.string().optional(),
    department: z.string().optional(),
    title: z.string().optional(),
  });
  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, watch, reset, formState: { errors } } =
    useForm<FormData, unknown, FormData>({
      resolver: zodResolver(schema) as any,
    });

  const roleValue = watch('role') ?? 'Professor';

  const { data: profile, isLoading } = useQuery({
    queryKey: isSelf ? ['myProfile'] : ['userProfile', userId],
    queryFn: isSelf ? usersApi.getMyProfile : () => usersApi.getById(userId),
  });

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        role: profile.role,
        indexNumber: profile.indexNumber?.toString() ?? '',
        department: profile.department ?? '',
        title: profile.title ?? '',
      });
    }
  }, [profile, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const indexNumber = data.indexNumber ? parseInt(data.indexNumber, 10) : null;
      const department = data.department || undefined;
      const title = data.title || undefined;

      if (isSelf) {
        return usersApi.updateMyProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          indexNumber,
          department,
          title,
        });
      }
      return usersApi.updateProfile(userId, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        role: data.role ?? 'Professor',
        indexNumber,
        department,
        title,
      });
    },
    onSuccess: (_, variables) => {
      if (isSelf) {
        updateUser({
          email: variables.email,
          fullName: `${variables.firstName} ${variables.lastName}`.trim(),
        });
        qc.invalidateQueries({ queryKey: ['myProfile'] });
      } else {
        qc.invalidateQueries({ queryKey: ['users'] });
        qc.invalidateQueries({ queryKey: ['userProfile', userId] });
      }
      toast.success(t('toast.profileUpdated'));
      onSaved?.();
      onClose();
    },
    onError: () => toast.error(t('toast.profileUpdateFailed')),
  });

  const handleSendReset = async () => {
    const email = watch('email');
    setSendingReset(true);
    try {
      await authApi.forgotPassword(email);
      setResetSent(true);
      toast.success(t('toast.resetLinkSent'));
    } catch {
      toast.error(t('toast.somethingWentWrong'));
    } finally {
      setSendingReset(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent';

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {isSelf ? t('profile.myProfile') : t('profile.editUser')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-500 py-4">{t('users.loading')}</p>
        ) : (
          <form
            onSubmit={handleSubmit((data) => saveMutation.mutate(data))}
            className="space-y-4"
          >
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('form.email')}
              </label>
              <input {...register('email')} type="email" className={inputClass} />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {canEditRole && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.role')}
                </label>
                <select {...register('role')} className={inputClass}>
                  <option value="User">{t('role.User')}</option>
                  <option value="Assistant">{t('role.Assistant')}</option>
                  <option value="Professor">{t('role.Professor')}</option>
                  {isSuperAdmin && <option value="Admin">{t('role.Admin')}</option>}
                </select>
              </div>
            )}

            {roleValue === 'User' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('form.indexNumber')}
                </label>
                <input {...register('indexNumber')} type="number" className={inputClass} />
              </div>
            )}

            {(roleValue === 'Assistant' || roleValue === 'Professor') && (
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

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">{t('profile.password')}</p>
              <button
                type="button"
                onClick={handleSendReset}
                disabled={resetSent || sendingReset}
                className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetSent
                  ? t('profile.resetLinkSent')
                  : sendingReset
                  ? t('auth.sending')
                  : t('profile.sendResetLink')}
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {t('calendar.cancel')}
              </button>
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveMutation.isPending ? t('profile.saving') : t('profile.saveChanges')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
