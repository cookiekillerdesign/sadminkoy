import LegalPage from '../components/LegalPage';
import { COOKIES_LABELS, COOKIES_DEFAULT, COOKIES_UPDATED } from '../data/cookiePolicy';

export default function CookiePolicy() {
  return (
    <LegalPage
      textKey="cookies"
      labels={COOKIES_LABELS}
      defaultText={COOKIES_DEFAULT}
      updatedAt={COOKIES_UPDATED}
      activeHref="/cookie-policy"
    />
  );
}
