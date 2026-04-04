import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react';

const CACHE_PREFIX = 'form_';

export function useCachedState<T>(formKey: string, field: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const key = `${CACHE_PREFIX}${formKey}_${field}`;

  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial;
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch { return initial; }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (value === initial || (Array.isArray(value) && Array.isArray(initial) && value.length === 0 && initial.length === 0)) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(value));
      }
    } catch {}
  }, [value, key]);

  return [value, setValue];
}

export function clearFormCache(formKey: string) {
  if (typeof window === 'undefined') return;
  const prefix = `${CACHE_PREFIX}${formKey}_`;
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k?.startsWith(prefix)) keys.push(k);
  }
  keys.forEach(k => sessionStorage.removeItem(k));
}
