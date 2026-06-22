import { api } from './client';

export type EditScope = 'single' | 'future';

const editTypeOf = (scope?: EditScope) => (scope === 'future' ? 1 : 0);

export interface BookingsQueryParams {
  roomName?: string;
  description?: string;
  occasionType?: string;
  status?: 'active' | 'cancelled';
  startDate?: string;
  endDate?: string;
  userId?: string;
  sortBy?: 'room' | 'user' | 'date' | 'status';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PagedBookings<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const bookingsApi = {
  getAll: (params: BookingsQueryParams = {}): Promise<PagedBookings<any>> =>
    api.get('/api/bookings', { params }).then(r => r.data),
  getMine: (params: BookingsQueryParams = {}): Promise<PagedBookings<any>> =>
    api.get('/api/bookings/my', { params }).then(r => r.data),
  getById: (id: number) => api.get(`/api/bookings/${id}`).then(r => r.data),
  create: (data: object) => api.post('/api/bookings', data).then(r => r.data),
  update: (id: number, data: object) => api.put(`/api/bookings/${id}`, data).then(r => r.data),
  cancel: (id: number, scope: EditScope = 'future') =>
    api.delete(`/api/bookings/${id}?editType=${editTypeOf(scope)}`),
  restore: (id: number, scope: EditScope = 'single') =>
    api.put(`/api/bookings/${id}/restore?editType=${editTypeOf(scope)}`),
};