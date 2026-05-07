import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog, Menu, Metric, Modal, Pill, SectionHeader } from '../components/primitives.jsx';
import { ExpenseBars } from '../components/charts.jsx';
import { api, downloadCSV, fmtINR, fmtINRk } from '../api.js';

const CATEGORIES = ['Salaries', 'Maintenance', 'Utilities', 'Cleaning', 'Coffee Purchases', 'Misc'];
const blank = { date: new Date().toISOString().slice(0, 10), category: 'Utilities', vendor: '', amount: '', method: 'UPI', note: '' };

function WaterfallRow({ label, value, positive }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: 'var(--ink-2)' }}>{label}</span>
      <span style={{ color: positive ? '#9bc497' : 'var(--ink-2)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
        {value >= 0 ? '+' : ''}{fmtINR(value)}
      </span>
    </div>
  );
}

export default function Expenses({ onToast }) {
  const [showNew, setShowNew] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [catFilter, setCatFilter] = useState('all');
  const [confirmDel, setConfirmDel] = useState(null);

  const refresh = () => api.expenses.list().then(setExpenses);
  useEffect(() => { refresh(); }, []);

  const visible = catFilter === 'all' ? expenses : expenses.filter(e => e.category === catFilter);
  const total = visible.reduce((s, e) => s + e.amount, 0);
  const byCat = CATEGORIES.map(c => ({ name: c, value: expenses.filter(e => e.category === c).reduce((s, e) => s + e.amount, 0) })).filter(c => c.value > 0);
  const largestCat = byCat.length ? byCat.reduce((a, b) => a.value > b.value ? a : b) : null;

  const exportCSV = () => {
    downloadCSV(`aurelia-expenses-${new Date().toISOString().slice(0, 10)}.csv`, visible, ['id', 'date', 'category', 'vendor', 'amount', 'method', 'note']);
    onToast?.(`Exported ${visible.length} expense${visible.length !== 1 ? 's' : ''}`);
  };

  const deleteExpense = async () => {
    if (!confirmDel) return;
    try {
      await api.expenses.remove(confirmDel.id);
      onToast?.('Expense deleted');
      setConfirmDel(null);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not delete'); }
  };

  const submit = async () => {
    if (!form.vendor || !form.amount) { onToast('Vendor and amount are required'); return; }
    setBusy(true);
    try {
      await api.expenses.create({ ...form, amount: Number(form.amount), date: form.date });
      onToast('Expense recorded');
      setShowNew(false);
      setForm(blank);
      refresh();
    } catch (e) { onToast(e.message || 'Could not record expense'); }
    finally { setBusy(false); }
  };

  return (
    <div className="page page-enter">
      <SectionHeader
        eyebrow="Business"
        title="Expenses"
        sub={`${fmtINR(total)} this month across ${byCat.length} categories`}
        right={
          <div className="row gap-2">
            <button className="btn" onClick={exportCSV}><Icon name="download" size={14} />Export</button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={14} strokeWidth={2.4} />Add expense</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <Metric label="This month" value={fmtINRk(total)} sub={`${expenses.length} entries`} trend={-3} />
        <Metric label="Largest category" value={largestCat?.name || '—'} sub={largestCat ? `${fmtINR(largestCat.value)} · ${total ? Math.round((largestCat.value / total) * 100) : 0}% of spend` : ''} accent="var(--gold-2)" />
        <Metric label="Avg / day" value={fmtINR(Math.round(total / Math.max(1, expenses.length)))} sub="Per entry" trend={5} />
        <Metric label="Pending bills" value="2" sub="Due this week" accent="#e8c266" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="display" style={{ fontSize: 18, marginBottom: 18 }}>By category</div>
          <ExpenseBars data={byCat} height={240} />
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div className="display" style={{ fontSize: 18, marginBottom: 18 }}>Profit waterfall</div>
          <div className="col gap-3">
            <WaterfallRow label="Room revenue" value={842000} positive />
            <WaterfallRow label="Coffee shop" value={248000} positive />
            <WaterfallRow label="Mini Hall" value={192000} positive />
            <div className="divider" />
            {byCat.map(c => <WaterfallRow key={c.name} label={`– ${c.name}`} value={-c.value} />)}
            <div className="divider" />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="display" style={{ fontSize: 18 }}>Net profit</div>
              <div className="display" style={{ fontSize: 22, color: '#9bc497' }}>{fmtINR(842000 + 248000 + 192000 - total)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 17 }}>All expenses {catFilter !== 'all' && <span style={{ color: 'var(--ink-4)', fontFamily: 'var(--font-body)', fontSize: 13 }}>· {catFilter}</span>}</div>
          <select className="input" style={{ width: 180, padding: '6px 10px', fontSize: 12 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <table className="table">
          <thead><tr><th>Date</th><th>Vendor</th><th>Category</th><th>Method</th><th>Note</th><th style={{ textAlign: 'right' }}>Amount</th><th /></tr></thead>
          <tbody>
            {visible.map(e => (
              <tr key={e.id}>
                <td style={{ color: 'var(--ink-3)' }}>{e.date}</td>
                <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{e.vendor}</td>
                <td><Pill>{e.category}</Pill></td>
                <td>{e.method}</td>
                <td style={{ color: 'var(--ink-3)' }}>{e.note}</td>
                <td style={{ textAlign: 'right', color: 'var(--ink)', fontWeight: 500 }}>{fmtINR(e.amount)}</td>
                <td>
                  <Menu trigger={<button className="btn btn-ghost btn-icon"><Icon name="more" size={14} /></button>}
                    items={[{ label: 'Delete', icon: 'trash', danger: true, onClick: () => setConfirmDel(e) }]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No expenses match.</div>}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add expense" width={480}
        footer={<><button className="btn btn-ghost" onClick={() => setShowNew(false)} disabled={busy}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={busy}><Icon name="check" size={14} strokeWidth={2.4} />Save expense</button></>}>
        <div className="col gap-4">
          <div className="row gap-3">
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Vendor *</div><input className="input" value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Date</div><input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Category</div>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            </div>
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Method</div>
              <select className="input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}><option>Bank</option><option>UPI</option><option>Cash</option><option>Card</option></select>
            </div>
          </div>
          <div><div className="label" style={{ marginBottom: 6 }}>Amount (₹) *</div><input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><div className="label" style={{ marginBottom: 6 }}>Note</div><textarea className="input" rows="2" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel}
        title="Delete expense?"
        body={confirmDel ? `${confirmDel.vendor} (${fmtINR(confirmDel.amount)}) will be permanently removed.` : ''}
        confirmLabel="Delete" danger
        onCancel={() => setConfirmDel(null)} onConfirm={deleteExpense} />
    </div>
  );
}
