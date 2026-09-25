'use client';

type Settings = Record<string, Record<string, unknown>>;

const STORAGE_KEY = 'settings';

const getSettings = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Settings) : {};
  } catch {
    return {};
  }
};

const saveSettings = (settings: Settings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

// Validators (biar singkat & reusable)
export const isString = (val: unknown): val is string =>
  typeof val === 'string';
export const isNumber = (val: unknown): val is number =>
  typeof val === 'number';
export const isBoolean = (val: unknown): val is boolean =>
  typeof val === 'boolean';
export const isObject = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

// Update value
export const updateLocalStorageSettings = (
  page: string,
  key: string,
  value: unknown
): void => {
  const settings = getSettings();

  const updatedSettings: Settings = {
    ...settings,
    [page]: {
      ...settings[page],
      [key]: value
    }
  };

  saveSettings(updatedSettings);
};

// Ambil value dengan validator
export const getLocalStorageSettings = <T>(
  page: string,
  key: string,
  check: (val: unknown) => val is T
): T | null => {
  const settings = getSettings();
  const value = settings[page]?.[key];

  return value !== undefined && check(value) ? value : null;
};
