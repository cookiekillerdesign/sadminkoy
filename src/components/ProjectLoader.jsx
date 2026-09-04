import { useEffect, useState } from 'react';

/*
 * Short "opening" transition played every time a project page mounts.
 * A small square fills with pixels in a clean diagonal sweep (top-left to
 * bottom-right) rather than a random scatter, so the fill always reads as
 * one deliberate wipe instead of flickering unevenly, then the whole thing
 * fades away to reveal the page underneath.
 */

const GRID = 8;
const CELL_MS = 120;   // must match the CSS transition duration on .proj-loader-sq span
const FILL_MS = 180;   // total time until the last cell is fully visible
const HOLD_MS = 0;     // fade starts the instant the fill finishes — no idle
                        // "fully filled and just sitting there" gap, which is
                        // what made the fill look done long before the loader
                        // actually went away
const FADE_MS = 160;   // overlay fade-out duration

const CELLS = Array.from({ length: GRID * GRID }, (_, i) => {
  const r = Math.floor(i / GRID), c = i % GRID;
  return { i, order: r + c }; // diagonal distance from the top-left corner
});
const MAX_ORDER = (GRID - 1) * 2;
const MAX_STAGGER = (FILL_MS - CELL_MS) / 1000;

export default function ProjectLoader() {
  const [filled, setFilled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (RM) { setFilled(true); setHidden(true); return; }
    const t1 = requestAnimationFrame(() => setFilled(true));
    const t2 = setTimeout(() => setHidden(true), FILL_MS + HOLD_MS);
    return () => { cancelAnimationFrame(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className={`proj-loader${hidden ? ' hide' : ''}`} style={{ transitionDuration: `${FADE_MS}ms` }} aria-hidden="true">
      <div className={`proj-loader-sq${filled ? ' in' : ''}`}>
        {CELLS.map(({ i, order }) => (
          <span key={i} style={{ transitionDelay: `${(order / MAX_ORDER) * MAX_STAGGER}s` }} />
        ))}
      </div>
    </div>
  );
}
