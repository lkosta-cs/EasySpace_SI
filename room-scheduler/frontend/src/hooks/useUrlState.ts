import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFilterPersistStore } from '../stores/filterPersistStore';

type UrlValue = string | number | boolean | string[] | undefined;
type UrlState = Record<string, UrlValue>;

function parseValue(raw: string | null, sample: UrlValue): UrlValue {
  if (raw == null || raw === '') return undefined;
  if (typeof sample === 'number') {
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  if (typeof sample === 'boolean') {
    return raw === 'true';
  }
  if (Array.isArray(sample)) {
    return raw.split(',').filter(Boolean);
  }
  return raw;
}

function isDefaultValue(value: UrlValue, defaultValue: UrlValue): boolean {
  if (Array.isArray(value) && Array.isArray(defaultValue)) {
    return value.length === defaultValue.length && value.every((v, i) => v === defaultValue[i]);
  }
  return value === defaultValue;
}

/**
 * Mirrors a flat state object to the URL's query string, replacing (not pushing)
 * history entries so every filter/sort/page change doesn't pollute browser back/forward.
 * Keys equal to their default are omitted from the URL to keep it clean.
 *
 * When storageKey is given, the state also round-trips through the Zustand
 * filterPersistStore (localStorage-backed): landing on a bare URL (e.g. clicking a
 * sidebar link) restores the last-used values for that key, and every change is saved
 * back. An explicit URL (bookmark/shared link) always takes priority over storage.
 */
export function useUrlState<T extends UrlState>(
  defaults: T,
  storageKey?: string
): [T, (next: Partial<T>) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasRestoredFromStorage = useRef(false);

  useEffect(() => {
    if (!storageKey || hasRestoredFromStorage.current) return;
    hasRestoredFromStorage.current = true;

    const urlHasAnyKey = Object.keys(defaults).some((key) => searchParams.has(key));
    if (urlHasAnyKey) return;

    const saved = useFilterPersistStore.getState().filters[storageKey];
    if (!saved) return;

    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        for (const key of Object.keys(defaults) as Array<keyof T>) {
          const value = saved[key as string] as UrlValue;
          if (value === undefined || value === '' || isDefaultValue(value, defaults[key])) continue;
          if (Array.isArray(value)) updated.set(key as string, value.join(','));
          else updated.set(key as string, String(value));
        }
        return updated;
      },
      { replace: true }
    );
    // Only ever run once, right after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const raw = searchParams.get(key as string);
    const parsed = parseValue(raw, defaults[key]);
    if (parsed !== undefined) state[key] = parsed as T[typeof key];
  }

  const stateSnapshot = JSON.stringify(state);
  useEffect(() => {
    if (!storageKey) return;
    useFilterPersistStore.getState().setFilters(storageKey, state);
    // state is captured via stateSnapshot to avoid re-running on every render with a new object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, stateSnapshot]);

  const setState = (next: Partial<T>) => {
    setSearchParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        for (const key of Object.keys(next) as Array<keyof T>) {
          const value = next[key];
          if (value === undefined || value === '' || isDefaultValue(value, defaults[key])) {
            updated.delete(key as string);
          } else if (Array.isArray(value)) {
            updated.set(key as string, value.join(','));
          } else {
            updated.set(key as string, String(value));
          }
        }
        return updated;
      },
      { replace: true }
    );
  };

  return [state, setState];
}

/**
 * Marker stored in a persisted array field to mean "explicitly emptied" — a plain empty
 * array can't be used for that because it serializes to an empty string in the URL, which
 * is indistinguishable from "key not present" (i.e. falls back to the default).
 */
export const NONE_SENTINEL = '__none__';

/** Resolves a persisted string[] field back into a typed Set, honoring NONE_SENTINEL and
 * falling back to `fallback` when the field is untouched (still at its default `[]`). */
export function resolveUrlSet<T>(values: string[], mapper: (raw: string) => T, fallback: T[]): Set<T> {
  if (values.length === 0) return new Set(fallback);
  if (values.length === 1 && values[0] === NONE_SENTINEL) return new Set();
  return new Set(values.map(mapper));
}

/** Inverse of resolveUrlSet: turns a Set back into the string[] shape useUrlState expects. */
export function toUrlArray<T>(set: Set<T>): string[] {
  return set.size === 0 ? [NONE_SENTINEL] : Array.from(set).map(String);
}
