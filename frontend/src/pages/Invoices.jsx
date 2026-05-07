import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Drawer, Metric, Modal, SectionHeader, StatusPill } from '../components/primitives.jsx';
import { api, downloadCSV, fmtINR, fmtINRk } from '../api.js';

const blankInv = { guest: '', date: new Date().toISOString().slice(0, 10), amount: '', tax: '', status: 'pending', method: '—' };

function InvoiceView({ inv, profile }) {
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'linear-gradient(135deg, #e3c688, #8a6f3c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#15110c', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600, marginBottom: 12,
          }}>{(profile?.name || 'A')[0]}</div>
          <div className="display" style={{ fontSize: 20 }}>{profile?.name || 'Aurelia'}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{profile?.tagline}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4 }}>{profile?.location} · GSTIN {profile?.gstin}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="label">Invoice</div>
          <div className="display" style={{ fontSize: 22 }}>{inv.id}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>Issued {inv.date}</div>
          <div style={{ marginTop: 10 }}><StatusPill status={inv.status} /></div>
        </div>
      </div>

      <div className="row gap-4" style={{ padding: 16, background: 'var(--bg-3)', borderRadius: 12, marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 6 }}>Bill to</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{inv.guest}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 6 }}>Payment</div>
          <div style={{ fontSize: 14, color: 'var(--ink)' }}>{inv.method}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Due on receipt</div>
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }} />
        <div className="col gap-2" style={{ width: 220 }}>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)' }}><span>Subtotal</span><span>{fmtINR(inv.amount)}</span></div>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)' }}><span>GST</span><span>{fmtINR(inv.tax)}</span></div>
          <div className="divider" style={{ margin: '6px 0' }} />
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="display" style={{ fontSize: 18 }}>Total</span>
            <span className="display" style={{ fontSize: 22, color: 'var(--gold-2)' }}>{fmtINR(inv.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Invoices({ onToast }) {
  const [invoices, setInvoices] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(blankInv);
  const [busy, setBusy] = useState(false);

  const refresh = () => api.invoices.list().then(setInvoices);
  useEffect(() => { refresh(); api.settings.profile().then(setProfile); }, []);

  const filtered = invoices.filter(i => statusFilter === 'all' || i.status === statusFilter);
  const total = invoices.reduce((s, i) => s + i.total, 0);
  const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const pending = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);

  const exportCSV = () => {
    downloadCSV(`aurelia-invoices-${new Date().toISOString().slice(0, 10)}.csv`, filtered, ['id', 'guest', 'date', 'amount', 'tax', 'total', 'status', 'method']);
    onToast?.(`Exported ${filtered.length} invoice${filtered.length !== 1 ? 's' : ''}`);
  };

  const submitInvoice = async () => {
    if (!form.guest || !form.amount) { onToast?.('Guest and amount are required'); return; }
    setBusy(true);
    try {
      const amount = Number(form.amount);
      const tax = Number(form.tax || Math.round(amount * 0.18));
      const created = await api.invoices.create({
        guest: form.guest, date: form.date, amount, tax, total: amount + tax,
        status: form.status, method: form.method,
      });
      onToast?.(`${created.id} created`);
      setShowNew(false);
      setForm(blankInv);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not create invoice'); }
    finally { setBusy(false); }
  };

  const markPaid = async (inv) => {
    try {
      await api.invoices.update(inv.id, { ...inv, status: 'paid' });
      onToast?.(`${inv.id} marked paid`);
      setSelected({ ...inv, status: 'paid' });
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not update'); }
  };

  const printInvoice = () => {
    onToast?.('Opening print dialog (use "Save as PDF")');
    setTimeout(() => window.print(), 200);
  };

  return (
    <div className="page page-enter">
      <SectionHeader
        eyebrow="Business"
        title="Invoices & Payments"
        sub={`${invoices.length} invoices · ${fmtINR(pending)} pending collection`}
        right={
          <div className="row gap-2">
            <button className="btn" onClick={exportCSV}><Icon name="download" size={14} />Export</button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={14} strokeWidth={2.4} />New invoice</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <Metric label="Total billed" value={fmtINRk(total)} sub="Month-to-date" trend={9} />
        <Metric label="Collected" value={fmtINRk(paid)} sub={`${total ? Math.round((paid / total) * 100) : 0}% of total`} accent="#9bc497" />
        <Metric label="Pending" value={fmtINRk(pending)} sub={`${invoices.filter(i => i.status !== 'paid').length} invoices`} accent="#e8c266" />
        <Metric label="Avg invoice" value={fmtINR(invoices.length ? Math.round(total / invoices.length) : 0)} sub="Including tax" />
      </div>

      <div className="card">
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 17 }}>All invoices</div>
          <div className="row gap-2">
            {['all', 'paid', 'pending', 'partial', 'advance'].map(s => (
              <button key={s} className="btn btn-sm" onClick={() => setStatusFilter(s)}
                style={statusFilter === s ? { background: 'var(--gold-soft)', borderColor: 'var(--gold-line)', color: 'var(--gold-2)' } : {}}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Invoice</th><th>Guest</th><th>Date</th>
              <th style={{ textAlign: 'right' }}>Subtotal</th>
              <th style={{ textAlign: 'right' }}>Tax</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Method</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} onClick={() => setSelected(inv)} style={{ cursor: 'pointer' }}>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-2)' }}>{inv.id}</td>
                <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{inv.guest}</td>
                <td style={{ color: 'var(--ink-3)' }}>{inv.date}</td>
                <td style={{ textAlign: 'right' }}>{fmtINR(inv.amount)}</td>
                <td style={{ textAlign: 'right', color: 'var(--ink-3)' }}>{fmtINR(inv.tax)}</td>
                <td style={{ textAlign: 'right', color: 'var(--ink)', fontWeight: 500 }}>{fmtINR(inv.total)}</td>
                <td>{inv.method}</td>
                <td><StatusPill status={inv.status} /></td>
                <td><Icon name="chevronRight" size={14} color="var(--ink-4)" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.id || ''} width={520}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
          {selected?.status !== 'paid' && <button className="btn" onClick={() => markPaid(selected)}><Icon name="check" size={14} />Mark paid</button>}
          <button className="btn" onClick={printInvoice}><Icon name="download" size={14} />Download PDF</button>
          <button className="btn btn-primary" onClick={() => { setSelected(null); onToast('Invoice sent to guest'); }}><Icon name="mail" size={14} />Send</button>
        </>}>
        {selected && <InvoiceView inv={selected} profile={profile} />}
      </Drawer>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New invoice" width={500}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowNew(false)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submitInvoice} disabled={busy}>
            <Icon name="check" size={14} strokeWidth={2.4} />{busy ? 'Creating…' : 'Create invoice'}
          </button>
        </>}>
        <div className="col gap-4">
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Guest *</div>
            <input className="input" value={form.guest} onChange={e => setForm(f => ({ ...f, guest: e.target.value }))} />
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Date</div>
              <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Method</div>
              <select className="input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                <option>—</option><option>Card</option><option>UPI</option><option>Cash</option><option>Bank</option>
              </select>
            </div>
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Amount (₹) *</div>
              <input className="input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Tax (₹) — auto 18%</div>
              <input className="input" type="number" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} placeholder="leave blank" />
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Status</div>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option>pending</option><option>paid</option><option>partial</option><option>advance</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
