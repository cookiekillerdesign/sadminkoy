import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { List, X, ArrowUpRight, LinkedinLogo, BehanceLogo, EnvelopeSimple } from '@phosphor-icons/react';
import PixelHeart from './PixelHeart';
import { LANGS, fmtCount } from '../i18n';
import { getSiteMenuLinks } from '../lib/menu';
import { useChisinauClock } from '../lib/useChisinauClock';
import { useSiteSetting, useProjects } from '../content/ContentProvider';

export default function SiteHeader({ lang, setLang, t, activeHref }) {
  const clock = useChisinauClock();
  const langSwitcherEnabled = useSiteSetting('lang_switcher');
  const PROJECTS = useProjects();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPreview, setMenuPreview] = useState(null);
  const menuLinks = useMemo(() => getSiteMenuLinks(t), [t]);

  const toggleMenu = (open) => {
    setMenuOpen(open);
    document.documentElement.classList.toggle('locked', open);
    document.body.classList.toggle('locked', open);
    if (!open) setMenuPreview(null);
  };

  // Mobile header: transparent (blend-mode) over the top of the page, solid
  // blurred bar once scrolled - see `header.scrolled` in index.css.
  // Also hides when scrolling down past 600 px (same as Home) and re-appears
  // when scrolling back up — keeps the header out of the way while reading.
  const headerRef = useRef(null);
  useEffect(() => {
    let lastHideY = 0;
    const onScroll = () => {
      const el = headerRef.current;
      if (!el) return;
      const y = scrollY;
      el.classList.toggle('scrolled', y > 28);
      if (y > 600 && y > lastHideY + 8) el.classList.add('hide');
      else if (y < lastHideY - 8 || y <= 600) el.classList.remove('hide');
      lastHideY = y;
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  return (
    <>
      <header ref={headerRef}>
        <Link className="logo" to="/" aria-label={t.header.home} onClick={() => toggleMenu(false)}>
          <span className="logo-mark">
            <svg viewBox="0 0 991 404" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M549.018 205.735L609.076 293.797H665.209L583.169 176.56L659.717 90.0701H603.976L521.147 181.595L519.209 0H466.608L468.546 293.797H521.147V233.021L549.018 205.735ZM63.595 289.349C76.9399 294.91 91.9864 297.723 108.735 297.723L108.729 297.739C123.91 297.739 137.582 295.447 149.752 290.868C161.921 286.289 172.518 279.939 181.547 271.828C190.576 263.717 197.441 254.554 202.154 244.349L150.734 228.648C148.641 233.355 145.371 237.542 140.921 241.209C136.477 244.875 131.436 247.752 125.81 249.846C120.185 251.939 114.232 252.986 107.951 252.986C98.004 252.986 88.975 250.367 80.8639 245.068C72.7528 239.835 66.2736 232.636 61.4316 223.543C56.5897 214.385 54.1687 203.982 54.1687 192.14C54.1687 180.105 56.5199 169.503 61.233 160.345C65.9462 151.246 72.42 144.182 80.6653 139.211C88.9052 134.17 97.9986 131.685 107.946 131.685C116.846 131.685 124.957 133.709 132.284 137.767C139.612 141.825 145.5 147.644 149.95 155.235L201.371 139.533C193.523 123.832 181.616 111.142 165.652 101.458C149.693 91.7737 130.588 86.9318 108.343 86.9318C86.1031 86.9318 66.8695 91.704 50.6419 101.323C34.4144 110.873 21.9176 123.628 13.1517 139.528C4.38567 155.428 0 172.96 0 192.129C0 206.134 2.54981 219.415 7.6548 232.105C12.7598 244.795 20.0227 256.116 29.4436 266.057C38.8645 276.069 50.2501 283.788 63.595 289.349ZM687.579 293.806V88.1143L739.789 88.5061L740.181 293.806H687.579ZM838.324 289.346C851.669 294.908 866.587 297.721 883.072 297.721L883.078 297.715C898.253 297.715 912.124 295.423 924.685 290.844C937.246 286.265 948.17 279.915 957.462 271.804C966.749 263.693 973.883 254.401 978.854 243.933L933.709 231.372C930.305 239.746 923.96 246.483 914.668 251.588C905.376 256.693 895.499 259.243 885.031 259.243C875.868 259.243 867.301 257.278 859.319 253.289C851.336 249.365 844.798 243.541 839.693 235.822C834.593 228.167 831.518 219.202 830.471 208.998H989.45C989.713 206.904 989.971 204.285 990.234 201.016C990.497 197.811 990.626 194.606 990.626 191.53C990.626 173.08 986.369 155.94 977.866 139.976C969.363 124.081 957.129 111.193 941.165 101.509C925.206 91.7603 905.972 86.9183 883.464 86.9183C861.219 86.9183 841.921 91.7603 825.564 101.509C809.208 111.193 796.647 124.081 787.881 140.11C779.115 156.139 774.729 173.87 774.729 193.302C774.729 207.302 777.279 220.518 782.384 233.079C787.489 245.64 794.752 256.763 804.173 266.446C813.594 276.195 824.979 283.785 838.324 289.346ZM936.854 175.641H829.301C830.347 165.431 833.289 156.536 838.131 148.946C842.973 141.425 849.254 135.536 856.973 131.349C864.692 127.098 873.265 125.004 882.686 125.004C892.364 125.004 901.135 127.098 908.984 131.349C916.837 135.536 923.182 141.42 928.024 148.946C932.866 156.536 935.808 165.436 936.854 175.641ZM713.747 66.4778C668.86 66.4778 668.903 0.220308 713.747 0.220308C758.882 0.220308 759.053 66.4778 713.747 66.4778ZM601.486 366.725V353.369C604.106 353.707 607.402 353.96 610.021 353.96H665.382C667.159 353.96 671.383 353.793 673.75 353.369V366.639C671.469 366.472 667.915 366.386 665.382 366.386H646.449C645.858 374.836 643.743 381.514 640.871 387.263C637.999 393.264 631.407 400.114 623.715 404L611.712 395.379C617.375 393.264 623.291 388.449 626.673 383.714C629.969 378.813 631.574 372.978 632.084 366.386H610.021C607.573 366.386 603.853 366.558 601.486 366.725ZM654.989 329.53L662.934 326.32V326.314C665.049 329.438 668.007 334.935 669.526 337.893L661.495 341.275C660.395 339.079 658.962 336.288 657.523 333.668V344.657C654.399 344.49 650.931 344.319 647.721 344.319H620.929C617.971 344.319 613.913 344.485 611.127 344.657V331.553C613.999 331.977 618.057 332.23 620.929 332.23H647.721C650.512 332.23 653.556 332.063 656.342 331.725C656.025 331.159 655.663 330.59 655.323 330.056L655.322 330.055C655.265 329.966 655.209 329.878 655.154 329.791C655.098 329.702 655.043 329.615 654.989 329.53ZM665.387 325.471L673.332 322.261C675.527 325.471 678.571 330.882 680.01 333.754L672.065 337.136C670.374 333.668 667.668 328.681 665.387 325.471ZM751.007 329.363L757.685 327.248C759.29 330.716 761.067 335.531 761.995 338.661L755.318 340.776C754.137 337.141 752.698 332.831 751.007 329.363ZM741.962 358.436V361.142L741.957 361.147C741.957 381.181 736.803 394.622 715.755 403.834L704.767 393.522C721.676 387.939 728.52 380.585 728.52 361.485V358.442H710.768V368.668C710.768 372.807 711.026 376.103 711.192 378.218H696.908C697.16 376.108 697.413 372.807 697.413 368.668V358.442H691.325C686.763 358.442 684.229 358.614 681.776 358.78V344.92C681.89 344.94 682.007 344.96 682.129 344.982L682.163 344.988C684.115 345.331 687.055 345.848 691.325 345.848H697.413V338.832C697.413 336.041 697.16 333.336 696.822 330.378H711.359C711.107 332.402 710.768 335.279 710.768 338.913V345.843H728.52V337.898C728.52 334.431 728.349 331.645 728.01 329.53H742.547C742.461 330.286 742.381 331.135 742.295 332.063L748.806 330.034C750.411 333.502 752.102 338.237 752.945 341.447L746.181 343.642C745.913 342.819 745.644 341.962 745.371 341.089L745.371 341.089C744.438 338.108 743.45 334.951 742.209 332.401C742.042 334.012 741.957 335.783 741.957 337.898V345.843H746.439C751.34 345.843 753.707 345.671 756.665 345.167V358.689C754.303 358.436 751.345 358.436 746.525 358.436H741.962ZM770.278 375.26L763.939 362.328L763.933 362.323C779.318 358.436 791.407 353.197 800.871 347.448C809.406 342.209 819.718 333.083 825.043 326.658L836.117 337.222C829.777 343.395 821.581 349.987 813.55 355.312V388.615C813.55 392.674 813.722 398.503 814.398 400.871H798.171C798.509 398.589 798.847 392.674 798.847 388.615V363.847C790.312 368.158 780.086 372.468 770.278 375.26ZM871.707 347.625V339.509L871.712 339.514C871.712 336.556 871.374 331.988 870.446 328.778H886.673C886.077 331.988 885.911 336.889 885.911 339.595V347.625H902.987C907.464 347.625 911.269 347.287 913.299 347.035V361.067C911.269 360.895 906.707 360.643 902.901 360.643H885.825C885.068 376.784 880.081 390.816 861.401 402.143L848.635 392.679C865.373 385.153 870.526 373.488 871.541 360.643H851.759C847.787 360.643 844.239 360.895 841.109 361.147V346.949C844.153 347.287 847.787 347.625 851.421 347.625H871.707ZM920.728 372.05V355.908C924.11 356.16 931.206 356.499 935.35 356.499H980.232C983.138 356.499 986.237 356.251 988.632 356.061C988.958 356.035 989.271 356.01 989.569 355.986C989.949 355.957 990.305 355.93 990.63 355.908V372.05C989.872 372.022 988.815 371.954 987.612 371.876L987.61 371.876H987.61C985.32 371.727 982.505 371.545 980.232 371.545H935.35C930.535 371.545 924.19 371.797 920.728 372.05ZM328.577 297.722C270.608 297.722 223.181 250.295 223.181 192.326C223.181 134.356 270.608 86.93 328.577 86.93V131.678C295.22 131.678 267.929 158.969 267.929 192.326C267.929 225.683 295.22 252.974 328.577 252.974V297.722ZM433.972 267.357C433.972 209.388 386.546 161.961 328.576 161.961V206.704C361.933 206.704 389.224 233.995 389.224 267.352C389.224 300.709 361.933 328 328.576 328V372.753C386.546 372.753 433.972 325.327 433.972 267.357Z" fill="currentColor" />
            </svg>
            <PixelHeart />
          </span>
        </Link>
        <div className="hdr-right">
          <span className="hdr-time">{t.city} {clock}</span>
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
            <Link
              key={l.href}
              to={l.href}
              className={activeHref === l.href ? 'active' : ''}
              style={{ transitionDelay: menuOpen ? `${.15 + i * .06}s, ${.15 + i * .06}s, 0s` : '0s, 0s, 0s' }}
              onMouseEnter={() => setMenuPreview(l)}
              onClick={() => toggleMenu(false)}
            ><i>{l.num}</i>{l.label}</Link>
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
            <a href="https://behance.net/iamcookiekiller" target="_blank" rel="noopener noreferrer"><BehanceLogo size={15} weight="bold" />Behance<ArrowUpRight size={12} /></a>
            <a href="https://linkedin.com/in/iamcookiekiller" target="_blank" rel="noopener noreferrer"><LinkedinLogo size={15} weight="bold" />LinkedIn<ArrowUpRight size={12} /></a>
            {/* Desktop keeps the email in the menu as before; hidden on
                mobile only (see .menu-mail in index.css) - phone screenshots
                specifically flagged the crowded mobile sheet, desktop was
                never part of that ask. */}
            <a className="menu-mail" href="mailto:cookiekiller.design@gmail.com"><EnvelopeSimple size={15} weight="bold" />cookiekiller.design@gmail.com</a>
          </div>
          <div className="menu-legal">
            <Link to="/privacy" onClick={() => toggleMenu(false)}>{t.footer.privacy}</Link>
            <Link to="/cookie-policy" onClick={() => toggleMenu(false)}>{t.footer.cookiePolicy}</Link>
            <Link to="/gdpr" onClick={() => toggleMenu(false)}>{t.footer.gdpr}</Link>
          </div>
        </div>
      </div>
      <div className="menu-status" aria-hidden="true">
        <span className="hdr-status">{t.header.openToWork}</span>
        <span>{t.city} {clock}</span>
      </div>
      <button className="menu-close" aria-label={t.header.close} onClick={() => toggleMenu(false)}><X size={13} weight="bold" /><span className="menu-close-label">{t.header.close}</span></button>
    </>
  );
}
