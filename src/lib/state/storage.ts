const memoryStore = new Map<string, string>();
const removedKeys = new Set<string>();

export const safeStorage = {
  getItem<T>(key: string, fallback: T): T {
    try {
      if (removedKeys.has(key)) return fallback;
      const sessionValue = memoryStore.get(key);
      if (sessionValue !== undefined) return JSON.parse(sessionValue) as T;
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val === null) return fallback;
        return JSON.parse(val) as T;
      }
      return fallback;
    } catch {
      const sessionValue = memoryStore.get(key);
      try {
        return sessionValue === undefined ? fallback : JSON.parse(sessionValue) as T;
      } catch {
        return fallback;
      }
    }
  },

  setItem<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      memoryStore.set(key, serialized);
      removedKeys.delete(key);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, serialized);
        return true;
      }
      return true;
    } catch {
      try { memoryStore.set(key, JSON.stringify(value)); } catch {}
      return false;
    }
  },

  removeItem(key: string): boolean {
    memoryStore.delete(key);
    removedKeys.add(key);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return true;
    } catch {
      return false;
    }
  },
};

