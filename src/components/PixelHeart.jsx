import { useEffect, useRef } from 'react';

export const HEART = [
  0, 1, 1, 0, 1, 1, 0,
  1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1,
  0, 1, 1, 1, 1, 1, 0,
  0, 0, 1, 1, 1, 0, 0,
  0, 0, 0, 1, 0, 0, 0
];

export default function PixelHeart({ className = '', stagger = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!stagger || !ref.current) return;
    const on = [...ref.current.querySelectorAll('i.on')].sort(() => Math.random() - 0.5);
    on.forEach((p, i) => { p.style.animationDelay = (80 + i * 24) + 'ms'; });
  }, [stagger]);
  return (
    <span className={`pxheart ${className}`} ref={ref} aria-hidden="true">
      {HEART.map((v, i) => <i key={i} className={v ? 'on' : ''} />)}
    </span>
  );
}
