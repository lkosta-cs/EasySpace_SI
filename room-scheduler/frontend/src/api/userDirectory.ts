import { api } from './client';

export interface BookableUser {
  id: string;
  fullName: string;
}

export const userDirectoryApi = {
  getBookable: (): Promise<BookableUser[]> =>
    api.get('/api/userdirectory/bookable').then(r => r.data),
};
