import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Grain from '../components/Grain';
import ProgressBar from '../components/ProgressBar';
import Cursor from '../components/Cursor';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import PixelIcon from '../components/PixelIcon';
import SplitChars from '../components/SplitChars';
import GenerativeArt from '../components/GenerativeArt';
import RippleThumb from '../components/RippleThumb';
import { useLang } from '../lib/useLang';
import { useChisinauClock } from '../lib/useChisinauClock';
import { useReveal, mountReveal } from '../lib/useReveal';
import { useMagnetic } from '../lib/useMagnetic';
import { useProjects } from '../content/ContentProvider';
import { projectName, projectTags } from '../i18n';
import { initials, stripeBg, accentColor } from '../lib/format';
import { usePageMeta } from '../lib/usePageMeta';

const CATEGORIES = ['all', 'product', 'ecommerce', 'mobile', 'branding'];

function PortfolioCard({ p, catalogIdx, posIdx, lang, t }) {
  const artCanvasRef = useRef(null);
  const rippleCanvasRef = useRef(null);
  const activeRef = useRef(false);

  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', ((.5 - py) * 8).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((px - .5) * 10).toFixed(2) + 'deg');
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    rippleCanvasRef.current?.__ripplePush?.(px, py);
  };
  const onEnter = (e) => {
    activeRef.current = true;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    rippleCanvasRef.current?.__rippleStart?.();
    rippleCanvasRef.current?.__ripplePush?.(px, py);
  };
  const onLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    activeRef.current = false;
  };
  // The card frame is 4:3, so prefer the 4:3 "preview" cover - the square
  // thumb only as a fallback (a square in a 4:3 frame gets visibly cropped
  // and reads as "the cover zoomed in instead of fitting").
  const cover = p.previewImg || p.thumb;
  return (
    <Link
      className="pf-card"
      to={p.href}
      style={{ animationDelay: Math.min(posIdx, 7) * 55 + 'ms' }}
      onMouseEnter={onEnter}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      data-cursor-label={`↗ ${t.portfolio.viewCase}`}
    >
      <span className="pf-idx">{String(catalogIdx + 1).padStart(2, '0')}</span>
      <span className={`pf-status status ${p.status}`}>{t.status[p.status]}</span>
      <span className={`pf-thumb${cover ? '' : ' pf-placeholder'}`} style={cover ? undefined : { background: stripeBg(p.hue) }}>
        {cover ? (
          <img className="pf-thumb-img" src={cover} alt="" loading="lazy" decoding="async" onError={e => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <>
            <GenerativeArt seed={p.slug} hue={p.hue} canvasRef={artCanvasRef} />
            <RippleThumb sourceRef={artCanvasRef} active={activeRef} ref={rippleCanvasRef} />
            <span>{initials(projectName(p, lang))}</span>
          </>
        )}
      </span>
      <span className="pf-overlay">
        <span className="pf-name"><span className="pf-name-text">{projectName(p, lang)}</span><PixelIcon glyph="arrow" className="pf-arrow" /></span>
        <span className="pf-tags">{projectTags(p, lang)}</span>
      </span>
    </Link>
  );
}

export default function Portfolio() {
  const PROJECTS = useProjects();
  const [lang, setLang, t] = useLang();
  const clock = useChisinauClock();
  usePageMeta(
    'Portfolio - UX/UI & Graphic Design Case Studies | Cookiekiller®',
    'Full portfolio of UX/UI, product design and branding work by Mihail Barascov (Cookiekiller®) - Chisinau-based designer, twelve projects across banking, e-commerce and mobile.'
  );
  const [filter, setFilter] = useState('all');       // drives active button + pill (instant)
  const [displayFilter, setDisplayFilter] = useState('all'); // drives what's actually rendered
  const [gridPhase, setGridPhase] = useState('idle'); // 'idle' | 'leaving'
  const [heroIn, setHeroIn] = useState(false);
  const filtersRef = useRef(null);
  const pendingRef = useRef('all');
  const [pillStyle, setPillStyle] = useState({ opacity: 0 });

  const filtered = useMemo(
    () => displayFilter === 'all' ? PROJECTS : PROJECTS.filter(p => p.category === displayFilter),
    [displayFilter, PROJECTS]
  );
  // Hide filter tabs for categories with nothing in them - no point offering
  // a tab that only leads to the "nothing here yet" empty state.
  const visibleCategories = useMemo(
    () => CATEGORIES.filter(cat => cat === 'all' || PROJECTS.some(p => p.category === cat)),
    [PROJECTS]
  );
  // counts the just-clicked target immediately, independent of the grid's
  // own crossfade timing, so the badge feels responsive to the click
  const targetCount = useMemo(
    () => filter === 'all' ? PROJECTS.length : PROJECTS.filter(p => p.category === filter).length,
    [filter, PROJECTS]
  );

  useEffect(() => mountReveal(setHeroIn, 60), []);
  useReveal([displayFilter, PROJECTS]);
  useMagnetic([]);

  const selectFilter = (cat) => {
    if (cat === filter) return;
    setFilter(cat);
    pendingRef.current = cat;
    setGridPhase('leaving');
  };

  // If the active tab's category empties out (or was never populated), fall
  // back to "all" rather than leaving an active tab that isn't shown.
  useEffect(() => {
    if (!visibleCategories.includes(filter)) selectFilter('all');
  }, [visibleCategories]);

  useEffect(() => {
    if (gridPhase !== 'leaving') return;
    const id = setTimeout(() => {
      setDisplayFilter(pendingRef.current);
      setGridPhase('idle');
    }, 220);
    return () => clearTimeout(id);
  }, [gridPhase]);

  useLayoutEffect(() => {
    const container = filtersRef.current;
    if (!container) return;
    const sync = () => {
      const active = container.querySelector('.pf-btn.active');
      if (!active) return;
      const cRect = container.getBoundingClientRect(), aRect = active.getBoundingClientRect();
      setPillStyle({
        transform: `translate(${aRect.left - cRect.left}px, ${aRect.top - cRect.top}px)`,
        width: aRect.width + 'px',
        height: aRect.height + 'px',
        opacity: 1
      });
    };
    sync();
    addEventListener('resize', sync);
    return () => removeEventListener('resize', sync);
  }, [filter, lang, visibleCategories]);

  return (
    <>
      <Grain />
      <ProgressBar />
      <Cursor />
      <SiteHeader lang={lang} setLang={setLang} t={t} activeHref="/portfolio" />

      <main>
        <section className="portfolio-hero">
          <div className="ph-top">
            <div className="ph-title">
              <span className="ph-ghost" aria-hidden="true">{t.portfolio.title}</span>
              <h1><SplitChars text={t.portfolio.title} key={lang} baseDelay={.12} /><PixelIcon glyph="spark" twinkle pop className="ph-spark" /></h1>
            </div>
            <div className={`ph-stats mreveal${heroIn ? ' in' : ''}`}>
              <div className="ph-stat">
                <b>{String(PROJECTS.length).padStart(2, '0')}</b>
                <span>{t.portfolio.statCount}</span>
              </div>
              <div className="ph-stat">
                <b>2018&ndash;2026</b>
                <span>{t.portfolio.statRange}</span>
              </div>
              <div className="ph-palette" aria-hidden="true">
                {PROJECTS.slice(0, 6).map(p => <i key={p.slug} style={{ background: accentColor(p.hue) }} />)}
              </div>
            </div>
          </div>
          <p className={`mreveal${heroIn ? ' in' : ''}`}>{t.portfolio.intro}</p>
        </section>

        <div className={`portfolio-filters${heroIn ? ' in' : ''}`} role="group" aria-label={t.portfolio.title} ref={filtersRef}>
          <span className="pf-pill" style={pillStyle} aria-hidden="true" />
          {visibleCategories.map(cat => (
            <button
              key={cat}
              type="button"
              className={`pf-btn${filter === cat ? ' active' : ''}`}
              aria-pressed={filter === cat}
              onClick={() => selectFilter(cat)}
            >
              {filter === cat && <PixelIcon glyph="arrow" pop className="pf-btn-arrow" />}
              {t.portfolio.filters[cat]}
            </button>
          ))}
          <span className="pf-count"><b>{String(targetCount).padStart(2, '0')}</b> / {String(PROJECTS.length).padStart(2, '0')}</span>
        </div>

        {!filtered.length && (
          <p className="pf-empty">{t.portfolio.empty}</p>
        )}
        <div className={`portfolio-grid${gridPhase === 'leaving' ? ' leaving' : ''}`} key={displayFilter}>
          {filtered.map((p, posIdx) => (
            <PortfolioCard key={p.slug} p={p} catalogIdx={PROJECTS.indexOf(p)} posIdx={posIdx} lang={lang} t={t} />
          ))}
        </div>

      </main>

      <SiteFooter t={t} clock={clock} />
    </>
  );
}
