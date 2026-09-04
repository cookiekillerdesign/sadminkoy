import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import ScrollToTop from './components/ScrollToTop';

// Portfolio/Project pull in WebGL shader code (RippleThumb) and other
// route-specific weight that the initial "/" route (and its LCP) never
// needs — split them into their own chunks, fetched on navigation instead
// of bundled into the entry chunk everyone downloads on first load.
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Project = lazy(() => import('./pages/Project'));
// The admin panel is only ever opened by one person. Keeping it in its own
// chunk means visitors never download the editor, the auth client UI or the
// upload code just to look at the portfolio.
const AdminApp = lazy(() => import('./admin/AdminApp'));
// Legal text is a few KB of prose nobody needs until they click the footer link.
const Privacy = lazy(() => import('./pages/Privacy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const Gdpr = lazy(() => import('./pages/Gdpr'));
const Terms = lazy(() => import('./pages/Terms'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/project/:slug" element={<Project />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/gdpr" element={<Gdpr />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
