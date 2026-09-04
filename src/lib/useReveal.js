import { useEffect } from 'react';

/**
 * Observes every not-yet-revealed `.reveal` element in the document and adds
 * `.in` once it scrolls into view. Mirrors the reveal-on-scroll behaviour
 * already used on the homepage, so pages share one visual language.
 */
export function useReveal(deps = []) {
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Flips a state flag shortly after mount — for above-the-fold content that
 * should animate in on load rather than wait for a scroll trigger.
 */
export function mountReveal(setter, delay = 60) {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t = setTimeout(() => setter(true), RM ? 0 : delay);
  return () => clearTimeout(t);
}
