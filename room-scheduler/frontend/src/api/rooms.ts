import { api } from './client';

export const roomsApi = {
  getAll: () => api.get('/api/rooms').then(r => r.data),
  getById: (id: number) => api.get(`/api/rooms/${id}`).then(r => r.data),
  create: (data: object) => api.post('/api/rooms', data).then(r => r.data),
  update: (id: number, data: object) => api.put(`/api/rooms/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/rooms/${id}`),
};