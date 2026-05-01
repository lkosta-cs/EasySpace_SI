import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { bookingsApi } from '../../api/bookings';
import { format } from 'date-fns';
import { useState } from 'react';

interface PendingBooking {
  id: number;
  roomName: string;
  userName: string;
  userEmail: string;
  start: string;
  end: string;
  notes?: string;
  occasionType: number;
  occasionTypeLabel: string;
  recurringGroupId?: string;
  isRecurringRoot: boolean;
}

const OCCASION_COLORS: Record<number, string> = {
  0: 'bg-blue-100 text-blue-700',
  1: 'bg-red-100 text-red-700',
  2: 'bg-green-100 text-green-700',
};

export default function PendingBookingsPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['pending-bookings'],
    queryFn: bookingsApi.getPending,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-bookings'] });
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      toast.success(t('toast.bookingApproved'));
    },
    onError: () => toast.error(t('toast.approveFailed')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      bookingsApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-bookings'] });
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      toast.success(t('toast.bookingRejected'));
    },
    onError: () => toast.error(t('toast.rejectFailed')),
  });

  const setReason = (id: number, reason: string) => {
    setRejectReasons(prev => ({ ...prev, [id]: reason }));
  };

  const grouped = (bookings as PendingBooking[]).reduce(
    (acc: Record<string, PendingBooking[]>, booking: PendingBooking) => {
      const key = booking.recurringGroupId ?? String(booking.id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(booking);
      return acc;
    },
    {} as Record<string, PendingBooking[]>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('pending.title')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('pending.subtitle')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('pending.loading')}</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">{t('pending.noPending')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.entries(grouped) as [string, PendingBooking[]][]).map(([groupKey, groupBookings]) => {
            const first = groupBookings[0];
            const isRecurring = groupBookings.length > 1;
            const rootId = first.id;

            return (
              <div
                key={groupKey}
                className="bg-white border border-gray-200 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900">{first.roomName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        OCCASION_COLORS[first.occasionType] ?? 'bg-gray-100 text-gray-600'
                      }`}>
                        {first.occasionTypeLabel}
                      </span>
                      {isRecurring && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          {t('pending.recurring', { count: groupBookings.length })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {first.userName} — {first.userEmail}
                    </p>
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  {groupBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                      <span>{format(new Date(booking.start), 'EEEE, MMMM d yyyy')}</span>
                      <span className="text-gray-400">
                        {format(new Date(booking.start), 'HH:mm')} —{' '}
                        {format(new Date(booking.end), 'HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>

                {first.notes && (
                  <p className="text-xs text-gray-400 italic mb-4">"{first.notes}"</p>
                )}

                <input
                  value={rejectReasons[rootId] ?? ''}
                  onChange={(e) => setReason(rootId, e.target.value)}
                  placeholder={t('pending.rejectionReason')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 mb-3"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate(rootId)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    {isRecurring
                      ? t('pending.approveAll', { count: groupBookings.length })
                      : t('pending.approve')}
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate({
                      id: rootId,
                      reason: rejectReasons[rootId] ?? ''
                    })}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    {isRecurring
                      ? t('pending.rejectAll', { count: groupBookings.length })
                      : t('pending.reject')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
