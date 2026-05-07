import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Avatar, ConfirmDialog, Menu, Modal, SectionHeader, StatusPill, Tabs } from '../components/primitives.jsx';
import { api, downloadCSV, fmtINR } from '../api.js';

const blankForm = {
  guest: '', phone: '', email: '', room: '',
  checkin: '', checkout: '', source: 'Direct', guests: 2,
};

export default function Bookings({ onToast, prefill, onPrefillConsumed }) {
  const [tab, setTab] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [busy, setBusy] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selected, setSelected] = useState([]);

  const refreshAll = async () => {
    const [b, r] = await Promise.all([api.bookings.list(), api.rooms.list()]);
    setBookings(b);
    setRooms(r.rooms);
    setTypes(r.types);
  };
  const refresh = refreshAll;
  useEffect(() => { refreshAll(); }, []);

  // Receive pre-fill from CRM "New booking"
  useEffect(() => {
    if (prefill) {
      setForm(f => ({ ...f, ...prefill }));
      setShowNew(true);
      onPrefillConsumed?.();
    }
  }, [prefill]); // eslint-disable-line react-hooks/exhaustive-deps

  const sources = ['all', ...new Set(bookings.map(b => b.source))];
  const filtered = bookings
    .filter(b => tab === 'all' || b.status === tab)
    .filter(b => sourceFilter === 'all' || b.source === sourceFilter);

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleSelectAll = () => setSelected(s => s.length === filtered.length ? [] : filtered.map(b => b.id));

  const exportCSV = () => {
    const rows = (selected.length ? filtered.filter(b => selected.includes(b.id)) : filtered);
    downloadCSV(`aurelia-bookings-${new Date().toISOString().slice(0, 10)}.csv`, rows,
      ['id', 'guest', 'phone', 'room', 'checkin', 'checkout', 'nights', 'amount', 'source', 'status']);
    onToast?.(`Exported ${rows.length} booking${rows.length !== 1 ? 's' : ''}`);
  };

  const setStatus = async (b, status) => {
    try {
      await api.bookings.update(b.id, { status });
      onToast?.(`${b.id} → ${status}`);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not update'); }
  };

  const deleteBooking = async () => {
    if (!confirmDelete) return;
    try {
      await api.bookings.remove(confirmDelete.id);
      onToast?.(`${confirmDelete.id} deleted`);
      setConfirmDelete(null);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not delete'); }
  };

  const updateForm = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const computeTotal = () => {
    if (!form.room || !form.checkin || !form.checkout) return { nights: 0, amount: 0, tax: 0, total: 0 };
    const nights = Math.max(1, Math.round((new Date(form.checkout) - new Date(form.checkin)) / 86400000));
    const room = rooms.find(r => r.num === form.room);
    const type = types.find(t => t.id === room?.type_id);
    const amount = (type?.base_price || 0) * nights;
    const tax = Math.round(amount * 0.18);
    return { nights, amount, tax, total: amount + tax };
  };
  const { nights, amount, tax, total } = computeTotal();

  const submit = async () => {
    if (!form.guest || !form.room || !form.checkin || !form.checkout) {
      onToast('Please fill all required fields');
      return;
    }
    setBusy(true);
    try {
      const created = await api.bookings.create({
        guest: form.guest,
        phone: form.phone || null,
        email: form.email || null,
        room: form.room,
        checkin: form.checkin,
        checkout: form.checkout,
        nights,
        amount,
        source: form.source,
        status: 'confirmed',
      });
      onToast(`Booking ${created.id} created`);
      setShowNew(false);
      setForm(blankForm);
      refresh();
    } catch (e) {
      onToast(e.message || 'Could not create booking');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-enter">
      <SectionHeader
        eyebrow="Operations"
        title="Bookings"
        sub={`${bookings.length} bookings · ${bookings.filter(b => b.status === 'pending').length} need attention`}
        right={
          <div className="row gap-2">
            <select className="input" style={{ width: 160 }} value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
              {sources.map(s => <option key={s} value={s}>{s === 'all' ? 'All sources' : s}</option>)}
            </select>
            <button className="btn" onClick={exportCSV}><Icon name="download" size={14} />Export{selected.length ? ` (${selected.length})` : ''}</button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={14} strokeWidth={2.4} />New booking</button>
          </div>
        }
      />

      <div style={{ marginBottom: 18 }}>
        <Tabs
          tabs={[
            { id: 'all', label: 'All', count: bookings.length },
            { id: 'checked-in', label: 'Checked-in', count: bookings.filter(b => b.status === 'checked-in').length },
            { id: 'confirmed', label: 'Confirmed', count: bookings.filter(b => b.status === 'confirmed').length },
            { id: 'pending', label: 'Pending', count: bookings.filter(b => b.status === 'pending').length },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 32 }}><div className="checkbox" data-checked={selected.length > 0 && selected.length === filtered.length} onClick={toggleSelectAll} /></th>
              <th>ID</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th>
              <th>Nights</th><th>Amount</th><th>Source</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id}>
                <td><div className="checkbox" data-checked={selected.includes(b.id)} onClick={() => toggleSelect(b.id)} /></td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>{b.id}</td>
                <td>
                  <div className="row gap-2">
                    <Avatar name={b.guest} size={26} />
                    <div>
                      <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{b.guest}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{b.phone}</div>
                    </div>
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{b.room}</td>
                <td>{b.checkin}</td><td>{b.checkout}</td>
                <td>{b.nights}</td>
                <td style={{ color: 'var(--gold-2)', fontWeight: 500 }}>{fmtINR(b.amount)}</td>
                <td><span className="badge">{b.source}</span></td>
                <td><StatusPill status={b.status} /></td>
                <td>
                  <Menu
                    trigger={<button className="btn btn-ghost btn-icon"><Icon name="more" size={14} /></button>}
                    items={[
                      b.status !== 'checked-in' && { label: 'Mark checked-in', icon: 'check', onClick: () => setStatus(b, 'checked-in') },
                      b.status === 'checked-in' && { label: 'Mark checked-out', icon: 'arrowRight', onClick: () => setStatus(b, 'checked-out') },
                      b.status !== 'confirmed' && { label: 'Mark confirmed', icon: 'check', onClick: () => setStatus(b, 'confirmed') },
                      b.status !== 'pending' && { label: 'Mark pending', icon: 'dot', onClick: () => setStatus(b, 'pending') },
                      b.phone && { label: 'WhatsApp guest', icon: 'whatsapp', onClick: () => window.open(`https://wa.me/${b.phone.replace(/\D/g, '')}`, '_blank') },
                      { label: 'Delete', icon: 'trash', danger: true, onClick: () => setConfirmDelete(b) },
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No bookings in this view.</div>}
      </div>

      <Modal
        open={showNew}
        onClose={() => setShowNew(false)}
        title="New booking"
        width={580}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowNew(false)} disabled={busy}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={busy}>
              <Icon name="check" size={14} strokeWidth={2.4} />Create booking
            </button>
          </>
        }
      >
        <div className="col gap-4">
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Guest name *</div>
            <input className="input" placeholder="Full name" value={form.guest} onChange={e => updateForm('guest', e.target.value)} />
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Phone</div>
              <input className="input" placeholder="+91" value={form.phone} onChange={e => updateForm('phone', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Email</div>
              <input className="input" type="email" placeholder="email@example.com" value={form.email} onChange={e => updateForm('email', e.target.value)} />
            </div>
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Check-in *</div>
              <input className="input" type="date" value={form.checkin} onChange={e => updateForm('checkin', e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Check-out *</div>
              <input className="input" type="date" value={form.checkout} onChange={e => updateForm('checkout', e.target.value)} />
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Room *</div>
            <select className="input" value={form.room} onChange={e => updateForm('room', e.target.value)}>
              <option value="">Select a room…</option>
              {rooms.filter(r => r.status === 'available' || r.num === form.room).map(r => {
                const t = types.find(x => x.id === r.type_id);
                return <option key={r.id} value={r.num}>Room {r.num} — {t?.name} · {fmtINR(t?.base_price || 0)}/night</option>;
              })}
            </select>
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Source</div>
              <select className="input" value={form.source} onChange={e => updateForm('source', e.target.value)}>
                <option>Direct</option><option>Booking.com</option><option>WhatsApp</option><option>MakeMyTrip</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Guests</div>
              <input className="input" type="number" min="1" value={form.guests} onChange={e => updateForm('guests', Number(e.target.value))} />
            </div>
          </div>
          <div style={{ padding: 14, background: 'var(--bg-3)', borderRadius: 10 }}>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
              <span>{nights} night{nights !== 1 ? 's' : ''}</span>
              <span>{fmtINR(amount)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>
              <span>GST (18%)</span>
              <span>{fmtINR(tax)}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 14, color: 'var(--ink)', fontWeight: 500, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--gold-2)' }}>{fmtINR(total)}</span>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete booking?"
        body={confirmDelete ? `${confirmDelete.id} for ${confirmDelete.guest} will be permanently removed.` : ''}
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(null)}
        onConfirm={deleteBooking}
      />
    </div>
  );
}
