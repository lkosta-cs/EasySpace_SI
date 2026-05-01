import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { bookingsApi } from '../../api/bookings';
import { format } from 'date-fns';

interface Booking {
  id: number;
  roomName: string;
  start: string;
  end: string;
  notes?: string;
  status: string;
  occasionType: number;
  occasionTypeLabel: string;
  recurringGroupId?: string;
  isRecurringRoot: boolean;
}

export default function MyBookingsPage() {
  const qc = useQueryClient();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: bookingsApi.getMine,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => bookingsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
      toast.success('Booking cancelled');
    },
    onError: () => toast.error('Failed to cancel booking'),
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">My Bookings</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Your upcoming and past room reservations
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading bookings...</p>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No bookings yet.</p>
          <p className="text-sm mt-1">
            Go to the calendar and drag to book a room.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking: Booking) => (
            <div
              key={booking.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">
                    {booking.roomName}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    booking.status === 'Confirmed'
                      ? 'bg-green-100 text-green-700'
                      : booking.status === 'Pending'
                      ? 'bg-yellow-100 text-yellow-700'
                      : booking.status === 'Rejected'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {booking.status}
                  </span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {booking.occasionTypeLabel}
                  </span>
                  {booking.recurringGroupId && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                      Recurring
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
                  <p className="text-xs text-gray-400 mt-1 italic">
                    {booking.notes}
                  </p>
                )}
              </div>
              {booking.status === 'Confirmed' && (
                <button
                  onClick={() => cancelMutation.mutate(booking.id)}
                  className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}