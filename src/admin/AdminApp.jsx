import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import { SquaresFour, Images, FolderOpen, Sliders, SignOut, ArrowUpRight, Stack, SealCheck, ShieldCheck, FileText, Scales, Cookie, AddressBook } from '@phosphor-icons/react';
import PixelHeart from '../components/PixelHeart';
import { supabase } from '../lib/supabase';
import { isSupabaseConfigured } from '../lib/supabaseConfig';
import { checkAdmin, signOut } from './api';
import { ToastProvider } from './components/Toasts';
import Setup from './pages/Setup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import HomeMediaPage from './pages/HomeMediaPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectEditor from './pages/ProjectEditor';
import CapabilitiesPage from './pages/CapabilitiesPage';
import CertificationsPage from './pages/CertificationsPage';
import SettingsPage from './pages/SettingsPage';
import PrivacyPage from './pages/PrivacyPage';
import LegalTextPage from './pages/LegalTextPage';
import SocialLinksPage from './pages/SocialLinksPage';
import { TERMS_LABELS, TERMS_DEFAULT } from '../data/terms';
import { GDPR_LABELS, GDPR_DEFAULT } from '../data/gdpr';
import { COOKIES_LABELS, COOKIES_DEFAULT } from '../data/cookiePolicy';
import './admin.css';

/* Legals section: "Privacy Policy" has its own bespoke editor (PrivacyPage -
   split-view markdown-ish preview), the other three share one generic
   editor (LegalTextPage). Each row in `site_texts` keyed separately;
   defaults live in src/data/*. */
const PRIVACY_NAV = { path: 'privacy', label: 'Privacy Policy', icon: ShieldCheck };
const LEGALS = [
  { path: 'legals/terms',   label: 'Terms of Use',  icon: FileText, textKey: 'terms',   title: 'Terms of Use',  publicHref: '/terms',         labels: TERMS_LABELS,   defaults: TERMS_DEFAULT },
  { path: 'legals/gdpr',    label: 'GDPR',          icon: Scales,   textKey: 'gdpr',    title: 'GDPR',          publicHref: '/gdpr',          labels: GDPR_LABELS,    defaults: GDPR_DEFAULT },
  { path: 'legals/cookies', label: 'Cookie Policy', icon: Cookie,   textKey: 'cookies', title: 'Cookie Policy', publicHref: '/cookie-policy', labels: COOKIES_LABELS, defaults: COOKIES_DEFAULT }
];

const NAV = [
  { to: '/admin', end: true, label: 'Обзор', icon: SquaresFour },
  { to: '/admin/home', end: false, label: 'Главная страница', icon: Images },
  { to: '/admin/projects', end: false, label: 'Проекты', icon: FolderOpen },
  { to: '/admin/capabilities', end: false, label: 'Компетенции', icon: Stack },
  { to: '/admin/certifications', end: false, label: 'Сертификаты', icon: SealCheck },
  { to: '/admin/contacts', end: false, label: 'Контакты', icon: AddressBook },
  { to: '/admin/settings', end: false, label: 'Настройки', icon: Sliders }
];

export default function AdminApp() {
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [admin, setAdmin] = useState(null);          // null = not checked yet

  useEffect(() => { document.title = 'Админка · Cookiekiller®'; }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setSession(null); return; }
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSession(data.session || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next || null);
      // Re-run the allowlist check on every session change: signing out and
      // back in as a different account must not inherit the first one's answer.
      setAdmin(null);
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    checkAdmin().then(ok => { if (!cancelled) setAdmin(ok); });
    return () => { cancelled = true; };
  }, [session]);

  if (!isSupabaseConfigured) return <Setup />;

  if (session === undefined) {
    return (
      <div className="adm">
        <div className="adm-login"><div className="adm-loading"><span className="adm-spinner" />Проверяю доступ…</div></div>
      </div>
    );
  }

  if (!session) {
    return <ToastProvider><Login /></ToastProvider>;
  }

  if (admin === null) {
    return (
      <div className="adm">
        <div className="adm-login"><div className="adm-loading"><span className="adm-spinner" />Проверяю права…</div></div>
      </div>
    );
  }

  if (admin === false) {
    return (
      <div className="adm">
        <div className="adm-login">
          <div className="adm-login-card">
            <div className="adm-login-mark"><PixelHeart />Cookiekiller® · админка</div>
            <h1>Доступ закрыт</h1>
            <p className="adm-lede">
              Вы вошли как <b>{session.user.email}</b>, но этот аккаунт не в списке администраторов.
            </p>
            <div className="adm-note">
              <b>Как открыть доступ</b>
              Supabase → SQL Editor → выполните:<br />
              <code>select public.grant_admin('{session.user.email}');</code><br />
              Затем обновите эту страницу.
            </div>
            <div className="adm-actions">
              <button type="button" className="adm-btn" onClick={() => signOut()}>Выйти</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="adm">
        <div className="adm-shell">
          <aside className="adm-side">
            <div className="adm-brand"><PixelHeart />Cookiekiller®</div>

            {NAV.map(({ to, end, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `adm-navlink${isActive ? ' active' : ''}`}
              >
                <Icon size={15} weight="bold" />{label}
              </NavLink>
            ))}

            <div className="adm-nav-heading">Legals</div>
            <NavLink
              to={`/admin/${PRIVACY_NAV.path}`}
              className={({ isActive }) => `adm-navlink${isActive ? ' active' : ''}`}
            >
              <PRIVACY_NAV.icon size={15} weight="bold" />{PRIVACY_NAV.label}
            </NavLink>
            {LEGALS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={`/admin/${path}`}
                className={({ isActive }) => `adm-navlink${isActive ? ' active' : ''}`}
              >
                <Icon size={15} weight="bold" />{label}
              </NavLink>
            ))}

            <div className="adm-side-foot">
              <div className="adm-side-user">{session.user.email}</div>
              <a className="adm-btn adm-btn--sm adm-btn--ghost" href="/" target="_blank" rel="noopener noreferrer" style={{ width: '100%', marginBottom: 8 }}>
                Сайт<ArrowUpRight size={11} weight="bold" />
              </a>
              <button type="button" className="adm-btn adm-btn--sm adm-btn--ghost" style={{ width: '100%' }} onClick={() => signOut()}>
                <SignOut size={12} weight="bold" />Выйти
              </button>
            </div>
          </aside>

          <main className="adm-main">
            <Routes>
              <Route index element={<Dashboard email={session.user.email} />} />
              <Route path="home" element={<HomeMediaPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectEditor />} />
              <Route path="capabilities" element={<CapabilitiesPage />} />
              <Route path="certifications" element={<CertificationsPage />} />
              <Route path="contacts" element={<SocialLinksPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              {LEGALS.map(({ path, ...cfg }) => (
                <Route key={path} path={path} element={<LegalTextPage {...cfg} />} />
              ))}
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
