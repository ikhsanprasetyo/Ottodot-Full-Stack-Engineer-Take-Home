export function getSessionStorage<T = unknown>(key: string): T | null {
  if (!key) return null;
  if (typeof window === 'undefined') return null; // ✅ Aman saat SSR

  try {
    const raw = sessionStorage?.getItem(key);
    if (!raw) {
      //console.log(`No sessionStorage found for key "${key}"`);
      return null;
    }
    //console.log(`Got sessionStorage for key "${key}"`);
    //console.log({ sessionStorage: key, raw });

    // Jika data adalah string murni (bukan JSON stringified), kembalikan langsung
    if (raw.startsWith('{') || raw.startsWith('[') || raw.startsWith('"')) {
      //console.log({ sessionStorage: key, data: JSON.parse(raw) });
      return JSON.parse(raw);
    }

    // Kalau bukan JSON, anggap sebagai primitive (string) dan cast
    return raw as unknown as T;
  } catch (err) {
    console.error(`Failed to parse sessionStorage for key "${key}"`, err);
    return null;
  }
}

export function setSessionStorage<T = unknown>(key: string, value: T): void {
  if (typeof window === 'undefined' || !key) return;

  try {
    if (typeof value === 'string') {
      // langsung simpan string (JWT)
      sessionStorage.setItem(key, value);
    } else {
      // merge jika object
      const existingRaw = sessionStorage.getItem(key);
      let existing: T = {} as T;

      if (existingRaw) {
        try {
          existing = JSON.parse(existingRaw);
        } catch (err) {
          console.warn(
            `Failed to parse existing sessionStorage for key "${key}"`,
            err
          );
        }
      }

      const merged = { ...existing, ...value };
      sessionStorage.setItem(key, JSON.stringify(merged));
    }
  } catch (err) {
    console.error(`Failed to set sessionStorage value for key "${key}"`, err);
  }
}

export function removeSessionStorage(key: string): void {
  if (typeof window === 'undefined' || !key) return;
  try {
    sessionStorage.removeItem(key);
  } catch (err) {
    console.error(
      `Failed to remove sessionStorage value for key "${key}"`,
      err
    );
  }
}
