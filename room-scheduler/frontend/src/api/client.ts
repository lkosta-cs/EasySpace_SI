import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { useLanguageStore } from '../stores/languageStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Map our internal language code to the IETF tag the backend expects
  const lang = useLanguageStore.getState().language;
  config.headers['Accept-Language'] = lang === 'rs' ? 'sr-Latn' : 'en';

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);


// import axios from 'axios';
// import { useAuthStore } from '../stores/authStore';

// export const api = axios.create({
//     baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000',
// });

// api.interceptors.request.use((config) => {
//   const token = useAuthStore.getState().token;
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       useAuthStore.getState().logout();
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );