import { api } from './client';

export interface RoomListItem {
  id: number;
  name: string;
  seats: number;
  description?: string;
  isActive: boolean;
  softwarePackages: { id: number; name: string }[];
}

export interface RoomsQueryParams {
  search?: string;
  minSeats?: number;
  softwarePackage?: string;
  status?: 'active' | 'inactive';
  sortBy?: 'name' | 'seats' | 'status';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PagedRooms {
  items: RoomListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const roomsApi = {
  getAll: () => api.get('/api/rooms').then(r => r.data),
  search: (params: RoomsQueryParams = {}): Promise<PagedRooms> =>
    api.get('/api/rooms/search', { params }).then(r => r.data),
  getSoftwarePackages: (): Promise<string[]> =>
    api.get('/api/rooms/software-packages').then(r => r.data),
  getById: (id: number) => api.get(`/api/rooms/${id}`).then(r => r.data),
  create: (data: object) => api.post('/api/rooms', data).then(r => r.data),
  update: (id: number, data: object) => api.put(`/api/rooms/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/api/rooms/${id}`),
};