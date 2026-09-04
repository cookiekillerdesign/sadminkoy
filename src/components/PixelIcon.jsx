import { useEffect, useRef, useState } from 'react';

/* Same 7×6 grid language as the header/footer pixel-heart, so new glyphs read
   as part of the same little pixel-icon family rather than a foreign import. */
export const GLYPHS = {
  arrow: [
    0, 0, 0, 1, 0, 0, 0,
    0, 0, 0, 1, 1, 0, 0,
    1, 1, 1, 1, 1, 1, 0,
    1, 1, 1, 1, 1, 1, 0,
    0, 0, 0, 1, 1, 0, 0,
    0, 0, 0, 1, 0, 0, 0
  ],
  spark: [
    0, 0, 0, 1, 0, 0, 0,
    0, 0, 1, 1, 1, 0, 0,
    0, 1, 1, 1, 1, 1, 0,
    1, 1, 1, 1, 1, 1, 1,
    0, 0, 1, 1, 1, 0, 0,
    0, 0, 0, 1, 0, 0, 0
  ],
  square: [
    0, 0, 0, 0, 0, 0, 0,
    0, 0, 1, 1, 1, 0, 0,
    0, 0, 1, 1, 1, 0, 0,
    0, 0, 1, 1, 1, 0, 0,
    0, 0, 1, 1, 1, 0, 0,
    0, 0, 0, 0, 0, 0, 0
  ]
};

/**
 * Small pixel-art glyph, drawn from the same grid system as PixelHeart.
 * - `pop`: waits until scrolled into view, then materialises cell-by-cell.
 * - `twinkle`: idle cells softly pulse once visible.
 * With neither flag it just renders as a static glyph for CSS-driven hovers.
 */
export default function PixelIcon({ glyph = 'spark', className = '', pop = false, twinkle = false, style }) {
  const ref = useRef(null);
  const cells = GLYPHS[glyph] || GLYPHS.spark;
  const [inView, setInView] = useState(!pop);

  useEffect(() => {
    if (!pop || !ref.current) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: .4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [pop]);

  useEffect(() => {
    if (!inView || !ref.current) return;
    const on = [...ref.current.querySelectorAll('i.on')].sort(() => Math.random() - 0.5);
    on.forEach((p, i) => {
      p.style.transitionDelay = (i * 22) + 'ms';
      if (twinkle) p.style.animationDelay = (300 + i * 140) + 'ms';
    });
  }, [inView, twinkle]);

  return (
    <span className={`pxicon${inView ? ' in' : ''}${twinkle ? ' twinkle' : ''} ${className}`} ref={ref} style={style} aria-hidden="true">
      {cells.map((v, i) => <i key={i} className={v ? 'on' : ''} />)}
    </span>
  );
}
