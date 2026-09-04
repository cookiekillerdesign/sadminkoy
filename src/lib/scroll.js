export function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function smoothScrollTo(targetY, duration = 900) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  if (Math.abs(diff) < 1) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { window.scrollTo(0, targetY); return; }
  const t0 = performance.now();
  function step(now) {
    const t = Math.min((now - t0) / duration, 1);
    window.scrollTo(0, startY + diff * easeOutExpo(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function scrollToHash(hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  const targetY = el.getBoundingClientRect().top + window.scrollY;
  const distance = Math.abs(targetY - window.scrollY);
  const duration = Math.min(1500, Math.max(600, distance * 0.55));
  smoothScrollTo(targetY, duration);
}
