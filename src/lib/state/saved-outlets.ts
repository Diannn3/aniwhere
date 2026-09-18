import { safeStorage } from './storage';

const STORAGE_KEY = 'aniwhere_saved_outlets';

export function getSavedOutletIds(): string[] {
  return safeStorage.getItem<string[]>(STORAGE_KEY, []);
}

export function isOutletSaved(id: string): boolean {
  const ids = getSavedOutletIds();
  return ids.includes(id);
}

export function toggleSavedOutlet(id: string): boolean {
  const ids = getSavedOutletIds();
  const index = ids.indexOf(id);
  let newIds: string[];

  if (index >= 0) {
    newIds = ids.filter((item) => item !== id);
  } else {
    newIds = [...ids, id];
  }

  safeStorage.setItem(STORAGE_KEY, newIds);
  return index < 0; // returns true if now saved, false if removed
}
