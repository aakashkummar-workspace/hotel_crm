import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import { Toast } from './components/primitives.jsx';
import { TweaksPanel, TweakSection, TweakRadio, TweakSelect } from './components/TweaksPanel.jsx';
import CommandPalette from './components/CommandPalette.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Rooms from './pages/Rooms.jsx';
import Bookings from './pages/Bookings.jsx';
import Coffee from './pages/Coffee.jsx';
import Hall from './pages/Hall.jsx';
import Expenses from './pages/Expenses.jsx';
import CRM from './pages/CRM.jsx';
import Reports from './pages/Reports.jsx';
import Invoices from './pages/Invoices.jsx';
import Settings from './pages/Settings.jsx';

const FONT_PAIRINGS = {
  'fraunces-geist': { display: "'Fraunces', Georgia, serif", body: "'Geist', system-ui, sans-serif", label: 'Fraunces × Geist' },
  'instrument-inter': { display: "'Instrument Serif', Georgia, serif", body: "'Inter', system-ui, sans-serif", label: 'Instrument × Inter' },
  'geist-geist': { display: "'Geist', system-ui, sans-serif", body: "'Geist', system-ui, sans-serif", label: 'Geist × Geist' },
  'fraunces-inter': { display: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif", label: 'Fraunces × Inter' },
};

const PAGE_TITLES = {
  dashboard: { title: 'Dashboard', sub: 'Live overview of every module' },
  rooms: { title: 'Rooms', sub: 'Manage all rooms across floors' },
  bookings: { title: 'Bookings', sub: 'Reservations and check-ins' },
  coffee: { title: 'Coffee Shop', sub: 'Café POS and daily sales' },
  hall: { title: 'Mini Hall', sub: 'Event reservations' },
  expenses: { title: 'Expenses', sub: 'Track spending and profit' },
  crm: { title: 'Guests', sub: 'Customer profiles and history' },
  reports: { title: 'Reports', sub: 'Analytics across modules' },
  invoices: { title: 'Invoices', sub: 'Billing and payments' },
  settings: { title: 'Settings', sub: 'Hotel profile and integrations' },
};

const TWEAKS_KEY = 'aurelia.tweaks';

function loadTweaks() {
  try {
    const raw = localStorage.getItem(TWEAKS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { sidebarStyle: 'expanded', fontPairing: 'fraunces-geist', theme: 'dark' };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [tweaks, setTweaks] = useState(loadTweaks);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [bookingPrefill, setBookingPrefill] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  // Load the hotel profile early so the brand block, document title, login
  // screen and every header use the latest hotel name.
  useEffect(() => {
    api.publicSite.profile().then(setProfile).catch(() => { /* no-op */ });
  }, []);

  // Keep the browser tab title in sync with the hotel name.
  useEffect(() => {
    const name = profile?.name?.trim();
    document.title = name ? `${name} — Hotel CRM` : 'Hotel CRM';
  }, [profile?.name]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    const fp = FONT_PAIRINGS[tweaks.fontPairing] || FONT_PAIRINGS['fraunces-geist'];
    document.documentElement.style.setProperty('--font-display', fp.display);
    document.documentElement.style.setProperty('--font-body', fp.body);
    try { localStorage.setItem(TWEAKS_KEY, JSON.stringify(tweaks)); } catch { /* ignore */ }
  }, [tweaks]);

  useEffect(() => {
    let cancelled = false;
    if (!getToken()) { setAuthChecked(true); return; }
    api.me().then(({ user }) => { if (!cancelled) { setUser(user); setAuthChecked(true); } })
      .catch(() => { setToken(null); if (!cancelled) setAuthChecked(true); });
    return () => { cancelled = true; };
  }, []);

  const setTweak = (key, value) => setTweaks(t => ({ ...t, [key]: value }));
  const cycleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      setMobileNavOpen(v => !v);
      return;
    }
    const cycle = { expanded: 'collapsed', collapsed: 'floating', floating: 'expanded' };
    setTweak('sidebarStyle', cycle[tweaks.sidebarStyle] || 'expanded');
  };
  const navigate = (target) => {
    setMobileNavOpen(false);
    setPage(target);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setToast('Signed out');
  };

  if (!authChecked) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--ink-3)', fontSize: 14 }}>Loading…</div>;
  }
  if (!user) {
    return <Login profile={profile} onSuccess={(u) => { setUser(u); setToast(`Welcome back, ${u.name.split(' ')[0]}`); }} />;
  }

  const navigateWithPrefill = (target, prefill) => {
    setBookingPrefill(prefill || null);
    navigate(target);
  };
  const props = {
    onNavigate: navigate, onToast: setToast,
    onNavigateWithPrefill: navigateWithPrefill,
    profile, onProfileSaved: setProfile,
  };
  const pageEl = {
    dashboard: <Dashboard {...props} />,
    rooms: <Rooms {...props} />,
    bookings: <Bookings {...props} prefill={bookingPrefill} onPrefillConsumed={() => setBookingPrefill(null)} />,
    coffee: <Coffee {...props} />,
    hall: <Hall {...props} />,
    expenses: <Expenses {...props} />,
    crm: <CRM {...props} />,
    reports: <Reports {...props} />,
    invoices: <Invoices {...props} />,
    settings: <Settings {...props} />,
  }[page] || <Dashboard {...props} />;

  return (
    <div className="app" data-sidebar={tweaks.sidebarStyle} data-mobile-nav={mobileNavOpen ? 'open' : 'closed'}>
      {mobileNavOpen && <div className="mobile-nav-backdrop" onClick={() => setMobileNavOpen(false)} />}
      <Sidebar
        active={page}
        onNavigate={navigate}
        onOpenBookingPage={() => { setMobileNavOpen(false); window.open('/booking.html', '_blank'); }}
        onOpenSearch={() => { setMobileNavOpen(false); setPaletteOpen(true); }}
        user={user}
        profile={profile}
      />
      <div className="main-area">
        <Topbar
          pageTitle={PAGE_TITLES[page]}
          onToggleSidebar={cycleSidebar}
          sidebarStyle={tweaks.sidebarStyle}
          theme={tweaks.theme}
          onToggleTheme={() => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark')}
          onLogout={handleLogout}
          onOpenSearch={() => setPaletteOpen(true)}
          user={user}
        />
        <div key={page} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {pageEl}
        </div>
      </div>

      <Toast message={toast} onDismiss={() => setToast('')} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onNavigate={navigate} />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Sidebar style" />
        <TweakRadio
          label="Layout"
          value={tweaks.sidebarStyle}
          onChange={v => setTweak('sidebarStyle', v)}
          options={[
            { value: 'expanded', label: 'Wide' },
            { value: 'collapsed', label: 'Icon' },
            { value: 'floating', label: 'Float' },
          ]}
        />
        <TweakSection label="Typography" />
        <TweakSelect
          label="Pairing"
          value={tweaks.fontPairing}
          onChange={v => setTweak('fontPairing', v)}
          options={Object.entries(FONT_PAIRINGS).map(([k, v]) => ({ value: k, label: v.label }))}
        />
        <TweakSection label="Theme" />
        <TweakRadio
          label="Mode"
          value={tweaks.theme}
          onChange={v => setTweak('theme', v)}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
          ]}
        />
      </TweaksPanel>
    </div>
  );
}
