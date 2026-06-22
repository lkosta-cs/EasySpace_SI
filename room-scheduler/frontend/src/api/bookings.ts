import { api } from './client';

export type EditScope = 'single' | 'future';

const editTypeOf = (scope?: EditScope) => (scope === 'future' ? 1 : 0);

export const bookingsApi = {
  getAll: () => api.get('/api/bookings').then(r => r.data),
  getMine: () => api.get('/api/bookings/my').then(r => r.data),
  getById: (id: number) => api.get(`/api/bookings/${id}`).then(r => r.data),
  create: (data: object) => api.post('/api/bookings', data).then(r => r.data),
  update: (id: number, data: object) => api.put(`/api/bookings/${id}`, data).then(r => r.data),
  cancel: (id: number, scope: EditScope = 'future') =>
    api.delete(`/api/bookings/${id}?editType=${editTypeOf(scope)}`),
  restore: (id: number, scope: EditScope = 'single') =>
    api.put(`/api/bookings/${id}/restore?editType=${editTypeOf(scope)}`),
};