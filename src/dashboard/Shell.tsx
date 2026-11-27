import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CircleUserRound,
  FileCheck,
  Globe,
  Home,
  Landmark,
  LayoutDashboard,
  Menu,
  Mic,
  Phone,
  Shield,
  ShieldCheck,
  Users,
  Vault,
  Wallet,
  X,
} from 'lucide-react';
import { useDashboard } from '../state/dashboardStore';
import { t } from '../i18n';

// Flat shield mark (solid two-tone, no gradient, no glow — the unslop
// ruling from Step 5 still applies; the screenshot's halo is not rebuilt).
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

// Page fade: 200ms rise, skipped entirely under reduced motion.
export function PageFade({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const lang = useDashboard((s) => s.settings.language);
  return (
    <>
      {NAV.map(({ to, key, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `db-nav-item${isActive ? ' active' : ''}`} onClick={onNavigate}>
          <Icon size={20} aria-hidden="true" />
          <span>{t(lang, key)}</span>
        </NavLink>
      ))}
    </>
  );
}

export function Shell() {
  const lang = useDashboard((s) => s.settings.language);
  const setSettings = useDashboard((s) => s.setSettings);
  const caregiver = useDashboard((s) => s.settings.caregiver);
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

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

  return (
    <div className="db-shell">
      <aside className="db-sidebar" aria-label="Main navigation">
        <Link to="/" className="db-side-logo" aria-label="RAKSHIO home">
          <ShieldLogo />
          <span className="wordmark">RAKSHIO</span>
        </Link>
        <nav className="db-nav">
          <NavItems />
        </nav>
      </aside>

      <div className="db-main">
        <header className="db-header">
          <button
            type="button"
            className="db-avatar db-hamburger"
            aria-label="Menu kholein"
            onClick={() => setDrawer(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <span className="subtitle">{t(lang, 'appSubtitle')}</span>
          <span className="spacer" />
          <span className="db-pill" role="status">
            <span className="dot" aria-hidden="true" />
            {offlineReady ? t(lang, 'offlineReady') : t(lang, 'online')}
          </span>
          {caregiver && <span className="db-badge green">Caregiver</span>}
          <label className="db-lang">
            <Globe size={18} aria-hidden="true" />
            <select
              aria-label="Language"
              value={lang}
              onChange={(e) => setSettings({ language: e.target.value as 'en' | 'hi' })}
              style={{ background: 'transparent', border: 'none', color: 'inherit', font: 'inherit', minHeight: 'auto' }}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
          </label>
          <button type="button" className="db-avatar" aria-label="Settings kholein" onClick={() => navigate('/settings')}>
            <CircleUserRound size={22} aria-hidden="true" />
          </button>
        </header>

        <main className="db-content">
          <p className="db-banner" role="note">
            RAKSHIO report file nahi karta. Aapko 1930 / bank ko khud contact karna hoga.
          </p>
          <PageFade>
            <Outlet />
          </PageFade>
        </main>

        <footer className="db-footer">
          RAKSHIO kabhi OTP / PIN / CVV nahi mangta. Aapka data sirf is device par rehta hai.
        </footer>
      </div>

      <nav className="db-bottomnav" aria-label="Quick navigation">
        {[
          { to: '/', key: 'navHome', icon: Home },
          { to: '/report', key: 'navReport', icon: Mic },
          { to: '/incidents', key: 'navIncidents', icon: LayoutDashboard },
          { to: '/vault', key: 'navVault', icon: Vault },
          { to: '/settings', key: 'navSettings', icon: Wallet },
        ].map(({ to, key, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={20} aria-hidden="true" />
            {t(lang, key)}
          </NavLink>
        ))}
      </nav>

      {drawer && (
        <>
          <div className="db-drawer-backdrop" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="db-drawer" role="dialog" aria-label="Navigation">
            <div className="flex items-center justify-between px-2 pb-4">
              <span className="flex items-center gap-2.5 text-[1.375rem] font-bold">
                <ShieldLogo size={32} /> RAKSHIO
              </span>
              <button type="button" className="db-avatar" aria-label="Menu band karein" onClick={() => setDrawer(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav className="db-nav">
              <NavItems onNavigate={() => setDrawer(false)} />
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
