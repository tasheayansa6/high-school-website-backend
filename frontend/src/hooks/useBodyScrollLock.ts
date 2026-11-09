import { useEffect } from 'react';

/**
 * Locks document scroll while `isLocked` is true (e.g. open mobile nav).
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isLocked]);
}
