import Icon from './Icon.jsx';
import { Avatar } from './primitives.jsx';

const NAV_GROUPS = [
  { label: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: 'home' }] },
  {
    label: 'Operations',
    items: [
      { id: 'rooms', label: 'Rooms', icon: 'bed' },
      { id: 'bookings', label: 'Bookings', icon: 'calendar' },
      { id: 'coffee', label: 'Coffee Shop', icon: 'coffee' },
      { id: 'hall', label: 'Mini Hall', icon: 'users' },
    ],
  },
  {
    label: 'Business',
    items: [
      { id: 'expenses', label: 'Expenses', icon: 'receipt' },
      { id: 'crm', label: 'Guests CRM', icon: 'user' },
      { id: 'invoices', label: 'Invoices', icon: 'file' },
      { id: 'reports', label: 'Reports', icon: 'chart' },
    ],
  },
  { label: 'Account', items: [{ id: 'settings', label: 'Settings', icon: 'settings' }] },
];

export default function Sidebar({ active, onNavigate, onOpenBookingPage, onOpenSearch, user }) {
  return (
    <aside className="sidebar">
      <div style={{ padding: '20px 16px 12px' }}>
        <div className="row gap-3" style={{ alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #e3c688, #8a6f3c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: '#15110c', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 18,
          }}>A</div>
          <div className="sidebar-brand-text" style={{ overflow: 'hidden' }}>
            <div className="display" style={{ fontSize: 17, lineHeight: 1.1, color: 'var(--ink)' }}>Aurelia</div>
            <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>Heritage · Pondi</div>
          </div>
        </div>
      </div>

      <div className="sidebar-search" style={{ padding: '0 16px 12px' }}>
        <div onClick={onOpenSearch} className="row" style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 10, padding: '7px 10px', gap: 8, cursor: 'pointer' }}>
          <Icon name="search" size={14} color="var(--ink-4)" />
          <span style={{ color: 'var(--ink-4)', fontSize: 12, flex: 1 }}>Search…</span>
          <span className="kbd">⌘K</span>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 18 }}>
            <div className="sidebar-section-label label" style={{ padding: '0 10px 8px' }}>{group.label}</div>
            <div className="col" style={{ gap: 2 }}>
              {group.items.map(item => (
                <div key={item.id} className="nav-item" data-active={active === item.id} onClick={() => onNavigate(item.id)}>
                  <span className="nav-icon"><Icon name={item.icon} size={17} /></span>
                  <span className="nav-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div style={{ padding: 12 }}>
        <button
          className="btn"
          style={{ width: '100%', justifyContent: 'flex-start', background: 'var(--gold-soft)', borderColor: 'var(--gold-line)', color: 'var(--gold-2)' }}
          onClick={onOpenBookingPage}
        >
          <Icon name="link" size={14} />
          <span className="nav-label">Public booking page</span>
        </button>
      </div>

      <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
        <div className="row gap-3" style={{ padding: '4px 4px' }}>
          <Avatar name={user?.name || 'Vikram Pillai'} size={32} />
          <div className="sidebar-user-text col" style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{user?.name || 'Vikram Pillai'}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>{user?.role === 'admin' ? 'General Manager' : (user?.role || 'Staff')}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
