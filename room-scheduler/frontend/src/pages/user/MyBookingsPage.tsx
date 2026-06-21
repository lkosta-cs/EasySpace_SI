import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { bookingsApi } from '../../api/bookings';
import { format } from 'date-fns';

interface Booking {
  id: number;
  roomName: string;
  start: string;
  end: string;
  notes?: string;
  isCancelled: boolean;
  occasionType: number;
  occasionTypeLabel: string;
  recurringGroupId?: string;
  isRecurringRoot: boolean;
}

export default function MyBookingsPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: bookingsApi.getMine,
  });

  const [statusFilters, setStatusFilters] = useState<Set<'upcoming' | 'past' | 'cancelled'>>(
    new Set(['upcoming'])
  );

  const toggleStatusFilter = (filter: 'upcoming' | 'past' | 'cancelled') => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  };

  const filteredBookings = useMemo(() => {
    const now = new Date();
    return bookings.filter((b: Booking) => {
      if (b.isCancelled) return statusFilters.has('cancelled');
      const isPast = new Date(b.end) < now;
      return statusFilters.has(isPast ? 'past' : 'upcoming');
    });
  }, [bookings, statusFilters]);

  const cancelMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success(t('toast.bookingCancelled'));
    },
    onError: () => toast.error(t('toast.cancelFailed')),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.restore(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success(t('toast.bookingRestored'));
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.status === 409
          ? t('toast.conflictsFound')
          : t('toast.restoreFailed')
      );
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('myBookings.title')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('myBookings.subtitle')}</p>
      </div>

      <div className="flex gap-4 mb-4 flex-wrap">
        {(['upcoming', 'past', 'cancelled'] as const).map((filter) => (
          <label key={filter} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={statusFilters.has(filter)}
              onChange={() => toggleStatusFilter(filter)}
              className="rounded border-gray-300"
            />
            {filter === 'cancelled' ? t('status.Cancelled') : t(`calendar.filter${filter[0].toUpperCase()}${filter.slice(1)}`)}
          </label>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('myBookings.loading')}</p>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">{t('myBookings.noBookings')}</p>
          <p className="text-sm mt-1">{t('myBookings.goToCalendar')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((booking: Booking) => (
            <div
              key={booking.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    {booking.roomName}
                  </h3>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {booking.occasionTypeLabel}
                  </span>
                  {booking.recurringGroupId && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                      {t('myBookings.recurring')}
                    </span>
                  )}
                  {booking.isCancelled && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {t('status.Cancelled')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(booking.start), 'EEEE, MMMM d yyyy')}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(booking.start), 'HH:mm')} —{' '}
                  {format(new Date(booking.end), 'HH:mm')}
                </p>
                {booking.notes && (
                  <p className="text-xs text-gray-400 mt-1 italic">{booking.notes}</p>
                )}
              </div>
              {booking.isCancelled ? (
                <button
                  onClick={() => restoreMutation.mutate(booking.id)}
                  className="text-sm text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                >
                  {t('myBookings.restore')}
                </button>
              ) : (
                <button
                  onClick={() => cancelMutation.mutate(booking.id)}
                  className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  {t('myBookings.cancel')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
