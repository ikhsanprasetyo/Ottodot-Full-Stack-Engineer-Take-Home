type StringSearchable = string | readonly string[] | null | undefined;

/**
 * Case-insensitive string includes helper
 *
 * - Supports string
 * - Supports array of strings
 * - Safe for null / undefined
 */
export function stringIncludes(
  value: StringSearchable,
  search: string = ''
): boolean {
  if (!search || typeof search !== 'string') return false;
  if (!value) return false;

  const keyword = search.toLowerCase();

  // Array of strings
  if (Array.isArray(value)) {
    return value.some(
      (item): item is string =>
        typeof item === 'string' && item.toLowerCase().includes(keyword)
    );
  }

  // Single string
  if (typeof value === 'string') {
    return value.toLowerCase().includes(keyword);
  }

  return false;
}

export function stringUnitConverter(
  from: string = '',
  to: string = ''
): string {
  if (!from || typeof from !== 'string') return '';
  if (!to || typeof to !== 'string') return from;

  return to;
}
