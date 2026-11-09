import { useTranslation } from 'react-i18next';

/**
 * Read an array stored in translation JSON (e.g. `home.departments.items`).
 * Returns an empty list when the key is missing or not an array so pages never crash.
 */
export function useTranslatedList<T>(
  key: string,
  options?: Readonly<Record<string, string | number>>,
): readonly T[] {
  const { t } = useTranslation();
  const value: unknown = t(key, { ...options, returnObjects: true });
  return Array.isArray(value) ? (value as T[]) : [];
}
