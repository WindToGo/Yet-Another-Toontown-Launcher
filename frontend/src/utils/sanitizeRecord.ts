export function sanitizeRecord<T>(
  obj: Record<string, T | undefined> | undefined | null
): Record<string, T> {
  const result: Record<string, T> = {};
  if (!obj) return result;
  for (const key in obj) {
    const value = obj[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}
