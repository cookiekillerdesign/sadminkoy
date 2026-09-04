import { useEffect, useRef } from 'react';
import { shade } from '../lib/format';

/* Deterministic PRNG (mulberry32) so the same project always renders the
   same composition — no layout shift between renders/reloads. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

const COLS = 7, ROWS = 6; // same grid as PixelHeart / PixelIcon — one motif, every scale

/**
 * Deterministic, seeded pixel-block composition drawn on canvas — the same
 * 7×6 grid used by the pixel-heart/pixel-icon glyphs, scaled up into a full
 * background. Layers over the existing diagonal stripe (left showing through
 * the gaps) rather than replacing it, so every project reads as a distinct,
 * designed cover instead of the one repeating stripe pattern.
 */
export default function GenerativeArt({ seed, hue, className = '', density = .62, canvasRef: externalRef }) {
  const internalRef = useRef(null);
  const canvasRef = externalRef || internalRef;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rand = mulberry32(hashSeed(String(seed)));
    const light = shade(hue);
    let w = 0, h = 0, cells = [], visible = true, intervalId = null;

    function build() {
      w = canvas.offsetWidth; h = canvas.offsetHeight;
      if (!w || !h) return;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cw = w / COLS, ch = h / ROWS;
      cells = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const roll = rand();
          if (roll < 1 - density) continue; // gap — base stripe shows through
          const isPaper = roll > .93;
          const isLight = !isPaper && roll > .78;
          // paper (near-white) cells stay small and low-alpha — a full 2x2
          // bright block can land right under readable text (project title,
          // card initials) and blow out contrast. Hue/tint cells are close
          // enough in tone to the background that "big" ones stay subtle.
          const big = !isPaper && rand() < .1 && c < COLS - 1 && r < ROWS - 1;
          cells.push({
            x: c * cw, y: r * ch, w: (big ? 2 : 1) * cw, h: (big ? 2 : 1) * ch,
            fill: isPaper ? 'rgba(241,240,236,.5)' : isLight ? light : hue,
            phase: rand() * Math.PI * 2
          });
        }
      }
    }
    function draw(t) {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      for (const cell of cells) {
        ctx.globalAlpha = RM ? .85 : .68 + Math.sin(t / 2200 + cell.phase) * .17;
        ctx.fillStyle = cell.fill;
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
      }
      ctx.globalAlpha = 1;
    }

    build();
    draw(0);

    const io = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0 });
    io.observe(canvas);

    if (!RM) intervalId = setInterval(() => { if (visible) draw(performance.now()); }, 100);

    const ro = new ResizeObserver(() => { build(); draw(performance.now()); });
    ro.observe(canvas);

    return () => {
      if (intervalId) clearInterval(intervalId);
      io.disconnect();
      ro.disconnect();
    };
  }, [seed, hue, density]);

  return <canvas ref={canvasRef} className={`gen-art ${className}`} aria-hidden="true" />;
}
