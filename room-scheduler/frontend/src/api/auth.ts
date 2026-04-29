import { api } from './client';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),

  register: (email: string, password: string, fullName: string) =>
    api.post('/api/auth/register', { email, password, fullName }),

  forgotPassword: (email: string) =>
    api.post('/api/auth/forgot-password', { email }),

  resetPassword: (userId: string, token: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { userId, token, newPassword }),
};