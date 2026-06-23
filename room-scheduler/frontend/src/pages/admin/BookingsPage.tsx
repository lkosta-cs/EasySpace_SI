import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { bookingsApi, type BookingsQueryParams, type EditScope } from '../../api/bookings';
import { occasionConfigApi } from '../../api/occasionConfig';
import { usersApi } from '../../api/users';
import { format } from 'date-fns';
import BookingFormModal from '../../components/BookingFormModal';
import RecurringScopeModal from '../../components/RecurringScopeModal';
import { useUrlState } from '../../hooks/useUrlState';

interface Booking {
  id: number;
  roomName: string;
  userId: string;
  userName: string;
  start: string;
  end: string;
  notes?: string;
  isCancelled: boolean;
  occasionType: number;
  occasionTypeLabel: string;
  isOwn: boolean;
  recurringGroupId?: string;
}

interface OccasionConfig {
  id: number;
  occasionType: number;
  label: string;
  color: string;
}

const OCCASION_TYPE_NAMES = ['Kolokvijum', 'Ispit', 'LabVezbe'];
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SORT_FIELDS: NonNullable<BookingsQueryParams['sortBy']>[] = ['room', 'user', 'date', 'status'];

const URL_DEFAULTS = {
  roomName: '',
  description: '',
  occasionType: '',
  status: 'all' as 'all' | 'active' | 'cancelled',
  startDate: '',
  endDate: '',
  userId: '',
  sortBy: 'date' as NonNullable<BookingsQueryParams['sortBy']>,
  sortDir: 'asc' as NonNullable<BookingsQueryParams['sortDir']>,
  page: 1,
  pageSize: 20,
};

export default function BookingsPage() {
  const qc = useQueryClient();
  const { t } = useTranslation();

  // Applied filters, sort and paging — persisted to the URL so they survive refresh/back/share
  const [urlState, setUrlState] = useUrlState(URL_DEFAULTS, 'bookings-filters');
  const { sortBy, sortDir, page, pageSize } = urlState;

  // Draft filter values — only applied to the query when "Search" is clicked
  const [roomNameDraft, setRoomNameDraft] = useState(urlState.roomName);
  const [descriptionDraft, setDescriptionDraft] = useState(urlState.description);
  const [occasionTypeDraft, setOccasionTypeDraft] = useState(urlState.occasionType);
  const [statusDraft, setStatusDraft] = useState(urlState.status);
  const [startDateDraft, setStartDateDraft] = useState(urlState.startDate);
  const [endDateDraft, setEndDateDraft] = useState(urlState.endDate);
  const [userIdDraft, setUserIdDraft] = useState(urlState.userId);

  // Re-sync drafts whenever the applied filters change from outside the Search button
  // (URL restored from storage, or navigating directly to a URL with different params).
  useEffect(() => {
    setRoomNameDraft(urlState.roomName);
    setDescriptionDraft(urlState.description);
    setOccasionTypeDraft(urlState.occasionType);
    setStatusDraft(urlState.status);
    setStartDateDraft(urlState.startDate);
    setEndDateDraft(urlState.endDate);
    setUserIdDraft(urlState.userId);
  }, [
    urlState.roomName,
    urlState.description,
    urlState.occasionType,
    urlState.status,
    urlState.startDate,
    urlState.endDate,
    urlState.userId,
  ]);

  const [editBookingId, setEditBookingId] = useState<number | null>(null);
  const [scopePrompt, setScopePrompt] = useState<{ booking: Booking; action: 'cancel' | 'restore' } | null>(null);

  const queryParams: BookingsQueryParams = {
    roomName: urlState.roomName || undefined,
    description: urlState.description || undefined,
    occasionType: urlState.occasionType || undefined,
    status: urlState.status === 'all' ? undefined : urlState.status,
    startDate: urlState.startDate || undefined,
    endDate: urlState.endDate || undefined,
    userId: urlState.userId || undefined,
    sortBy,
    sortDir,
    page,
    pageSize,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['all-bookings', 'search', queryParams],
    queryFn: () => bookingsApi.getAll(queryParams),
  });

  const bookings: Booking[] = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;

  const { data: occasionConfigs = [] } = useQuery({
    queryKey: ['occasionConfigs'],
    queryFn: occasionConfigApi.getAll,
  });
  const getOccasionConfig = (occasionType: number): OccasionConfig | undefined =>
    occasionConfigs.find((c: OccasionConfig) => c.occasionType === occasionType);

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all-for-filter'],
    queryFn: () => usersApi.getAll({ pageSize: -1, sortBy: 'name', roles: ['Professor', 'Assistant'] }),
  });
  const userOptions = usersData?.items ?? [];

  const runSearch = () => {
    setUrlState({
      roomName: roomNameDraft.trim(),
      description: descriptionDraft.trim(),
      occasionType: occasionTypeDraft,
      status: statusDraft,
      startDate: startDateDraft,
      endDate: endDateDraft,
      userId: userIdDraft,
      page: 1,
    });
  };

  const toggleSort = (field: NonNullable<BookingsQueryParams['sortBy']>) => {
    if (sortBy === field) {
      setUrlState({ sortDir: sortDir === 'asc' ? 'desc' : 'asc', page: 1 });
    } else {
      setUrlState({ sortBy: field, sortDir: 'asc', page: 1 });
    }
  };

  const changePageSize = (value: number) => {
    setUrlState({ pageSize: value, page: 1 });
  };

  const cancelMutation = useMutation({
    mutationFn: ({ id, scope }: { id: number; scope: EditScope }) => bookingsApi.cancel(id, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      toast.success(t('toast.bookingCancelled'));
      setScopePrompt(null);
    },
    onError: () => toast.error(t('toast.cancelFailed')),
  });

  const restoreMutation = useMutation({
    mutationFn: ({ id, scope }: { id: number; scope: EditScope }) => bookingsApi.restore(id, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-bookings'] });
      toast.success(t('toast.bookingRestored'));
      setScopePrompt(null);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.status === 409
          ? t('toast.conflictsFound')
          : t('toast.restoreFailed')
      );
    },
  });

  const requestCancel = (booking: Booking) => {
    if (booking.recurringGroupId) setScopePrompt({ booking, action: 'cancel' });
    else cancelMutation.mutate({ id: booking.id, scope: 'single' });
  };

  const requestRestore = (booking: Booking) => {
    if (booking.recurringGroupId) setScopePrompt({ booking, action: 'restore' });
    else restoreMutation.mutate({ id: booking.id, scope: 'single' });
  };

  const confirmScope = (scope: EditScope) => {
    if (!scopePrompt) return;
    const { booking, action } = scopePrompt;
    if (action === 'cancel') cancelMutation.mutate({ id: booking.id, scope });
    else restoreMutation.mutate({ id: booking.id, scope });
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t('bookings.title')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('bookings.subtitle')}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <input
            type="text"
            value={roomNameDraft}
            onChange={(e) => setRoomNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder={t('bookings.searchRoomPlaceholder')}
            className="flex-1 min-w-40 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />

          <input
            type="text"
            value={descriptionDraft}
            onChange={(e) => setDescriptionDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder={t('bookings.searchDescriptionPlaceholder')}
            className="flex-1 min-w-40 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />

          <select
            value={occasionTypeDraft}
            onChange={(e) => setOccasionTypeDraft(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          >
            <option value="">{t('bookings.filterOccasionType')}</option>
            {occasionConfigs.map((config: OccasionConfig) => (
              <option key={config.occasionType} value={OCCASION_TYPE_NAMES[config.occasionType]}>
                {config.label}
              </option>
            ))}
          </select>

          <select
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value as 'all' | 'active' | 'cancelled')}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          >
            <option value="all">{t('bookings.filterStatus')}: {t('bookings.statusAll')}</option>
            <option value="active">{t('bookings.filterStatus')}: {t('bookings.statusActive')}</option>
            <option value="cancelled">{t('bookings.filterStatus')}: {t('bookings.statusCancelled')}</option>
          </select>

          <select
            value={userIdDraft}
            onChange={(e) => setUserIdDraft(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
          >
            <option value="">{t('bookings.filterOrganiser')}</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>{user.fullName}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('bookings.startDate')}</label>
            <input
              type="date"
              value={startDateDraft}
              onChange={(e) => setStartDateDraft(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('bookings.endDate')}</label>
            <input
              type="date"
              value={endDateDraft}
              onChange={(e) => setEndDateDraft(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
            />
          </div>

          <button
            type="button"
            onClick={runSearch}
            className="text-sm bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800"
          >
            {t('bookings.search')}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-500">{t('bookings.sortBy')}:</span>
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
              {t(`bookings.sort${field[0].toUpperCase()}${field.slice(1)}`)}
              {sortBy === field && (sortDir === 'asc' ? ' ↑' : ' ↓')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{t('bookings.loading')}</p>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">{t('bookings.noBookings')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">{booking.roomName}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {booking.userName}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${getOccasionConfig(booking.occasionType)?.color ?? '#2563eb'}1a`,
                      color: getOccasionConfig(booking.occasionType)?.color ?? '#2563eb',
                    }}
                  >
                    {t(`occasionType.${booking.occasionType}`)}
                  </span>
                  {booking.recurringGroupId && (
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                      {t('bookings.recurring')}
                    </span>
                  )}
                  {booking.isCancelled && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {t('status.Cancelled')}
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
                  <p className="text-xs text-gray-400 mt-1 italic">{booking.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
                {!booking.isCancelled && (
                  <button
                    onClick={() => setEditBookingId(booking.id)}
                    className="text-sm text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {t('bookings.edit')}
                  </button>
                )}
                {booking.isCancelled ? (
                  <button
                    onClick={() => requestRestore(booking)}
                    className="text-sm text-green-600 hover:text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                  >
                    {t('bookings.restore')}
                  </button>
                ) : (
                  <button
                    onClick={() => requestCancel(booking)}
                    className="text-sm text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    {t('bookings.cancel')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && bookings.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('bookings.pageSize')}:</span>
            <select
              value={pageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
              className="text-xs border border-gray-300 rounded-lg px-2 py-1"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
              <option value={-1}>{t('bookings.pageSizeAll')}</option>
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
                {t('bookings.pagePrev')}
              </button>
              <span className="text-xs text-gray-500">
                {t('bookings.pageOf', { page, totalPages })}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setUrlState({ page: Math.min(totalPages, page + 1) })}
                className="text-xs px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {t('bookings.pageNext')}
              </button>
            </div>
          )}
        </div>
      )}

      <BookingFormModal
        mode="edit"
        open={editBookingId != null}
        onClose={() => setEditBookingId(null)}
        bookingId={editBookingId ?? undefined}
      />

      <RecurringScopeModal
        open={scopePrompt != null}
        title={scopePrompt?.action === 'cancel' ? t('bookings.cancel') : t('bookings.restore')}
        confirmLabel={scopePrompt?.action === 'cancel' ? t('bookings.cancel') : t('bookings.restore')}
        confirmClassName={scopePrompt?.action === 'cancel' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-green-600 text-white hover:bg-green-700'}
        defaultScope={scopePrompt?.action === 'cancel' ? 'future' : 'single'}
        isPending={cancelMutation.isPending || restoreMutation.isPending}
        onConfirm={confirmScope}
        onClose={() => setScopePrompt(null)}
      />
    </div>
  );
}
