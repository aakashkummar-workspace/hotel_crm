import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

export function Pill({ children, tone = 'neutral', icon }) {
  const cls = tone === 'gold' ? 'badge-gold'
    : tone === 'green' ? 'badge-green'
    : tone === 'red' ? 'badge-red'
    : tone === 'blue' ? 'badge-blue'
    : tone === 'amber' ? 'badge-amber'
    : '';
  return (
    <span className={`badge ${cls}`}>
      {icon ? <Icon name={icon} size={11} strokeWidth={2} /> : null}
      {children}
    </span>
  );
}

export function StatusPill({ status }) {
  const map = {
    available: { tone: 'green', label: 'Available' },
    occupied: { tone: 'red', label: 'Occupied' },
    reserved: { tone: 'amber', label: 'Reserved' },
    cleaning: { tone: 'blue', label: 'Cleaning' },
    confirmed: { tone: 'green', label: 'Confirmed' },
    'checked-in': { tone: 'gold', label: 'Checked-in' },
    pending: { tone: 'amber', label: 'Pending' },
    paid: { tone: 'green', label: 'Paid' },
    partial: { tone: 'amber', label: 'Partial' },
    advance: { tone: 'blue', label: 'Advance' },
    vip: { tone: 'gold', label: 'VIP' },
    regular: { tone: 'blue', label: 'Regular' },
    new: { tone: 'neutral', label: 'New' },
  };
  const m = map[status] || { tone: 'neutral', label: status };
  const cls = m.tone === 'gold' ? 'badge-gold' : m.tone === 'green' ? 'badge-green' : m.tone === 'red' ? 'badge-red' : m.tone === 'blue' ? 'badge-blue' : m.tone === 'amber' ? 'badge-amber' : '';
  const dotStatus = status === 'checked-in' ? 'occupied' : status === 'paid' ? 'available' : status === 'confirmed' ? 'available' : status === 'pending' ? 'reserved' : status === 'partial' ? 'reserved' : status === 'advance' ? 'cleaning' : status === 'vip' ? 'reserved' : status === 'regular' ? 'cleaning' : status === 'new' ? 'available' : status;
  return (
    <span className={`badge ${cls}`}>
      <span className={`status-dot status-${dotStatus}`} style={{ width: 6, height: 6 }} />
      {m.label}
    </span>
  );
}

export function Avatar({ name, size = 32, tone = 'gold' }) {
  const initials = (name || '').split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const bg = tone === 'gold' ? 'linear-gradient(135deg, #c9a96e, #8a6f3c)'
    : tone === 'warm' ? 'linear-gradient(135deg, #c97a6e, #8a3a30)'
    : tone === 'green' ? 'linear-gradient(135deg, #7fa67a, #4a6845)'
    : 'linear-gradient(135deg, #7a93c9, #3a5288)';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg,
      color: '#1a1208',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600,
      fontSize: size * 0.38,
      flexShrink: 0,
      fontFamily: 'var(--font-body)',
    }}>{initials}</div>
  );
}

export function SectionHeader({ eyebrow, title, sub, right }) {
  return (
    <div className="section-header">
      <div className="section-header-text">
        {eyebrow && <div className="label" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <div className="display section-header-title">{title}</div>
        {sub && <div className="section-header-sub">{sub}</div>}
      </div>
      {right && <div className="section-header-right">{right}</div>}
    </div>
  );
}

export function Sparkline({ data, color = 'var(--gold)', height = 36 }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const points = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${height - ((v - min) / range) * height}`).join(' ');
  const area = `0,${height} ${points} ${w},${height}`;
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Metric({ label, value, sub, trend, accent, sparkData }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="row" style={{ alignItems: 'flex-end', gap: 10 }}>
        <div className="metric-value" style={{ color: accent || 'var(--ink)' }}>{value}</div>
        {trend != null && (
          <div className="row gap-1" style={{
            color: trend >= 0 ? '#9bc497' : '#db9088',
            fontSize: 12, fontWeight: 500, marginBottom: 8, gap: 3,
          }}>
            <Icon name={trend >= 0 ? 'trendUp' : 'trendDown'} size={12} strokeWidth={2} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      {sub && <div className="metric-sub">{sub}</div>}
      {sparkData && (
        <div style={{ marginTop: 14, height: 36 }}>
          <Sparkline data={sparkData} />
        </div>
      )}
    </div>
  );
}

export function Empty({ icon, title, desc, action }) {
  return (
    <div className="col" style={{ alignItems: 'center', padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)', marginBottom: 14 }}>
        <Icon name={icon} size={22} />
      </div>
      <div className="display" style={{ fontSize: 20, marginBottom: 4 }}>{title}</div>
      <div style={{ color: 'var(--ink-3)', maxWidth: 360 }}>{desc}</div>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, width = 520, footer }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'transparent',
      zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'pageEnter .2s',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--panel)', border: '1px solid var(--line)',
        borderRadius: 'var(--radius-lg)', width, maxWidth: '92vw',
        maxHeight: '88vh', overflow: 'hidden',
        boxShadow: '0 30px 80px rgba(0,0,0,.6)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div className="row" style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 20 }}>{title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div className="row gap-3" style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, width = 480, footer }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'transparent',
      zIndex: 200,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', right: 0, top: 0, bottom: 0,
        width, maxWidth: '92vw',
        background: 'var(--panel)', borderLeft: '1px solid var(--line)',
        animation: 'drawerIn .3s cubic-bezier(.2,.7,.2,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div className="row" style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 22 }}>{title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>{children}</div>
        {footer && <div className="row gap-3" style={{ padding: '14px 22px', borderTop: '1px solid var(--line)', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 3200);
    return () => clearTimeout(t);
  }, [message, onDismiss]);
  if (!message) return null;
  return (
    <div className="toast">
      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gold-soft)', color: 'var(--gold-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={14} strokeWidth={2.4} />
      </div>
      <div>{message}</div>
    </div>
  );
}

export function ConfirmDialog({ open, title = 'Are you sure?', body, confirmLabel = 'Confirm', danger = false, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onCancel} title={title} width={420}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn' : 'btn btn-primary'} style={danger ? { background: 'rgba(201,122,110,0.18)', borderColor: 'rgba(201,122,110,0.5)', color: '#db9088' } : undefined} onClick={onConfirm}>
            <Icon name={danger ? 'trash' : 'check'} size={14} strokeWidth={2.4} />{confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>{body}</div>
    </Modal>
  );
}

export function Menu({ trigger, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <span onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}>{trigger}</span>
      {open && (
        <div className="card-elevated" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
          minWidth: 180, zIndex: 60, padding: 6,
          boxShadow: '0 12px 32px rgba(0,0,0,.4)'
        }}>
          {items.filter(Boolean).map((it, i) => (
            <div key={i}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick?.(); }}
              style={{
                padding: '8px 12px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
                color: it.danger ? '#db9088' : 'var(--ink-2)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {it.icon && <Icon name={it.icon} size={13} />}{it.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="row gap-1" style={{ borderBottom: '1px solid var(--line)', gap: 4 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: '11px 14px',
          background: 'transparent',
          border: 'none',
          color: active === t.id ? 'var(--ink)' : 'var(--ink-3)',
          fontSize: 13,
          fontWeight: 500,
          position: 'relative',
          transition: 'color .15s',
        }}>
          {t.label}
          {t.count != null && <span style={{ marginLeft: 6, color: 'var(--ink-4)', fontSize: 11 }}>{t.count}</span>}
          {active === t.id && (
            <div style={{ position: 'absolute', bottom: -1, left: 8, right: 8, height: 2, background: 'var(--gold)', borderRadius: 2 }} />
          )}
        </button>
      ))}
    </div>
  );
}
