import { useState } from 'react';
import Icon from './Icon.jsx';
import { Avatar } from './primitives.jsx';

const NOTIFICATIONS = [
  { id: 1, type: 'booking', title: 'New booking — Tom Whitfield', desc: 'Balcony King · 3 nights · ₹18,600', time: '12 min ago', unread: true },
  { id: 2, type: 'payment', title: 'Payment received', desc: '₹29,264 from Sarah & David Lin via UPI', time: '1 hr ago', unread: true },
  { id: 3, type: 'checkin', title: 'Check-in due', desc: 'Imran Shaikh arriving today at 14:00', time: '2 hr ago', unread: true },
  { id: 4, type: 'alert', title: 'Low stock — Coffee', desc: 'Blue Tokai house blend < 1kg', time: '5 hr ago', unread: false },
  { id: 5, type: 'review', title: '5-star review on Google', desc: 'Léa M. — "A true heritage gem."', time: 'Yesterday', unread: false },
];

export default function Topbar({ pageTitle, onToggleSidebar, sidebarStyle, theme, onToggleTheme, onLogout, onOpenSearch, user }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFICATIONS);
  const unread = notifs.filter(n => n.unread).length;
  const markAllRead = () => setNotifs(ns => ns.map(n => ({ ...n, unread: false })));

  return (
    <div className="topbar">
      <button className="btn btn-ghost btn-icon" onClick={onToggleSidebar} title="Toggle sidebar">
        <Icon name={sidebarStyle === 'collapsed' ? 'chevronRight' : 'list'} size={18} />
      </button>
      <div className="col" style={{ marginRight: 'auto', minWidth: 0 }}>
        <div className="display topbar-title" style={{ fontSize: 20, lineHeight: 1.1 }}>{pageTitle.title}</div>
        {pageTitle.sub && <div className="topbar-subtitle" style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{pageTitle.sub}</div>}
      </div>

      <div className="row gap-2">
        <button className="btn topbar-search" onClick={onOpenSearch} style={{ minWidth: 280, justifyContent: 'space-between', background: 'var(--bg-3)' }}>
          <span className="row gap-2">
            <Icon name="search" size={14} color="var(--ink-4)" />
            <span className="topbar-search-text" style={{ color: 'var(--ink-4)' }}>Search bookings, guests, rooms…</span>
          </span>
          <span className="kbd">⌘K</span>
        </button>

        <button className="btn btn-ghost btn-icon topbar-theme-toggle" onClick={onToggleTheme} title="Toggle theme">
          <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
        </button>

        <div style={{ position: 'relative' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setNotifOpen(v => !v)}>
            <Icon name="bell" size={18} />
            {unread > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 0 0 2px var(--bg)' }} />}
          </button>
          {notifOpen && (
            <>
              <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
              <div className="card-elevated topbar-notif-panel" style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                width: 360, maxWidth: 'calc(100vw - 24px)', zIndex: 51,
                boxShadow: '0 20px 60px rgba(0,0,0,.5)',
              }}>
                <div className="row" style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', justifyContent: 'space-between' }}>
                  <div className="display" style={{ fontSize: 16 }}>Notifications</div>
                  <button className="btn btn-ghost btn-sm" onClick={markAllRead} disabled={unread === 0}>Mark all read</button>
                </div>
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {notifs.map(n => (
                    <div key={n.id} className="row gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: n.type === 'payment' ? 'rgba(127,166,122,0.15)' : n.type === 'alert' ? 'rgba(212,168,71,0.15)' : 'var(--gold-soft)',
                        color: n.type === 'payment' ? '#9bc497' : n.type === 'alert' ? '#e8c266' : 'var(--gold-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon name={n.type === 'payment' ? 'check' : n.type === 'alert' ? 'flame' : n.type === 'review' ? 'star' : 'calendar'} size={14} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{n.title}</div>
                          {n.unread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{n.desc}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="vdivider" style={{ height: 24, alignSelf: 'center' }} />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setUserMenuOpen(v => !v)} style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <Avatar name={user?.name || 'Vikram Pillai'} size={32} />
          </button>
          {userMenuOpen && (
            <>
              <div onClick={() => setUserMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />
              <div className="card-elevated" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, zIndex: 51, padding: 8 }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', marginBottom: 4 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{user?.name || 'Vikram Pillai'}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{user?.email}</div>
                </div>
                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={onLogout}>
                  <Icon name="logout" size={14} />Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
