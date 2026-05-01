import { api } from './client';

export const occasionConfigApi = {
  getAll: () => api.get('/api/occasionconfig').then(r => r.data),
  update: (type: number, data: object) =>
    api.put(`/api/occasionconfig/${type}`, data).then(r => r.data),
};