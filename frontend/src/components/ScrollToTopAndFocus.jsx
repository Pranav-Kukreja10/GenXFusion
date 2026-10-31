import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Automatically scrolls window to top and shifts focus to the primary page heading (h1)
 * on every route transition for WCAG AA compliance.
 */
export default function ScrollToTopAndFocus() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 1. Reset window scroll to the top
    window.scrollTo(0, 0);

    // 2. Move keyboard/screen reader focus to the page heading
    const timer = setTimeout(() => {
      const heading = document.querySelector('h1');
      if (heading) {
        if (!heading.hasAttribute('tabindex')) {
          heading.setAttribute('tabindex', '-1');
        }
        heading.focus({ preventScroll: true });
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

