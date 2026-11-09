import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Professional route transitions: scroll to top on path change,
 * or smoothly to a hash target when present (e.g. /#inquiry-form).
 */
export function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      const scrollToHash = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return true;
        }
        return false;
      };

      if (scrollToHash()) return;

      let timeoutId = 0;
      const frame = window.requestAnimationFrame(() => {
        if (scrollToHash()) return;
        timeoutId = window.setTimeout(() => {
          if (!scrollToHash()) {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
          }
        }, 120);
      });
      return () => {
        window.cancelAnimationFrame(frame);
        if (timeoutId) window.clearTimeout(timeoutId);
      };
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    return undefined;
  }, [pathname, hash]);

  return null;
}
