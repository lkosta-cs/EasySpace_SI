import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterPersistState {
  filters: Record<string, Record<string, unknown>>;
  setFilters: (key: string, value: Record<string, unknown>) => void;
}

export const useFilterPersistStore = create<FilterPersistState>()(
  persist(
    (set) => ({
      filters: {},
      setFilters: (key, value) =>
        set((state) => ({ filters: { ...state.filters, [key]: value } })),
    }),
    { name: 'filter-storage' }
  )
);
