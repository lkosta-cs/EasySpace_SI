import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EditScope } from '../api/bookings';

interface RecurringScopeModalProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  confirmClassName: string;
  defaultScope?: EditScope;
  isPending?: boolean;
  onConfirm: (scope: EditScope) => void;
  onClose: () => void;
}

export default function RecurringScopeModal({
  open,
  title,
  confirmLabel,
  confirmClassName,
  defaultScope = 'single',
  isPending = false,
  onConfirm,
  onClose,
}: RecurringScopeModalProps) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<EditScope>(defaultScope);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('calendar.recurringActionPrompt')}</p>

        <div className="space-y-1.5 mb-5">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              checked={scope === 'single'}
              onChange={() => setScope('single')}
            />
            {t('calendar.scopeThisOccurrence')}
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              checked={scope === 'future'}
              onChange={() => setScope('future')}
            />
            {t('calendar.scopeFutureOccurrences')}
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => onConfirm(scope)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${confirmClassName}`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {t('calendar.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
