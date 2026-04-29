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
import { format } from 'date-fns';

const schema = z.object({
  roomId: z.coerce.number().min(1, 'Please select a room'),
  notes: z.string().optional(),
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
  isOwn: boolean;
}

interface Room {
  id: number;
  name: string;
  seats: number;
}

export default function AdminCalendarPage() {
  const qc = useQueryClient();
  const [bookingModal, setBookingModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data: bookings = [] } = useQuery({
    queryKey: ['all-bookings'],
    queryFn: bookingsApi.getAll,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData, unknown, FormData>({
    resolver: zodResolver(schema) as any,
  });

  const createBooking = useMutation({
    mutationFn: (data: FormData) =>
      bookingsApi.create({
        roomId: data.roomId,
        start: selectedSlot!.start.toISOString(),
        end: selectedSlot!.end.toISOString(),
        notes: data.notes,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      toast.success('Booking created');
      setBookingModal(false);
      reset();
    },
    onError: () => toast.error('Room is already booked for this time'),
  });

  const cancelBooking = useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      toast.success('Booking cancelled');
      setDetailModal(false);
      setSelectedBooking(null);
    },
    onError: () => toast.error('Failed to cancel booking'),
  });

  const onSelect = (info: { start: Date; end: Date }) => {
    setSelectedSlot({ start: info.start, end: info.end });
    setBookingModal(true);
  };

  const onEventClick = (info: any) => {
    const booking = bookings.find(
      (b: Booking) => String(b.id) === info.event.id
    );
    if (booking) {
      setSelectedBooking(booking);
      setDetailModal(true);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date: Date) =>
    date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          View and manage all room bookings. Click a booking to manage it, drag to create a new one.
        </p>
      </div>

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
          events={bookings.map((b: Booking) => ({
            id: String(b.id),
            title: `${b.roomName} — ${b.userName}`,
            start: b.start,
            end: b.end,
            backgroundColor: b.isOwn ? '#111827' : '#6b7280',
            borderColor: b.isOwn ? '#111827' : '#6b7280',
          }))}
          select={onSelect}
          eventClick={onEventClick}
          height="auto"
        />
      </div>

      {/* Create booking modal */}
      {bookingModal && selectedSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-base font-medium text-gray-900 mb-1">
              Create booking
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              {formatDate(selectedSlot.start)},{' '}
              {formatTime(selectedSlot.start)} — {formatTime(selectedSlot.end)}
            </p>
            <form onSubmit={handleSubmit((d) => createBooking.mutate(d))} className="space-y-4">
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
                  {isSubmitting ? 'Creating...' : 'Create booking'}
                </button>
                <button
                  type="button"
                  onClick={() => { setBookingModal(false); reset(); }}
                  className="flex-1 py-2 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
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
            <h3 className="text-base font-medium text-gray-900 mb-4">
              Booking details
            </h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Room</span>
                <span className="font-medium text-gray-900">{selectedBooking.roomName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Booked by</span>
                <span className="font-medium text-gray-900">{selectedBooking.userName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Date</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(selectedBooking.start), 'EEEE, MMMM d yyyy')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Time</span>
                <span className="font-medium text-gray-900">
                  {format(new Date(selectedBooking.start), 'HH:mm')} —{' '}
                  {format(new Date(selectedBooking.end), 'HH:mm')}
                </span>
              </div>
              {selectedBooking.notes && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Notes</span>
                  <span className="font-medium text-gray-900">{selectedBooking.notes}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => cancelBooking.mutate(selectedBooking.id)}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Cancel booking
              </button>
              <button
                onClick={() => { setDetailModal(false); setSelectedBooking(null); }}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}