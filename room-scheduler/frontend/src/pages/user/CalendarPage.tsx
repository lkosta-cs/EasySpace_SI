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
import { bookingsApi } from '../../api/bookings';
import { roomsApi } from '../../api/rooms';
import { occasionConfigApi } from '../../api/occasionConfig';
import { useAuthStore } from '../../stores/authStore';
import { format } from 'date-fns';

const schema = z.object({
  roomId: z.coerce.number().min(1, 'Please select a room'),
  notes: z.string().optional(),
  occasionType: z.coerce.number().min(0),
  recurrencePattern: z.string().optional(),
  recurrenceEndDate: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
});

type FormData = z.infer<typeof schema>;

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
  isOwn: boolean;
}

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
  pendingColor: string;
  requiresApproval: boolean;
}

const OCCASION_TYPES = [
  { value: 0, label: 'Kolokvijum' },
  { value: 1, label: 'Ispit' },
  { value: 2, label: 'Lab vežbe' },
];

export default function CalendarPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [conflictDates, setConflictDates] = useState<string[]>([]);

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
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

  // Filter available occasion types based on role
  const availableOccasions = OCCASION_TYPES.filter(o => {
    if (user?.role === 'Assistant') return o.value === 2; // LabVezbe only
    if (user?.role === 'Professor') return o.value !== 2; // Kolokvijum + Ispit
    return true; // Admin/SuperAdmin see all
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      occasionType: availableOccasions[0]?.value ?? 0,
      recurrencePattern: '',
    }
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
        recurrencePattern: data.recurrencePattern
          ? Number(data.recurrencePattern)
          : null,
        recurrenceEndDate: data.recurrenceEndDate
          ? new Date(data.recurrenceEndDate).toISOString()
          : null,
      });
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      if (result.status === 'Pending') {
        toast.success('Booking submitted and awaiting approval');
      } else {
        toast.success(`${result.count > 1 ? `${result.count} bookings` : 'Booking'} created successfully`);
      }
      setModalOpen(false);
      setConflictDates([]);
      reset();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data?.conflictingDates) {
        setConflictDates(data.conflictingDates);
        toast.error('Conflicts found — please choose a different time');
      } else {
        toast.error('Failed to create booking');
      }
    },
  });

  const onSelect = (info: { start: Date; end: Date }) => {
    setSelectedSlot({ start: info.start, end: info.end });
    setConflictDates([]);
    reset({
      occasionType: availableOccasions[0]?.value ?? 0,
      recurrencePattern: '',
      startTime: format(info.start, 'HH:mm'),
      endTime: format(info.end, 'HH:mm'),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedSlot(null);
    setConflictDates([]);
    reset();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Click and drag to book a room
        </p>
      </div>

      {/* Legend */}
      {configs.length > 0 && (
        <div className="flex gap-4 mb-4 flex-wrap">
          {configs.map((config: OccasionConfig) => (
            <div key={config.occasionType} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs text-gray-600">{config.label}</span>
              {config.requiresApproval && (
                <span className="text-xs text-gray-400">(requires approval)</span>
              )}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span className="text-xs text-gray-600">Pending</span>
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
              backgroundColor: isPending
                ? (config?.pendingColor ?? '#d1d5db')
                : (config?.color ?? '#111827'),
              borderColor: isPending
                ? (config?.pendingColor ?? '#d1d5db')
                : (config?.color ?? '#111827'),
              textColor: isPending ? '#374151' : '#ffffff',
            };
          })}
          select={onSelect}
          height="auto"
        />
      </div>

      {/* Booking modal */}
      {modalOpen && selectedSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-medium text-gray-900 mb-1">
              Book a room
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {format(selectedSlot.start, 'EEEE, MMMM d yyyy')}
            </p>

            {/* Conflict warning */}
            {conflictDates.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-red-700 mb-1">
                  Conflicts found on these dates:
                </p>
                <ul className="text-xs text-red-600 space-y-0.5">
                  {conflictDates.map((d, i) => (
                    <li key={i}>• {d}</li>
                  ))}
                </ul>
                <p className="text-xs text-red-500 mt-2">
                  Please adjust the time or choose a different room.
                </p>
              </div>
            )}

            <form
              onSubmit={handleSubmit((d) => createBooking.mutate(d))}
              className="space-y-4"
            >
              {/* Time pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start time
                  </label>
                  <input
                    {...register('startTime')}
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End time
                  </label>
                  <input
                    {...register('endTime')}
                    type="time"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              {/* Occasion type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occasion type
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

              {/* Room */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room
                </label>
                <select
                  {...register('roomId')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Select a room</option>
                  {rooms.map((room: Room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.seats} seats)
                    </option>
                  ))}
                </select>
                {errors.roomId && (
                  <p className="text-red-500 text-xs mt-1">{errors.roomId.message}</p>
                )}
              </div>

              {/* Recurrence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repeat
                </label>
                <select
                  {...register('recurrencePattern')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                >
                  <option value="">Does not repeat</option>
                  <option value="0">Every week</option>
                  <option value="1">Every 2 weeks</option>
                  <option value="2">Every month</option>
                </select>
              </div>

              {/* Recurrence end date */}
              {recurrencePattern && recurrencePattern !== '' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repeat until
                  </label>
                  <input
                    {...register('recurrenceEndDate')}
                    type="date"
                    min={format(selectedSlot.start, 'yyyy-MM-dd')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <input
                  {...register('notes')}
                  placeholder="What is this room being used for?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Booking...' : 'Book room'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}