import { safeStorage } from './storage';

const STORAGE_KEY = 'aniwhere_saved_outlets';

function validSavedId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 80 && /^[a-z0-9-]+$/.test(value);
}

export function getSavedOutletIds(): string[] {
  const stored = safeStorage.getItem<unknown>(STORAGE_KEY, []);
  if (!Array.isArray(stored)) return [];

  return stored
    .filter(validSavedId)
    .filter((id, index, ids) => ids.indexOf(id) === index);
}

export function isOutletSaved(id: string): boolean {
  const ids = getSavedOutletIds();
  return ids.includes(id);
}

export function toggleSavedOutlet(id: string): boolean {
  if (!validSavedId(id)) return false;
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
