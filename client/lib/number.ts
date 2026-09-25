/**
 * Mengubah nilai rasio (contoh 1.125) menjadi string persen (contoh "12.5%") atau number persen.
 *
 * @param value - nilai rasio, contoh: 1.125 (untuk 12.5%)
 * @param decimals - jumlah angka di belakang koma, default = 2
 * @param format - 'string' untuk output string dengan %, 'number' untuk output number
 * @returns string dalam format "12.50%" atau number 12.5
 */
export function getPercent(
  value?: number | null,
  decimals: number = 2,
  format: 'string' | 'number' = 'string'
): string | number {
  if (value === null || value === undefined || isNaN(value)) {
    return format === 'string' ? '-' : NaN;
  }

  const percent = value * 100;

  return format === 'string'
    ? `${percent.toFixed(decimals)}%`
    : Number(percent.toFixed(decimals));
}

export const formatIndoNumber = (
  value: string | number | null | undefined,
  decimals: number = 1
): string => {
  if (value === null || value === undefined || value === '') return '';

  let raw = String(value);

  const hasComma = raw.includes(',');
  const dotCount = (raw.match(/\./g) || []).length;

  if (hasComma) {
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (dotCount === 1) {
    raw = raw.replace(',', '.'); // jaga-jaga
  } else if (dotCount > 1) {
    raw = raw.replace(/\./g, '');
  }

  const num = Number(raw);
  if (isNaN(num)) return '';

  const match = raw.match(/\.(\d+)/);
  const hasDecimal = !!match;

  const formatted = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: hasDecimal ? 0 : 0
  }).format(num);

  return formatted.replace(/,\s*0+$/, '');
};

// formatted: "1.234,56" -> "1234,56"
export const normalizeValue = (formatted: string) =>
  formatted.replace(/\./g, ''); // ✅ hanya hapus ribuan, biarkan comma

export function round(
  value: number | null | undefined,
  decimals: number = 0
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error('Decimal places must be a non-negative integer');
  }

  const factor = 10 ** decimals;

  // Use EPSILON to reduce floating point precision issues
  const result = Math.round((value + Number.EPSILON) * factor) / factor;

  return result;
}

export type CalculateGrowthOptions = {
  decimals?: number; // jumlah desimal (default 1)
  cap?: number; // optional max cap (misal 999)
};

export function calculateGrowth(
  current: number,
  last: number,
  options: CalculateGrowthOptions = {}
): number {
  const { decimals = 1, cap } = options;

  if (!Number.isFinite(current) || !Number.isFinite(last)) {
    return 0;
  }

  if (current < 0 || last < 0) {
    return 0; // protect invalid KPI
  }

  let growth: number;

  if (last === 0) {
    growth = current === 0 ? 0 : 100;
  } else {
    growth = ((current - last) / last) * 100;
  }

  if (typeof cap === 'number') {
    growth = Math.min(Math.max(growth, -cap), cap);
  }

  const factor = 10 ** decimals;
  return Math.round((growth + Number.EPSILON) * factor) / factor;
}

export const formatCompactIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    compactDisplay: 'short',
    style: 'currency',
    currency: 'IDR'
  }).format(value);
};

export const formatFullIDR = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(value);
};
