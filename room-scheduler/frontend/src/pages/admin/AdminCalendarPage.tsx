import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { bookingsApi } from '../../api/bookings';
import { roomsApi } from '../../api/rooms';
import { occasionConfigApi } from '../../api/occasionConfig';
import { format } from 'date-fns';

interface Booking {
  id: number;
  roomId: number;
  roomName: string;
  userName: string;
  start: string;
  end: string;
  notes?: string;
  status: string;
  occasionType: number;
  recurringGroupId?: string;
  isOwn: boolean;
}

interface Room {
  id: number;
  name: string;
  seats: number;
}

interface OccasionConfig {
  occasionType: number;
  label: string;
  color: string;
  pendingColor: string;
  requiresApproval: boolean;
}

export default function AdminCalendarPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [bookingModal, setBookingModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [conflictDates, setConflictDates] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState('');

  const OCCASION_TYPES = [
    { value: 0, label: t('occasionType.0') },
    { value: 1, label: t('occasionType.1') },
    { value: 2, label: t('occasionType.2') },
  ];

  const schema = z.object({
    roomId: z.coerce.number().min(1, t('validation.roomRequired')),
    notes: z.string().optional(),
    occasionType: z.coerce.number().min(0),
    recurrencePattern: z.string().optional(),
    recurrenceEndDate: z.string().optional(),
    startTime: z.string(),
    endTime: z.string(),
  });
  type FormData = z.infer<typeof schema>;

  const { data: bookings = [] } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: bookingsApi.getAll,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['occasionConfigs'],
    queryFn: occasionConfigApi.getAll,
  });

  const getConfig = (occasionType: number): OccasionConfig | undefined =>
    configs.find((c: OccasionConfig) => c.occasionType === occasionType);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { occasionType: 0, recurrencePattern: '' }
  });

  const recurrencePattern = watch('recurrencePattern');

  const createBooking = useMutation({
    mutationFn: (data: FormData) => {
      const baseDate = format(selectedSlot!.start, 'yyyy-MM-dd');
      const start = new Date(`${baseDate}T${data.startTime}`);
      const end = new Date(`${baseDate}T${data.endTime}`);
      return bookingsApi.create({
        roomId: data.roomId,
        start: start.toISOString(),
        end: end.toISOString(),
        occasionType: Number(data.occasionType),
        notes: data.notes,
        recurrencePattern: data.recurrencePattern ? Number(data.recurrencePattern) : null,
        recurrenceEndDate: data.recurrenceEndDate
          ? new Date(data.recurrenceEndDate).toISOString()
          : null,
      });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      toast.success(
        result.count > 1
          ? t('toast.bookingsCreated', { count: result.count })
          : t('toast.bookingCreated')
      );
      setBookingModal(false);
      setConflictDates([]);
      reset();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data?.conflictingDates) {
        setConflictDates(data.conflictingDates);
        toast.error(t('toast.conflictsFound'));
      } else {
        toast.error(t('toast.bookingFailed'));
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      toast.success(t('toast.bookingCancelled'));
      setDetailModal(false);
      setSelectedBooking(null);
    },
    onError: () => toast.error(t('toast.cancelFailed')),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      qc.invalidateQueries({ queryKey: ['pending-bookings'] });
      toast.success(t('toast.bookingApproved'));
      setDetailModal(false);
      setSelectedBooking(null);
    },
    onError: () => toast.error(t('toast.approveFailed')),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      bookingsApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      qc.invalidateQueries({ queryKey: ['pending-bookings'] });
      toast.success(t('toast.bookingRejected'));
      setDetailModal(false);
      setSelectedBooking(null);
      setRejectReason('');
    },
    onError: () => toast.error(t('toast.rejectFailed')),
  });

  const onSelect = (info: { start: Date; end: Date }) => {
    setSelectedSlot({ start: info.start, end: info.end });
    setConflictDates([]);
    reset({
      occasionType: 0,
      recurrencePattern: '',
      startTime: format(info.start, 'HH:mm'),
      endTime: format(info.end, 'HH:mm'),
    });
    setBookingModal(true);
  };

  const onEventClick = (info: any) => {
    const booking = bookings.find((b: Booking) => String(b.id) === info.event.id);
    if (booking) {
      setSelectedBooking(booking);
      setRejectReason('');
      setDetailModal(true);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('calendar.title')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('calendar.adminSubtitle')}</p>
      </div>

      {configs.length > 0 && (
        <div className="flex gap-4 mb-4 flex-wrap">
          {configs.map((config: OccasionConfig) => (
            <div key={config.occasionType} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
              <span className="text-xs text-gray-600">{config.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-xs text-gray-600">{t('calendar.pending')}</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          selectable={true}
          selectMirror={true}
          nowIndicator={true}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={bookings.map((b: Booking) => {
            const config = getConfig(b.occasionType);
            const isPending = b.status === 'Pending';
            return {
              id: String(b.id),
              title: `${b.roomName} — ${b.userName}`,
              start: b.start,
              end: b.end,
              backgroundColor: isPending ? (config?.pendingColor ?? '#d1d5db') : (config?.color ?? '#111827'),
              borderColor: isPending ? (config?.pendingColor ?? '#d1d5db') : (config?.color ?? '#111827'),
              textColor: isPending ? '#374151' : '#ffffff',
            };
          })}
          select={onSelect}
          eventClick={onEventClick}
          height="auto"
        />
      </div>

      {/* Create booking modal */}
      {bookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-medium text-gray-900 mb-1">
              {t('calendar.createBooking')}
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {format(selectedSlot.start, 'EEEE, MMMM d yyyy')}
            </p>

            {conflictDates.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-red-700 mb-1">
                  {t('calendar.conflictsFoundOn')}
                </p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {conflictDates.map((d, i) => <li key={i}>• {d}</li>)}
                </ul>
                <p className="text-xs text-red-500 mt-2">{t('calendar.adjustTime')}</p>
              </div>
            )}

            <form
              onSubmit={handleSubmit((d) => createBooking.mutate(d))}
              className="space-y-4"
            >
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
                  {OCCASION_TYPES.map(o => (
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
                  <p className="text-red-500 text-xs mt-1">{errors.roomId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('calendar.repeat')}
                </label>
                <select
                  {...register('recurrencePattern')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">{t('calendar.doesNotRepeat')}</option>
                  <option value="0">{t('calendar.everyWeek')}</option>
                  <option value="1">{t('calendar.every2Weeks')}</option>
                  <option value="2">{t('calendar.everyMonth')}</option>
                </select>
              </div>

              {recurrencePattern && recurrencePattern !== '' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('calendar.repeatUntil')}
                  </label>
                  <input
                    {...register('recurrenceEndDate')}
                    type="date"
                    min={format(selectedSlot.start, 'yyyy-MM-dd')}
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
                  {isSubmitting ? t('calendar.creating') : t('calendar.createBooking')}
                </button>
                <button
                  type="button"
                  onClick={() => { setBookingModal(false); reset(); }}
                  className="flex-1 py-2 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  {t('calendar.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking detail modal */}
      {detailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-base font-medium text-gray-900">
                {t('calendar.bookingDetails')}
              </h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedBooking.status === 'Confirmed'
                  ? 'bg-green-100 text-green-700'
                  : selectedBooking.status === 'Pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-600'
              }`}>
                {t(`status.${selectedBooking.status}`, { defaultValue: selectedBooking.status })}
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('calendar.room')}</span>
                <span className="font-medium text-gray-900">{selectedBooking.roomName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('calendar.bookedBy')}</span>
                <span className="font-medium text-gray-900">{selectedBooking.userName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('calendar.type')}</span>
                <span className="font-medium text-gray-900">
                  {OCCASION_TYPES.find(o => o.value === selectedBooking.occasionType)?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('calendar.date')}</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(selectedBooking.start), 'EEEE, MMMM d yyyy')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('calendar.time')}</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(selectedBooking.start), 'HH:mm')} —{' '}
                  {format(new Date(selectedBooking.end), 'HH:mm')}
                </span>
              </div>
              {selectedBooking.recurringGroupId && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('calendar.recurring')}</span>
                  <span className="font-medium text-gray-900">{t('calendar.recurringCancels')}</span>
                </div>
              )}
              {selectedBooking.notes && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('calendar.notes')}</span>
                  <span className="font-medium text-gray-900">{selectedBooking.notes}</span>
                </div>
              )}
            </div>

            {selectedBooking.status === 'Pending' && (
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('calendar.rejectionReason')}
                  </label>
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t('calendar.rejectionPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate(selectedBooking.id)}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    {t('calendar.approve')}
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate({ id: selectedBooking.id, reason: rejectReason })}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    {t('calendar.reject')}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {selectedBooking.status === 'Confirmed' && (
                <button
                  onClick={() => cancelMutation.mutate(selectedBooking.id)}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  {t('calendar.cancelBooking')}
                </button>
              )}
              <button
                onClick={() => { setDetailModal(false); setSelectedBooking(null); }}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {t('calendar.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
