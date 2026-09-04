export function initials(name) {
  return name.replace(/[^A-Za-zА-Яа-я0-9 ]/g, '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function shade(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.min(255, (n >> 16) + 24)} ${Math.min(255, ((n >> 8) & 255) + 24)} ${Math.min(255, (n & 255) + 24)})`;
}

export function stripeBg(hue) {
  return `repeating-linear-gradient(45deg,${hue},${hue} 14px,${shade(hue)} 14px,${shade(hue)} 28px)`;
}

/** A project's own hue, used as a small brand accent — except when that hue
 * is itself near-black (e.g. the #0F0F13 placeholder used for a few case
 * studies), where it would vanish against the equally dark cover background.
 * Falls back to the site's cobalt accent in that case. */
export function accentColor(hex, fallback = '#1B3BFF') {
  if (!hex || hex[0] !== '#') return fallback;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 40 ? fallback : hex;
}
