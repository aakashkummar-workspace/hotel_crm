import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { fmtINR } from '../api.js';

function ChartTooltip({ x, y, items, label, fmt }) {
  if (x == null) return null;
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', left: x + 12, top: y + 12, pointerEvents: 'none',
      background: 'var(--panel)', border: '1px solid var(--gold-line)',
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: '0 12px 32px rgba(0,0,0,.4)', zIndex: 9999, minWidth: 140,
    }}>
      {label != null && <div style={{ color: 'var(--ink-3)', marginBottom: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>}
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--ink-3)', textTransform: 'capitalize', flex: 1 }}>{it.name}</span>
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{fmt ? fmt(it.value) : it.value}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}

function useTooltip() {
  const [tip, setTip] = useState({ x: null, y: null, items: [], label: null });
  return [tip, setTip];
}

function useResizeWidth(initial = 600) {
  const ref = useRef(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function RevenueChart({ data, height = 280 }) {
  const [ref, w] = useResizeWidth(800);
  const [tip, setTip] = useTooltip();
  if (!data || data.length === 0) return <div ref={ref} style={{ height }} />;

  const padL = 44, padR = 12, padT = 14, padB = 28;
  const W = Math.max(300, w), H = height;
  const iw = W - padL - padR, ih = H - padT - padB;
  const series = ['rooms', 'cafe', 'hall'];
  const colors = { rooms: '#c9a96e', cafe: '#e3c688', hall: '#7fa67a' };
  const stacked = data.map(d => {
    let acc = 0;
    const out = { day: d.day };
    series.forEach(s => { out[s + '0'] = acc; acc += d[s] || 0; out[s + '1'] = acc; });
    out.total = acc;
    return out;
  });
  const maxY = Math.max(...stacked.map(d => d.total)) * 1.1 || 1;
  const x = i => padL + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = v => padT + ih - (v / maxY) * ih;

  const path = (lo, hi) => {
    let top = '', bot = '';
    data.forEach((_, i) => { top += `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(stacked[i][hi])} `; });
    for (let i = data.length - 1; i >= 0; i--) bot += `L ${x(i)} ${y(stacked[i][lo])} `;
    return top + bot + 'Z';
  };
  const linePath = (key) => data.map((_, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(stacked[i][key])}`).join(' ');

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (maxY / yTicks) * i);

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const ratio = (px - padL) / iw;
    const i = Math.max(0, Math.min(data.length - 1, Math.round(ratio * (data.length - 1))));
    setTip({
      x: e.clientX, y: e.clientY, label: data[i].day,
      items: series.map(s => ({ name: s, value: data[i][s] || 0, color: colors[s] })),
    });
  };

  return (
    <div ref={ref} style={{ width: '100%', height, position: 'relative' }}
         onMouseMove={onMove} onMouseLeave={() => setTip({ x: null, y: null, items: [] })}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <defs>
          {series.map(s => (
            <linearGradient key={s} id={`grad-${s}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[s]} stopOpacity={s === 'rooms' ? 0.55 : 0.4} />
              <stop offset="100%" stopColor={colors[s]} stopOpacity="0.05" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fill="var(--ink-4)" fontSize="11">{(t / 1000).toFixed(0)}k</text>
          </g>
        ))}
        {data.map((d, i) => i % Math.ceil(data.length / 8) === 0 && (
          <text key={i} x={x(i)} y={H - padB + 18} textAnchor="middle" fill="var(--ink-4)" fontSize="11">{d.day}</text>
        ))}
        {series.map(s => <path key={s} d={path(s + '0', s + '1')} fill={`url(#grad-${s})`} />)}
        {series.map(s => <path key={s} d={linePath(s + '1')} stroke={colors[s]} strokeWidth="1.6" fill="none" />)}
      </svg>
      <ChartTooltip {...tip} fmt={(v) => fmtINR(v)} />
    </div>
  );
}

export function OccupancyChart({ data, height = 220 }) {
  const [ref, w] = useResizeWidth(600);
  const [tip, setTip] = useTooltip();
  if (!data || data.length === 0) return <div ref={ref} style={{ height }} />;

  const padL = 36, padR = 12, padT = 12, padB = 24;
  const W = Math.max(240, w), H = height;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maxY = 100;
  const bw = (iw / data.length) * 0.6;
  const gap = (iw / data.length) * 0.4;

  return (
    <div ref={ref} style={{ width: '100%', height, position: 'relative' }}
         onMouseLeave={() => setTip({ x: null, y: null, items: [] })}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {[0, 25, 50, 75, 100].map(t => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={padT + ih - (t / maxY) * ih} y2={padT + ih - (t / maxY) * ih} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={padL - 8} y={padT + ih - (t / maxY) * ih + 4} textAnchor="end" fill="var(--ink-4)" fontSize="11">{t}%</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = padL + i * (iw / data.length) + gap / 2;
          const h = (d.occupancy / maxY) * ih;
          const y = padT + ih - h;
          return (
            <g key={i} onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, label: d.week, items: [{ name: 'occupancy', value: d.occupancy + '%', color: '#c9a96e' }] })}>
              <rect x={x} y={y} width={bw} height={h} fill="#c9a96e" rx="4" />
              <text x={x + bw / 2} y={H - padB + 16} textAnchor="middle" fill="var(--ink-4)" fontSize="11">{d.week}</text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip {...tip} fmt={(v) => v} />
    </div>
  );
}

export function RevenueDonut({ data, height = 220 }) {
  const [ref, w] = useResizeWidth(220);
  const [tip, setTip] = useTooltip();
  if (!data || data.length === 0) return <div ref={ref} style={{ height }} />;
  const W = Math.max(160, w), H = height;
  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 8;
  const r = R * 0.66;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let a0 = -Math.PI / 2;
  const arcs = data.map((d) => {
    const a1 = a0 + (d.value / total) * Math.PI * 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const xi0 = cx + r * Math.cos(a0), yi0 = cy + r * Math.sin(a0);
    const xi1 = cx + r * Math.cos(a1), yi1 = cy + r * Math.sin(a1);
    const path = `M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi0} ${yi0} Z`;
    const out = { ...d, path };
    a0 = a1;
    return out;
  });

  return (
    <div ref={ref} style={{ width: '100%', height, position: 'relative' }}
         onMouseLeave={() => setTip({ x: null, y: null, items: [] })}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} stroke="var(--panel)" strokeWidth="2"
            onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, items: [{ name: a.name, value: a.value, color: a.color }] })} />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--ink-3)" fontSize="11" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--ink)" fontSize="18" fontFamily="var(--font-display)">{fmtINR(total)}</text>
      </svg>
      <ChartTooltip {...tip} fmt={(v) => fmtINR(v)} />
    </div>
  );
}

export function ExpenseBars({ data, height = 220 }) {
  const [ref, w] = useResizeWidth(400);
  const [tip, setTip] = useTooltip();
  if (!data || data.length === 0) return <div ref={ref} style={{ height }} />;
  const padL = 110, padR = 14, padT = 8, padB = 8;
  const W = Math.max(260, w), H = height;
  const iw = W - padL - padR, ih = H - padT - padB;
  const maxX = Math.max(...data.map(d => d.value)) * 1.1 || 1;
  const rowH = ih / data.length;

  return (
    <div ref={ref} style={{ width: '100%', height, position: 'relative' }}
         onMouseLeave={() => setTip({ x: null, y: null, items: [] })}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {data.map((d, i) => {
          const y = padT + i * rowH + rowH * 0.2;
          const bh = rowH * 0.6;
          const bw = (d.value / maxX) * iw;
          return (
            <g key={i} onMouseMove={(e) => setTip({ x: e.clientX, y: e.clientY, items: [{ name: d.name, value: d.value, color: d.color || '#c9a96e' }] })}>
              <text x={padL - 10} y={y + bh / 2 + 4} textAnchor="end" fill="var(--ink-2)" fontSize="12">{d.name}</text>
              <rect x={padL} y={y} width={bw} height={bh} fill={d.color || '#c9a96e'} rx="4" />
              <text x={padL + bw + 6} y={y + bh / 2 + 4} fill="var(--ink-3)" fontSize="11">{fmtINR(d.value)}</text>
            </g>
          );
        })}
      </svg>
      <ChartTooltip {...tip} fmt={(v) => fmtINR(v)} />
    </div>
  );
}
