import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export type ActiveFilter = '' | 'true' | 'false';

/**
 * URL-backed list state (page, search, active filter, include-deleted) for SMS list pages.
 * Search input is debounced before it is written to the URL / query.
 */
export function useSmsListParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const q = searchParams.get('q') ?? '';
  const isActiveParam = searchParams.get('isActive');
  const isActive: ActiveFilter =
    isActiveParam === 'true' || isActiveParam === 'false' ? isActiveParam : '';
  const includeDeleted = searchParams.get('includeDeleted') === '1';

  const [searchInput, setSearchInput] = useState(q);

  const updateParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
          if (key !== 'page') {
            next.delete('page');
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (searchInput === q) {
      return;
    }
    const handle = window.setTimeout(() => updateParam('q', searchInput.trim()), 300);
    return () => window.clearTimeout(handle);
  }, [searchInput, q, updateParam]);

  return { page, q, isActive, includeDeleted, searchInput, setSearchInput, updateParam };
}
