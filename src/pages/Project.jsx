import { useParams, Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Skull } from '@phosphor-icons/react';
import Grain from '../components/Grain';
import ProgressBar from '../components/ProgressBar';
import Cursor from '../components/Cursor';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import ProjectLoader from '../components/ProjectLoader';
import ProjectGallery from './ProjectGallery';
import SplitChars from '../components/SplitChars';
import { useLang } from '../lib/useLang';
import { useChisinauClock } from '../lib/useChisinauClock';
import { useReveal } from '../lib/useReveal';
import { useMagnetic } from '../lib/useMagnetic';
import { findProjectBySlug, findAdjacentProject } from '../data/projects';
import { useContent, useCapabilityDecks } from '../content/ContentProvider';
import { projectName, projectTags, projectOverview, resolveChipLabels } from '../i18n';
import { usePageMeta } from '../lib/usePageMeta';

export default function Project() {
  const { slug } = useParams();
  const [lang, setLang, t] = useLang();
  const clock = useChisinauClock();
  const { projects: PROJECTS, loading } = useContent();
  const CAPABILITY_DECKS = useCapabilityDecks();
  const project = findProjectBySlug(PROJECTS, slug);

  // `project` (and its gallery) can change shape when the Supabase fetch
  // resolves after the static fallback has already rendered - a case with no
  // uploaded media briefly shows the two generic placeholder frames, then
  // swaps in the real gallery once content loads. Without `project` in the
  // deps here, any `.reveal` frames added by that swap are never observed by
  // the IntersectionObserver and stay stuck at opacity 0 forever.
  useReveal([slug, lang, project]);
  useMagnetic([slug]);

  usePageMeta(
    project ? `${projectName(project, lang)} - ${projectTags(project, lang)} | Cookiekiller®` : t.project.notFoundTitle,
    project ? projectOverview(project, lang) : undefined
  );

  // While the first content fetch is still in flight the project list is
  // whatever we had cached - possibly nothing. Rendering "this one's not here"
  // in that window flashed a 404 on a perfectly valid link, so hold the loader
  // instead and let the fetch resolve.
  if (!project && loading) {
    return (
      <>
        <ProjectLoader key={slug} />
        <Grain />
        <Cursor />
        <SiteHeader lang={lang} setLang={setLang} t={t} activeHref="/portfolio" />
        <main style={{ minHeight: '60svh' }} />
        <SiteFooter t={t} clock={clock} />
      </>
    );
  }

  if (!project) {
    return (
      <>
        <ProjectLoader key={slug} />
        <Grain />
        <Cursor />
        <SiteHeader lang={lang} setLang={setLang} t={t} activeHref="/portfolio" />
        <main>
          <section className="notfound">
            <span className="notfound-num" aria-hidden="true">404</span>
            <div className="notfound-badge reveal"><Skull size={13} weight="bold" />{t.project.notFoundBadge}</div>
            <h1 className="reveal"><SplitChars text={t.project.notFoundTitle} key={lang} baseDelay={.15} /></h1>
            <p className="notfound-body reveal">{t.project.notFoundBody}</p>
            <div className="notfound-actions reveal">
              <Link className="cert magnetic" to="/portfolio">{t.project.notFoundCta}<ArrowUpRight size={13} weight="bold" /></Link>
              <Link className="notfound-home magnetic" to="/">{t.header.home}<ArrowRight size={13} weight="bold" /></Link>
            </div>
          </section>
        </main>
        <SiteFooter t={t} clock={clock} />
      </>
    );
  }

  const name = projectName(project, lang);
  const tags = projectTags(project, lang);
  const overview = projectOverview(project, lang);
  const platformLabel = t.platformLabels[project.platform];
  // A project's chips are capability_items.id strings now (see
  // supabase/schema.sql's migration), resolved against the live deck list -
  // an id can point at an item that's since been renamed or deleted from the
  // admin panel, so resolveChipLabels silently drops anything it can't find
  // rather than throwing and blanking the whole case-study page.
  const chips = resolveChipLabels(project.chips, CAPABILITY_DECKS, lang);
  const next = findAdjacentProject(PROJECTS, project.slug) || project;
  const nextName = projectName(next, lang);
  const posIndex = PROJECTS.findIndex(p => p.slug === project.slug) + 1;

  return (
    <>
      <ProjectLoader key={`loader-${project.slug}`} />
      <Grain />
      <ProgressBar />
      <Cursor />
      <SiteHeader lang={lang} setLang={setLang} t={t} activeHref="/portfolio" />
      <main className="lf-page" key={`main-${project.slug}`}>
        <ProjectGallery
          project={project}
          name={name}
          tags={tags}
          overview={overview}
          platformLabel={platformLabel}
          chips={chips}
          posIndex={posIndex}
          total={PROJECTS.length}
          next={next}
          nextName={nextName}
          t={t}
        />
      </main>
      <SiteFooter t={t} clock={clock} />
    </>
  );
}
