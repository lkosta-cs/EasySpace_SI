import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { roomsApi, type RoomListItem, type RoomsQueryParams } from '../../api/rooms';
import { useUrlState } from '../../hooks/useUrlState';

type Room = RoomListItem;

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SORT_FIELDS: NonNullable<RoomsQueryParams['sortBy']>[] = ['name', 'seats', 'status'];

const URL_DEFAULTS = {
  search: '',
  minSeats: '',
  softwarePackage: '',
  status: 'all' as 'all' | 'active' | 'inactive',
  sortBy: 'name' as NonNullable<RoomsQueryParams['sortBy']>,
  sortDir: 'asc' as NonNullable<RoomsQueryParams['sortDir']>,
  page: 1,
  pageSize: 20,
};

export default function RoomManagementPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // Applied filters, sort and paging — persisted to the URL so they survive refresh/back/share
  const [urlState, setUrlState] = useUrlState(URL_DEFAULTS, 'rooms-filters');
  const { sortBy, sortDir, page, pageSize } = urlState;

  // Draft filter values — only applied to the query when "Search" is clicked
  const [searchDraft, setSearchDraft] = useState(urlState.search);
  const [minSeatsDraft, setMinSeatsDraft] = useState(urlState.minSeats);
  const [softwarePackageDraft, setSoftwarePackageDraft] = useState(urlState.softwarePackage);
  const [statusDraft, setStatusDraft] = useState(urlState.status);

  // Re-sync drafts whenever the applied filters change from outside the Search button
  // (URL restored from storage, or navigating directly to a URL with different params).
  useEffect(() => {
    setSearchDraft(urlState.search);
    setMinSeatsDraft(urlState.minSeats);
    setSoftwarePackageDraft(urlState.softwarePackage);
    setStatusDraft(urlState.status);
  }, [urlState.search, urlState.minSeats, urlState.softwarePackage, urlState.status]);

  const queryParams: RoomsQueryParams = {
    search: urlState.search || undefined,
    minSeats: urlState.minSeats ? Number(urlState.minSeats) : undefined,
    softwarePackage: urlState.softwarePackage || undefined,
    status: urlState.status === 'all' ? undefined : urlState.status,
    sortBy,
    sortDir,
    page,
    pageSize,
  };

  const schema = z.object({
    name: z.string().min(1, t('validation.roomNameRequired')),
    seats: z.coerce.number().min(1, t('validation.seatsMin')),
    description: z.string().optional(),
    softwarePackages: z.string().optional(),
  });
  type FormData = z.infer<typeof schema>;

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', 'search', queryParams],
    queryFn: () => roomsApi.search(queryParams),
  });

  const rooms = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  const { data: softwarePackageOptions = [] } = useQuery({
    queryKey: ['rooms', 'software-packages'],
    queryFn: roomsApi.getSoftwarePackages,
  });

  const runSearch = () => {
    setUrlState({
      search: searchDraft.trim(),
      minSeats: minSeatsDraft.trim(),
      softwarePackage: softwarePackageDraft,
      status: statusDraft,
      page: 1,
    });
  };

  const toggleSort = (field: NonNullable<RoomsQueryParams['sortBy']>) => {
    if (sortBy === field) {
      setUrlState({ sortDir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      setUrlState({ sortBy: field, sortDir: 'asc', page: 1 });
    }
  };

  const changePageSize = (value: number) => {
    setUrlState({ pageSize: value, page: 1 });
  };

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
      toast.success(t('toast.roomCreated'));
      reset();
      setShowForm(false);
    },
    onError: () => toast.error(t('toast.roomCreateFailed')),
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
      toast.success(t('toast.roomUpdated'));
      reset();
      setEditingRoom(null);
      setShowForm(false);
    },
    onError: () => toast.error(t('toast.roomUpdateFailed')),
  });

  const deleteMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(t('toast.roomDeactivated'));
    },
    onError: () => toast.error(t('toast.roomDeactivateFailed')),
  });

  const reactivateMutation = useMutation({
    mutationFn: roomsApi.reactivate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success(t('toast.roomReactivated'));
    },
    onError: () => toast.error(t('toast.roomReactivateFailed')),
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('rooms.title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('rooms.subtitle')}</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          {t('rooms.addRoom')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {editingRoom ? t('rooms.editRoom') : t('rooms.newRoom')}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('rooms.name')}
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
                  {t('rooms.seats')}
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
                {t('rooms.description')}
              </label>
              <input
                {...register('description')}
                placeholder="Optional description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('rooms.softwarePackages')}
              </label>
              <input
                {...register('softwarePackages')}
                placeholder="e.g. AutoCAD, Photoshop, MATLAB"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">{t('rooms.softwarePackagesHint')}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {editingRoom ? t('rooms.saveChanges') : t('rooms.createRoom')}
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {t('calendar.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-55">
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder={t('rooms.searchPlaceholder')}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <input
            type="number"
            min={0}
            value={minSeatsDraft}
            onChange={(e) => setMinSeatsDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder={t('rooms.minSeats')}
            className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />

          <select
            value={softwarePackageDraft}
            onChange={(e) => setSoftwarePackageDraft(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          >
            <option value="">{t('rooms.filterSoftware')}</option>
            {softwarePackageOptions.map((name: string) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value as 'all' | 'active' | 'inactive')}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          >
            <option value="all">{t('rooms.filterStatus')}: {t('rooms.statusAll')}</option>
            <option value="active">{t('rooms.filterStatus')}: {t('rooms.statusActive')}</option>
            <option value="inactive">{t('rooms.filterStatus')}: {t('rooms.statusInactive')}</option>
          </select>

          <button
            type="button"
            onClick={runSearch}
            className="text-sm bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800"
          >
            {t('rooms.search')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-500">{t('rooms.sortBy')}:</span>
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
              {t(`rooms.sort${field[0].toUpperCase()}${field.slice(1)}`)}
              {sortBy === field && (sortDir === 'asc' ? ' ↑' : ' ↓')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('rooms.loading')}</p>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">
            {urlState.search || urlState.minSeats || urlState.softwarePackage || urlState.status !== 'all'
              ? t('rooms.noRoomsFiltered')
              : t('rooms.noRooms')}
          </p>
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
                    {t('rooms.seatsLabel', { count: room.seats })}
                  </span>
                  {!room.isActive && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {t('rooms.inactive')}
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
                  {t('rooms.edit')}
                </button>
                {room.isActive ? (
                  <button
                    onClick={() => deleteMutation.mutate(room.id)}
                    className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    {t('rooms.deactivate')}
                  </button>
                ) : (
                  <button
                    onClick={() => reactivateMutation.mutate(room.id)}
                    className="text-sm text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    {t('rooms.activate')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && rooms.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('rooms.pageSize')}:</span>
            <select
              value={pageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
              <option value={-1}>{t('rooms.pageSizeAll')}</option>
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
                {t('rooms.pagePrev')}
              </button>
              <span className="text-xs text-gray-500">
                {t('rooms.pageOf', { page, totalPages })}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setUrlState({ page: Math.min(totalPages, page + 1) })}
                className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {t('rooms.pageNext')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
