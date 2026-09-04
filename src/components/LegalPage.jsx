import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ShieldCheck } from '@phosphor-icons/react';
import Grain from './Grain';
import ProgressBar from './ProgressBar';
import Cursor from './Cursor';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import SplitChars from './SplitChars';
import { useLang } from '../lib/useLang';
import { useChisinauClock } from '../lib/useChisinauClock';
import { useReveal, mountReveal } from '../lib/useReveal';
import { useMagnetic } from '../lib/useMagnetic';
import { usePageMeta } from '../lib/usePageMeta';
import { isSupabaseConfigured } from '../lib/supabaseConfig';
import { fetchSiteText } from '../content/publicApi';
import { PRIVACY_CONTROLLER, parsePrivacy } from '../data/privacy';

const LOCALE = { en: 'en-GB', ru: 'ru-RU', ro: 'ro-RO' };

/* Tiny inline renderer for the policy text: **bold** and [label](url).
   Enough for a legal page, avoids pulling in a markdown library. */
function inline(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<b key={k++}>{m[1]}</b>);
    else {
      const href = m[3];
      const external = /^https?:/.test(href);
      out.push(
        <a key={k++} href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>{m[2]}</a>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/**
 * Generic legal-page shell shared by Privacy, Cookie Policy and GDPR - same
 * admin-editable-text-with-a-built-in-fallback plumbing (see src/data/privacy.js
 * for the format), just parameterised by which policy it's showing.
 *
 * `textKey` is the site_texts row key that this page's admin-edited text
 * would live under (e.g. 'privacy', 'cookies', 'gdpr') - each policy gets
 * its own row, all optional; every one of these pages works from its
 * built-in default text alone with no Supabase content configured at all.
 */
export default function LegalPage({ textKey, labels, defaultText, updatedAt, activeHref, controller = PRIVACY_CONTROLLER }) {
  const [lang, setLang, t] = useLang();
  const clock = useChisinauClock();
  const p = labels[lang] || labels.en;
  const [heroIn, setHeroIn] = useState(false);
  // Admin-edited text from Supabase; null until fetched or when there's none,
  // in which case the built-in default below is shown.
  const [row, setRow] = useState(null);

  usePageMeta(p.metaTitle, p.metaDesc);
  useEffect(() => mountReveal(setHeroIn, 60), []);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const ac = new AbortController();
    fetchSiteText(textKey, ac.signal).then(r => { if (!ac.signal.aborted && r) setRow(r); });
    return () => ac.abort();
  }, [textKey]);

  const custom = row && typeof row[lang] === 'string' && row[lang].trim();
  const text = custom ? row[lang] : (defaultText[lang] || defaultText.en);
  const { intro, sections } = parsePrivacy(text);

  useReveal([lang, text]);
  useMagnetic([lang]);

  const updated = new Date(custom ? row.updated_at : updatedAt).toLocaleDateString(LOCALE[lang] || 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <Grain />
      <ProgressBar />
      <Cursor />
      <SiteHeader lang={lang} setLang={setLang} t={t} activeHref={activeHref} />

      <main className="legal">
        <section className="legal-hero">
          <div className={`legal-badge mreveal${heroIn ? ' in' : ''}`}><ShieldCheck size={13} weight="bold" />{p.eyebrow}</div>
          <div className="ph-title">
            <span className="ph-ghost" aria-hidden="true">{p.title}</span>
            {/* One word per nowrap span: SplitChars makes every letter an
                inline-block, which would otherwise let the line break mid-word. */}
            <h1>{p.title.split(' ').map((w, i) => (
              <span className="legal-word" key={`${lang}-${i}`}>{i > 0 && ' '}<SplitChars text={w} baseDelay={.12 + i * .12} /></span>
            ))}</h1>
          </div>
          <p className={`legal-intro mreveal${heroIn ? ' in' : ''}`}>{inline(intro)}</p>
          <dl className={`legal-meta mreveal${heroIn ? ' in' : ''}`}>
            <div><dt>{p.updatedLabel}</dt><dd>{updated}</dd></div>
            <div><dt>{p.controllerLabel}</dt><dd>{controller.name} · {controller.brand}</dd></div>
          </dl>
        </section>

        <section className="legal-body">
          <div className="legal-sections">
            {sections.map((s, i) => (
              <article className="legal-section reveal" id={`section-${i}`} key={i}>
                <h2><span className="legal-num">{String(i + 1).padStart(2, '0')}</span>{s.title}</h2>
                {s.body.map((para, j) => <p key={j}>{inline(para)}</p>)}
              </article>
            ))}

            <div className="legal-actions reveal">
              <a className="cert magnetic" href={`mailto:${controller.email}`}>{p.contactCta}<ArrowUpRight size={13} weight="bold" /></a>
              <Link className="notfound-home magnetic" to="/">{p.backHome}<ArrowRight size={13} weight="bold" /></Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter t={t} clock={clock} />
    </>
  );
}
