import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Metric, SectionHeader } from '../components/primitives.jsx';
import { ExpenseBars, OccupancyChart, RevenueChart, RevenueDonut } from '../components/charts.jsx';
import { api, downloadCSV, fmtINR, fmtINRk } from '../api.js';

export default function Reports({ onToast }) {
  const [period, setPeriod] = useState('30d');
  const [summary, setSummary] = useState(null);

  useEffect(() => { api.reports.summary().then(setSummary); }, []);
  if (!summary) return <div className="page" style={{ color: 'var(--ink-3)' }}>Loading reports…</div>;

  const periodSlice = (rows) => {
    if (!rows) return [];
    if (period === '7d') return rows.slice(-7);
    if (period === '30d') return rows.slice(-30);
    return rows;
  };
  const occupancySlice = (rows) => {
    if (!rows) return [];
    if (period === '7d') return rows.slice(-2);
    if (period === '30d') return rows.slice(-4);
    if (period === '90d') return rows.slice(-12);
    return rows;
  };
  const revenue = periodSlice(summary.revenue.revenue30d);
  const occupancy = occupancySlice(summary.revenue.occupancy12w);

  const totalRev = revenue.reduce((s, r) => s + r.total, 0) || summary.revenue.modules.reduce((s, m) => s + m.value, 0);
  const totalExp = summary.expenses.total;

  const exportCSV = () => {
    downloadCSV(`aurelia-revenue-${period}.csv`, revenue, ['day', 'rooms', 'cafe', 'hall', 'total']);
    onToast?.('Revenue exported as CSV');
  };
  const exportPDF = () => {
    onToast?.('Opening print dialog (use "Save as PDF")');
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="page page-enter">
      <SectionHeader
        eyebrow="Business"
        title="Reports & Analytics"
        sub="Drill into revenue, occupancy, and module performance"
        right={
          <div className="row gap-2">
            <div className="seg">
              {['7d', '30d', '90d', 'ytd'].map(p => (
                <button key={p} data-active={period === p} onClick={() => setPeriod(p)}>{p.toUpperCase()}</button>
              ))}
            </div>
            <button className="btn" onClick={exportPDF}><Icon name="download" size={14} />PDF</button>
            <button className="btn" onClick={exportCSV}><Icon name="download" size={14} />CSV</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <Metric label="Total revenue" value={fmtINRk(totalRev)} sub="Month-to-date" trend={11} accent="var(--gold-2)" />
        <Metric label="Total expenses" value={fmtINRk(totalExp)} sub={`${summary.expenses.breakdown.length} categories`} trend={-3} />
        <Metric label="Net profit" value={fmtINRk(totalRev - totalExp)} sub={`${totalRev ? Math.round(((totalRev - totalExp) / totalRev) * 100) : 0}% margin`} trend={14} accent="#9bc497" />
        <Metric label="Avg occupancy" value="68%" sub="12-week trailing" trend={6} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="display" style={{ fontSize: 18, marginBottom: 16 }}>Revenue by module</div>
          <RevenueChart data={revenue} height={300} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="display" style={{ fontSize: 18, marginBottom: 6 }}>Module mix</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 12 }}>{fmtINR(totalRev)} total</div>
          <RevenueDonut data={summary.revenue.modules} height={220} />
          <div className="col gap-2" style={{ marginTop: 16 }}>
            {summary.revenue.modules.map(m => (
              <div key={m.name} className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                <div className="row gap-2"><span style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} /><span style={{ color: 'var(--ink-2)' }}>{m.name}</span></div>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{fmtINRk(m.value)} <span style={{ color: 'var(--ink-4)' }}>· {totalRev ? Math.round((m.value / totalRev) * 100) : 0}%</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="display" style={{ fontSize: 18, marginBottom: 16 }}>Occupancy, last 12 weeks</div>
          <OccupancyChart data={occupancy} height={240} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="display" style={{ fontSize: 18, marginBottom: 16 }}>Expense breakdown</div>
          <ExpenseBars data={summary.expenses.breakdown.map(b => ({ name: b.name, value: b.value }))} height={240} />
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="display" style={{ fontSize: 18 }}>Saved reports</div>
          <button className="btn btn-sm" onClick={() => onToast?.('Custom report builder coming soon')}><Icon name="plus" size={12} />New report</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { name: 'Monthly P&L', desc: 'Revenue, expenses, profit by category', updated: '2 hr ago', export: () => downloadCSV('aurelia-pnl.csv', summary.expenses.breakdown.map(b => ({ category: b.name, amount: b.value })), ['category', 'amount']) },
            { name: 'Occupancy & ADR', desc: 'Daily occupancy, average daily rate, RevPAR', updated: 'Yesterday', export: () => downloadCSV('aurelia-occupancy.csv', summary.revenue.occupancy12w, ['week', 'occupancy']) },
            { name: 'Café performance', desc: 'Item-wise sales, peak hours, gross margin', updated: '2 days ago', export: exportCSV },
            { name: 'Guest cohorts', desc: 'Repeat rate, lifetime value, source mix', updated: '1 week ago', export: () => downloadCSV('aurelia-sources.csv', summary.bookingSources, ['name', 'value']) },
            { name: 'Expense audit', desc: 'Vendor spend, payment methods, anomalies', updated: '1 week ago', export: () => downloadCSV('aurelia-expenses-summary.csv', summary.expenses.breakdown, ['name', 'value']) },
            { name: 'Hall pipeline', desc: 'Confirmed events, advance collected, conversion', updated: '2 weeks ago', export: exportCSV },
          ].map(r => (
            <div key={r.name} className="card" style={{ padding: 16, cursor: 'pointer' }} onClick={() => { r.export(); onToast?.(`${r.name} exported`); }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{r.name}</div>
                <Icon name="arrowUpRight" size={14} color="var(--ink-4)" />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.5 }}>{r.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 10 }}>Updated {r.updated}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
