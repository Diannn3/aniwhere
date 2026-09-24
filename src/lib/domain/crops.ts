import type { CropKey } from './types';

export interface CropMeta {
  key: CropKey;
  labelEn: string;
  labelFil: string;
  aliases: string[];
}

export const SUPPORTED_CROPS: CropMeta[] = [
  {
    key: 'tomato',
    labelEn: 'Tomatoes',
    labelFil: 'Kamatis',
    aliases: ['tomato', 'tomatoes', 'kamatis'],
  },
  {
    key: 'eggplant',
    labelEn: 'Eggplant',
    labelFil: 'Talong',
    aliases: ['eggplant', 'eggplants', 'talong'],
  },
  {
    key: 'calamansi',
    labelEn: 'Calamansi',
    labelFil: 'Kalamansi',
    aliases: ['calamansi', 'kalamansi', 'calamondin'],
  },
  {
    key: 'banana',
    labelEn: 'Banana',
    labelFil: 'Saging',
    aliases: ['banana', 'bananas', 'saging'],
  },
  {
    key: 'papaya',
    labelEn: 'Papaya',
    labelFil: 'Papaya',
    aliases: ['papaya', 'papayas'],
  },
  {
    key: 'pechay',
    labelEn: 'Pechay',
    labelFil: 'Pechay',
    aliases: ['pechay', 'petsay', 'bok choy', 'bok choi', 'pak choi'],
  },
  {
    key: 'sitaw',
    labelEn: 'String beans',
    labelFil: 'Sitaw',
    aliases: ['sitaw', 'string bean', 'string beans', 'yardlong bean', 'yardlong beans', 'long bean', 'long beans'],
  },
];

export function normalizeCrop(input: string): { key: CropKey; isSupported: boolean } {
  if (!input) return { key: 'other', isSupported: false };
  const cleaned = input.trim().toLowerCase();

  for (const c of SUPPORTED_CROPS) {
    if (c.key === cleaned || c.aliases.includes(cleaned)) {
      return { key: c.key, isSupported: true };
    }
  }

  return { key: 'other', isSupported: false };
}

export function getCropLabel(key: CropKey | string, lang: 'en' | 'fil' = 'en'): string {
  const found = SUPPORTED_CROPS.find((c) => c.key === key);
  if (found) {
    return lang === 'fil' ? found.labelFil : found.labelEn;
  }
  return key;
}
