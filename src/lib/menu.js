/**
 * The site's menu entries.
 *
 * `prefix` is '/' everywhere except the homepage's own menu, which uses bare
 * '#work' style hashes so clicking a section doesn't push a route change and
 * remount the page you're already looking at.
 *
 * Capabilities, Certifications and the Work grid stay on the homepage
 * (scroll past About) but aren't listed here anymore - the menu is the short
 * list, not every section on the page. "Home" just scrolls back to the top.
 */
export function getSiteMenuLinks(t, prefix = '/') {
  return [
    { href: `${prefix}#top`, num: '01', ...t.nav.home },
    { href: `${prefix}#about`, num: '02', ...t.nav.about },
    { href: '/portfolio', num: '03', ...t.nav.portfolio },
    { href: `${prefix}#contact`, num: '04', ...t.nav.contact }
  ];
}
