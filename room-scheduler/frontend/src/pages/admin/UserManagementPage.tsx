import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usersApi } from '../../api/users';
import { roomsApi } from '../../api/rooms';
import { useAuthStore } from '../../stores/authStore';
import EditUserModal from '../../components/EditUserModal';

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
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();

  const [selectedUser] = useState<User | null>(null);
  // const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editUserId, setEditUserId] = useState<string | null>(null);

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
      toast.success(t('toast.userStatusUpdated'));
    },
    onError: () => toast.error(t('toast.userStatusFailed')),
  });

  const setPermissionMutation = useMutation({
    mutationFn: ({ id, roomId, level }: { id: string; roomId: number; level: number }) =>
      usersApi.setPermission(id, roomId, level),
    onSuccess: async () => {
      if (selectedUser) {
        const perms = await usersApi.getPermissions(selectedUser.id);
        setPermissions(perms);
      }
      toast.success(t('toast.permissionUpdated'));
    },
    onError: () => toast.error(t('toast.permissionFailed')),
  });

  const removePermissionMutation = useMutation({
    mutationFn: ({ id, roomId }: { id: string; roomId: number }) =>
      usersApi.removePermission(id, roomId),
    onSuccess: async () => {
      if (selectedUser) {
        const perms = await usersApi.getPermissions(selectedUser.id);
        setPermissions(perms);
      }
      toast.success(t('toast.permissionRemoved'));
    },
    onError: () => toast.error(t('toast.permissionRemoveFailed')),
  });

  // const openPermissions = async (user: User) => {
  //   setSelectedUser(user);
  //   const perms = await usersApi.getPermissions(user.id);
  //   setPermissions(perms);
  // };

  const getPermissionLevel = (roomId: number): string | null => {
    const p = permissions.find((p) => p.roomId === roomId);
    return p ? p.level : null;
  };

  const isSuperAdmin = currentUser?.role === 'SuperAdmin';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('users.title')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('users.subtitle')}</p>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          {isLoading ? (
            <p className="text-sm text-gray-500">{t('users.loading')}</p>
          ) : (
            users.filter((u: User) => u.id !== currentUser?.id).map((user: User) => (
              <div
                key={user.id}
                className={`bg-white border rounded-2xl p-5 cursor-pointer transition-colors ${
                  selectedUser?.id === user.id
                    ? 'border-gray-900'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                // onClick={() => openPermissions(user)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                      <span className="text-xs text-gray-400">
                        {t(`role.${user.role}`, { defaultValue: user.role })}
                      </span>
                      {!user.isActive && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          {t('users.inactive')}
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
                      {user.isActive ? t('users.deactivate') : t('users.activate')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditUserId(user.id);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {t('users.edit')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {selectedUser && (
          <div className="w-80 bg-white border border-gray-200 rounded-2xl p-5 h-fit">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {t('users.roomPermissions')}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{selectedUser.fullName}</p>
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
                            ? removePermissionMutation.mutate({ id: selectedUser.id, roomId: room.id })
                            : setPermissionMutation.mutate({ id: selectedUser.id, roomId: room.id, level: 0 })
                        }
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                          level === 'ViewOnly'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {t('users.view')}
                      </button>
                      <button
                        onClick={() =>
                          level === 'CanBook'
                            ? removePermissionMutation.mutate({ id: selectedUser.id, roomId: room.id })
                            : setPermissionMutation.mutate({ id: selectedUser.id, roomId: room.id, level: 1 })
                        }
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                          level === 'CanBook'
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {t('users.book')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {editUserId && (
        <EditUserModal
          userId={editUserId}
          isSelf={false}
          canEditRole={true}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setEditUserId(null)}
        />
      )}
    </div>
  );
}
