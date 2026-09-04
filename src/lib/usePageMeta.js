import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Per-route <title>, meta description and canonical URL.
 *
 * The canonical part matters more than it looks: index.html shipped a single
 * hardcoded `<link rel="canonical" href="/">`, which told Google that every
 * case-study page was really just the homepage — the fastest way to keep a
 * dozen pages out of the index. Setting it from the current path fixes that
 * without hardcoding a domain that could be wrong on preview deploys.
 */
export function usePageMeta(title, description, { noindex = false } = {}) {
  const { pathname } = useLocation();

  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', description);
      const og = document.querySelector('meta[property="og:description"]');
      if (og) og.setAttribute('content', description);
    }
    if (title) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', title);
    }
  }, [title, description]);

  // A SPA behind a catch-all rewrite can't send a real 404 status, so the
  // best available signal for search engines is a dynamic robots meta.
  // Google evaluates it after rendering JS; restored on unmount so client-side
  // navigation away from the 404 page doesn't leave the site marked noindex.
  useEffect(() => {
    if (!noindex) return;
    const meta = document.querySelector('meta[name="robots"]');
    const prev = meta ? meta.getAttribute('content') : null;
    if (meta) meta.setAttribute('content', 'noindex, nofollow');
    return () => { if (meta && prev !== null) meta.setAttribute('content', prev); };
  }, [noindex]);

  useEffect(() => {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.setAttribute('href', location.origin + pathname);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', location.origin + pathname);
  }, [pathname]);
}
