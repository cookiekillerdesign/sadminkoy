/*
 * Writes dist/sitemap.xml after the Vite build — but only when the site's real
 * address is known.
 *
 * Sitemaps require absolute URLs, so guessing a domain here isn't a harmless
 * default: a sitemap full of the wrong host is worse than no sitemap at all,
 * because search engines will try to crawl addresses that aren't yours. If no
 * address is available the file is skipped and the build carries on.
 *
 * Where the address comes from, in order:
 *   1. VITE_SITE_URL            — set it yourself once the final domain exists
 *   2. VERCEL_PROJECT_PRODUCTION_URL — Vercel fills this in automatically, but
 *                                  it's only trusted on production builds
 * Preview deployments deliberately get no sitemap: their URLs are throwaway.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function siteUrl() {
  const explicit = (process.env.VITE_SITE_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '').replace(/^(?!https?:\/\/)/, 'https://');

  const vercel = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  if (vercel && process.env.VERCEL_ENV === 'production') return `https://${vercel}`;

  return null;
}

const SITE = siteUrl();

if (!SITE) {
  console.log('[sitemap] Адрес сайта неизвестен — sitemap.xml не создан.');
  console.log('[sitemap] Чтобы он появился, добавьте переменную VITE_SITE_URL с адресом сайта.');
  process.exit(0);
}

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const ANON = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const STATIC_SLUGS = [
  'victoriabank', 'my-doctor-32', 'point-money', 'zazitex', 'conu-tache', 'promez',
  'des-champs', 'yuca-vpn', 'riongo', 'pawsome-world', 'logos-for-business', 'rock-metal-stage-md'
];

async function slugs() {
  if (!SUPABASE_URL || !ANON) return STATIC_SLUGS.map(slug => ({ slug, updated: null }));
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=slug,updated_at&published=eq.true&order=sort_order.asc`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` }
    });
    if (!res.ok) throw new Error(String(res.status));
    const rows = await res.json();
    if (!rows.length) throw new Error('в базе нет опубликованных проектов');
    return rows.map(r => ({ slug: r.slug, updated: r.updated_at }));
  } catch (err) {
    console.warn(`[sitemap] Supabase недоступен (${err.message}) — беру статический список.`);
    return STATIC_SLUGS.map(slug => ({ slug, updated: null }));
  }
}

const today = new Date().toISOString().slice(0, 10);
const url = (loc, priority, lastmod) =>
  `  <url>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${(lastmod || today).slice(0, 10)}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;

const projects = await slugs();
const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  url('/', '1.0'),
  url('/portfolio', '0.9'),
  url('/privacy', '0.3'),
  url('/cookie-policy', '0.3'),
  url('/gdpr', '0.3'),
  ...projects.map(p => url(`/project/${p.slug}`, '0.8', p.updated)),
  '</urlset>'
].join('\n');

await writeFile(resolve(root, 'dist/sitemap.xml'), xml + '\n', 'utf8');

// robots.txt ships without a Sitemap line, since that line also needs an
// absolute URL. It's appended here, to the built copy only, once we know one.
const robotsPath = resolve(root, 'dist/robots.txt');
const robots = await readFile(robotsPath, 'utf8').catch(() => 'User-agent: *\nAllow: /\nDisallow: /admin\n');
if (!/^Sitemap:/m.test(robots)) {
  await writeFile(robotsPath, `${robots.trimEnd()}\n\nSitemap: ${SITE}/sitemap.xml\n`, 'utf8');
}

console.log(`[sitemap] ${projects.length + 5} адресов записано в dist/sitemap.xml (${SITE})`);
