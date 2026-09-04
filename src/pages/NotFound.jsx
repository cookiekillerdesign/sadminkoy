import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Skull } from '@phosphor-icons/react';
import Grain from '../components/Grain';
import Cursor from '../components/Cursor';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import SplitChars from '../components/SplitChars';
import { useLang } from '../lib/useLang';
import { useChisinauClock } from '../lib/useChisinauClock';
import { useReveal } from '../lib/useReveal';
import { useMagnetic } from '../lib/useMagnetic';
import { usePageMeta } from '../lib/usePageMeta';

/**
 * Catch-all route. Used to fall through to <Home />, which served every typo
 * and dead link as a 200 copy of the homepage - search engines index those
 * as duplicates. Same visual as the missing-project state in Project.jsx,
 * plus a noindex meta since the server can't send a real 404 status.
 */
export default function NotFound() {
  const [lang, setLang, t] = useLang();
  const clock = useChisinauClock();
  const n = t.notFound;

  usePageMeta(`404 - ${n.title} | Cookiekiller®`, n.body, { noindex: true });
  useReveal([lang]);
  useMagnetic([lang]);

  return (
    <>
      <Grain />
      <Cursor />
      <SiteHeader lang={lang} setLang={setLang} t={t} activeHref="" />
      <main>
        <section className="notfound">
          <span className="notfound-num" aria-hidden="true">404</span>
          <div className="notfound-badge reveal"><Skull size={13} weight="bold" />{n.badge}</div>
          <h1 className="reveal"><SplitChars text={n.title} key={lang} baseDelay={.15} /></h1>
          <p className="notfound-body reveal">{n.body}</p>
          <div className="notfound-actions reveal">
            <Link className="cert magnetic" to="/portfolio">{n.cta}<ArrowUpRight size={13} weight="bold" /></Link>
            <Link className="notfound-home magnetic" to="/">{t.header.home}<ArrowRight size={13} weight="bold" /></Link>
          </div>
        </section>
      </main>
      <SiteFooter t={t} clock={clock} />
    </>
  );
}
