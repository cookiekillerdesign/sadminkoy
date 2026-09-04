import { useEffect, useRef, useState, useCallback, useMemo, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LANGS, detectLang, translations, projectName, projectTags, fmtCount, deckField, itemLabel } from '../i18n';
import { useProjects, useSiteMedia, useContent, useCapabilityDecks, useCertifications, useSocialLinks } from '../content/ContentProvider';
import { iconFor, isExternalUrl } from '../lib/socialIcons';
import PixelHeart, { HEART } from '../components/PixelHeart';
import { initials, stripeBg } from '../lib/format';
import { scrollToHash } from '../lib/scroll';
import { useChisinauClock } from '../lib/useChisinauClock';
import { getSiteMenuLinks } from '../lib/menu';
import { usePageMeta } from '../lib/usePageMeta';
import SlotMedia from '../components/SlotMedia';
import GenerativeArt from '../components/GenerativeArt';
import {
  List, X, ArrowRight, ArrowUpRight, PawPrint, Skull,
  EnvelopeSimple, CheckCircle, SealCheck
} from '@phosphor-icons/react';

const CERTIPORT_VERIFY = 'https://verify.certiport.com';

// Mirrors the SUBJECTS map that used to live server-side in api/send-lead.js
// - now that the lead form posts straight to Web3Forms, the email subject
// is built here instead.
const FORM_SUBJECTS = {
  vet: 'Vet volunteer / rescue project',
  metal: 'Band / label project',
  general: 'New project request'
};

// Capabilities cards used to list every skill/tool for a deck (12-18 chips),
// which read as a wall of tags rather than a card you can scan in a glance -
// worse on mobile, where that many wrapped pills make the card twice as
// tall as it needs to be. This trims each card down to the handful of
// keywords that most directly say what the card's own title means, without
// touching the underlying deck/item data - a project's "What I used" chips
// (see resolveChipLabels in i18n.js) still resolve against the full list,
// and the admin panel still shows every item. Matched against the item's
// canonical English label (stable across languages), keyed by deck
// position - if a deck doesn't match any curated label (e.g. capability
// decks were rebuilt from the admin panel), it just falls back to showing
// everything rather than rendering an empty card.
const CAPABILITY_HIGHLIGHTS = [
  ['UX Research', 'User Flows', 'Information Architecture', 'Wireframing', 'MVP Design', 'A/B Testing'],
  ['Design Systems', 'Prototyping', 'Responsive Design', 'Accessibility', 'Design Tokens', 'Motion Design'],
  ['Identity Systems', 'Rebranding', 'Brand Guidelines', 'Typography & Lettering', 'Packaging', 'Illustration'],
  ['Figma', 'Adobe CC', 'Framer', 'ChatGPT', 'Claude', 'Notion']
];
function highlightedDeckItems(deck, deckIndex) {
  const highlight = CAPABILITY_HIGHLIGHTS[deckIndex];
  if (!highlight || !deck.items) return deck.items || [];
  const shown = deck.items.filter(it => highlight.includes(it.label));
  return shown.length ? shown : deck.items;
}

// About-section stat tiles: the count-up target plus the +/% accent shown
// as a small superscript, keyed to `t.about.stats` (same index) for labels.
const STAT_META = [
  { target: 18, prefix: '+', suffix: '%' },
  { target: 35, suffix: '+' },
  { target: 800, suffix: 'K+' },
  { target: 12 },
  { target: 5, suffix: '+' }
];

/* ================= loader ================= */
// Plays only once per SPA session. Navigating back to "/" from another route
// (e.g. clicking "Contact" while on /portfolio) shouldn't replay a ~2.5s
// boot animation every time - that's the "site reloads" feeling reported.
let hasBootedThisSession = false;

const LOADER_DURATION = 1500; // ms - total boot animation length (was 2200 - felt long)

function Loader({ onDone, messages, skip }) {
  const [count, setCount] = useState(skip ? 100 : 0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [done, setDone] = useState(skip);
  const [removed, setRemoved] = useState(skip);

  useEffect(() => {
    if (skip) { onDone && onDone(); return; }
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (RM) {
      setCount(100);
      setDone(true);
      const t = setTimeout(() => { setRemoved(true); onDone && onDone(); }, 200);
      return () => clearTimeout(t);
    }

    // A steady eased curve (quick start, gentle finish) reads as "actually
    // loading" - the old per-tick random jump made the count look glitchy
    // rather than purposeful.
    const start = performance.now();
    let raf;
    // Cycles through the playful status lines independently of the count -
    // same idea as Claude's own "frying garlic" / "painting the wall"
    // working messages, themed to this site's "I kill bad design" voice.
    // Slower than the count so it reads as a couple of calm status updates
    // rather than flickering text (was 420ms - far too fast to actually read).
    const msgTimer = setInterval(() => {
      setMsgIndex(i => (i + 1) % messages.length);
    }, 650);

    const tick = (now) => {
      // Clamped on both ends: on the very first frame the rAF timestamp can
      // land a hair before this `start` (a well-known browser timing quirk,
      // not a logic bug), which without the lower clamp briefly computed a
      // negative eased value and flashed a negative number for one frame.
      const p = Math.min(Math.max((now - start) / LOADER_DURATION, 0), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        clearInterval(msgTimer);
        setTimeout(() => setDone(true), 200);
        // Short hold on "100" then gone - the old 1600ms tail after the count
        // finished was most of what made the loader feel slow.
        setTimeout(() => { setRemoved(true); onDone && onDone(); }, 500);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); clearInterval(msgTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone, skip, messages]);

  if (removed) return null;

  return (
    <div className={`loader${done ? ' done' : ''}`} aria-hidden="true">
      <div className="half l" /><div className="half r" />
      <div className="loader-core">
        <PixelHeart stagger />
        <div className="loader-count">{count}</div>
        <div className="loader-tag" key={msgIndex}>{messages[msgIndex]}</div>
      </div>
    </div>
  );
}

/* ================= logo mark (shared by the header and the mobile menu) ================= */
function LogoMark() {
  return (
    <>
      <svg viewBox="0 0 991 404" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M549.018 205.735L609.076 293.797H665.209L583.169 176.56L659.717 90.0701H603.976L521.147 181.595L519.209 0H466.608L468.546 293.797H521.147V233.021L549.018 205.735ZM63.595 289.349C76.9399 294.91 91.9864 297.723 108.735 297.723L108.729 297.739C123.91 297.739 137.582 295.447 149.752 290.868C161.921 286.289 172.518 279.939 181.547 271.828C190.576 263.717 197.441 254.554 202.154 244.349L150.734 228.648C148.641 233.355 145.371 237.542 140.921 241.209C136.477 244.875 131.436 247.752 125.81 249.846C120.185 251.939 114.232 252.986 107.951 252.986C98.004 252.986 88.975 250.367 80.8639 245.068C72.7528 239.835 66.2736 232.636 61.4316 223.543C56.5897 214.385 54.1687 203.982 54.1687 192.14C54.1687 180.105 56.5199 169.503 61.233 160.345C65.9462 151.246 72.42 144.182 80.6653 139.211C88.9052 134.17 97.9986 131.685 107.946 131.685C116.846 131.685 124.957 133.709 132.284 137.767C139.612 141.825 145.5 147.644 149.95 155.235L201.371 139.533C193.523 123.832 181.616 111.142 165.652 101.458C149.693 91.7737 130.588 86.9318 108.343 86.9318C86.1031 86.9318 66.8695 91.704 50.6419 101.323C34.4144 110.873 21.9176 123.628 13.1517 139.528C4.38567 155.428 0 172.96 0 192.129C0 206.134 2.54981 219.415 7.6548 232.105C12.7598 244.795 20.0227 256.116 29.4436 266.057C38.8645 276.069 50.2501 283.788 63.595 289.349ZM687.579 293.806V88.1143L739.789 88.5061L740.181 293.806H687.579ZM838.324 289.346C851.669 294.908 866.587 297.721 883.072 297.721L883.078 297.715C898.253 297.715 912.124 295.423 924.685 290.844C937.246 286.265 948.17 279.915 957.462 271.804C966.749 263.693 973.883 254.401 978.854 243.933L933.709 231.372C930.305 239.746 923.96 246.483 914.668 251.588C905.376 256.693 895.499 259.243 885.031 259.243C875.868 259.243 867.301 257.278 859.319 253.289C851.336 249.365 844.798 243.541 839.693 235.822C834.593 228.167 831.518 219.202 830.471 208.998H989.45C989.713 206.904 989.971 204.285 990.234 201.016C990.497 197.811 990.626 194.606 990.626 191.53C990.626 173.08 986.369 155.94 977.866 139.976C969.363 124.081 957.129 111.193 941.165 101.509C925.206 91.7603 905.972 86.9183 883.464 86.9183C861.219 86.9183 841.921 91.7603 825.564 101.509C809.208 111.193 796.647 124.081 787.881 140.11C779.115 156.139 774.729 173.87 774.729 193.302C774.729 207.302 777.279 220.518 782.384 233.079C787.489 245.64 794.752 256.763 804.173 266.446C813.594 276.195 824.979 283.785 838.324 289.346ZM936.854 175.641H829.301C830.347 165.431 833.289 156.536 838.131 148.946C842.973 141.425 849.254 135.536 856.973 131.349C864.692 127.098 873.265 125.004 882.686 125.004C892.364 125.004 901.135 127.098 908.984 131.349C916.837 135.536 923.182 141.42 928.024 148.946C932.866 156.536 935.808 165.436 936.854 175.641ZM713.747 66.4778C668.86 66.4778 668.903 0.220308 713.747 0.220308C758.882 0.220308 759.053 66.4778 713.747 66.4778ZM601.486 366.725V353.369C604.106 353.707 607.402 353.96 610.021 353.96H665.382C667.159 353.96 671.383 353.793 673.75 353.369V366.639C671.469 366.472 667.915 366.386 665.382 366.386H646.449C645.858 374.836 643.743 381.514 640.871 387.263C637.999 393.264 631.407 400.114 623.715 404L611.712 395.379C617.375 393.264 623.291 388.449 626.673 383.714C629.969 378.813 631.574 372.978 632.084 366.386H610.021C607.573 366.386 603.853 366.558 601.486 366.725ZM654.989 329.53L662.934 326.32V326.314C665.049 329.438 668.007 334.935 669.526 337.893L661.495 341.275C660.395 339.079 658.962 336.288 657.523 333.668V344.657C654.399 344.49 650.931 344.319 647.721 344.319H620.929C617.971 344.319 613.913 344.485 611.127 344.657V331.553C613.999 331.977 618.057 332.23 620.929 332.23H647.721C650.512 332.23 653.556 332.063 656.342 331.725C656.025 331.159 655.663 330.59 655.323 330.056L655.322 330.055C655.265 329.966 655.209 329.878 655.154 329.791C655.098 329.702 655.043 329.615 654.989 329.53ZM665.387 325.471L673.332 322.261C675.527 325.471 678.571 330.882 680.01 333.754L672.065 337.136C670.374 333.668 667.668 328.681 665.387 325.471ZM751.007 329.363L757.685 327.248C759.29 330.716 761.067 335.531 761.995 338.661L755.318 340.776C754.137 337.141 752.698 332.831 751.007 329.363ZM741.962 358.436V361.142L741.957 361.147C741.957 381.181 736.803 394.622 715.755 403.834L704.767 393.522C721.676 387.939 728.52 380.585 728.52 361.485V358.442H710.768V368.668C710.768 372.807 711.026 376.103 711.192 378.218H696.908C697.16 376.108 697.413 372.807 697.413 368.668V358.442H691.325C686.763 358.442 684.229 358.614 681.776 358.78V344.92C681.89 344.94 682.007 344.96 682.129 344.982L682.163 344.988C684.115 345.331 687.055 345.848 691.325 345.848H697.413V338.832C697.413 336.041 697.16 333.336 696.822 330.378H711.359C711.107 332.402 710.768 335.279 710.768 338.913V345.843H728.52V337.898C728.52 334.431 728.349 331.645 728.01 329.53H742.547C742.461 330.286 742.381 331.135 742.295 332.063L748.806 330.034C750.411 333.502 752.102 338.237 752.945 341.447L746.181 343.642C745.913 342.819 745.644 341.962 745.371 341.089L745.371 341.089C744.438 338.108 743.45 334.951 742.209 332.401C742.042 334.012 741.957 335.783 741.957 337.898V345.843H746.439C751.34 345.843 753.707 345.671 756.665 345.167V358.689C754.303 358.436 751.345 358.436 746.525 358.436H741.962ZM770.278 375.26L763.939 362.328L763.933 362.323C779.318 358.436 791.407 353.197 800.871 347.448C809.406 342.209 819.718 333.083 825.043 326.658L836.117 337.222C829.777 343.395 821.581 349.987 813.55 355.312V388.615C813.55 392.674 813.722 398.503 814.398 400.871H798.171C798.509 398.589 798.847 392.674 798.847 388.615V363.847C790.312 368.158 780.086 372.468 770.278 375.26ZM871.707 347.625V339.509L871.712 339.514C871.712 336.556 871.374 331.988 870.446 328.778H886.673C886.077 331.988 885.911 336.889 885.911 339.595V347.625H902.987C907.464 347.625 911.269 347.287 913.299 347.035V361.067C911.269 360.895 906.707 360.643 902.901 360.643H885.825C885.068 376.784 880.081 390.816 861.401 402.143L848.635 392.679C865.373 385.153 870.526 373.488 871.541 360.643H851.759C847.787 360.643 844.239 360.895 841.109 361.147V346.949C844.153 347.287 847.787 347.625 851.421 347.625H871.707ZM920.728 372.05V355.908C924.11 356.16 931.206 356.499 935.35 356.499H980.232C983.138 356.499 986.237 356.251 988.632 356.061C988.958 356.035 989.271 356.01 989.569 355.986C989.949 355.957 990.305 355.93 990.63 355.908V372.05C989.872 372.022 988.815 371.954 987.612 371.876L987.61 371.876H987.61C985.32 371.727 982.505 371.545 980.232 371.545H935.35C930.535 371.545 924.19 371.797 920.728 372.05ZM328.577 297.722C270.608 297.722 223.181 250.295 223.181 192.326C223.181 134.356 270.608 86.93 328.577 86.93V131.678C295.22 131.678 267.929 158.969 267.929 192.326C267.929 225.683 295.22 252.974 328.577 252.974V297.722ZM433.972 267.357C433.972 209.388 386.546 161.961 328.576 161.961V206.704C361.933 206.704 389.224 233.995 389.224 267.352C389.224 300.709 361.933 328 328.576 328V372.753C386.546 372.753 433.972 325.327 433.972 267.357Z" fill="currentColor" />
      </svg>
    </>
  );
}

/* ================= hero title split ================= */
function HeroTitleLine({ text, accent, innerRef }) {
  let charIndex = 0;
  return (
    <span className={`line${accent ? ' accent' : ''}`} ref={innerRef}>
      {[...text].map((c, i) => {
        if (c === ' ') return <span className="sp" key={i}> </span>;
        const delay = (0.55 + charIndex * 0.035) + 's';
        charIndex++;
        return <span className="ch" style={{ transitionDelay: delay }} key={i}>{c}</span>;
      })}
    </span>
  );
}

/* ================= certifications ================= */
/**
 * One credential card. Front face is the existing badge/title/verify-link
 * design; hovering (or, on touch, tapping) flips it 180° to the back face,
 * which shows the actual scanned certificate - as a CSS background-image
 * rather than an <img>, and with right-click/drag disabled on it, so the
 * casual "save image as" route just isn't there. None of this stops an
 * actual screenshot - nothing running in a browser tab can - it just removes
 * the one-click path.
 *
 * The holographic sheen and scanline texture on the back are cosmetic: they
 * read as "this is a protected scan", which is the point, without claiming
 * a security guarantee the card can't back up.
 */
function CertCard({ cert, index, onExpand, t }) {
  const cardRef = useRef(null);
  const [flipped, setFlipped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const issuerClass = cert.issuer === 'Adobe' ? 'adobe' : 'ibm';
  const hasImg = !!cert.img;
  const hoverCapable = () => matchMedia('(hover: hover)').matches;

  // The page's own reveal-on-scroll effect adds `.in` straight to the DOM
  // node with classList.add, bypassing React entirely - fine for elements
  // whose className never changes again, but this card's className is
  // recomputed from `flipped`/`hasImg` on every render, and React overwrites
  // the whole class attribute whenever that computed string changes. Tapping
  // the card (which flips `flipped`) was clobbering the imperatively-added
  // `.in` class the instant React re-rendered - since `.reveal:not(.in)` is
  // opacity:0 with a 1s transition, the card would visibly animate itself
  // into nothing right after the tap that was supposed to flip it. Tracking
  // "revealed" as real React state and folding it into the className below
  // keeps it under React's own reconciliation, so it survives every re-render.
  useEffect(() => {
    const el = cardRef.current;
    if (!el || el.classList.contains('in')) { setRevealed(true); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { setRevealed(true); io.unobserve(en.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
  };

  // The back's own click (settled state, the common case) - opens the
  // lightbox and stops its own bubbling so it doesn't also reach onCardClick
  // below.
  const onBackClick = (e) => {
    e.stopPropagation();
    onExpand(cert);
  };

  // Fallback for the outer container. Needed because for a few frames mid-
  // flip, a still-turning 3D face can occupy neither face's actual hit-test
  // box (foreshortened close to edge-on) - a click right then lands on
  // .cert-flip-inner, which has no handler of its own, and bubbles up here.
  // `hovered`/`flipped` is the same logical state the flip itself runs on,
  // so it's never out of sync with what's actually on screen - unlike asking
  // the browser which face's DOM node the click resolved to, which can be a
  // frame behind. `hovered` is only ever set on genuinely hover-capable
  // devices (see below): touch has no equivalent mid-transition gap here,
  // since applying .is-flipped is instant, not a race with a transition.
  const onCardClick = () => {
    if (!hasImg) return;
    if (hovered || flipped) { onExpand(cert); return; }
    if (matchMedia('(hover: none)').matches) setFlipped(f => !f);
  };

  // The staggered per-card delay reads as a nice cascade when a whole row
  // reveals together on desktop's multi-column grid. On the single-column
  // mobile layout, cards enter the viewport one at a time already - stacking
  // an index-based delay on top of that just makes each one visibly lag
  // behind its own scroll position, so touch devices skip the stagger.
  const staggerDelay = matchMedia('(hover: none)').matches ? 0 : Math.min(index, 6) * 45;

  return (
    <div
      className={`cert-flip reveal${revealed ? ' in' : ''}${!hasImg ? ' no-back' : ''}${flipped ? ' is-flipped' : ''}`}
      style={{ transitionDelay: staggerDelay + 'ms' }}
      ref={cardRef}
      onMouseMove={onMove}
      onMouseEnter={() => { if (hoverCapable()) setHovered(true); }}
      onMouseLeave={() => { if (hoverCapable()) setHovered(false); }}
      onClick={onCardClick}
    >
      <div className="cert-ribbon-clip" aria-hidden="true"><span className="cert-ribbon">Verified</span></div>
      <div className="cert-flip-inner">
        <div className="cert-face">
          <div className="cert-front">
            <span className="cert-glow" aria-hidden="true" />
            <SealCheck size={168} weight="fill" className="cert-watermark" aria-hidden="true" />
            <span className="cert-card-top">
              <span className={`cert-issuer ${issuerClass}`}>{cert.issuer}</span>
            </span>
            <h3>{cert.name}</h3>
            {!hasImg && (
              <div className="cert-card-meta">
                <span>{cert.dateLabel}</span>
                {cert.code && <span>{cert.code}</span>}
              </div>
            )}
            <div className="cert-front-spacer" />
            <div className="cert-front-foot">
              {hasImg ? (
                <>
                  <span>{cert.dateLabel}</span>
                  {cert.code && <span>{cert.code}</span>}
                </>
              ) : (
                // No scan to flip to and show a verify button on, so the front
                // keeps its own verify link - the one place this card can send
                // someone to confirm it.
                <a
                  className="cert-card-verify"
                  href={cert.verifyUrl || CERTIPORT_VERIFY}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                >
                  {t.certifications.verifyLabel}<ArrowUpRight size={12} weight="bold" />
                </a>
              )}
            </div>
          </div>
        </div>

        {hasImg && (
          <div className="cert-face cert-face--back">
            <div
              className="cert-back cert-protected"
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
              onClick={onBackClick}
            >
              <div className="cert-photo" style={{ backgroundImage: `url('${cert.img}')` }} />
              <div className="cert-holo" aria-hidden="true" />
              <div className="cert-scan" aria-hidden="true" />
              <span className="cert-back-chip"><i />{cert.dateLabel}</span>
              <a
                className="cert-back-verify"
                href={cert.verifyUrl || CERTIPORT_VERIFY}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
              >
                {t.certifications.verifyLabel}<ArrowUpRight size={12} weight="bold" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= App ================= */
export default function Home() {
  const clock = useChisinauClock();
  const PROJECTS = useProjects();
  const CAPABILITY_DECKS = useCapabilityDecks();
  const CERTS = useCertifications();
  const SOCIAL_LINKS = useSocialLinks();
  const heroMedia = useSiteMedia('hero_media');
  const aboutMedia = useSiteMedia('about_media');
  const vetMedia = useSiteMedia('special_vet_media');
  const metalMedia = useSiteMedia('special_metal_media');
  const { siteSettings, loading: settingsLoading } = useContent();
  const langSwitcherEnabled = !!siteSettings.lang_switcher;
  const [heroIn, setHeroIn] = useState(false);
  const [introDone, setIntroDone] = useState(hasBootedThisSession);
  // Stable reference on purpose: this is passed to <Loader> below, whose own
  // boot-animation effect lists `onDone` as a dependency. An inline arrow
  // function here would be a new reference every time Home re-renders - and
  // Home re-renders well within the ~1.5-2s loader window (the clock's first
  // tick fires almost immediately, Supabase content can resolve in that
  // window too). Each such re-render restarted the loader's effect from
  // scratch, snapping the "0-100" count back down and replaying the climb -
  // the "counter loops twice" bug. useCallback keeps the function identity
  // fixed so the loader's effect only ever runs once.
  const handleLoaderDone = useCallback(() => {
    hasBootedThisSession = true;
    setIntroDone(true);
  }, []);

  // language
  const [lang, setLangState] = useState(detectLang);
  const t = translations[lang];
  // On the homepage the section links are bare hashes so they never trigger a
  // route change; every other page needs the leading slash to come back here first.
  const menuLinks = useMemo(() => getSiteMenuLinks(t, ''), [t]);
  const setLang = useCallback((l) => {
    setHeroIn(false);
    setLangState(l);
    try { localStorage.setItem('cc_lang', l); } catch { /* ignore */ }
  }, []);

  // The switcher is hidden in the header whenever it's off in the admin panel
  // (the default), but a language saved from an earlier visit - or a tab left
  // open from before an admin turned it off - can still be sitting in
  // localStorage. Wait for a confirmed answer (not `settingsLoading`) before
  // forcing English back, so this doesn't flash a returning ru/ro visitor to
  // English for a moment while the setting is still being fetched.
  useEffect(() => {
    if (settingsLoading) return;
    if (!langSwitcherEnabled && lang !== 'en') setLangState('en');
  }, [langSwitcherEnabled, settingsLoading, lang]);

  const heroMounted = useRef(false);
  useEffect(() => {
    if (!heroMounted.current) { heroMounted.current = true; return; }
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = setTimeout(() => setHeroIn(true), RM ? 0 : 120);
    return () => clearTimeout(timer);
  }, [lang]);

  usePageMeta(t.meta.title, t.meta.description);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!location.hash || !introDone) return;
    // Fires right as the intro finishes (instantly if it was skipped), instead
    // of a blind fixed delay - this is what makes cross-page links like
    // "Contact" land on the footer quickly instead of feeling like a reload.
    //
    // location.key is in the dependency list on purpose: with only [introDone]
    // the effect ran once and never again, so arriving at /#contact a second
    // time (or switching from #about to #contact) silently did nothing.
    // Two frames, because the first one still has the pre-layout heights of a
    // page that just mounted, which lands the scroll hundreds of pixels short.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => scrollToHash(location.hash));
    });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  }, [introDone, location.hash, location.key]);

  // top-level state
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('work');
  const [menuPreview, setMenuPreview] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [formContext, setFormContext] = useState('general');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [cursorOnLink, setCursorOnLink] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [cursorLabelShow, setCursorLabelShow] = useState(false);
  const [cursorLabelText, setCursorLabelText] = useState('');
  const [statValues, setStatValues] = useState(STAT_META.map(() => 0));
  const [certLightbox, setCertLightbox] = useState(null); // the cert object being viewed full-size, or null

  // refs to DOM nodes needed by imperative animation loops
  const cursorRef = useRef(null);
  const cursorLabelRef = useRef(null);
  const progressRef = useRef(null);
  const headerRef = useRef(null);
  const skewRef = useRef(null);
  const heroEyebrowRef = useRef(null);
  const trackRef = useRef(null);
  const canvasRef = useRef(null);
  const heroRef = useRef(null);
  const accentLineRef = useRef(null);
  const heroTitleRef = useRef(null);
  const logoRef = useRef(null);
  const logoSvgRef = useRef(null);
  const workListRef = useRef(null);
  const deckCardsRef = useRef([]);
  const statsRef = useRef(null);
  const leadFormRef = useRef(null);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const msgRef = useRef(null);

  /* ---- hero title reveal ---- */
  useEffect(() => {
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setHeroIn(true), RM ? 0 : 600);
    return () => clearTimeout(t);
  }, []);

  /* ---- cursor: link detection ---- */
  useEffect(() => {
    const onOver = e => { if (e.target.closest('a,button')) setCursorOnLink(true); };
    const onOut = e => { if (e.target.closest('a,button')) setCursorOnLink(false); };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);

  /* ---- magnetic buttons ---- */
  useEffect(() => {
    const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!(FINE && !RM)) return;
    const magnets = [...document.querySelectorAll('.magnetic')];
    const cleanups = [];
    magnets.forEach(el => {
      const onMove = e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * .25}px,${dy * .35}px)`;
      };
      const onLeave = () => {
        el.style.transform = '';
        el.style.transition = 'transform .5s cubic-bezier(.19,1,.22,1)';
        setTimeout(() => { el.style.transition = ''; }, 500);
      };
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
      cleanups.push(() => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); });
    });
    return () => cleanups.forEach(fn => fn());
  }, []);

  /* ---- section-in-view tracking for menu ---- */
  useEffect(() => {
    const ids = ['work', 'about', 'capabilities', 'certifications', 'contact'];
    const obs = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) setActiveSection(en.target.id); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    ids.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  /* ---- reveal-on-scroll ---- */
  // Deps matter here: content that arrives from Supabase (the About photo,
  // in particular) mounts its own `.reveal` element *after* this effect's
  // first pass, once the async fetch resolves. With an empty dep array that
  // element is never observed and stays permanently invisible (opacity: 0
  // from the base .reveal rule) - the photo is "uploaded" but never actually
  // shows up on the page. Re-running whenever the async content changes
  // (`:not(.in)` skips anything already revealed, so this is safe to repeat).
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [PROJECTS, CERTS, heroMedia, aboutMedia, vetMedia, metalMedia]);

  /* ---- stat count-up ---- */
  useEffect(() => {
    const targets = STAT_META.map(m => m.target);
    if (!statsRef.current) return;
    const obs = new IntersectionObserver((en, o) => {
      if (!en[0].isIntersecting) return;
      o.disconnect();
      const t0 = performance.now(), dur = 1300;
      const tick = t => {
        const k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
        setStatValues(targets.map(target => Math.round(target * e)));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: .4 });
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  /* ---- hero title fit ----
     One clamp() can't serve three languages: the Russian "ПРОФЕССИОНАЛЬНО"
     is almost twice as wide as "I KILL" at the same size. Instead of a
     per-language guess, measure each line against the hero's inner width
     after fonts load and step the size down only as far as the widest line
     actually needs. Runs again on resize / orientation change. */
  useEffect(() => {
    const h1 = heroTitleRef.current;
    if (!h1) return;
    let raf;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        h1.style.fontSize = '';
        const lines = [...h1.querySelectorAll('.line')];
        if (!lines.length) return;
        let size = parseFloat(getComputedStyle(h1).fontSize);
        const min = 24;
        for (let i = 0; i < 14; i++) {
          const over = lines.some(l => l.scrollWidth > l.clientWidth + 1);
          if (!over || size <= min) break;
          size = Math.max(min, size * .95);
          h1.style.fontSize = size + 'px';
        }
      });
    };
    fit();
    addEventListener('resize', fit, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
  }, [lang]);

  /* ---- hero particle canvas ---- */
  useEffect(() => {
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let parts = [], cw = 0, ch = 0;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let pmx = -9999, pmy = -9999, heroVisible = true;
    // On compact (adaptive) layouts the heart runs in "calm" mode: instead
    // of the desktop's physics (idle breathing plus a scroll-velocity kick
    // and touch/cursor repulsion), it plays a plain, deterministic human
    // heartbeat pulse - a function of the clock only. See drawParticles.
    // calmCx/calmCy is the heart's own visual center, set in buildParticles,
    // that the pulse scales every particle toward/away from.
    let calm = false, calmCx = 0, calmCy = 0;

    function buildParticles() {
      cw = canvas.offsetWidth; ch = canvas.offsetHeight;
      canvas.width = cw * dpr; canvas.height = ch * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      parts = [];
      if (RM) return;
      const heroEl = heroRef.current;
      if (!heroEl) return;
      const heroRect = heroEl.getBoundingClientRect();
      const padRight = parseFloat(getComputedStyle(heroEl).paddingRight) || cw * .04;
      const compact = cw < 1100;
      calm = compact;
      // Below 1100px the heart used to be dropped entirely, leaving the mobile
      // hero as plain text. It now builds a smaller heart in the band between
      // the header and the eyebrow line - the space the bottom-anchored title
      // leaves free - and fits itself to whatever height that band has.
      const SUB = compact ? 2 : 3;
      const gridW = 7 * SUB, gridH = 6 * SUB;
      let size, ox, oy;
      if (!compact) {
        const boxX1 = cw - padRight, boxX0 = cw * .62;
        size = (boxX1 - boxX0) / gridW;
        const totalH = gridH * size;
        const accentLine = accentLineRef.current;
        let centerY = ch * .4;
        if (accentLine) {
          const r = accentLine.getBoundingClientRect();
          centerY = (r.top + r.bottom) / 2 - heroRect.top;
        }
        centerY = Math.min(Math.max(centerY, totalH / 2 + 20), ch - totalH / 2 - 20);
        ox = boxX0; oy = centerY - totalH / 2;
      } else {
        const eyebrow = heroEyebrowRef.current;
        // the eyebrow carries the hero's top padding, so measure its text box
        // (content edge) rather than the padded border box
        const eyebrowTextTop = eyebrow
          ? eyebrow.getBoundingClientRect().top - heroRect.top + (parseFloat(getComputedStyle(eyebrow).paddingTop) || 0)
          : ch * .45;
        const bandTop = 96, bandBottom = eyebrowTextTop - 18;
        const bandH = bandBottom - bandTop;
        if (bandH >= 70) {
          // Centered in the free band and noticeably larger than the old
          // right-anchored version - the mobile heart is meant to be seen.
          size = Math.min((cw * .74) / gridW, bandH / gridH, cw >= 700 ? 24 : 19);
          if (size < 3) return;
          const totalW = gridW * size, totalH = gridH * size;
          ox = (cw - totalW) / 2;
          oy = bandTop + (bandH - totalH) / 2;
          calmCx = ox + totalW / 2; calmCy = oy + totalH / 2;
        } else if (cw >= 640) {
          // Landscape phones / short tablets: no free band above the title,
          // but plenty of room beside it - use the desktop placement, scaled.
          const title = heroTitleRef.current;
          let titleRight = 0;
          if (title) {
            // block-level lines span the full width; measure the glyphs themselves
            const range = document.createRange();
            title.querySelectorAll('.line').forEach(l => { range.selectNodeContents(l); titleRight = Math.max(titleRight, range.getBoundingClientRect().right - heroRect.left); });
          }
          if (!titleRight) titleRight = cw * .6;
          const boxX0 = Math.max(cw * .6, titleRight + 24), boxX1 = cw - padRight;
          size = Math.min((boxX1 - boxX0) / gridW, (ch * .6) / gridH);
          if (size < 3) return;
          const totalH = gridH * size;
          const accentLine = accentLineRef.current;
          let centerY = ch * .5;
          if (accentLine) { const r = accentLine.getBoundingClientRect(); centerY = (r.top + r.bottom) / 2 - heroRect.top; }
          centerY = Math.min(Math.max(centerY, totalH / 2 + 20), ch - totalH / 2 - 20);
          ox = boxX0; oy = centerY - totalH / 2;
          calmCx = ox + gridW * size / 2; calmCy = oy + totalH / 2;
        } else return;
      }
      const jitterW = compact ? cw * .45 : cw * .7, jitterH = compact ? ch * .25 : ch * .7;
      for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
        if (!HEART[r * 7 + c]) continue;
        for (let sr = 0; sr < SUB; sr++) for (let sc = 0; sc < SUB; sc++) {
          const hx = ox + (c * SUB + sc) * size, hy = oy + (r * SUB + sr) * size;
          parts.push({
            hx, hy,
            x: hx + (Math.random() - .5) * jitterW,
            y: hy + (Math.random() - .5) * jitterH,
            vx: 0, vy: 0, s: size * .8,
            ph: Math.random() * Math.PI * 2,
            col: Math.random() < .05 ? '#1B3BFF' : 'rgba(15,15,19,.85)'
          });
        }
      }
    }
    function drawParticles(vel = 0) {
      if (!parts.length || !heroVisible) return;
      ctx.clearRect(0, 0, cw, ch);
      const now = performance.now() / 1000;
      if (calm) {
        // Compact/mobile heart: a plain human heartbeat - two quick pulses
        // ("lub-dub") at a resting ~70bpm, then a rest, on endless repeat.
        // This is a pure function of the clock: no touch, scroll or cursor
        // state is read anywhere in this branch, so nothing else can ever
        // perturb it - every particle scales toward/away from the heart's
        // own center in lockstep, which is what reads as a single shape
        // beating rather than a scatter of independently jittering pixels.
        const period = .86;
        const t = (now % period) / period;
        const beat = (center, width, amp) => {
          const d = Math.min(Math.abs(t - center), 1 - Math.abs(t - center));
          return amp * Math.exp(-(d * d) / (2 * width * width));
        };
        const scale = 1 + beat(0, .045, .07) + beat(.14, .05, .032);
        for (const p of parts) {
          p.x = calmCx + (p.hx - calmCx) * scale;
          p.y = calmCy + (p.hy - calmCy) * scale;
          ctx.fillStyle = p.col;
          ctx.fillRect(p.x, p.y, p.s, p.s);
        }
        return;
      }
      // Desktop: at rest every particle sits exactly on its own grid cell
      // (p.hx, p.hy) - a clean, static heart, not a haze of particles
      // wobbling around their spot. A scroll-velocity kick and touch/cursor
      // repulsion can still knock a particle off its cell, and the spring
      // below pulls it straight back to that exact point once released.
      const restore = .09, damp = .78, R = 150, force = 2.2;
      const kick = Math.min(Math.abs(vel), 40) * .032;
      for (const p of parts) {
        p.vx += (p.hx - p.x) * restore; p.vy += (p.hy - p.y) * restore;
        if (kick > .1) { p.vx += (Math.random() - .5) * kick; p.vy += (Math.random() - .5) * kick; }
        const dx = p.x - pmx, dy = p.y - pmy, d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const t2 = (R - d) / R, f = t2 * t2 * force;
          p.vx += dx / d * f; p.vy += dy / d * f;
        }
        p.vx *= damp; p.vy *= damp;
        // Once a particle is close to home and has all but stopped, snap it
        // exactly onto the grid instead of leaving it to creep in for a few
        // more (visually imperceptible but never-quite-zero) frames - this
        // is what keeps a fully-settled heart pixel-crisp instead of every
        // square sitting a fraction off its neighbors.
        if (Math.abs(p.vx) < .02 && Math.abs(p.vy) < .02 && Math.abs(p.hx - p.x) < .3 && Math.abs(p.hy - p.y) < .3) {
          p.x = p.hx; p.y = p.hy; p.vx = 0; p.vy = 0;
        } else { p.x += p.vx; p.y += p.vy; }
        ctx.fillStyle = p.col;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      }
    }
    buildParticles();
    const onResize = () => buildParticles();
    addEventListener('resize', onResize);
    const parent = canvas.parentElement;
    const onMove = e => { const r = canvas.getBoundingClientRect(); pmx = e.clientX - r.left; pmy = e.clientY - r.top; };
    const onLeave = () => { pmx = pmy = -9999; };
    // The mouse listener only binds on devices that report a real, precise
    // hover pointer (a mouse/trackpad) - never on touch. This isn't about
    // hiding the repulsion from touch (that's handled by its own, softer
    // touch listeners below); it's that iOS Safari and some hybrid/WebView
    // browsers synthesize a one-off "mousemove" from a tap when nothing else
    // handles the touch, which would silently feed a phantom position into
    // this same physics via the "mouse" path - and with no matching
    // mouseleave on a touch device, that stray position would then sit
    // there repelling the heart indefinitely instead of releasing.
    const hasFineHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hasFineHover) {
      parent.addEventListener('mousemove', onMove);
      parent.addEventListener('mouseleave', onLeave);
    }
    // Touch only ever drives the desktop repulsion (e.g. a touch-capable
    // laptop trackpad-and-touchscreen combo) - the compact/mobile "calm"
    // heart is a pure heartbeat pulse (see drawParticles) that never reads
    // a touch position at all, so on that layout no touch listener is even
    // attached: there is nothing for a finger to reach.
    const onTouch = e => { const t = e.touches[0]; if (!t) return; const r = canvas.getBoundingClientRect(); pmx = t.clientX - r.left; pmy = t.clientY - r.top; };
    if (!calm) {
      parent.addEventListener('touchstart', onTouch, { passive: true });
      parent.addEventListener('touchmove', onTouch, { passive: true });
      parent.addEventListener('touchend', onLeave, { passive: true });
      parent.addEventListener('touchcancel', onLeave, { passive: true });
    }
    // The band the compact heart sits in depends on where the eyebrow ends up
    // once webfonts have swapped in, so rebuild after fonts settle too.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildParticles);
    const visObs = new IntersectionObserver(en => { heroVisible = en[0].isIntersecting; }, { threshold: 0 });
    visObs.observe(canvas);

    // expose drawParticles to master loop via canvas element
    canvas.__drawParticles = drawParticles;

    return () => {
      removeEventListener('resize', onResize);
      parent.removeEventListener('mousemove', onMove);
      parent.removeEventListener('mouseleave', onLeave);
      parent.removeEventListener('touchstart', onTouch);
      parent.removeEventListener('touchmove', onTouch);
      parent.removeEventListener('touchend', onLeave);
      parent.removeEventListener('touchcancel', onLeave);
      visObs.disconnect();
      // The master loop reaches the draw function through this expando; leaving
      // it behind on an unmounted canvas keeps the whole particle closure alive.
      delete canvas.__drawParticles;
    };
  }, []);

  /* ---- master scroll/raf loop: cursor, skew, marquee, progress, logo, particles ---- */
  useEffect(() => {
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;

    const cursor = cursorRef.current, cursorLabel = cursorLabelRef.current;
    const progress = progressRef.current;
    const header = headerRef.current, skew = skewRef.current, track = trackRef.current;
    const logo = logoRef.current, logoSvg = logoSvgRef.current, canvas = canvasRef.current;
    if (!cursor || !skew || !track) return;

    // Only mark .skew as a transform containing block on the devices that
    // actually receive the skewY effect below. Leaving will-change:transform
    // on unconditionally (e.g. via static CSS) breaks position:sticky for
    // every descendant - including the capabilities deck cards - since it
    // silently creates a new containing block for the whole page.
    skew.style.willChange = (!RM && FINE) ? 'transform' : 'auto';

    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    const onMouseMove = e => { mx = e.clientX; my = e.clientY; };
    addEventListener('mousemove', onMouseMove);

    let logoRect = logo ? logo.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    const measureLogo = () => { if (logo) logoRect = logo.getBoundingClientRect(); };
    addEventListener('resize', measureLogo, { passive: true });
    addEventListener('load', measureLogo);

    let logoTX = 0, logoTY = 0, logoScaleK = 1, logoTilt = 0;
    function updateLogo(scrollT, vel) {
      if (!logo || !logoSvg) return;
      const lcx = logoRect.left + logoRect.width / 2, lcy = logoRect.top + logoRect.height / 2;
      const dx = mx - lcx, dy = my - lcy;
      const dist = Math.hypot(dx, dy);
      const radius = 280;
      const pull = Math.max(0, 1 - dist / radius);
      const tx = FINE && !RM ? (dx / radius) * 20 * pull : 0;
      const ty = FINE && !RM ? (dy / radius) * 20 * pull : 0;
      logoTX += (tx - logoTX) * .16;
      logoTY += (ty - logoTY) * .16;
      // Growing the mark on scroll only makes sense with a real cursor to pull
      // it around too - on touch there's no pull, and the SVG's transform-
      // origin (center-left) means a scaled-up mark visually bleeds right,
      // into the fixed-size heart mark next to it, without a mouse there to
      // ever back it off again. Keeping it flat at 1 on touch is what stops
      // the heart from reading as "sometimes crowding the logo".
      const targetScale = FINE && !RM ? 1 + scrollT * .22 + pull * .1 : 1;
      logoScaleK += (targetScale - logoScaleK) * .12;
      const tiltTarget = (RM || !FINE) ? 0 : Math.max(-5, Math.min(5, vel * .1));
      logoTilt += (tiltTarget - logoTilt) * .15;
      logoSvg.style.transform = `translate(${logoTX}px,${logoTY}px) scale(${logoScaleK}) rotate(${logoTilt}deg)`;
      const glow = .12 + scrollT * .4 + pull * .25;
      logoSvg.style.filter = scrollT > .02 || pull > .05 ? `drop-shadow(0 0 ${6 + scrollT * 20}px rgba(27,59,255,${glow}))` : 'none';
    }

    let lastY = scrollY, vel = 0, smoothVel = 0, skewCur = 0, mqX = 0;
    // track.scrollWidth and document.documentElement.scrollHeight are layout
    // reads. The marquee's content width never changes outside of a resize
    // (or fonts loading), so it's measured once + on resize instead of every
    // frame - that alone removes one forced-layout read from the hot loop.
    let trackHalf = track.scrollWidth / 3;
    const remeasureTrack = () => { trackHalf = track.scrollWidth / 3; };
    addEventListener('resize', remeasureTrack, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasureTrack);

    let raf;
    function master() {
      // ---- read phase: gather every layout-dependent value up front, before
      // this frame's style writes below invalidate layout for the next read.
      const y = scrollY;
      const scrollHeight = document.documentElement.scrollHeight;

      // ---- write phase ----
      cx += (mx - cx) * .22; cy += (my - cy) * .22;
      cursor.style.transform = `translate(${cx}px,${cy}px)`;
      if (cursorLabel) { cursorLabel.style.left = cx + 'px'; cursorLabel.style.top = cy + 'px'; }

      // A hard flick of a trackpad/wheel can move scrollY by hundreds of px
      // in a single frame - clamped here so one sharp flick can't punch the
      // tilt/particle effects below to their extreme in one jump, which is
      // what read as a jolt rather than motion. Blended in slowly (.07,
      // was .1) so a quick up-then-down flick doesn't snap the page's tilt
      // from one direction straight to the other.
      vel = Math.max(-60, Math.min(60, y - lastY)); lastY = y;
      smoothVel += (vel - smoothVel) * .07;

      if (!RM && FINE) {
        // Smaller range (±2.5°, was ±4°) and a second easing pass on top of
        // the already-smoothed velocity - two damped stages instead of one
        // is what turns "the whole page visibly wobbles as you scroll" into
        // a subtle, comfortable tilt.
        const skewTarget = Math.max(-2.5, Math.min(2.5, smoothVel * .07));
        skewCur += (skewTarget - skewCur) * .12;
        skew.style.transform = `skewY(${skewCur}deg)`;
      }

      mqX -= 1.1 + Math.min(Math.abs(smoothVel) * .4, 14);
      if (-mqX >= trackHalf) mqX += trackHalf;
      track.style.transform = `translateX(${mqX}px)`;

      const max = scrollHeight - innerHeight;
      if (progress) progress.style.transform = `scaleX(${max ? y / max : 0})`;

      updateLogo(max ? Math.min(y / max, 1) : 0, smoothVel);

      if (canvas && canvas.__drawParticles) canvas.__drawParticles(smoothVel);

      raf = requestAnimationFrame(master);
    }
    raf = requestAnimationFrame(master);

    let lastHideY = 0;
    const onScroll = () => {
      const y = scrollY;
      if (!header) return;
      header.classList.toggle('scrolled', y > 28);
      if (y > 600 && y > lastHideY + 8) header.classList.add('hide');
      else if (y < lastHideY - 8 || y <= 600) header.classList.remove('hide');
      lastHideY = y;
    };
    addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('mousemove', onMouseMove);
      removeEventListener('resize', measureLogo);
      removeEventListener('resize', remeasureTrack);
      removeEventListener('load', measureLogo);
      removeEventListener('scroll', onScroll);
    };
  }, []);

  /* ---- deck stacking (capabilities) ---- */
  // CAPABILITY_DECKS can arrive after mount once Supabase resolves (it starts
  // as the static fallback), changing how many .deck-card refs actually exist
  // - without it in the deps this measured/observed the wrong (usually empty)
  // set of cards whenever the fetch resolved after first paint.
  useEffect(() => {
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
    const cards = deckCardsRef.current.filter(Boolean);
    cards.forEach((c, i) => { c.style.top = (100 + i * 22) + 'px'; c.style.zIndex = i + 1; });
    // The progressive scale/brightness animation below reads window.innerHeight every
    // frame. On touch devices the mobile browser's address bar collapses/expands while
    // scrolling, which makes innerHeight jump mid-scroll and shows up as one card
    // visibly snapping/glitching. Sticky positioning alone still stacks the cards
    // correctly on mobile, so only run the extra animation on precise-pointer devices.
    if (!FINE || RM) return;
    let raf, running = false;
    // Read every card's rect first (layout pass), then apply all style writes
    // in a second pass. Interleaving read->write->read->write per card forces
    // a synchronous layout recalc on every iteration; batching avoids that.
    function deckScale() {
      const rects = new Array(cards.length);
      for (let i = 0; i < cards.length - 1; i++) rects[i] = cards[i + 1].getBoundingClientRect();
      for (let i = 0; i < cards.length - 1; i++) {
        const c = cards[i], r = rects[i];
        const start = innerHeight, end = 100 + (i + 1) * 22;
        const t = Math.min(Math.max((start - r.top) / (start - end), 0), 1);
        c.style.transform = `scale(${1 - t * .06}) translateY(${-t * 8}px)`;
        c.style.filter = `brightness(${1 - t * .15})`;
      }
      raf = requestAnimationFrame(deckScale);
    }
    // Only run this loop while the deck is actually in view - it was
    // previously running continuously from mount, costing a layout pass on
    // every frame for the whole page's lifetime regardless of scroll position.
    const deckSection = document.getElementById('capabilities');
    const io = new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; raf = requestAnimationFrame(deckScale); }
      else if (!visible && running) { running = false; cancelAnimationFrame(raf); }
    }, { threshold: 0 });
    if (deckSection) io.observe(deckSection);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [CAPABILITY_DECKS]);

  /* ---- menu toggle & preview ---- */
  const toggleMenu = useCallback((open) => {
    setMenuOpen(open);
    if (!open) setMenuPreview(null);
  }, []);

  /* Both the fullscreen menu and the lead-form modal want the page frozen
     behind them. They used to each call classList.toggle('locked', ownState),
     so whichever rendered last won - closing one unfroze the page while the
     other was still open. One effect, one source of truth. */
  useEffect(() => {
    const locked = menuOpen || formModalOpen || !!certLightbox;
    document.documentElement.classList.toggle('locked', locked);
    document.body.classList.toggle('locked', locked);
    return () => {
      document.documentElement.classList.remove('locked');
      document.body.classList.remove('locked');
    };
  }, [menuOpen, formModalOpen, certLightbox]);

  /* ---- close modal, then reset form + thank-you state after the close transition ---- */
  const closeFormModal = useCallback(() => {
    setFormModalOpen(false);
    setTimeout(() => {
      setFormSent(false);
      setFormContext('general');
      setFormError('');
      setFormSubmitting(false);
      if (leadFormRef.current) leadFormRef.current.reset();
    }, 400);
  }, []);

  /* ---- opens the lead-request modal, tagging which entry point it came
     from so the outgoing email subject (and the little badge in the modal)
     reflect it - "vet"/"metal" from the Side Quests cards, "general" from
     the footer CTA. ---- */
  const openFormModal = (context = 'general') => {
    setFormContext(context);
    setFormModalOpen(true);
  };

  /* ---- honours "/?openForm=<context>#contact" links, e.g. the footer CTA
     on the Portfolio/Project pages, which can't reach this component's own
     state to open the modal directly and instead routes home with this flag.
     The query param is stripped right after so it doesn't linger in the URL
     or reopen the modal on a later back/forward navigation. ---- */
  useEffect(() => {
    if (!introDone) return;
    const params = new URLSearchParams(location.search);
    const context = params.get('openForm');
    if (!context) return;
    openFormModal(context);
    navigate(location.pathname + location.hash, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introDone, location.search]);

  /* ---- escape key closes menu / form modal ---- */
  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (menuOpen) toggleMenu(false);
      if (formModalOpen) closeFormModal();
      if (certLightbox) setCertLightbox(null);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [menuOpen, formModalOpen, certLightbox, toggleMenu, closeFormModal]);

  /* ---- form modal open: focus first field ---- */
  useEffect(() => {
    if (formModalOpen) {
      const focusTimer = setTimeout(() => { if (nameRef.current) nameRef.current.focus(); }, 380);
      return () => clearTimeout(focusTimer);
    }
  }, [formModalOpen]);

  // The form used to just build a mailto: link and hand off to whatever
  // email app (if any) was configured on the visitor's device - unreliable
  // on a phone with no mail app set up, and it required the visitor to
  // actually hit "send" themselves in that app. It now posts straight to
  // Web3Forms (https://web3forms.com), which relays it by email without
  // needing any backend of our own - the visitor never leaves the page.
  // Requires VITE_WEB3FORMS_ACCESS_KEY (see .env.example / docs/ADMIN.md).
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const form = leadFormRef.current;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    // Honeypot: real visitors never see or fill this field (hidden via CSS),
    // so anything in it marks the submission as spam and Web3Forms drops it.
    if (form.botcheck && form.botcheck.checked) return;
    const name = nameRef.current.value.trim();
    const email = emailRef.current.value.trim();
    const message = msgRef.current.value.trim();
    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;
    setFormError('');
    if (!accessKey) {
      console.error('[form] VITE_WEB3FORMS_ACCESS_KEY is not set - lead email not sent');
      setFormError(t.form.errorMsg);
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `${FORM_SUBJECTS[formContext] || FORM_SUBJECTS.general} — ${name}`,
          from_name: 'Cookiekiller Site',
          name,
          email,
          message,
          context: formContext
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error('web3forms failed');
      setFormSent(true);
      setTimeout(closeFormModal, 3400);
    } catch {
      setFormError(t.form.errorMsg);
    } finally {
      setFormSubmitting(false);
    }
  };

  /* ---- work list hover ---- */
  const onWorkListMouseOver = (e) => {
    const row = e.target.closest('.work-row');
    if (!row) return;
    setCursorHidden(true);
    setCursorLabelShow(true);
    setCursorLabelText(<><ArrowUpRight size={13} weight="bold" />{t.work.viewCase}</>);
  };
  const onWorkListMouseLeave = () => {
    setCursorHidden(false);
    setCursorLabelShow(false);
  };

  const onSpecialCardEnter = (label) => {
    setCursorLabelText(label);
    setCursorLabelShow(true);
  };
  const onSpecialCardLeave = () => setCursorLabelShow(false);

  // Cursor-spotlight glow: tracks pointer position as a %, driving the
  // radial-gradient in .cert-card-glow / .special-card::after via CSS vars.
  const onSpotlightMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
  };

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <div className="progress" id="progress" ref={progressRef} aria-hidden="true" />
      <div
        className={`cursor${cursorOnLink ? ' on-link' : ''}${cursorHidden ? ' hidden' : ''}`}
        id="cursor" ref={cursorRef} aria-hidden="true"
      >
        <span className="cursor-ring">
          <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
          <i className="dot" />
        </span>
      </div>
      <div
        className={`cursor-label${cursorLabelShow ? ' show' : ''}`}
        id="cursorLabel" ref={cursorLabelRef} aria-hidden="true"
      >{cursorLabelText}</div>

      <Loader messages={t.loader.messages} skip={hasBootedThisSession} onDone={handleLoaderDone} />

      <header id="header" ref={headerRef}>
        <a className="logo" href="#top" aria-label={t.header.home} ref={logoRef} onClick={(e) => { e.preventDefault(); scrollToHash('#top'); }}>
          <span className="logo-mark" ref={logoSvgRef}>
            <LogoMark />
          </span>
        </a>
        <div className="hdr-right">
          <span className="hdr-time" id="clock">{t.city} {clock}</span>
          <span className="hdr-status">{t.header.openToWork}</span>
          {langSwitcherEnabled && (
            <div className="lang-switch" role="group" aria-label={t.header.language}>
              {LANGS.map(l => (
                <button key={l} type="button" className={lang === l ? 'active' : ''} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
              ))}
            </div>
          )}
          <button className="menu-btn" aria-expanded={menuOpen} aria-controls="menu" aria-label={t.header.menu} onClick={() => toggleMenu(true)}><List size={14} weight="bold" /><span className="menu-btn-label" aria-hidden="true">{t.header.menu}</span></button>
        </div>
      </header>

      <div className={`menu${menuOpen ? ' open' : ''}`} id="menu" aria-hidden={!menuOpen}>
        <nav className="menu-links" aria-label={t.header.mainNav}>
          {menuLinks.map((l, i) => (
            l.href.startsWith('#') ? (
              <a
                key={l.href}
                href={l.href}
                className={activeSection === l.href.slice(1) ? 'active' : ''}
                style={{ transitionDelay: menuOpen ? `${.15 + i * .06}s, ${.15 + i * .06}s, 0s` : '0s, 0s, 0s' }}
                onMouseEnter={() => setMenuPreview(l)}
                onClick={(e) => { e.preventDefault(); toggleMenu(false); scrollToHash(l.href); }}
              ><i>{l.num}</i>{l.label}</a>
            ) : (
              <Link
                key={l.href}
                to={l.href}
                style={{ transitionDelay: menuOpen ? `${.15 + i * .06}s, ${.15 + i * .06}s, 0s` : '0s, 0s, 0s' }}
                onMouseEnter={() => setMenuPreview(l)}
                onClick={() => toggleMenu(false)}
              ><i>{l.num}</i>{l.label}</Link>
            )
          ))}
        </nav>
        <div className={`menu-preview${menuPreview ? ' show' : ''}`} onMouseLeave={() => setMenuPreview(null)} aria-hidden="true">
          <span className="menu-preview-num">{menuPreview ? menuPreview.num : '01'}</span>
          <span className="menu-preview-eyebrow">{menuPreview ? fmtCount(menuPreview.n, PROJECTS.length) : ''}</span>
          <p className="menu-preview-desc">{menuPreview ? menuPreview.desc : ''}</p>
        </div>
        <div className="menu-meta" aria-hidden="true">
          <span className="hdr-status">{t.header.openToWork}</span>
          <span className="menu-meta-clock">{t.city} {clock}</span>
          {langSwitcherEnabled && (
            <div className="lang-switch menu-lang" role="group" aria-label={t.header.language}>
              {LANGS.map(l => (
                <button key={l} type="button" className={lang === l ? 'active' : ''} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
              ))}
            </div>
          )}
        </div>
        <div className="menu-bottom">
          <div className="menu-foot">
            {SOCIAL_LINKS.filter(l => l.url).map(l => {
              const Icon = iconFor(l.icon);
              const external = isExternalUrl(l.url);
              return (
                <a key={l.id} href={l.url} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
                  <Icon size={15} weight="bold" />{l.label}{external && <ArrowUpRight size={12} />}
                </a>
              );
            })}
            {/* Desktop keeps the email in the menu as before; hidden on
                mobile only (see .menu-mail in index.css). */}
            <a className="menu-mail" href="mailto:cookiekiller.design@gmail.com"><EnvelopeSimple size={15} weight="bold" />cookiekiller.design@gmail.com</a>
          </div>
          <div className="menu-legal">
            <Link to="/privacy" onClick={() => toggleMenu(false)}>{t.footer.privacy}</Link>
            <Link to="/cookie-policy" onClick={() => toggleMenu(false)}>{t.footer.cookiePolicy}</Link>
            <Link to="/gdpr" onClick={() => toggleMenu(false)}>{t.footer.gdpr}</Link>
          </div>
        </div>
      </div>
      <a className="logo menu-logo" href="#top" aria-label={t.header.home} aria-hidden={!menuOpen} tabIndex={menuOpen ? 0 : -1} onClick={(e) => { e.preventDefault(); toggleMenu(false); scrollToHash('#top'); }}>
        <span className="logo-mark"><LogoMark /></span>
      </a>
      <div className="menu-status" aria-hidden="true">
        <span className="hdr-status">{t.header.openToWork}</span>
        <span>{t.city} {clock}</span>
      </div>
      <button className="menu-close" aria-label={t.header.close} onClick={() => toggleMenu(false)}><X size={13} weight="bold" /><span className="menu-close-label">{t.header.close}</span></button>

      <div className="skew" ref={skewRef}>
        <main id="top">

          {/* HERO */}
          <section className="hero" ref={heroRef}>
            <SlotMedia slot={heroMedia} className="hero-media" decorative />
            <canvas id="heroCanvas" ref={canvasRef} aria-hidden="true" />
            {/* Kept empty (no name/role text) - the ref still anchors the
                compact mobile heart-particle band calculation in the
                particle effect below, and the class keeps its reserved
                spacing above the hero title. */}
            <p className="hero-eyebrow in" ref={heroEyebrowRef} aria-hidden="true" />
            <h1 className={`hero-title${heroIn ? ' in' : ''}`} id="heroTitle" ref={heroTitleRef} key={lang}>
              <HeroTitleLine text={t.hero.line1} />
              <HeroTitleLine text={t.hero.line2} accent innerRef={accentLineRef} />
              <HeroTitleLine text={t.hero.line3} />
            </h1>
            <div className={`hero-foot${heroIn ? ' in' : ''}`}>
              <p className="hero-sub">{t.hero.subPre}<b>{t.hero.subBold}</b>{t.hero.subPost}</p>
            </div>
          </section>

          {/* MARQUEE */}
          <div className="marquee" aria-hidden="true" style={{ display: 'none' }}>
            <div className="marquee-track" ref={trackRef}>
              {[0, 1, 2].map(copy => (
                <span key={copy}>{t.marquee.map((m, i) => <Fragment key={i}>{m}<i className="dot" /></Fragment>)}</span>
              ))}
            </div>
          </div>

          {/* WORK */}
          <section id="work">
            <h2 className="eyebrow reveal">{t.work.eyebrow}</h2>
            <div id="workList" ref={workListRef} onMouseOver={onWorkListMouseOver} onMouseLeave={onWorkListMouseLeave}>
              {PROJECTS.map((p, i) => (
                <Link
                  key={p.name}
                  className="work-row reveal"
                  to={p.href}
                  data-i={i}
                >
                  <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                  {p.thumb
                    ? <span className="row-thumb"><img src={p.thumb} alt={`${projectName(p, lang)} preview`} loading="lazy" /></span>
                    : <span className="row-thumb placeholder" style={{ background: p.hue + '1F' }}><span style={{ color: p.hue }}>{initials(projectName(p, lang))}</span></span>}
                  <span className="name">{projectName(p, lang)}</span>
                  <span className="tags">{projectTags(p, lang)}</span>
                  <span className={`status ${p.status}`}>{t.status[p.status]}</span>
                </Link>
              ))}
            </div>
            <div className="work-more"><Link className="cert reveal" to="/portfolio">{t.work.more}<ArrowUpRight size={13} weight="bold" /></Link></div>
          </section>

          {/* ABOUT */}
          <section id="about">
            <h2 className="eyebrow reveal">{t.about.eyebrow}</h2>
            <div className="about-grid">
              <p className="about-statement reveal">{t.about.statementPre}<em>{t.about.statementEm}</em>{t.about.statementPost}</p>
              <div className="about-copy reveal">
                <p>{t.about.p1Pre}<b>{t.about.p1Bold}</b></p>
                <p>{t.about.p2}</p>
              </div>
            </div>
            {aboutMedia && (
              <figure className="about-media reveal">
                <SlotMedia slot={aboutMedia} />
                {aboutMedia.alt ? <figcaption>{aboutMedia.alt}</figcaption> : null}
              </figure>
            )}
            <div className="stats reveal" id="stats" ref={statsRef}>
              {STAT_META.map((m, i) => (
                <div className="stat" key={i}>
                  <div className="num">
                    {m.prefix && <sup>{m.prefix}</sup>}
                    {statValues[i]}
                    {m.suffix && <sup>{m.suffix}</sup>}
                  </div>
                  <div className="lbl">{t.about.stats[i]}</div>
                </div>
              ))}
            </div>
          </section>

          {/* CAPABILITIES */}
          <section id="capabilities">
            <h2 className="eyebrow reveal">{t.capabilities.eyebrow} <span className="count">{t.capabilities.count}</span></h2>
            <div className="deck" id="deck">
              {CAPABILITY_DECKS.map((d, i) => (
                <div className="deck-card" key={d.id} ref={el => { deckCardsRef.current[i] = el; }}>
                  <div className="deck-top"><span>{deckField(d, 'top1', lang)}</span><span>{deckField(d, 'top2', lang)}</span></div>
                  <h3>{deckField(d, 'h3', lang)}</h3>
                  <ul>{highlightedDeckItems(d, i).map(it => <li key={it.id}>{itemLabel(it, lang)}</li>)}</ul>
                </div>
              ))}
            </div>
          </section>

          {/* CERTIFICATIONS */}
          <section id="certifications">
            <h2 className="eyebrow reveal">{t.certifications.eyebrow}</h2>
            <div className="cert-grid">
              {CERTS.map((c, i) => (
                <CertCard key={c.id} cert={c} index={i} onExpand={setCertLightbox} t={t} />
              ))}
            </div>
          </section>

          {/* SPECIAL RATES */}
          <section id="special">
            <div className="eyebrow reveal">{t.special.eyebrow} <span className="count">{t.special.count}</span></div>
            <div className="special-ticker" aria-hidden="true">
              <div className="special-ticker-track">
                <span><PawPrint size={22} weight="fill" />{t.special.tickerVet}<i>✦</i><Skull size={22} weight="fill" />{t.special.tickerMetal}<i>✦</i><PawPrint size={22} weight="fill" />{t.special.tickerVet}<i>✦</i><Skull size={22} weight="fill" />{t.special.tickerMetal}<i>✦</i></span>
                <span><PawPrint size={22} weight="fill" />{t.special.tickerVet}<i>✦</i><Skull size={22} weight="fill" />{t.special.tickerMetal}<i>✦</i><PawPrint size={22} weight="fill" />{t.special.tickerVet}<i>✦</i><Skull size={22} weight="fill" />{t.special.tickerMetal}<i>✦</i></span>
              </div>
            </div>
            <div className="quest-list">
              <div
                className="quest quest--vet reveal"
                onMouseEnter={() => onSpecialCardEnter(<><PawPrint size={13} weight="bold" />{t.special.vetCursor}</>)}
                onMouseMove={onSpotlightMove}
                onMouseLeave={onSpecialCardLeave}
              >
                <span className="quest-glow" aria-hidden="true" />
                <span className="quest-media">
                  {vetMedia ? (
                    <SlotMedia slot={vetMedia} />
                  ) : (
                    <span className="quest-media-fallback" style={{ background: stripeBg('#00B549') }}>
                      <GenerativeArt seed="special-vet" hue="#00B549" density={.5} />
                    </span>
                  )}
                  <PawPrint className="quest-media-icon" size={120} weight="fill" aria-hidden="true" />
                </span>
                <span className="quest-body">
                  <span className="quest-tag"><PawPrint size={14} weight="bold" />{t.special.tickerVet}</span>
                  <h3>{t.special.vetTitle}</h3>
                  <p>{t.special.vetDesc}</p>
                  <button type="button" className="quest-btn quest-btn--vet magnetic" onClick={() => openFormModal('vet')}>{t.special.vetCta}<ArrowRight size={14} weight="bold" /></button>
                </span>
              </div>
              <div
                className="quest quest--metal reveal"
                onMouseEnter={() => onSpecialCardEnter(<><Skull size={13} weight="bold" />{t.special.metalCursor}</>)}
                onMouseMove={onSpotlightMove}
                onMouseLeave={onSpecialCardLeave}
              >
                <span className="quest-glow" aria-hidden="true" />
                <span className="quest-body">
                  <span className="quest-tag"><Skull size={14} weight="bold" />{t.special.tickerMetal}</span>
                  <h3>{t.special.metalTitle}</h3>
                  <p>{t.special.metalDesc}</p>
                  <button type="button" className="quest-btn quest-btn--metal magnetic" onClick={() => openFormModal('metal')}>{t.special.metalCta}<ArrowRight size={14} weight="bold" /></button>
                </span>
                <span className="quest-media">
                  {metalMedia ? (
                    <SlotMedia slot={metalMedia} />
                  ) : (
                    <span className="quest-media-fallback" style={{ background: stripeBg('#FF3B30') }}>
                      <GenerativeArt seed="special-metal" hue="#FF3B30" density={.5} />
                    </span>
                  )}
                  <Skull className="quest-media-icon" size={120} weight="fill" aria-hidden="true" />
                </span>
              </div>
            </div>
          </section>

        </main>

        {/* FOOTER */}
        <footer id="contact">
          <h2 className="foot-eyebrow">{t.footer.eyebrow}</h2>
          <a className="foot-cta" href="mailto:cookiekiller.design@gmail.com">{t.footer.ctaPre}<span className="swap">{t.footer.ctaSwap}</span><br />{t.footer.ctaPost}</a>

          <div className="foot-ctas">
            <a className="foot-mail magnetic" href="mailto:cookiekiller.design@gmail.com"><EnvelopeSimple size={17} weight="bold" />cookiekiller.design@gmail.com<ArrowRight size={15} weight="bold" /></a>
            <button type="button" className="foot-form-trigger magnetic" onClick={() => openFormModal('general')}>{t.footer.formTrigger}<ArrowRight size={15} weight="bold" /></button>
          </div>

          <div className="foot-grid">
            <div className="foot-links">
              {SOCIAL_LINKS.filter(l => l.url).map(l => {
                const Icon = iconFor(l.icon);
                const external = isExternalUrl(l.url);
                return (
                  <a key={l.id} href={l.url} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}>
                    <Icon size={15} weight="bold" />{l.label}
                  </a>
                );
              })}
            </div>
            <div className="foot-legal">
              <Link to="/privacy">{t.footer.privacy}</Link>
              <Link to="/cookie-policy">{t.footer.cookiePolicy}</Link>
              <Link to="/gdpr">{t.footer.gdpr}</Link>
            </div>
          </div>
        </footer>
      </div>

      {/* LEAD FORM MODAL */}
      <div className={`form-modal${formModalOpen ? ' open' : ''}`} aria-hidden={!formModalOpen}>
        <div className="form-modal-backdrop" onClick={closeFormModal} />
        <div className="form-modal-panel" role="dialog" aria-modal="true" aria-labelledby="formModalTitle">
          <button className="form-modal-close" aria-label={t.header.close} onClick={closeFormModal}><X size={18} weight="bold" /></button>
          {formSent ? (
            <div className="form-thanks">
              <CheckCircle className="form-thanks-icon" size={56} weight="fill" aria-hidden="true" />
              <h3 className="form-modal-title">{t.form.thanksTitle}</h3>
              <p className="form-modal-sub">{t.form.thanksSub}</p>
            </div>
          ) : (
            <>
              {formContext !== 'general' && (
                <span className={`form-modal-tag form-modal-tag--${formContext}`}>
                  {formContext === 'vet' ? <PawPrint size={12} weight="bold" /> : <Skull size={12} weight="bold" />}
                  {formContext === 'vet' ? t.special.vetTitle : t.special.metalTitle}
                </span>
              )}
              <h3 className="form-modal-title" id="formModalTitle">{t.form.title}</h3>
              <p className="form-modal-sub">{t.form.sub}</p>
              <form className="foot-form" ref={leadFormRef} noValidate onSubmit={handleFormSubmit}>
                {/* Web3Forms honeypot: invisible to visitors, bots tend to fill every
                    field they find. Any value here makes the submission get dropped. */}
                <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" style={{ display: 'none' }} />
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="lfName">{t.form.nameLabel}</label>
                    <input type="text" id="lfName" name="name" autoComplete="name" placeholder={t.form.namePlaceholder} required ref={nameRef} />
                  </div>
                  <div className="form-field">
                    <label htmlFor="lfEmail">{t.form.emailLabel}</label>
                    <input type="email" id="lfEmail" name="email" autoComplete="email" placeholder={t.form.emailPlaceholder} required ref={emailRef} />
                  </div>
                </div>
                <div className="form-field">
                  <label htmlFor="lfMsg">{t.form.msgLabel}</label>
                  <textarea id="lfMsg" name="message" rows="4" placeholder={t.form.msgPlaceholder} required ref={msgRef} />
                </div>
                <div className="form-foot">
                  <button type="submit" className="form-submit magnetic" disabled={formSubmitting} aria-busy={formSubmitting}>
                    {formSubmitting ? t.form.sending : t.form.submit}
                  </button>
                </div>
                {formError && <p className="form-error" role="alert">{formError}</p>}
                <p className="form-consent">{t.form.consentPre}<Link to="/privacy" onClick={closeFormModal}>{t.form.consentLink}</Link>{t.form.consentPost}</p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* CERTIFICATION LIGHTBOX */}
      <div className={`cert-lb${certLightbox ? ' open' : ''}`} aria-hidden={!certLightbox}>
        <div className="cert-lb-backdrop" onClick={() => setCertLightbox(null)} />
        <div className="cert-lb-close" role="button" tabIndex={0} aria-label={t.header.close} onClick={() => setCertLightbox(null)}>
          <X size={16} weight="bold" />
        </div>
        {certLightbox && (
          <div className="cert-lb-frame">
            <div
              className="cert-lb-photo cert-protected"
              style={{ backgroundImage: `url('${certLightbox.img}')` }}
              onContextMenu={e => e.preventDefault()}
              onDragStart={e => e.preventDefault()}
            />
          </div>
        )}
        <p className="cert-lb-cap">{t.certifications.lightboxHint}</p>
      </div>
    </>
  );
}
