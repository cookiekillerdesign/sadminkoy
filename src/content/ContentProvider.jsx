import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabaseConfig';
import { fetchContent } from './publicApi';
import { STATIC_PROJECTS } from '../data/projects';
import { STATIC_CERTIFICATIONS } from '../data/certifications';
import { STATIC_SOCIAL_LINKS } from '../data/socialLinks';
import { STATIC_CAPABILITY_DECKS } from '../i18n';
import { normalizeProjects, normalizeSiteMedia, normalizeSiteSettings, normalizeCapabilityDecks, normalizeCertifications, normalizeSocialLinks } from './normalize';

// Bumped from v3: the cached shape gained `socialLinks`, and an old v3 entry
// without it would otherwise be read back as an empty list.
const CACHE_KEY = 'cc_content_v4';
const CACHE_TTL = 10 * 60 * 1000; // 10 min — long enough to make repeat visits
                                  // instant, short enough that an edit shows up
                                  // on the next session without a hard reload

const ContentContext = createContext(null);

const EMPTY = { projects: STATIC_PROJECTS, siteMedia: {}, siteSettings: {}, capabilityDecks: STATIC_CAPABILITY_DECKS, certifications: STATIC_CERTIFICATIONS, socialLinks: STATIC_SOCIAL_LINKS, source: 'static', loading: false, error: null };

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.at > CACHE_TTL) return null;
    if (!Array.isArray(parsed.projects) || !parsed.projects.length) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(projects, siteMedia, siteSettings, capabilityDecks, certifications, socialLinks) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), projects, siteMedia, siteSettings, capabilityDecks, certifications, socialLinks }));
  } catch { /* private mode / quota — caching is an optimisation, not a requirement */ }
}

export function clearContentCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

export function ContentProvider({ children }) {
  const cached = useRef(readCache()).current;

  const [state, setState] = useState(() => cached
    ? {
        projects: cached.projects,
        siteMedia: cached.siteMedia || {},
        siteSettings: cached.siteSettings || {},
        capabilityDecks: (cached.capabilityDecks && cached.capabilityDecks.length) ? cached.capabilityDecks : STATIC_CAPABILITY_DECKS,
        certifications: (cached.certifications && cached.certifications.length) ? cached.certifications : STATIC_CERTIFICATIONS,
        socialLinks: (cached.socialLinks && cached.socialLinks.length) ? cached.socialLinks : STATIC_SOCIAL_LINKS,
        source: 'cache', loading: isSupabaseConfigured, error: null
      }
    : { ...EMPTY, loading: isSupabaseConfigured });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const [projectRows, mediaRows, siteRows, settingsRows, deckRows, itemRows, certRows, socialRows] = await fetchContent(controller.signal);
        if (cancelled) return;

        const projects = normalizeProjects(projectRows || [], mediaRows || []);
        const siteMedia = normalizeSiteMedia(siteRows || []);
        const siteSettings = normalizeSiteSettings(settingsRows || []);
        // An empty/not-yet-migrated capabilities table falls back to the
        // static deck list, same reasoning as the projects fallback below.
        const decks = normalizeCapabilityDecks(deckRows || [], itemRows || []);
        const capabilityDecks = decks.length ? decks : STATIC_CAPABILITY_DECKS;
        // Same reasoning for certifications - an empty/not-yet-migrated table
        // falls back to the 5 credentials that ship with the site.
        const certs = normalizeCertifications(certRows || []);
        const certifications = certs.length ? certs : STATIC_CERTIFICATIONS;
        // Same reasoning again for the footer's contact links.
        const social = normalizeSocialLinks(socialRows || []);
        const socialLinks = social.length ? social : STATIC_SOCIAL_LINKS;

        // An empty table means "not seeded yet", not "the designer deleted
        // everything" — falling back keeps the site looking finished either way.
        if (!projects.length) {
          setState({ projects: STATIC_PROJECTS, siteMedia, siteSettings, capabilityDecks, certifications, socialLinks, source: 'static', loading: false, error: null });
          return;
        }

        writeCache(projects, siteMedia, siteSettings, capabilityDecks, certifications, socialLinks);
        setState({ projects, siteMedia, siteSettings, capabilityDecks, certifications, socialLinks, source: 'supabase', loading: false, error: null });
      } catch (error) {
        if (cancelled || error.name === 'AbortError') return;
        // Never break the page over a content fetch — degrade to whatever we have.
        setState(prev => ({
          projects: prev.projects.length ? prev.projects : STATIC_PROJECTS,
          siteMedia: prev.siteMedia,
          siteSettings: prev.siteSettings,
          capabilityDecks: (prev.capabilityDecks && prev.capabilityDecks.length) ? prev.capabilityDecks : STATIC_CAPABILITY_DECKS,
          certifications: (prev.certifications && prev.certifications.length) ? prev.certifications : STATIC_CERTIFICATIONS,
          socialLinks: (prev.socialLinks && prev.socialLinks.length) ? prev.socialLinks : STATIC_SOCIAL_LINKS,
          source: prev.source === 'supabase' ? 'supabase' : 'static',
          loading: false,
          error
        }));
      }
    })();

    return () => { cancelled = true; controller.abort(); };
  }, []);

  // The admin panel's "Картинка для соцсетей" (og_image) slot exists
  // specifically to control the link-preview image on Telegram/WhatsApp/
  // LinkedIn, but nothing ever wrote it to the actual <meta> tags - they
  // stayed hardcoded to the static /apple-touch-icon.png from index.html
  // forever, no matter what an admin uploaded there. This is what actually
  // makes that upload take effect.
  useEffect(() => {
    const ogImage = state.siteMedia && state.siteMedia.og_image;
    if (!ogImage || !ogImage.url) return;
    const absoluteUrl = /^https?:\/\//i.test(ogImage.url)
      ? ogImage.url
      : `${location.origin}${ogImage.url.startsWith('/') ? '' : '/'}${ogImage.url}`;
    const og = document.querySelector('meta[property="og:image"]');
    if (og) og.setAttribute('content', absoluteUrl);
    const tw = document.querySelector('meta[name="twitter:image"]');
    if (tw) tw.setAttribute('content', absoluteUrl);
  }, [state.siteMedia]);

  const value = useMemo(() => state, [state]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  return useContext(ContentContext) || EMPTY;
}

export function useProjects() {
  return useContent().projects;
}

/** The four capability "decks" (Product & UX, UI & Systems, Brand, Stack)
    and their items, as edited in admin → Компетенции. */
export function useCapabilityDecks() {
  return useContent().capabilityDecks;
}

/** The certifications shown in the homepage's Certifications section, as
    edited in admin → Сертификаты. */
export function useCertifications() {
  return useContent().certifications;
}

/** The footer's "ways to contact me" links (Behance, LinkedIn, WhatsApp,
    tel:, ...), as edited in admin → Контакты. */
export function useSocialLinks() {
  return useContent().socialLinks;
}

/** One homepage media slot, or null when it's empty/disabled. */
export function useSiteMedia(key) {
  const { siteMedia } = useContent();
  const slot = siteMedia && siteMedia[key];
  return slot && slot.url ? slot : null;
}

/** One site-wide on/off switch (see admin → Настройки). Defaults to `false`
    (off) when unset, unconfigured, or Supabase isn't reachable — so a brand
    new deploy behaves the same as an admin who hasn't touched the setting. */
export function useSiteSetting(key) {
  const { siteSettings } = useContent();
  return !!(siteSettings && siteSettings[key]);
}
