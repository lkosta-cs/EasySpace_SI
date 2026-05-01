import { api } from './client';

export const bookingsApi = {
  getAll: () => api.get('/api/bookings').then(r => r.data),
  getMine: () => api.get('/api/bookings/my').then(r => r.data),
  getPending: () => api.get('/api/bookings/pending').then(r => r.data),
  create: (data: object) => api.post('/api/bookings', data).then(r => r.data),
  cancel: (id: number) => api.delete(`/api/bookings/${id}`),
  approve: (id: number) => api.put(`/api/bookings/${id}/approve`).then(r => r.data),
  reject: (id: number, reason?: string) =>
    api.put(`/api/bookings/${id}/reject`, { reason }).then(r => r.data),
};