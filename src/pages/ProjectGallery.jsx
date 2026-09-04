import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, X, CaretLeft, CaretRight, Play } from '@phosphor-icons/react';
import GenerativeArt from '../components/GenerativeArt';
import PixelIcon from '../components/PixelIcon';
import { stripeBg, accentColor } from '../lib/format';
import { smoothScrollTo } from '../lib/scroll';
import { detectKind, isVideo } from '../lib/media';

/** Plays a background video only while its frame is actually on screen —
    matters once a case study can carry several autoplaying clips. */
function useAutoplayInView(ref, enabled) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play?.().catch(() => {});
      else el.pause?.();
    }, { threshold: .35 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled]);
}

// All frames render at 16:9 — the fixed aspect keeps the vertical rhythm of
// the gallery consistent between plain screenshots and video/gif clips.
function GalleryMedia({ item, name, hue, index, onOpen }) {
  const [broken, setBroken] = useState(false);
  const videoRef = useRef(null);
  const file = item && item.file;
  const kind = file ? (item.kind || detectKind(file)) : null;
  const video = isVideo(kind);
  useAutoplayInView(videoRef, video && !broken);

  useEffect(() => { setBroken(false); }, [file]);

  return (
    <div className="lf-gitem reveal">
      <button
        type="button"
        className="lf-gframe"
        onClick={() => file && !broken && onOpen(index)}
        aria-label={name || `Slide ${index + 1}`}
      >
        {!file || broken ? (
          <span className="lf-gframe-fallback" style={{ background: stripeBg(hue) }}>
            <GenerativeArt seed={`${hue}${index}`} hue={hue} density={.7} />
          </span>
        ) : video ? (
          <>
            <video
              ref={videoRef}
              src={file}
              poster={item.poster || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              onError={() => setBroken(true)}
            />
            <span className="lf-gkind" aria-hidden="true"><Play size={11} weight="fill" />video</span>
          </>
        ) : (
          <>
            <img src={file} alt={name || item.caption || ''} loading={index < 2 ? 'eager' : 'lazy'} decoding="async" onError={() => setBroken(true)} />
            {kind === 'gif' && <span className="lf-gkind" aria-hidden="true">gif</span>}
          </>
        )}
      </button>
      {item && item.caption ? <p className="lf-gcaption">{item.caption}</p> : null}
    </div>
  );
}

/** Sticky index/progress HUD — tracks which gallery frame is centred in the
    viewport and the overall scroll position through the gallery. */
function useScrollHud(total, containerRef) {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = [...container.querySelectorAll('.lf-gitem')];
    // Track the ratios of every frame rather than "whichever fired last".
    // With several tall frames crossing the 50% line in one scroll tick the
    // old version could settle on the one furthest from the middle.
    const ratios = new Map();
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => ratios.set(en.target, en.isIntersecting ? en.intersectionRatio : 0));
      let best = -1, bestRatio = 0;
      items.forEach((el, i) => {
        const r = ratios.get(el) || 0;
        if (r > bestRatio) { bestRatio = r; best = i; }
      });
      if (best >= 0) setActive(best);
    }, { threshold: [0, .25, .5, .75, 1] });
    items.forEach(el => io.observe(el));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress(max > 0 ? Math.min(Math.max(scrollY / max, 0), 1) : 0);
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener('scroll', onScroll); };
  }, [total, containerRef]);
  return [active, progress];
}

// Highlights the closing word of a multi-word project name in the project's
// own accent color, echoing the hero title's accent line. A one-word name
// (Victoriabank, Riongo, Promez…) has nothing left over once that word is
// pulled out, so it used to end up entirely re-colored instead of accented —
// reading as a flat block of color instead of a title. Those names now stay
// in the page's normal paper-white and get their accent from the swatch and
// underline beside them instead.
function HighlightedTitle({ text, accent }) {
  const words = String(text || '').trim().split(/\s+/);
  if (words.length < 2) return <>{text}</>;
  const last = words.pop();
  return (
    <>
      {words.join(' ') + ' '}
      <em style={{ color: accent }}>{last}</em>
    </>
  );
}

export default function ProjectGallery({ project, name, tags, overview, platformLabel, chips, posIndex, total, next, nextName, t }) {
  const galleryRef = useRef(null);

  // A project with no uploaded media still needs a page that looks finished —
  // two seeded generative covers stand in until real exports are added.
  const gallery = useMemo(() => {
    const items = Array.isArray(project.gallery) ? project.gallery.filter(g => g && g.file) : [];
    return items.length ? items : [{ file: null }, { file: null }];
  }, [project.gallery]);

  // The roster index is only meaningful when frames are distinct named works.
  // It comes from the captions entered in the admin panel, and falls back to
  // the original hardcoded logo-folio list for that one legacy case study.
  const namedItems = useMemo(() => {
    const captioned = gallery.filter(g => g.caption);
    if (captioned.length >= 2 && captioned.length === gallery.length) {
      return gallery.map(g => ({ name: g.caption, tag: '' }));
    }
    if (project.slug === 'logos-for-business' && gallery.length === t.caseStudy.items.length) {
      return t.caseStudy.items;
    }
    return null;
  }, [gallery, project.slug, t]);

  const [active, progress] = useScrollHud(gallery.length, galleryRef);
  const [lightbox, setLightbox] = useState(null); // index or null

  const jumpTo = (i) => {
    const el = galleryRef.current?.querySelectorAll('.lf-gitem')[i];
    if (!el) return;
    const targetY = el.getBoundingClientRect().top + scrollY - innerHeight * .3;
    smoothScrollTo(targetY, 700);
  };

  // Guarded: the nav buttons stay mounted while the lightbox is closed, and
  // `null + 1` quietly evaluates to 1 — one stray click used to open frame 02.
  const step = (d) => setLightbox(i => (i === null ? null : (i + d + gallery.length) % gallery.length));

  const accent = accentColor(project.hue);
  // Also drives the full-bleed art reveal on the "next project" link below —
  // a couple of projects use a near-black placeholder hue, which would make
  // that hover reveal read as barely-there dark-on-dark instead of a real
  // color moment, so the same near-black guard applies there too.
  const nextAccent = accentColor(next.hue);
  const nextIndex = total > 0 ? (posIndex % total) + 1 : 1; // mirrors the wrap-around

  useEffect(() => {
    if (lightbox === null) return;
    document.body.classList.add('locked');
    const onKey = e => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    addEventListener('keydown', onKey);
    return () => { document.body.classList.remove('locked'); removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, gallery.length]);

  const lbItem = lightbox !== null ? gallery[lightbox] : null;
  const lbFile = lbItem ? lbItem.file : null;
  const lbVideo = lbItem ? isVideo(lbItem.kind || detectKind(lbFile || '')) : false;

  return (
    <>
      <section className="lf-intro">
        <div className="lf-eyebrow reveal">
          <span className="lf-title-dot" style={{ background: accent }} aria-hidden="true" />
          <span className="lf-eyebrow-idx">{t.caseStudy.eyebrowLabel} {String(posIndex).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
          <span className="lf-eyebrow-sep" aria-hidden="true">·</span>
          <span className="lf-eyebrow-tags">{tags}</span>
        </div>
        <div className="lf-title-row">
          <span className="lf-title-swatch" style={{ background: accent }} aria-hidden="true" />
          <h1 className="reveal"><HighlightedTitle text={name} accent={accent} /></h1>
        </div>
        <p className="lf-intro-sub reveal">{overview}</p>
        <div className="lf-meta-row reveal">
          <div className="lf-meta-item"><span>{t.project.client}</span><b>{name}</b></div>
          <div className="lf-meta-item"><span>{t.project.role}</span><b>{tags}</b></div>
          <div className="lf-meta-item"><span>{t.project.year}</span><b>{project.year || '—'}</b></div>
          <div className="lf-meta-item"><span>{t.project.platform}</span><b>{platformLabel}</b></div>
        </div>
        {chips.length > 0 && (
          <div className="lf-chips reveal">
            <span className="lf-chips-label">{t.project.skillsLabel}</span>
            {chips.map((c, i) => <span key={i}>{c}</span>)}
          </div>
        )}
        {project.external && (
          <p className="lf-external reveal">
            <a className="cert magnetic" href={project.external} target="_blank" rel="noopener noreferrer">
              {t.project.behance}<ArrowRight size={13} weight="bold" />
            </a>
          </p>
        )}
      </section>

      <div className="lf-hud" aria-hidden="true">
        <span className="lf-hud-idx">{String(active + 1).padStart(2, '0')} / {String(gallery.length).padStart(2, '0')}</span>
        <span className="lf-hud-bar"><i style={{ width: `${progress * 100}%` }} /></span>
      </div>

      <div className="lf-gallery" ref={galleryRef}>
        {gallery.map((g, i) => (
          <GalleryMedia key={g.id || `${g.file || 'placeholder'}-${i}`} item={g} name={namedItems?.[i]?.name} hue={project.hue} index={i} onOpen={setLightbox} />
        ))}
      </div>

      <div className={`lf-lightbox${lightbox !== null ? ' open' : ''}`} aria-hidden={lightbox === null}>
        <button type="button" className="lf-lb-close" aria-label={t.header.close} onClick={() => setLightbox(null)} tabIndex={lightbox === null ? -1 : 0}><X size={16} weight="bold" /></button>
        <button type="button" className="lf-lb-nav l" aria-label="Previous" onClick={() => step(-1)} tabIndex={lightbox === null ? -1 : 0}><CaretLeft size={16} weight="bold" /></button>
        <button type="button" className="lf-lb-nav r" aria-label="Next" onClick={() => step(1)} tabIndex={lightbox === null ? -1 : 0}><CaretRight size={16} weight="bold" /></button>
        {lbFile && (lbVideo
          ? <video src={lbFile} poster={lbItem.poster || undefined} muted loop playsInline autoPlay controls />
          : <img src={lbFile} alt={namedItems?.[lightbox]?.name || lbItem.caption || ''} />)}
      </div>

      {namedItems && (
        <section className="lf-roster">
          <div className="lf-eyebrow reveal">
            {t.caseStudy.allLabel}
            <span className="lf-roster-hint">{t.caseStudy.clickHint}</span>
          </div>
          <div className="lf-roster-grid">
            {namedItems.map((it, i) => (
              <button type="button" key={i} className={`lf-rrow${active === i ? ' active' : ''}`} onClick={() => jumpTo(i)}>
                <span className="lf-ridx">{String(i + 1).padStart(2, '0')}</span>
                <span className="lf-rname">{it.name}</span>
                <span className="lf-rtag">{it.tag}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <Link className="project-next" to={next.href} data-cursor-label={`↗ ${nextName}`}>
        <span className="pn-preview" style={{ background: stripeBg(nextAccent) }} aria-hidden="true">
          {/* This banner renders the cover far larger than the 1:1 work-list
              thumbnail (`thumb`) was ever sized for - stretching that small
              square across a full-bleed, ~440px-tall block is what read as
              blurry/pixelated. `previewImg` is the larger 4:3 cover uploaded
              for the homepage hover preview, so it's a much better source
              here; only fall back to the thumb when no preview exists. */}
          {(next.previewImg || next.thumb)
            ? <img className="pn-preview-img" src={next.previewImg || next.thumb} alt="" loading="lazy" decoding="async" />
            : <GenerativeArt seed={next.slug} hue={nextAccent} density={.6} />}
        </span>
        <span className="pn-top">
          <span className="pn-label"><PixelIcon glyph="square" className="pn-swatch" style={{ color: nextAccent }} />{t.project.next}</span>
          <span className="pn-index">{String(nextIndex).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
        </span>
        <span className="pn-name">
          {nextName}
          <span className="pn-arrow" aria-hidden="true"><PixelIcon glyph="arrow" className="pn-arrow-icon" /></span>
        </span>
      </Link>
    </>
  );
}
