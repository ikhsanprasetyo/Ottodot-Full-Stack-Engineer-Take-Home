import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getApi = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API;

  if (!apiUrl) {
    if (typeof window !== 'undefined') {
      const isLocal =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      if (isLocal) return 'http://localhost:9050/api/v1';
    }
    return 'https://serverottodot.byteseeker.net/api/v1';
  }

  return apiUrl;
};

export const getImageUrl = (path?: string): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const apiBase = getApi();
  const host = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
  return `${host}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const formatLabel = (key: string) => {
  if (typeof key !== 'string' || key.trim() === '') return '';

  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (str) => str?.toUpperCase());
};

export const getCurrentUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.href;
  }
  return '';
};

/**
 * Decode cookie JSON dengan format `j:<stringified>`, hasilnya value asli.
 */
export function decodeJsonCookie<T>(encodedValue: string = ''): T | null {
  try {
    const decoded = decodeURIComponent(encodedValue);
    if (!decoded.startsWith('j:')) return null;
    return JSON.parse(decoded.slice(2)) as T;
  } catch {
    return null;
  }
}

/**
 * Format number input with thousand separators and optional decimals.
 * - Supports typing like "0,", "1234,56"
 * - Locale-aware (default: 'id-ID')
 */
export const formatThousand = (
  val: string,
  locale: string = 'id-ID'
): string => {
  if (!val) return '';

  const [rawInt, rawDec] = val.split(',');

  // Normalize integer (remove non-digits, but keep leading zero if user typed it)
  const integer = rawInt.replace(/\D/g, '') || '';
  const decimal = rawDec ?? '';

  // Format integer part safely
  const number =
    integer === '' ? '' : new Intl.NumberFormat(locale).format(Number(integer));

  // If user just typed comma at the end
  if (val.endsWith(',')) {
    return `${number},`;
  }

  return decimal ? `${number},${decimal}` : number;
};

export const toIDR = (
  value?: number | null,
  minFractionDigits: number = 0,
  maxFractionDigits: number = 5
): string => {
  if (
    value === null ||
    value === undefined ||
    typeof value !== 'number' ||
    isNaN(value)
  ) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits
  }).format(value);
};

/**
 * Format angka jadi string sesuai locale Indonesia
 * Contoh:
 *   formatNumberString(1250) -> "1.250"
 *   formatNumberString(3.5, { minimumFractionDigits: 1 }) -> "3,5"
 *   formatNumberString(1000000, { maximumFractionDigits: 0 }) -> "1.000.000"
 */
export function formatNumberString(
  value: number,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useGrouping?: boolean;
  } = {}
): string {
  if (value === null || value === undefined || isNaN(value)) return '';

  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 99,
    useGrouping = true
  } = options;

  return new Intl.NumberFormat('id-ID', {
    useGrouping,
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

// helper buat bikin string lebih human readable
export const formatHumanReadableString = (text: unknown): string => {
  if (typeof text !== 'string' || text.trim() === '') {
    return '';
  }

  return (
    text
      // pisahkan camelCase atau PascalCase dengan spasi
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // ubah semua huruf pertama jadi kapital
      .replace(/\b\w/g, (char) => char?.toUpperCase())
  );
};

export function capitalizeEach(input?: string): string {
  if (!input || typeof input !== 'string') return '';

  return input
    .split(' ')
    .filter(Boolean)
    .map(
      (word) => word?.charAt(0)?.toUpperCase() + word?.slice(1)?.toLowerCase()
    )
    .join(' ');
}

/**
 * Format city, region (province), and country into a readable location string.
 */
export function getLocationString(session: any): string {
  if (!session) return 'Unknown Location';
  if (session.city === 'Local') return 'Local';

  const parts: string[] = [];
  if (session.city) parts.push(session.city);

  // Deduplicate region if it is identical to city
  if (session.region && session.region !== session.city) {
    parts.push(session.region);
  }

  if (session.country) parts.push(session.country);

  return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
}

/**
 * Mengecek apakah suatu target href sedang aktif berdasarkan current pathname (bebas trailing slash dan sub-route).
 */
export const isPathActive = (
  currentPathname: string | null | undefined,
  targetHref?: string | null
): boolean => {
  if (!currentPathname || !targetHref) return false;

  const cleanPathname = currentPathname.replace(/\/$/, '') || '/';
  const cleanHref = targetHref.replace(/\/$/, '') || '/';

  if (cleanPathname === cleanHref) return true;

  // Mappings khusus sub-path (misal /rtu/recipe/xxx terhubung ke /rtu/product)
  if (cleanHref === '/rtu/product' && cleanPathname.startsWith('/rtu/recipe')) {
    return true;
  }

  // Generic sub-path match (contoh: /users/123 -> /users)
  if (
    cleanHref !== '/' &&
    cleanHref !== '/dashboard' &&
    cleanPathname.startsWith(cleanHref + '/')
  ) {
    return true;
  }

  return false;
};
