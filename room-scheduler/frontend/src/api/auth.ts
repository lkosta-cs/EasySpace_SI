import { api } from './client';

export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  indexNumber?: number;
  department?: string;
  title?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  register: (payload: RegisterPayload) =>
    api.post('/api/auth/register', payload),

  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),

  resetPassword: (userId: string, token: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { userId, token, newPassword }),
};
