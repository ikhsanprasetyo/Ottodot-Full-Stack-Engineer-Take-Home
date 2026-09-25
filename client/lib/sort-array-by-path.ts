/**
 * Sort an array of objects by a nested property path.
 * @param arr - The array to sort
 * @param path - Dot-separated path to the property (e.g., "material.name")
 * @param order - 'asc' (default) or 'desc'
 */
export function sortArrayByPath<T>(
  arr: T[],
  path: string,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  if (!Array.isArray(arr)) return [];

  const getValue = (obj: any, path: string) =>
    path.split('.').reduce((acc, key) => (acc as any)?.[key], obj);

  return [...arr].sort((a, b) => {
    const valueA = String(getValue(a, path) || '').toLowerCase();
    const valueB = String(getValue(b, path) || '').toLowerCase();
    const comparison = valueA.localeCompare(valueB);
    return order === 'desc' ? -comparison : comparison;
  });
}
