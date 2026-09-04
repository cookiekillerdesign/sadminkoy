import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/* React Router swaps the rendered page without touching window scroll —
   the browser just keeps wherever you were scrolled to on the previous
   page, which is why a new page could open in the middle or at the end
   instead of the top. Runs a plain, instant reset on every path change.
   Hash links (e.g. #capabilities on the home page) are left alone since
   those intentionally scroll to a section, not the top — Home already
   handles that itself in response to location.hash. */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}
