import LegalPage from '../components/LegalPage';
import { GDPR_LABELS, GDPR_DEFAULT, GDPR_UPDATED } from '../data/gdpr';

export default function Gdpr() {
  return (
    <LegalPage
      textKey="gdpr"
      labels={GDPR_LABELS}
      defaultText={GDPR_DEFAULT}
      updatedAt={GDPR_UPDATED}
      activeHref="/gdpr"
    />
  );
}
