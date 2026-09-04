import LegalPage from '../components/LegalPage';
import { PRIVACY_LABELS, PRIVACY_DEFAULT, PRIVACY_UPDATED } from '../data/privacy';

export default function Privacy() {
  return (
    <LegalPage
      textKey="privacy"
      labels={PRIVACY_LABELS}
      defaultText={PRIVACY_DEFAULT}
      updatedAt={PRIVACY_UPDATED}
      activeHref="/privacy"
    />
  );
}
