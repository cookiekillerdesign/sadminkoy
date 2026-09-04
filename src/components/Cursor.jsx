import { useEffect, useRef, useState } from 'react';

export default function Cursor() {
  const ref = useRef(null);
  const labelRef = useRef(null);
  const [onLink, setOnLink] = useState(false);
  const [label, setLabel] = useState('');
  const [labelShow, setLabelShow] = useState(false);

  useEffect(() => {
    const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
    // iPadOS (and some hybrid laptops) can report a fine/hover-capable
    // pointer even on a touchscreen-only session, which used to leave the
    // bracket cursor frozen wherever the first tap landed - looking like a
    // broken graphic stuck in a corner. Touch capability wins regardless of
    // what the media query says.
    const TOUCHABLE = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!FINE || TOUCHABLE) return;
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, raf, live = true;
    const onMove = e => { mx = e.clientX; my = e.clientY; };
    addEventListener('mousemove', onMove);
    const onOver = e => {
      if (e.target.closest('a,button')) setOnLink(true);
      const withLabel = e.target.closest('[data-cursor-label]');
      if (withLabel) { setLabel(withLabel.getAttribute('data-cursor-label')); setLabelShow(true); }
    };
    const onOut = e => {
      if (e.target.closest('a,button')) setOnLink(false);
      if (e.target.closest('[data-cursor-label]')) setLabelShow(false);
    };
    // Extra safety net: if a real touch ever lands (a mouse+touchscreen
    // hybrid device, or a media-query false positive), kill the loop and
    // hide the custom cursor for the rest of the session instead of leaving
    // it stranded at the last synthetic mousemove position.
    const onTouch = () => {
      live = false;
      if (ref.current) ref.current.style.display = 'none';
      if (labelRef.current) labelRef.current.style.display = 'none';
      cancelAnimationFrame(raf);
    };
    addEventListener('touchstart', onTouch, { passive: true });
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    const loop = () => {
      if (!live) return;
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      if (ref.current) ref.current.style.transform = `translate(${cx}px,${cy}px)`;
      if (labelRef.current) { labelRef.current.style.left = cx + 'px'; labelRef.current.style.top = cy + 'px'; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      live = false;
      removeEventListener('mousemove', onMove);
      removeEventListener('touchstart', onTouch);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className={`cursor${onLink ? ' on-link' : ''}`} ref={ref} aria-hidden="true">
        <span className="cursor-ring">
          <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
          <i className="dot" />
        </span>
      </div>
      <div className={`cursor-label${labelShow ? ' show' : ''}`} ref={labelRef} aria-hidden="true">{label}</div>
    </>
  );
}
