import { Link } from 'react-router-dom';
import { ArrowRight, EnvelopeSimple } from '@phosphor-icons/react';
import { useSocialLinks } from '../content/ContentProvider';
import { iconFor, isExternalUrl } from '../lib/socialIcons';

export default function SiteFooter({ t }) {
  const socialLinks = useSocialLinks();
  return (
    <footer id="contact">
      <p className="foot-eyebrow">{t.footer.eyebrow}</p>
      <a className="foot-cta" href="mailto:cookiekiller.design@gmail.com">{t.footer.ctaPre}<span className="swap">{t.footer.ctaSwap}</span><br />{t.footer.ctaPost}</a>

      <div className="foot-ctas">
        <a className="foot-mail" href="mailto:cookiekiller.design@gmail.com"><EnvelopeSimple size={17} weight="bold" />cookiekiller.design@gmail.com<ArrowRight size={15} weight="bold" /></a>
        {/* On Home this label opens the lead-request modal directly (see
            Home.jsx's own footer). This component is shared by every other
            page, which has no modal of its own - so it routes home with a
            flag that Home reads on arrival to open the same modal, instead
            of just landing on the footer and requiring a second click. */}
        <Link className="foot-form-trigger" to="/?openForm=general#contact"><span>{t.footer.formTrigger}</span><ArrowRight size={15} weight="bold" /></Link>
      </div>

      <div className="foot-grid">
        <div className="foot-links">
          {socialLinks.filter(l => l.url).map(l => {
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
          <Link to="/terms">{t.footer.terms}</Link>
          <Link to="/privacy">{t.footer.privacy}</Link>
          <Link to="/cookie-policy">{t.footer.cookiePolicy}</Link>
          <Link to="/gdpr">{t.footer.gdpr}</Link>
        </div>
      </div>
    </footer>
  );
}
