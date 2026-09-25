// utils/date.ts
import dayjs from 'dayjs';

/**
 * Mengembalikan string tanggal berdasarkan format yang diberikan
 * @param date - tanggal yang ingin diformat (string atau Date)
 * @param format - format output, contoh: 'DD-MM-YYYY' atau 'dddd, D MMMM YYYY'
 * @returns string tanggal hasil format, atau empty string jika tidak valid
 */
export function setDateStr(
  date: string | Date | null | undefined = new Date(),
  format: string = 'DD-MM-YYYY'
): string {
  const d = dayjs(date);
  return d.isValid() ? d.format(format) : '';
}

export function getDateStr(
  date: string | Date | null = new Date(),
  format: string = 'DD-MM-YYYY'
): string {
  const d = dayjs(date);
  return d.isValid() ? d.format(format) : '';
}

/**
 * Cek apakah suatu waktu sudah kadaluwarsa
 * @param expiresAt string | Date | undefined - waktu kadaluwarsa
 * @returns boolean - true jika sudah expired, false jika masih valid
 */
export function isExpired(expiresAt?: string | Date): boolean {
  if (!expiresAt) return true; // jika tidak ada expiry, dianggap expired

  const expiry = dayjs(expiresAt);
  if (!expiry.isValid()) return true; // jika format invalid, dianggap expired

  return dayjs().isAfter(expiry); // true = sudah lewat, false = masih berlaku
}
