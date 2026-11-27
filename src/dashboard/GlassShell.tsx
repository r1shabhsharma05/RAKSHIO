import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
  ChevronRight,
  FileCheck,
  Globe,
  Home,
  Landmark,
  LayoutDashboard,
  Mic,
  Moon,
  Phone,
  Scale,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Users,
  Vault,
  Wallet,
  X,
} from 'lucide-react';
import { dashboardStyles } from '../components/ui/glassy-dashboard';
import { useDashboard } from '../state/dashboardStore';
import { t, speechLangFor, type Lang } from '../i18n';

// Glass shell (Step 10): the 21st.dev GlassyDashboard chrome — top pill bar,
// side dock, bottom dock, glass stage, GSAP view transition, Manrope —
// wrapped around the 12 RAKSHIO HashRouter routes. The verbatim component
// itself is NOT rendered (it ships sample e-commerce views); only its CSS
// (dashboardStyles) and its chrome patterns are reused, so every number on
// screen comes from real saved data or the seeded demo.

// Flat shield mark (solid two-tone, no gradient, no glow — the unslop
// ruling from Step 5 still applies).
export function ShieldLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        d="M24 3 41 9v12c0 11-7.5 19.5-17 24C14.5 40.5 7 32 7 21V9L24 3z"
        fill="#3159e8"
      />
      <path
        d="M24 3 41 9v12c0 11-7.5 19.5-17 24V3z"
        fill="#1e3a8a"
        opacity="0.55"
      />
      <rect x="19" y="20" width="10" height="9" rx="2" fill="#f8fafc" />
      <path d="M20 20v-3a4 4 0 0 1 8 0v3" fill="none" stroke="#f8fafc" strokeWidth="2.5" />
      <circle cx="24" cy="24.5" r="1.6" fill="#3159e8" />
    </svg>
  );
}

const NAV = [
  { to: '/', key: 'navHome', icon: Home, end: true },
  { to: '/report', key: 'navReport', icon: Mic, end: false },
  { to: '/incidents', key: 'navIncidents', icon: LayoutDashboard, end: false },
  { to: '/actions', key: 'navActions', icon: FileCheck, end: false },
  { to: '/coach', key: 'navCoach', icon: Phone, end: false },
  { to: '/portal', key: 'navPortal', icon: Globe, end: false },
  { to: '/bank', key: 'navBank', icon: Landmark, end: false },
  { to: '/vault', key: 'navVault', icon: Vault, end: false },
  { to: '/shield', key: 'navShield', icon: ShieldCheck, end: false },
  { to: '/care', key: 'navCare', icon: Users, end: false },
  { to: '/proof', key: 'navProof', icon: Shield, end: false },
  { to: '/settings', key: 'navSettings', icon: Wallet, end: false },
] as const;

const BOTTOM_NAV = ['/', '/report', '/incidents', '/vault', '/settings'] as const;
const BOTTOM_SHORT: Record<string, string> = {
  '/': 'navHomeShort',
  '/report': 'navReportShort',
  '/incidents': 'navIncidentsShort',
  '/vault': 'navVaultShort',
  '/settings': 'navSettingsShort',
};
// Routes with no dock entry still need a page title.
const EXTRA_TITLES: Record<string, string> = { '/guide': 'guideTitle', '/judge': 'navJudge' };
// Search covers the 12 dock sections PLUS Judge Mode — Judge has no dock
// item (12 stay 12) but must be findable from the palette.
const SEARCHABLE = [
  ...NAV,
  { to: '/judge', key: 'navJudge', icon: Scale, end: false },
] as const;

function SearchDialog({ close }: { close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  const lang = useDashboard((s) => s.settings.language);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = SEARCHABLE.filter(({ key }) =>
    terms.every((term) => t(lang, key).toLowerCase().includes(term)),
  );

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector('input')?.focus();
  }, []);

  return (
    <dialog
      className="gd-dialog"
      ref={ref}
      aria-labelledby={label}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
    >
      <section className="gd-dialog-inner">
        <header>
          <h2 id={label}>{t(lang, 'searchTitle')}</h2>
          <button type="button" className="gd-icon-button" aria-label={t(lang, 'closeDialog')} onClick={() => ref.current?.close()}>
            <X aria-hidden="true" />
          </button>
        </header>
        <label className="gd-search gd-command-input">
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label={t(lang, 'searchPlaceholder')}
            placeholder={t(lang, 'searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="gd-quick-list">
          {results.map(({ to, key, icon: Icon }) => (
            <button
              key={to}
              type="button"
              onClick={() => {
                close();
                navigate(to);
              }}
            >
              <Icon aria-hidden="true" />
              <div>
                <strong>{t(lang, key)}</strong>
                <small>{t(lang, 'appSubtitle')}</small>
              </div>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
          {results.length === 0 && (
            <p className="gd-empty" role="status">
              {t(lang, 'searchNoMatch')}
            </p>
          )}
        </div>
      </section>
    </dialog>
  );
}

export function GlassShell() {
  const lang = useDashboard((s) => s.settings.language);
  const setSettings = useDashboard((s) => s.setSettings);
  const caregiver = useDashboard((s) => s.settings.caregiver);
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  // Theme follows the pasted demo: auto-detect via prefers-color-scheme,
  // toggle in the top bar, default light when undetectable.
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );
  const root = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const sideDock = useRef<HTMLElement>(null);
  const dockMarker = useRef<HTMLSpanElement>(null);
  const reduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  ).current;
  const { contextSafe } = useGSAP({ scope: root });

  // Offline Ready is real: true only once a service worker controls the page.
  useEffect(() => {
    let alive = true;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((r) => {
          if (alive) setOfflineReady(!!r?.active);
        })
        .catch(() => undefined);
    }
    return () => {
      alive = false;
    };
  }, []);

  // Route change: scroll the glass stage to the top and run the Glassy
  // blur/fade content transition (skipped under reduced motion).
  useEffect(() => {
    scrollArea.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const transition = contextSafe(() => {
    const layer = content.current;
    if (!layer) return;
    gsap.set(layer, { clearProps: 'opacity,filter' });
    if (reduced) return;
    gsap.fromTo(
      layer,
      { opacity: 0.55, filter: 'blur(5px)' },
      { opacity: 1, filter: 'blur(0px)', clearProps: 'opacity,filter', duration: 0.32, ease: 'power3.out' },
    );
  });
  useEffect(() => {
    transition();
    // Run once per route; transition is contextSafe-stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Side-dock active marker: the glass CSS positions the indicator behind
  // the [aria-current="page"] link — same logic as the verbatim Dock.
  useEffect(() => {
    const container = sideDock.current;
    const indicator = dockMarker.current;
    if (!container || !indicator) return;
    const adjust = () => {
      const current = container.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current) return;
      indicator.style.width = `${current.offsetWidth}px`;
      indicator.style.height = `${current.offsetHeight}px`;
      indicator.style.transform = `translate(${current.offsetLeft}px, ${current.offsetTop}px)`;
      indicator.dataset.ready = 'true';
    };
    const observer = new ResizeObserver(adjust);
    observer.observe(container);
    container.querySelectorAll('a').forEach((link) => observer.observe(link));
    adjust();
    return () => observer.disconnect();
  }, [location.pathname, lang]);

  const current = NAV.find((item) => item.to === location.pathname) ??
    (location.pathname.startsWith('/incidents/') ? NAV[2] : null) ??
    (EXTRA_TITLES[location.pathname] ? { to: location.pathname, key: EXTRA_TITLES[location.pathname] } : NAV[0]);

  function setLanguage(next: Lang) {
    // UI language drives the speech language: Hinglish/Hindi speakers
    // speak Hindi; only the English UI listens in English.
    setSettings({ language: next, speechLang: speechLangFor(next) });
  }

  return (
    <div
      className="gd-app"
      data-theme={theme}
      ref={root}
      style={{ '--gd-panel-frost': '12px' } as CSSProperties}
    >
      <style>{dashboardStyles}</style>
      <img className="gd-background" src="/rakshio-bg.jpg" alt="" aria-hidden="true" fetchPriority="high" />
      <div className="gd-surround">
        <header className="gd-top">
          <div className="gd-brand">
            <span className="gd-logo" aria-hidden="true">
              <ShieldLogo size={28} />
            </span>
            <div>
              <strong>RAKSHIO</strong>
              <small>{t(lang, 'appSubtitle')}</small>
            </div>
          </div>
          <button
            type="button"
            className="gd-ask"
            onClick={() => setSearchOpen(true)}
          >
            <span className="gd-orb" aria-hidden="true" />
            <span className="gd-prompt">{t(lang, 'searchPrompt')}</span>
            <Search aria-hidden="true" className="gd-ask-search" />
          </button>
          <div className="gd-top-actions">
            {caregiver && (
              <span className="gd-pill" role="status">
                <ShieldCheck size={14} aria-hidden="true" /> Caregiver
              </span>
            )}
            <span className="gd-pill gd-pill-status" role="status">
              <span className="gd-dot" aria-hidden="true" />
              {offlineReady ? t(lang, 'offlineReady') : t(lang, 'online')}
            </span>
            <label className="gd-lang">
              <Globe size={16} aria-hidden="true" />
              <select
                aria-label="Language"
                value={lang}
                onChange={(e) => setLanguage(e.target.value as Lang)}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="hg">Hinglish</option>
              </select>
            </label>
            <button
              type="button"
              className="gd-icon-button"
              title={theme === 'light' ? t(lang, 'themeToDark') : t(lang, 'themeToLight')}
              aria-label={theme === 'light' ? t(lang, 'themeToDark') : t(lang, 'themeToLight')}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </button>
            <Link to="/settings" className="gd-icon-button" aria-label={t(lang, 'settingsOpen')}>
              <Settings aria-hidden="true" />
            </Link>
          </div>
        </header>

        <div className="gd-stage-wrap">
          <nav ref={sideDock} className="gd-dock gd-dock-side" aria-label="Main navigation">
            <span ref={dockMarker} className="gd-dock-indicator" aria-hidden="true" />
            {NAV.map(({ to, key, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                aria-label={t(lang, key)}
                aria-current={location.pathname === to || (to !== '/' && location.pathname.startsWith(`${to}/`)) ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                <span className="gd-dock-text" aria-hidden="true">{t(lang, key)}</span>
                <span className="gd-dock-tip" aria-hidden="true">{t(lang, key)}</span>
              </NavLink>
            ))}
          </nav>
          <main className="gd-stage">
            <div className="gd-stage-scroll" ref={scrollArea}>
              <header className="gd-view-head">
                <div>
                  <h1>{t(lang, current.key)}</h1>
                </div>
              </header>
              <p className="gd-banner" role="note">
                {t(lang, 'bannerText')}
              </p>
              <div className="gd-content" ref={content} key={location.pathname}>
                <Outlet />
              </div>
            </div>
          </main>
          <nav className="gd-dock gd-dock-bottom" aria-label="Quick navigation">
            {NAV.filter(({ to }) => (BOTTOM_NAV as readonly string[]).includes(to)).map(({ to, key, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} aria-label={t(lang, key)}>
                <Icon aria-hidden="true" />
                <span className="gd-dock-short" aria-hidden="true">{t(lang, BOTTOM_SHORT[to])}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <footer className="gd-footer">
          <span>{t(lang, 'footerText')}</span>
          <a href="https://unsplash.com/photos/e0oJLc5FYsg" target="_blank" rel="noreferrer">
            Photo by GoodLifeConstruction
          </a>
        </footer>
      </div>

      {searchOpen && <SearchDialog close={() => setSearchOpen(false)} />}
    </div>
  );
}
