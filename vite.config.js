import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * Site URL, same resolution order as scripts/sitemap.mjs:
 *   1. VITE_SITE_URL                 - set once the final domain exists
 *   2. VERCEL_PROJECT_PRODUCTION_URL - production builds on Vercel only
 * Preview deploys stay relative on purpose (their hostnames are throwaway).
 */
function siteUrl() {
  const explicit = (process.env.VITE_SITE_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '').replace(/^(?!https?:\/\/)/, 'https://');
  const vercel = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  if (vercel && process.env.VERCEL_ENV === 'production') return `https://${vercel}`;
  return null;
}

/*
 * Open Graph and JSON-LD parsers don't resolve relative URLs - a canonical
 * of "/" or an og:image of "/og.png" is simply ignored by most of them, and
 * usePageMeta only fixes it after JS runs, which social crawlers never do.
 * Rewrite the handful of root-relative URLs in the static HTML to absolute
 * ones at build time, only when the real address is known.
 */
function absoluteMetaUrls() {
  return {
    name: 'absolute-meta-urls',
    apply: 'build',
    transformIndexHtml(html) {
      const site = siteUrl();
      if (!site) return html;
      return html
        .replace(/(<link rel="canonical" href=")\/(")/, `$1${site}/$2`)
        .replace(/(<meta property="og:url" content=")\/(")/, `$1${site}/$2`)
        .replace(/(<meta property="og:image" content=")(\/[^"]+")/, `$1${site}$2`)
        .replace(/(<meta name="twitter:image" content=")(\/[^"]+")/, `$1${site}$2`)
        .replace(/("url": ")\/(")/, `$1${site}/$2`)
        .replace(/("image": ")(\/[^"]+")/, `$1${site}$2`);
    }
  };
}

/*
 * Opens the connection to Supabase (DNS + TLS handshake) as soon as the HTML
 * starts parsing, instead of only once the JS bundle has downloaded, parsed
 * and run far enough to call fetch() itself. On a cold visit that handshake
 * was overlapping with, not hiding behind, the ~750ms it takes the main
 * bundle to arrive - this is a few hundred milliseconds off the content
 * fetch that was gating the homepage's largest paint.
 */
function supabasePreconnect() {
  return {
    name: 'supabase-preconnect',
    apply: 'build',
    transformIndexHtml() {
      const raw = (process.env.VITE_SUPABASE_URL || '').trim();
      if (!raw) return [];
      let origin;
      try { origin = new URL(raw).origin; } catch { return []; }
      return [
        { tag: 'link', attrs: { rel: 'preconnect', href: origin, crossorigin: '' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'dns-prefetch', href: origin }, injectTo: 'head' }
      ];
    }
  };
}

export default defineConfig({
  plugins: [react(), absoluteMetaUrls(), supabasePreconnect()]
})
