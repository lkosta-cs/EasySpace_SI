import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { usersApi, type UserListItem, type UsersQueryParams } from '../../api/users';
import { roomsApi } from '../../api/rooms';
import { useAuthStore } from '../../stores/authStore';
import EditUserModal from '../../components/EditUserModal';
import { useUrlState } from '../../hooks/useUrlState';

type User = UserListItem;

interface Permission {
  roomId: number;
  roomName: string;
  level: string;
}

interface Room {
  id: number;
  name: string;
}

const ROLE_OPTIONS = ['User', 'Assistant', 'Professor', 'Admin', 'SuperAdmin'];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SORT_FIELDS: NonNullable<UsersQueryParams['sortBy']>[] = ['name', 'surname', 'email', 'role', 'status'];

const URL_DEFAULTS = {
  search: '',
  roles: [] as string[],
  status: 'all' as 'all' | 'active' | 'inactive',
  sortBy: 'name' as NonNullable<UsersQueryParams['sortBy']>,
  sortDir: 'asc' as NonNullable<UsersQueryParams['sortDir']>,
  page: 1,
  pageSize: 20,
};

export default function UserManagementPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();

  const [selectedUser] = useState<User | null>(null);
  // const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editUserId, setEditUserId] = useState<string | null>(null);

  // Applied filters, sort and paging — persisted to the URL so they survive refresh/back/share
  const [urlState, setUrlState] = useUrlState(URL_DEFAULTS, 'users-filters');
  const { sortBy, sortDir, page, pageSize } = urlState;

  // Draft filter values — only applied to the query when "Search" is clicked
  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const [rolesDraft, setRolesDraft] = useState<Set<string>>(new Set(urlState.roles));
  const [statusDraft, setStatusDraft] = useState(urlState.status);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  // Re-sync drafts whenever the applied filters change from outside the Search button
  // (URL restored from storage, or navigating directly to a URL with different params).
  const rolesKey = JSON.stringify(urlState.roles);
  useEffect(() => {
    setSearchDraft(urlState.search);
    setRolesDraft(new Set(urlState.roles));
    setStatusDraft(urlState.status);
  }, [urlState.search, rolesKey, urlState.status]);

  const queryParams: UsersQueryParams = {
    search: urlState.search || undefined,
    roles: urlState.roles.length > 0 ? urlState.roles : undefined,
    status: urlState.status === 'all' ? undefined : urlState.status,
    sortBy,
    sortDir,
    page,
    pageSize,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['users', queryParams],
    queryFn: () => usersApi.getAll(queryParams),
  });

  const users = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.getAll,
  });

  const runSearch = () => {
    setUrlState({
      search: searchDraft.trim(),
      roles: Array.from(rolesDraft),
      status: statusDraft,
      page: 1,
    });
  };

  const toggleRoleDraft = (role: string) => {
    setRolesDraft((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const toggleSort = (field: NonNullable<UsersQueryParams['sortBy']>) => {
    if (sortBy === field) {
      setUrlState({ sortDir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      setUrlState({ sortBy: field, sortDir: 'asc', page: 1 });
    }
  };

  const changePageSize = (value: number) => {
    setUrlState({ pageSize: value, page: 1 });
  };

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

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-55">
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder={t('users.searchPlaceholder')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleDropdownOpen((prev) => !prev)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-50"
            >
              {t('users.filterRole')}
              {rolesDraft.size > 0 ? ` (${rolesDraft.size})` : ''}
            </button>
            {roleDropdownOpen && (
              <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1">
                {ROLE_OPTIONS.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 text-sm text-gray-700 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={rolesDraft.has(role)}
                      onChange={() => toggleRoleDraft(role)}
                      className="rounded border-gray-300"
                    />
                    {t(`role.${role}`, { defaultValue: role })}
                  </label>
                ))}
              </div>
            )}
          </div>

          <select
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          >
            <option value="all">{t('users.filterStatus')}: {t('users.statusAll')}</option>
            <option value="active">{t('users.filterStatus')}: {t('users.statusActive')}</option>
            <option value="inactive">{t('users.filterStatus')}: {t('users.statusInactive')}</option>
          </select>

          <button
            type="button"
            onClick={runSearch}
            className="text-sm bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800"
          >
            {t('users.search')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-500">{t('users.sortBy')}:</span>
          {SORT_FIELDS.map((field) => (
            <button
              key={field}
              type="button"
              onClick={() => toggleSort(field)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                sortBy === field
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(`users.sort${field[0].toUpperCase()}${field.slice(1)}`)}
              {sortBy === field && (sortDir === 'asc' ? ' ↑' : ' ↓')}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          {isLoading ? (
            <p className="text-sm text-gray-500">{t('users.loading')}</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500">{t('users.noUsers')}</p>
          ) : (
            users.map((user: User) => (
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

          {!isLoading && users.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t('users.pageSize')}:</span>
                <select
                  value={pageSize}
                  onChange={(e) => changePageSize(Number(e.target.value))}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                  <option value={-1}>{t('users.pageSizeAll')}</option>
                </select>
              </div>

              {pageSize > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setUrlState({ page: Math.max(1, page - 1) })}
                    className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {t('users.pagePrev')}
                  </button>
                  <span className="text-xs text-gray-500">
                    {t('users.pageOf', { page, totalPages })}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setUrlState({ page: Math.min(totalPages, page + 1) })}
                    className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {t('users.pageNext')}
                  </button>
                </div>
              )}
            </div>
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
