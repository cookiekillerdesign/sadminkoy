import LegalPage from '../components/LegalPage';
import { TERMS_LABELS, TERMS_DEFAULT, TERMS_UPDATED } from '../data/terms';

export default function Terms() {
  return (
    <LegalPage
      textKey="terms"
      labels={TERMS_LABELS}
      defaultText={TERMS_DEFAULT}
      updatedAt={TERMS_UPDATED}
      activeHref="/terms"
    />
  );
}
