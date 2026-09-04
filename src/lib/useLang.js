import { useCallback, useEffect, useState } from 'react';
import { detectLang, translations } from '../i18n';
import { useContent } from '../content/ContentProvider';

export function useLang() {
  const { siteSettings, loading } = useContent();
  const langSwitcherEnabled = !!siteSettings.lang_switcher;

  const [lang, setLangState] = useState(detectLang);
  const t = translations[lang];

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem('cc_lang', l); } catch { /* ignore */ }
  }, []);

  // The switcher is hidden in the header whenever it's turned off in the
  // admin panel (default), but a language saved from an earlier visit - or a
  // tab left open from before an admin turned it off - can still be sitting
  // in localStorage. Wait for a confirmed answer (not `loading`) before
  // forcing English, so this doesn't flash a returning ru/ro visitor back to
  // English for a moment while the setting is still being fetched.
  useEffect(() => {
    if (loading) return;
    if (!langSwitcherEnabled && lang !== 'en') setLangState('en');
  }, [langSwitcherEnabled, loading, lang]);

  // Only <html lang> here. Titles and descriptions belong to the route via
  // usePageMeta - when both wrote them, whichever effect ran last won, which is
  // why switching language on a case study could reset its title to the
  // homepage's.
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  return [lang, setLang, t, langSwitcherEnabled];
}
