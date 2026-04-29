import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { roomsApi } from '../../api/rooms';

const schema = z.object({
  name: z.string().min(1, 'Room name is required'),
  seats: z.coerce.number().min(1, 'Must have at least 1 seat'),
  description: z.string().optional(),
  softwarePackages: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Room {
  id: number;
  name: string;
  seats: number;
  description?: string;
  isActive: boolean;
  softwarePackages: { id: number; name: string }[];
}

export default function RoomManagementPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const { data: rooms = [], isLoading } = useQuery({
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

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      roomsApi.create({
        name: data.name,
        seats: data.seats,
        description: data.description,
        softwarePackages: data.softwarePackages
          ? data.softwarePackages.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room created successfully');
      reset();
      setShowForm(false);
    },
    onError: () => toast.error('Failed to create room'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      roomsApi.update(editingRoom!.id, {
        name: data.name,
        seats: data.seats,
        description: data.description,
        softwarePackages: data.softwarePackages
          ? data.softwarePackages.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room updated successfully');
      reset();
      setEditingRoom(null);
      setShowForm(false);
    },
    onError: () => toast.error('Failed to update room'),
  });

  const deleteMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room deactivated');
    },
    onError: () => toast.error('Failed to deactivate room'),
  });

  const onSubmit = (data: FormData): void => {
    if (editingRoom) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    reset({
      name: room.name,
      seats: room.seats,
      description: room.description ?? '',
      softwarePackages: room.softwarePackages.map((s) => s.name).join(', '),
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditingRoom(null);
    reset({ name: '', seats: 1, description: '', softwarePackages: '' });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRoom(null);
    reset();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rooms</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage bookable rooms and their software
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          Add room
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {editingRoom ? 'Edit room' : 'New room'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room name
                </label>
                <input
                  {...register('name')}
                  placeholder="e.g. Conference Room A"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {errors.name && (
                  <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seats
                </label>
                <input
                  {...register('seats')}
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {errors.seats && (
                  <p className="text-red-500 text-xs mt-1">{errors.seats.message}</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                {...register('description')}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Software packages
              </label>
              <input
                {...register('softwarePackages')}
                placeholder="e.g. AutoCAD, Photoshop, MATLAB"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">
                Separate multiple packages with commas
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {editingRoom ? 'Save changes' : 'Create room'}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rooms list */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading rooms...</p>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No rooms yet. Add your first room above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room: Room) => (
            <div
              key={room.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">{room.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {room.seats} seats
                  </span>
                  {!room.isActive && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                {room.description && (
                  <p className="text-xs text-gray-500 mt-1">{room.description}</p>
                )}
                {room.softwarePackages.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {room.softwarePackages.map((pkg) => (
                      <span
                        key={pkg.id}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"
                      >
                        {pkg.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => openEdit(room)}
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Edit
                </button>
                {room.isActive && (
                  <button
                    onClick={() => deleteMutation.mutate(room.id)}
                    className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}