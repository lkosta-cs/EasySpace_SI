import { api } from './client';

export const bookingsApi = {
  getAll: () => api.get('/api/bookings').then(r => r.data),
  getMine: () => api.get('/api/bookings/my').then(r => r.data),
  create: (data: object) => api.post('/api/bookings', data).then(r => r.data),
  cancel: (id: number) => api.delete(`/api/bookings/${id}`),
};