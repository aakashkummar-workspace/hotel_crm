import { useEffect, useRef, useState } from 'react';

const STYLES = `
  .twk-fab{position:fixed;right:20px;bottom:20px;z-index:99;width:48px;height:48px;border-radius:50%;
    background:var(--panel);border:1px solid var(--gold-line);color:var(--gold-2);
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    box-shadow:0 12px 32px rgba(0,0,0,.4)}
  .twk-fab:hover{background:var(--gold-soft)}
  .twk-panel{position:fixed;right:20px;bottom:80px;z-index:100;width:280px;
    background:var(--panel);color:var(--ink);
    border:1px solid var(--gold-line);border-radius:14px;
    box-shadow:0 24px 60px rgba(0,0,0,.45);
    font:12px/1.4 var(--font-body);overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:12px 14px;border-bottom:1px solid var(--line)}
  .twk-hd b{font-size:13px;font-weight:600;letter-spacing:.01em;font-family:var(--font-display);font-weight:500}
  .twk-x{appearance:none;border:0;background:transparent;color:var(--ink-3);
    width:22px;height:22px;border-radius:6px;cursor:pointer;font-size:14px}
  .twk-x:hover{background:var(--bg-3);color:var(--ink)}
  .twk-body{padding:12px 14px;display:flex;flex-direction:column;gap:14px}
  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-4)}
  .twk-row{display:flex;flex-direction:column;gap:6px}
  .twk-lbl{font-size:11px;color:var(--ink-3)}
  .twk-seg{display:flex;background:var(--bg-3);border:1px solid var(--line-2);border-radius:8px;padding:2px;gap:2px}
  .twk-seg button{flex:1;border:0;background:transparent;color:var(--ink-3);font:inherit;
    font-weight:500;padding:6px 8px;border-radius:6px;cursor:pointer}
  .twk-seg button[data-on="1"]{background:var(--panel);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.2)}
  .twk-select{appearance:none;width:100%;padding:7px 10px;border:1px solid var(--line-2);
    background:var(--bg-3);color:var(--ink);border-radius:8px;font:inherit}
`;

export function TweakSection({ label }) { return <div className="twk-sect">{label}</div>; }

export function TweakRadio({ label, value, options, onChange }) {
  return (
    <div className="twk-row">
      <div className="twk-lbl">{label}</div>
      <div className="twk-seg">
        {options.map(o => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <button key={v} type="button" data-on={v === value ? '1' : '0'} onClick={() => onChange(v)}>{l}</button>;
        })}
      </div>
    </div>
  );
}

export function TweakSelect({ label, value, options, onChange }) {
  return (
    <div className="twk-row">
      <div className="twk-lbl">{label}</div>
      <select className="twk-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => {
          const v = typeof o === 'object' ? o.value : o;
          const l = typeof o === 'object' ? o.label : o;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
    </div>
  );
}

export function TweaksPanel({ title = 'Tweaks', children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '.' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen(v => !v); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <style>{STYLES}</style>
      <button className="twk-fab" onClick={() => setOpen(v => !v)} title="Tweaks (⌘.)" aria-label="Open tweaks">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>
      {open && (
        <div ref={ref} className="twk-panel">
          <div className="twk-hd">
            <b>{title}</b>
            <button className="twk-x" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          <div className="twk-body">{children}</div>
        </div>
      )}
    </>
  );
}
