import { api } from './client';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  isActive: boolean;
  role: string;
  indexNumber?: number | null;
  department?: string | null;
  title?: string | null;
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  indexNumber?: number | null;
  department?: string | null;
  title?: string | null;
}

export interface UpdateMyProfilePayload {
  firstName: string;
  lastName: string;
  email: string;
  indexNumber?: number | null;
  department?: string | null;
  title?: string | null;
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  role: string;
}

export interface UsersQueryParams {
  search?: string;
  roles?: string[];
  status?: 'active' | 'inactive';
  sortBy?: 'name' | 'surname' | 'email' | 'role' | 'status';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PagedUsers {
  items: UserListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const usersApi = {
  getAll: (params: UsersQueryParams = {}): Promise<PagedUsers> =>
    api
      .get('/api/users', {
        params: {
          ...params,
          roles: params.roles?.length ? params.roles.join(',') : undefined,
        },
      })
      .then(r => r.data),
  getById: (id: string): Promise<UserProfile> => api.get(`/api/users/${id}`).then(r => r.data),
  updateProfile: (id: string, payload: UpdateProfilePayload) =>  api.put(`/api/users/${id}/profile`, payload).then(r => r.data),
  getMyProfile: (): Promise<UserProfile> => api.get('/api/profile').then(r => r.data),
  updateMyProfile: (payload: UpdateMyProfilePayload) => api.put('/api/profile', payload).then(r => r.data),
  toggleActive: (id: string) => api.put(`/api/users/${id}/toggle-active`).then(r => r.data),
  setRole: (id: string, role: string) => api.put(`/api/users/${id}/role`, { role }).then(r => r.data),
  getPermissions: (id: string) => api.get(`/api/users/${id}/permissions`).then(r => r.data),
  setPermission: (id: string, roomId: number, level: number) =>  api.post(`/api/users/${id}/permissions`, { roomId, level }).then(r => r.data),
  removePermission: (id: string, roomId: number) =>  api.delete(`/api/users/${id}/permissions/${roomId}`),
};