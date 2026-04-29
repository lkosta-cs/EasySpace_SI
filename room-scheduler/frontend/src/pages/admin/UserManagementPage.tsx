import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from '../../api/users';
import { roomsApi } from '../../api/rooms';

interface User {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  role: string;
}

interface Permission {
  roomId: number;
  roomName: string;
  level: string;
}

interface Room {
  id: number;
  name: string;
}

export default function UserManagementPage() {
  const qc = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => usersApi.toggleActive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: () => toast.error('Failed to update user status'),
  });

  const setRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      usersApi.setRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  const setPermissionMutation = useMutation({
    mutationFn: ({ id, roomId, level }: { id: string; roomId: number; level: number }) =>
      usersApi.setPermission(id, roomId, level),
    onSuccess: async () => {
      if (selectedUser) {
        const perms = await usersApi.getPermissions(selectedUser.id);
        setPermissions(perms);
      }
      toast.success('Permission updated');
    },
    onError: () => toast.error('Failed to update permission'),
  });

  const removePermissionMutation = useMutation({
    mutationFn: ({ id, roomId }: { id: string; roomId: number }) =>
      usersApi.removePermission(id, roomId),
    onSuccess: async () => {
      if (selectedUser) {
        const perms = await usersApi.getPermissions(selectedUser.id);
        setPermissions(perms);
      }
      toast.success('Permission removed');
    },
    onError: () => toast.error('Failed to remove permission'),
  });

  const openPermissions = async (user: User) => {
    setSelectedUser(user);
    const perms = await usersApi.getPermissions(user.id);
    setPermissions(perms);
  };

  const getPermissionLevel = (roomId: number): string | null => {
    const p = permissions.find((p) => p.roomId === roomId);
    return p ? p.level : null;
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Users</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage user accounts and room permissions
        </p>
      </div>

      <div className="flex gap-6">
        {/* Users list */}
        <div className="flex-1 space-y-3">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading users...</p>
          ) : (
            users.map((user: User) => (
              <div
                key={user.id}
                className={`bg-white border rounded-2xl p-5 cursor-pointer transition-colors ${
                  selectedUser?.id === user.id
                    ? 'border-gray-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => openPermissions(user)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {user.fullName}
                      </p>
                      {!user.isActive && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActiveMutation.mutate(user.id);
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                        user.isActive
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <select
                      onClick={(e) => e.stopPropagation()}
                      defaultValue={user.role ?? 'User'}
                      onChange={(e) =>
                        setRoleMutation.mutate({
                          id: user.id,
                          role: e.target.value,
                        })
                      }
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Permissions panel */}
        {selectedUser && (
          <div className="w-80 bg-white border border-gray-200 rounded-2xl p-5 h-fit">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Room permissions
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {selectedUser.fullName}
            </p>
            <div className="space-y-2">
              {rooms.map((room: Room) => {
                const level = getPermissionLevel(room.id);
                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-sm text-gray-700">{room.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          level === 'ViewOnly'
                            ? removePermissionMutation.mutate({
                                id: selectedUser.id,
                                roomId: room.id,
                              })
                            : setPermissionMutation.mutate({
                                id: selectedUser.id,
                                roomId: room.id,
                                level: 0,
                              })
                        }
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                          level === 'ViewOnly'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        View
                      </button>
                      <button
                        onClick={() =>
                          level === 'CanBook'
                            ? removePermissionMutation.mutate({
                                id: selectedUser.id,
                                roomId: room.id,
                              })
                            : setPermissionMutation.mutate({
                                id: selectedUser.id,
                                roomId: room.id,
                                level: 1,
                              })
                        }
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                          level === 'CanBook'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}