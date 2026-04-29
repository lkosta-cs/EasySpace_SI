import { api } from './client';

export const usersApi = {
  getAll: () => api.get('/api/users').then(r => r.data),
  toggleActive: (id: string) => api.put(`/api/users/${id}/toggle-active`).then(r => r.data),
  setRole: (id: string, role: string) => api.put(`/api/users/${id}/role`, { role }).then(r => r.data),
  getPermissions: (id: string) => api.get(`/api/users/${id}/permissions`).then(r => r.data),
  setPermission: (id: string, roomId: number, level: number) =>
    api.post(`/api/users/${id}/permissions`, { roomId, level }).then(r => r.data),
  removePermission: (id: string, roomId: number) =>
    api.delete(`/api/users/${id}/permissions/${roomId}`),
};