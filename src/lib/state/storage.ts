const memoryStore = new Map<string, string>();

export const safeStorage = {
  getItem<T>(key: string, fallback: T): T {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val === null) return fallback;
        return JSON.parse(val) as T;
      }
      const memVal = memoryStore.get(key);
      if (memVal === undefined) return fallback;
      return JSON.parse(memVal) as T;
    } catch {
      return fallback;
    }
  },

  setItem<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, serialized);
        return true;
      }
      memoryStore.set(key, serialized);
      return true;
    } catch {
      return false;
    }
  },

  removeItem(key: string): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      memoryStore.delete(key);
      return true;
    } catch {
      return false;
    }
  },
};

