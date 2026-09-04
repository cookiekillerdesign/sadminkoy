import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseConfig';

/**
 * Read-only access to the content tables over PostgREST.
 *
 * Deliberately hand-rolled fetch rather than supabase-js: this runs on every
 * visit to the public site, and the only thing it needs is three anonymous
 * GETs. Row Level Security still applies — the anon key can read published
 * rows and nothing else.
 */
async function get(path, signal) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    signal,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  }
  return res.json();
}

/**
 * Same 8 reads as fetchContentLegacy below, done in one Postgres round trip
 * (see supabase/migrate-combined-content.sql for the get_site_content()
 * function). One POST instead of 8 parallel GETs to the same host - on a
 * slow connection those queued up and delayed the homepage's largest paint.
 * Returns null (rather than throwing) if the function doesn't exist yet on
 * this database, so fetchContent below falls back to the old approach.
 */
async function fetchContentViaRpc(signal) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_site_content`, {
    method: 'POST',
    signal,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: '{}'
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || typeof data !== 'object') return null;
  return [
    data.projects || [],
    data.project_media || [],
    data.site_media || [],
    data.site_settings || [],
    data.capability_decks || [],
    data.capability_items || [],
    data.certifications || [],
    data.social_links || []
  ];
}

/** Original approach: 8 separate anonymous GETs run in parallel. */
function fetchContentLegacy(signal) {
  return Promise.all([
    get('projects?select=*&published=eq.true&order=sort_order.asc,created_at.asc', signal),
    get('project_media?select=*&order=sort_order.asc,created_at.asc', signal),
    get('site_media?select=*', signal),
    // Falls back to an empty list on its own (rather than failing the whole
    // Promise.all) so a database that hasn't run the site_settings migration
    // yet still loads the rest of the site instead of showing nothing.
    get('site_settings?select=*', signal).catch(() => []),
    // Same reasoning for the capabilities tables - a project made before this
    // feature shipped its migration still has to load the rest of the page.
    get('capability_decks?select=*&order=sort_order.asc', signal).catch(() => []),
    get('capability_items?select=*&order=sort_order.asc', signal).catch(() => []),
    // Same reasoning again - a deploy from before this table existed still
    // has to load the rest of the page instead of failing the whole fetch.
    get('certifications?select=*&order=sort_order.asc', signal).catch(() => []),
    // Same reasoning again - the footer's contact links.
    get('social_links?select=*&order=sort_order.asc', signal).catch(() => [])
  ]);
}

export async function fetchContent(signal) {
  try {
    const rpcResult = await fetchContentViaRpc(signal);
    if (rpcResult) return rpcResult;
  } catch {
    // Network hiccup, aborted request, or the RPC just isn't there yet on
    // this database - either way, fall through to the old reliable path.
  }
  return fetchContentLegacy(signal);
}

/**
 * One long-form text (e.g. the privacy policy). Fetched only by the page that
 * shows it, not on every visit, so it stays out of the shared content cache.
 * Resolves to null when the row doesn't exist or Supabase is unreachable -
 * the caller falls back to the built-in default.
 */
export async function fetchSiteText(key, signal) {
  try {
    const rows = await get(`site_texts?select=*&key=eq.${encodeURIComponent(key)}&limit=1`, signal);
    return rows && rows[0] ? rows[0] : null;
  } catch {
    return null;
  }
}
