import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { bookingsApi } from '../api/bookings';
import { roomsApi } from '../api/rooms';
import { occasionConfigApi } from '../api/occasionConfig';
import { useAuthStore } from '../stores/authStore';

interface Room {
  id: number;
  name: string;
  seats: number;
}

interface OccasionConfig {
  id: number;
  occasionType: number;
  label: string;
  color: string;
}

interface BookingDetail {
  id: number;
  roomId: number;
  start: string;
  end: string;
  notes?: string;
  occasionType: number;
  recurringGroupId?: string | null;
  recurrencePattern?: number | null;
  recurrenceEndDate?: string | null;
}

interface BookingFormModalProps {
  mode: 'create' | 'edit';
  open: boolean;
  onClose: () => void;
  bookingId?: number;
  initialStart?: Date;
  initialEnd?: Date;
}

const schema = z.object({
  roomId: z.coerce.number().min(1, 'roomRequired'),
  notes: z.string().optional(),
  occasionType: z.coerce.number().min(0),
  recurrencePattern: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  editType: z.enum(['single', 'future']).optional(),
});
type FormData = z.infer<typeof schema>;

export default function BookingFormModal({
  mode,
  open,
  onClose,
  bookingId,
  initialStart,
  initialEnd,
}: BookingFormModalProps) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [conflictDates, setConflictDates] = useState<string[]>([]);

  const OCCASION_TYPES = [
    { value: 0, label: t('occasionType.0') },
    { value: 1, label: t('occasionType.1') },
    { value: 2, label: t('occasionType.2') },
  ];

  const availableOccasions = OCCASION_TYPES.filter(o => {
    if (user?.role === 'Assistant') return o.value === 2;
    if (user?.role === 'Professor') return o.value !== 2;
    return true;
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const { data: configs = [] } = useQuery<OccasionConfig[]>({
    queryKey: ['occasionConfigs'],
    queryFn: occasionConfigApi.getAll,
  });

  const { data: bookingDetail } = useQuery<BookingDetail>({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingsApi.getById(bookingId!),
    enabled: open && mode === 'edit' && !!bookingId,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as any,
  });

  const recurrencePattern = watch('recurrencePattern');
  const editType = watch('editType');
  const date = watch('date');
  const isRecurring = mode === 'edit' && !!bookingDetail?.recurringGroupId;
  const recurrenceFieldsDisabled = isRecurring && editType === 'single';

  useEffect(() => {
    if (!open) return;
    setConflictDates([]);

    if (mode === 'create' && initialStart && initialEnd) {
      reset({
        roomId: undefined,
        notes: '',
        occasionType: availableOccasions[0]?.value ?? 0,
        recurrencePattern: '',
        recurrenceEndDate: '',
        date: format(initialStart, 'yyyy-MM-dd'),
        startTime: format(initialStart, 'HH:mm'),
        endTime: format(initialEnd, 'HH:mm'),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialStart, initialEnd]);

  useEffect(() => {
    if (mode === 'edit' && open && bookingDetail) {
      reset({
        roomId: bookingDetail.roomId,
        notes: bookingDetail.notes ?? '',
        occasionType: bookingDetail.occasionType,
        recurrencePattern:
          bookingDetail.recurrencePattern != null ? String(bookingDetail.recurrencePattern) : '',
        recurrenceEndDate: bookingDetail.recurrenceEndDate
          ? format(new Date(bookingDetail.recurrenceEndDate), 'yyyy-MM-dd')
          : '',
        date: format(new Date(bookingDetail.start), 'yyyy-MM-dd'),
        startTime: format(new Date(bookingDetail.start), 'HH:mm'),
        endTime: format(new Date(bookingDetail.end), 'HH:mm'),
        editType: 'single',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, open, bookingDetail]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['my-bookings'] });
    qc.invalidateQueries({ queryKey: ['all-bookings'] });
    if (bookingId) qc.invalidateQueries({ queryKey: ['booking', bookingId] });
  };

  const buildPayload = (data: FormData) => {
    const start = new Date(`${data.date}T${data.startTime}`);
    const end = new Date(`${data.date}T${data.endTime}`);
    const useRecurrence = !recurrenceFieldsDisabled;

    return {
      roomId: Number(data.roomId),
      start: start.toISOString(),
      end: end.toISOString(),
      occasionType: Number(data.occasionType),
      notes: data.notes,
      recurrencePattern: useRecurrence && data.recurrencePattern ? Number(data.recurrencePattern) : null,
      recurrenceEndDate: useRecurrence && data.recurrenceEndDate
        ? new Date(data.recurrenceEndDate).toISOString()
        : null,
    };
  };

  const saveBooking = useMutation({
    mutationFn: (data: FormData) => {
      const payload = buildPayload(data);
      if (mode === 'create') return bookingsApi.create(payload);
      return bookingsApi.update(bookingId!, {
        ...payload,
        editType: data.editType === 'future' ? 1 : 0,
      });
    },
    onSuccess: (result) => {
      invalidateAll();
      if (mode === 'create') {
        toast.success(
          result.count > 1
            ? t('toast.bookingsCreated', { count: result.count })
            : t('toast.bookingCreated')
        );
      } else {
        toast.success(t('toast.bookingUpdated'));
      }
      setConflictDates([]);
      onClose();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data?.conflictingDates) {
        setConflictDates(data.conflictingDates);
        toast.error(t('toast.conflictsFound'));
      } else {
        toast.error(mode === 'create' ? t('toast.bookingFailed') : t('toast.bookingUpdateFailed'));
      }
    },
  });

  if (!open) return null;
  if (mode === 'create' && (!initialStart || !initialEnd)) return null;

  const close = () => {
    setConflictDates([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-medium text-gray-900 mb-5">
          {mode === 'create' ? t('calendar.bookRoom') : t('calendar.editBooking')}
        </h3>

        {conflictDates.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-red-700 mb-1">
              {t('calendar.conflictsFoundOn')}
            </p>
            <ul className="text-xs text-red-600 space-y-0.5">
              {conflictDates.map((d, i) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
            <p className="text-xs text-red-500 mt-2">
              {t('calendar.adjustTime')}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit((d) => saveBooking.mutate(d))} className="space-y-4">
          {isRecurring && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm font-medium text-purple-800 mb-2">
                {t('calendar.recurringEditPrompt')}
              </p>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" value="single" {...register('editType')} defaultChecked />
                  {t('calendar.scopeThisOccurrence')}
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="radio" value="future" {...register('editType')} />
                  {t('calendar.scopeFutureOccurrences')}
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('calendar.date')}
            </label>
            <input
              {...register('date')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('calendar.startTime')}
              </label>
              <input
                {...register('startTime')}
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('calendar.endTime')}
              </label>
              <input
                {...register('endTime')}
                type="time"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('calendar.occasionType')}
            </label>
            <select
              {...register('occasionType')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {availableOccasions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('calendar.room')}
            </label>
            <select
              {...register('roomId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">{t('calendar.selectRoom')}</option>
              {rooms.map((room: Room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({t('rooms.seatsLabel', { count: room.seats })})
                </option>
              ))}
            </select>
            {errors.roomId && (
              <p className="text-red-500 text-xs mt-1">{t('validation.roomRequired')}</p>
            )}
          </div>

          <div className={recurrenceFieldsDisabled ? 'opacity-40 pointer-events-none' : ''}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('calendar.repeat')}
            </label>
            <select
              {...register('recurrencePattern')}
              disabled={recurrenceFieldsDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">{t('calendar.doesNotRepeat')}</option>
              <option value="0">{t('calendar.everyWeek')}</option>
              <option value="1">{t('calendar.every2Weeks')}</option>
              <option value="2">{t('calendar.everyMonth')}</option>
            </select>
          </div>

          {!recurrenceFieldsDisabled && recurrencePattern && recurrencePattern !== '' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('calendar.repeatUntil')}
              </label>
              <input
                {...register('recurrenceEndDate')}
                type="date"
                min={date}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('form.notes')}
            </label>
            <input
              {...register('notes')}
              placeholder={t('form.notesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {mode === 'create'
                ? isSubmitting ? t('calendar.booking') : t('calendar.bookRoomBtn')
                : isSubmitting ? t('calendar.savingChanges') : t('calendar.saveChangesBtn')}
            </button>
            <button
              type="button"
              onClick={close}
              className="flex-1 py-2 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {t('calendar.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
