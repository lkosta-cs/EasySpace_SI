import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

interface LanguageState {
  language: 'en' | 'rs';
  setLanguage: (lang: 'en' | 'rs') => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => {
        set({ language });
        i18n.changeLanguage(language);
      },
    }),
    { name: 'language-storage' }
  )
);
