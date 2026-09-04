import { detectKind } from '../lib/media';

const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/**
 * Turns one `projects` row (plus its media rows) into exactly the object shape
 * the existing components read — `thumb`, `i18n.{name,tags,overview}`, `href`,
 * `gallery[].file`. Nothing downstream needs to know where the data came from.
 */
export function normalizeProject(row, mediaRows = []) {
  // Chips used to be [deckIndex, itemIndex] pairs; they're now capability_items.id
  // strings (see supabase/schema.sql's migration). Only string ids are kept - any
  // leftover legacy pair from a project that predates the migration is dropped
  // rather than shown as a broken tag.
  const chips = Array.isArray(row.chips)
    ? row.chips.filter(c => typeof c === 'string' && c)
    : [];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name || row.slug,
    status: ['case', 'live', 'dev'].includes(row.status) ? row.status : 'case',
    platform: row.platform || 'web',
    category: row.category || 'product',
    hue: /^#[0-9a-f]{6}$/i.test(row.hue || '') ? row.hue : '#1B3BFF',
    year: row.year || '',
    thumb: row.thumb_url || '',
    previewImg: row.preview_url || '',
    external: row.external_url || '',
    chips,
    i18n: {
      name: asObject(row.name_i18n),
      tags: asObject(row.tags_i18n),
      overview: asObject(row.overview_i18n)
    },
    href: `/project/${row.slug}`,
    gallery: mediaRows.map(m => ({
      id: m.id,
      file: m.url,
      kind: m.kind || detectKind(m.url),
      poster: m.poster_url || '',
      caption: m.caption || ''
    }))
  };
}

export function normalizeProjects(projectRows = [], mediaRows = []) {
  const byProject = new Map();
  for (const m of mediaRows) {
    if (!byProject.has(m.project_id)) byProject.set(m.project_id, []);
    byProject.get(m.project_id).push(m);
  }
  for (const list of byProject.values()) {
    list.sort((a, b) => (a.sort_order - b.sort_order) || String(a.created_at).localeCompare(String(b.created_at)));
  }
  return projectRows.map(row => normalizeProject(row, byProject.get(row.id) || []));
}

/** Site-wide on/off switches (e.g. the header's RU/RO/EN switcher), keyed
    by `key`. Missing/unconfigured always reads as `false` so a feature stays
    off until an admin deliberately turns it on. */
export function normalizeSiteSettings(rows = []) {
  const out = {};
  for (const r of rows) {
    if (!r.key) continue;
    out[r.key] = r.enabled === true;
  }
  return out;
}

export function normalizeSiteMedia(rows = []) {
  const out = {};
  for (const r of rows) {
    if (!r.key) continue;
    out[r.key] = {
      key: r.key,
      url: r.enabled === false ? '' : (r.url || ''),
      kind: r.kind || detectKind(r.url || ''),
      alt: r.alt || '',
      poster: r.poster_url || '',
      opacity: typeof r.opacity === 'number' ? r.opacity : 1,
      enabled: r.enabled !== false
    };
  }
  return out;
}

/**
 * Turns `capability_decks` + `capability_items` rows into the deck/item tree
 * the site and admin panel read (see i18n.js's deckField/itemLabel/
 * resolveChipLabels). Items are grouped by `deck_id` and sorted by
 * `sort_order`, same convention as normalizeProjects groups media by
 * `project_id`.
 */
/**
 * Turns `certifications` rows into the shape CertCard reads. Certifications
 * aren't translated per-language (a credential name/issuer is the same in
 * every locale), so unlike projects/capabilities this is a flat list with no
 * `_i18n` columns to unpack.
 */
export function normalizeCertifications(rows = []) {
  const sorted = rows.slice().sort((a, b) => (a.sort_order - b.sort_order) || String(a.created_at).localeCompare(String(b.created_at)));
  return sorted.map(r => ({
    id: r.id,
    name: r.name || '',
    issuer: r.issuer || '',
    dateLabel: r.date_label || '',
    code: r.code || '',
    verifyUrl: r.verify_url || '',
    img: r.image_url || ''
  }));
}

/**
 * Turns `social_links` rows into the shape the footer reads. Flat list, no
 * `_i18n` columns - the same convention as normalizeCertifications, for the
 * same reason (an icon/label/url doesn't change per site language).
 */
export function normalizeSocialLinks(rows = []) {
  const sorted = rows.slice().sort((a, b) => (a.sort_order - b.sort_order) || String(a.created_at).localeCompare(String(b.created_at)));
  return sorted.map(r => ({
    id: r.id,
    icon: r.icon || 'link',
    label: r.label || '',
    url: r.url || ''
  }));
}

export function normalizeCapabilityDecks(deckRows = [], itemRows = []) {
  const byDeck = new Map();
  for (const it of itemRows) {
    if (!byDeck.has(it.deck_id)) byDeck.set(it.deck_id, []);
    byDeck.get(it.deck_id).push(it);
  }
  for (const list of byDeck.values()) {
    list.sort((a, b) => (a.sort_order - b.sort_order) || String(a.created_at).localeCompare(String(b.created_at)));
  }
  const decks = deckRows.slice().sort((a, b) => (a.sort_order - b.sort_order) || String(a.created_at).localeCompare(String(b.created_at)));
  return decks.map(d => ({
    id: d.id,
    top1: asObject(d.top1_i18n).en || '',
    top2: asObject(d.top2_i18n).en || '',
    h3: asObject(d.h3_i18n).en || '',
    i18n: {
      top1: asObject(d.top1_i18n),
      top2: asObject(d.top2_i18n),
      h3: asObject(d.h3_i18n)
    },
    items: (byDeck.get(d.id) || []).map(it => ({
      id: it.id,
      deck_id: it.deck_id,
      label: asObject(it.label_i18n).en || '',
      i18n: { label: asObject(it.label_i18n) }
    }))
  }));
}
