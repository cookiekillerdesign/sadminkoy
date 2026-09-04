import { next } from '@vercel/functions';

/*
 * Vercel Routing Middleware — makes the admin's "Картинка для соцсетей"
 * (Supabase site_media.og_image) actually reach link-preview bots.
 *
 * The rest of the site is a client-only SPA: index.html ships one static
 * <meta property="og:image"> baked in at build time, and a client-side
 * effect (src/content/ContentProvider.jsx) swaps it for whatever's in
 * Supabase - but only after React mounts and fetches. Telegram, WhatsApp,
 * Instagram and LinkedIn's link-preview crawlers don't run that JavaScript;
 * they just read the raw HTML Vercel serves, so they always saw the
 * placeholder /og.png from the build, no matter what was uploaded in admin.
 *
 * This runs on every page request, pulls the current og_image straight from
 * Supabase, and rewrites the og:image/twitter:image meta tags in the HTML
 * before it goes out - so bots and browsers finally see the same image.
 * Falls back to the normal static response (untouched) at every step that
 * can fail, so a Supabase hiccup never breaks the site itself.
 *
 * The image is the same across the whole site (there's no per-project
 * og_image), so this doesn't need to look at the request path at all -
 * every route gets the same rewritten HTML.
 */

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Only run on real page routes - skip /assets (JS/CSS/fonts), /api and any
// path that already points at a file (og.png, favicon.svg, sitemap.xml...).
// That also keeps this from ever touching /index.html itself, which is what
// the fetch below reads - so there's no risk of the middleware calling itself.
export const config = {
  matcher: ['/((?!assets/|api/|.*\\..*).*)']
};

async function getOgImageUrl(origin) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_media?select=url&key=eq.og_image&limit=1`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  const raw = rows && rows[0] && rows[0].url;
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `${origin}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

export default async function middleware(request) {
  const url = new URL(request.url);

  let originResponse;
  try {
    originResponse = await fetch(new URL('/index.html', url.origin));
  } catch {
    return next();
  }
  if (!originResponse.ok) return next();

  const ogImage = await getOgImageUrl(url.origin).catch(() => null);
  if (!ogImage) return next();

  let html;
  try {
    html = await originResponse.text();
  } catch {
    return next();
  }

  html = html
    .replace(
      /<meta property="og:image" content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${ogImage}" />`
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*"\s*\/>/,
      `<meta name="twitter:image" content="${ogImage}" />`
    );

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Short edge cache so an admin upload shows up within a minute
      // without hitting Supabase on every single page view.
      'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    }
  });
}
