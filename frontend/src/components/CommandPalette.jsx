import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { api } from '../api.js';

const QUICK_NAV = [
  { kind: 'nav', id: 'dashboard', label: 'Go to Dashboard', icon: 'home', page: 'dashboard' },
  { kind: 'nav', id: 'rooms', label: 'Go to Rooms', icon: 'bed', page: 'rooms' },
  { kind: 'nav', id: 'bookings', label: 'Go to Bookings', icon: 'calendar', page: 'bookings' },
  { kind: 'nav', id: 'coffee', label: 'Go to Coffee Shop', icon: 'coffee', page: 'coffee' },
  { kind: 'nav', id: 'hall', label: 'Go to Mini Hall', icon: 'users', page: 'hall' },
  { kind: 'nav', id: 'expenses', label: 'Go to Expenses', icon: 'receipt', page: 'expenses' },
  { kind: 'nav', id: 'crm', label: 'Go to Guests CRM', icon: 'user', page: 'crm' },
  { kind: 'nav', id: 'invoices', label: 'Go to Invoices', icon: 'file', page: 'invoices' },
  { kind: 'nav', id: 'reports', label: 'Go to Reports', icon: 'chart', page: 'reports' },
  { kind: 'nav', id: 'settings', label: 'Go to Settings', icon: 'settings', page: 'settings' },
];

const ICON_MAP = { room: 'bed', booking: 'calendar', guest: 'user', invoice: 'file', nav: 'arrowRight' };

export default function CommandPalette({ open, onClose, onNavigate }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setResults([]);
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const { results } = await api.search(q.trim());
        if (!cancelled) { setResults(results || []); setHighlight(0); }
      } catch { /* ignore */ }
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  const navMatches = QUICK_NAV.filter(n => !q || n.label.toLowerCase().includes(q.toLowerCase()));
  const allItems = q.trim() ? [...navMatches, ...results] : navMatches;

  const choose = (item) => {
    if (!item) return;
    if (item.kind === 'nav' || item.page) {
      onNavigate(item.page);
    }
    onClose();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); choose(allItems[highlight]); }
  };

  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--panel)', border: '1px solid var(--gold-line)', borderRadius: 14,
        width: 560, maxWidth: '92vw', maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 30px 80px rgba(0,0,0,.6)', overflow: 'hidden',
      }}>
        <div className="row gap-2" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <Icon name="search" size={16} color="var(--ink-3)" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search rooms, bookings, guests, invoices… or jump to a page"
            style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 15, outline: 'none' }}
          />
          <span className="kbd">esc</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {allItems.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>
              {q.trim() ? 'No matches.' : 'Type to search across the entire CRM.'}
            </div>
          )}
          {allItems.map((it, i) => (
            <div
              key={`${it.kind || 'r'}-${it.id || i}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(it)}
              style={{
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                background: highlight === i ? 'var(--gold-soft)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--bg-3)', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={it.icon || ICON_MAP[it.kind] || 'dot'} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</div>
                {it.sub && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.sub}</div>}
              </div>
              {it.kind && it.kind !== 'nav' && <span className="badge" style={{ fontSize: 10 }}>{it.kind}</span>}
            </div>
          ))}
        </div>
        <div className="row gap-3" style={{ padding: '8px 14px', borderTop: '1px solid var(--line)', fontSize: 11, color: 'var(--ink-4)' }}>
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  );
}
