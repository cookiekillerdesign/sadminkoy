import { PROJECTS_I18N } from '../i18n';

/*
 * Static fallback content.
 *
 * The live site reads its projects from Supabase (see src/content/ContentProvider).
 * This list is what renders when Supabase isn't configured yet, is unreachable,
 * or returns nothing - so the portfolio never shows an empty page.
 */

const logofolioGallery = [
  'Content.png', 'Content-1.png', 'Content-2.png', 'Content-3.png', 'Content-4.png',
  'Content-5.png', 'Content-6.png', 'Content-7.png', 'Content-8.png', 'Content-9.png',
  'Content-10.png', 'Content-11.png', 'Content-12.png'
].map(f => ({ file: `/assets/logofolio/${f}`, kind: 'image' }));

// Chip ids are `static-${deckIndex}-${itemIndex}` - see STATIC_CAPABILITY_DECKS
// in src/i18n.js, built from these same positions in translations.*.capabilities.decks.
const RAW = [
  { name: 'Victoriabank', slug: 'victoriabank', status: 'case', hue: '#1B3BFF', thumb: '', year: '2025', platform: 'web', category: 'product', chips: ['static-0-1', 'static-0-4', 'static-1-0'] },
  { name: 'My Doctor 32', slug: 'my-doctor-32', status: 'live', hue: '#00B549', thumb: '', year: '2023', platform: 'web', category: 'product', chips: ['static-0-0', 'static-0-6', 'static-1-2'] },
  { name: 'Point Money', slug: 'point-money', status: 'case', hue: '#0F0F13', thumb: '', year: '2024', platform: 'ios', category: 'product', chips: ['static-0-2', 'static-0-3', 'static-1-0'] },
  { name: 'Zazitex.com', slug: 'zazitex', status: 'live', hue: '#1B3BFF', thumb: '', year: '2024', platform: 'web', category: 'product', chips: ['static-0-7', 'static-1-2', 'static-1-5'] },
  { name: "Conu'Tache", slug: 'conu-tache', status: 'live', hue: '#B4530A', thumb: '', year: '2022', platform: 'web', category: 'ecommerce', chips: ['static-0-4', 'static-1-2', 'static-2-1'] },
  { name: 'Promez', slug: 'promez', status: 'live', hue: '#0E7490', thumb: '', year: '2021', platform: 'web', category: 'ecommerce', chips: ['static-0-4', 'static-0-0', 'static-1-2'] },
  { name: 'Des Champs', slug: 'des-champs', status: 'live', hue: '#4D7C0F', thumb: '', year: '2020', platform: 'web', category: 'ecommerce', chips: ['static-0-4', 'static-2-1', 'static-1-2'] },
  { name: 'YUCA VPN', slug: 'yuca-vpn', status: 'live', hue: '#6D28D9', thumb: '', year: '2023', platform: 'android', category: 'mobile', chips: ['static-1-4', 'static-2-0', 'static-0-7'] },
  { name: 'Riongo', slug: 'riongo', status: 'dev', hue: '#FF3B30', thumb: '', year: '2026', platform: 'web', category: 'product', chips: ['static-0-7', 'static-0-5', 'static-1-1'] },
  { name: 'Pawsome.world', slug: 'pawsome-world', status: 'dev', hue: '#EA580C', thumb: '', year: '2026', platform: 'mobile', category: 'mobile', chips: ['static-0-0', 'static-1-1', 'static-2-0'] },
  { name: 'Logos for Business', slug: 'logos-for-business', status: 'case', hue: '#0F0F13', thumb: '', year: '2021', platform: 'print', category: 'branding', chips: ['static-2-0', 'static-2-1', 'static-2-4'], gallery: logofolioGallery },
  { name: 'Rock / Metal Stage MD', slug: 'rock-metal-stage-md', status: 'case', hue: '#0F0F13', thumb: '', year: '2022', platform: 'print', category: 'branding', chips: ['static-2-0', 'static-2-3', 'static-2-4'] }
];

export const STATIC_PROJECTS = RAW.map((p, i) => ({
  ...p,
  previewImg: '',
  external: '',
  i18n: PROJECTS_I18N[i],
  href: `/project/${p.slug}`,
  gallery: p.gallery || []
}));

/** Kept as a named export so anything still importing PROJECTS keeps working. */
export const PROJECTS = STATIC_PROJECTS;

export function findProjectBySlug(list, slug) {
  return (list || []).find(p => p.slug === slug) || null;
}

export function findAdjacentProject(list, slug) {
  const items = list || [];
  if (!items.length) return null;
  const i = items.findIndex(p => p.slug === slug);
  if (i === -1) return items[0];
  return items[(i + 1) % items.length];
}
