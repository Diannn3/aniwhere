import { safeStorage } from './storage';

const STORAGE_KEY = 'aniwhere_saved_outlets';

export function getSavedOutletIds(): string[] {
  const value = safeStorage.getItem<unknown>(STORAGE_KEY, []);
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

export function isOutletSaved(id: string): boolean {
  const ids = getSavedOutletIds();
  return ids.includes(id);
}

export function toggleSavedOutlet(id: string): { saved: boolean; persisted: boolean } {
  const ids = getSavedOutletIds();
  const index = ids.indexOf(id);
  let newIds: string[];

  if (index >= 0) {
    newIds = ids.filter((item) => item !== id);
  } else {
    newIds = [...ids, id];
  }

  const persisted = safeStorage.setItem(STORAGE_KEY, newIds);
  return { saved: index < 0, persisted };
}
