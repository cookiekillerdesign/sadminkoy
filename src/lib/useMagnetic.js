import { useEffect } from 'react';

/** Makes every `.magnetic` element gently pull toward the cursor on hover. */
export function useMagnetic(deps = []) {
  useEffect(() => {
    const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!(FINE && !RM)) return;
    const magnets = [...document.querySelectorAll('.magnetic')];
    const cleanups = [];
    magnets.forEach(el => {
      // Measuring on every mousemove forces the browser to flush layout
      // synchronously right after the previous move wrote a new transform -
      // a classic read-after-write "forced reflow". The element's untransformed
      // box doesn't move while the cursor drags it around, so measuring once
      // on enter (and again after a resize) is exactly as correct and free.
      let rect = null;
      const measure = () => { rect = el.getBoundingClientRect(); };
      const onMove = e => {
        if (!rect) measure();
        const dx = e.clientX - (rect.left + rect.width / 2), dy = e.clientY - (rect.top + rect.height / 2);
        el.style.transform = `translate(${dx * .25}px,${dy * .35}px)`;
      };
      const onLeave = () => {
        rect = null;
        el.style.transform = '';
        el.style.transition = 'transform .5s cubic-bezier(.19,1,.22,1)';
        setTimeout(() => { el.style.transition = ''; }, 500);
      };
      el.addEventListener('mouseenter', measure);
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      window.addEventListener('resize', measure);
      cleanups.push(() => {
        el.removeEventListener('mouseenter', measure);
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('mouseleave', onLeave);
        window.removeEventListener('resize', measure);
      });
    });
    return () => cleanups.forEach(fn => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
