import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Drawer, Modal, SectionHeader, StatusPill } from '../components/primitives.jsx';
import { api, fmtINR, fmtINRk } from '../api.js';

const blank = { title: '', date: '', time: '', guests: 30, advance: 0, total: 28000, status: 'pending', contact: '' };

export default function Hall({ onToast }) {
  const [showNew, setShowNew] = useState(false);
  const [list, setList] = useState([]);
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);

  const refresh = () => api.hall.list().then(setList);
  useEffect(() => { refresh(); }, []);

  const totalAdvance = list.reduce((s, h) => s + h.advance, 0);
  const totalRevenue = list.reduce((s, h) => s + h.total, 0);

  const submit = async () => {
    if (!form.title || !form.date || !form.time || !form.contact) {
      onToast('Please fill all required fields');
      return;
    }
    setBusy(true);
    try {
      const created = await api.hall.create({ ...form, guests: Number(form.guests), advance: Number(form.advance), total: Number(form.total) });
      onToast(`Reservation ${created.id} created`);
      setShowNew(false);
      setForm(blank);
      refresh();
    } catch (e) {
      onToast(e.message || 'Could not create reservation');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-enter">
      <SectionHeader
        eyebrow="Events"
        title="Mini Hall"
        sub={`${list.length} events booked · ${fmtINR(totalRevenue)} pipeline`}
        right={
          <div className="row gap-2">
            <button className="btn" onClick={() => { navigator.clipboard?.writeText(window.location.origin + '/booking.html#hall'); onToast('Hall booking link copied'); }}><Icon name="link" size={14} />Hall booking link</button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={14} strokeWidth={2.4} />Reserve hall</button>
          </div>
        }
      />

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', minHeight: 240 }}>
          <div style={{ position: 'relative', overflow: 'hidden' }}>
            <img src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1400&q=80" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(21,17,12,0.85), rgba(21,17,12,0.1))' }} />
            <div style={{ position: 'absolute', left: 28, top: 28, color: '#f4ede0' }}>
              <div className="label" style={{ color: 'rgba(244,237,224,0.7)', marginBottom: 8 }}>The Verandah Hall</div>
              <div className="display" style={{ fontSize: 32, lineHeight: 1.1, marginBottom: 6 }}>Up to 80 guests, French-tile floors, garden access.</div>
              <div className="row gap-3" style={{ marginTop: 14, color: 'rgba(244,237,224,0.85)', fontSize: 13 }}>
                <span><Icon name="users" size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />80 capacity</span>
                <span>·</span><span>1,800 sqft</span><span>·</span><span>Catering on-site</span>
              </div>
            </div>
          </div>
          <div className="col" style={{ padding: 24, justifyContent: 'space-between' }}>
            <div>
              <div className="label" style={{ marginBottom: 10 }}>This month</div>
              <div className="row gap-4">
                <div>
                  <div className="display" style={{ fontSize: 28, color: 'var(--ink)' }}>{list.length}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Events</div>
                </div>
                <div className="vdivider" />
                <div>
                  <div className="display" style={{ fontSize: 28, color: 'var(--gold-2)' }}>{fmtINRk(totalRevenue)}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Revenue</div>
                </div>
                <div className="vdivider" />
                <div>
                  <div className="display" style={{ fontSize: 28, color: '#9bc497' }}>{fmtINRk(totalAdvance)}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Advance in</div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18 }}>
              <div className="label" style={{ marginBottom: 10 }}>Hall rate card</div>
              <div className="col gap-2">
                {[
                  { label: 'Half day (4h)', price: 28000 },
                  { label: 'Full day (8h)', price: 52000 },
                  { label: 'Evening event (5h)', price: 42000 },
                  { label: 'Wedding package', price: 115000 },
                ].map(r => (
                  <div key={r.label} className="row" style={{ justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--ink-2)' }}>{r.label}</span>
                    <span style={{ color: 'var(--gold-2)', fontWeight: 500 }}>{fmtINR(r.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ padding: '18px 20px 12px', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 18 }}>Upcoming events</div>
        </div>
        <div>
          {list.map(h => (
            <div key={h.id} style={{ padding: '16px 20px', borderTop: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setSelected(h)}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 500 }}>{h.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{h.contact} · {h.id}</div>
                </div>
                <StatusPill status={h.status} />
              </div>
              <div className="row gap-4" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
                <span><Icon name="calendar" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{h.date} · {h.time}</span>
                <span><Icon name="users" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{h.guests} guests</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 12, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ fontSize: 11, color: 'var(--ink-4)', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{fmtINR(h.advance)} advance · {fmtINR(h.total - h.advance)} due</span>
                    <span>{h.total ? Math.round((h.advance / h.total) * 100) : 0}% paid</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${h.total ? (h.advance / h.total) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-2))', transition: 'width 1s' }} />
                  </div>
                </div>
                <div style={{ marginLeft: 16, color: 'var(--gold-2)', fontWeight: 500 }}>{fmtINR(h.total)}</div>
              </div>
            </div>
          ))}
          {list.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No events yet.</div>}
        </div>
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Reserve the Hall" width={520}
        footer={<><button className="btn btn-ghost" onClick={() => setShowNew(false)} disabled={busy}>Cancel</button><button className="btn btn-primary" onClick={submit} disabled={busy}><Icon name="check" size={14} strokeWidth={2.4} />Create reservation</button></>}>
        <div className="col gap-4">
          <div><div className="label" style={{ marginBottom: 6 }}>Event title *</div><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Contact *</div><input className="input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Date *</div><input className="input" type="text" placeholder="May 30" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Time *</div><input className="input" placeholder="11:00 – 15:00" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Guests</div><input className="input" type="number" value={form.guests} onChange={e => setForm(f => ({ ...f, guests: e.target.value }))} /></div>
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Advance (₹)</div><input className="input" type="number" value={form.advance} onChange={e => setForm(f => ({ ...f, advance: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Total (₹)</div><input className="input" type="number" value={form.total} onChange={e => setForm(f => ({ ...f, total: e.target.value }))} /></div>
          </div>
        </div>
      </Modal>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.title || ''} width={520}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
          <button className="btn btn-primary" onClick={async () => {
            try {
              const newStatus = selected.status === 'pending' ? 'confirmed' : 'pending';
              await api.hall.update(selected.id, { status: newStatus });
              onToast?.(`${selected.id} → ${newStatus}`);
              setSelected({ ...selected, status: newStatus });
              refresh();
            } catch (e) { onToast?.(e.message); }
          }}>
            <Icon name="check" size={14} />{selected?.status === 'pending' ? 'Confirm' : 'Mark pending'}
          </button>
        </>}>
        {selected && (
          <div className="col gap-4">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="display" style={{ fontSize: 22 }}>{selected.title}</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 4 }}>{selected.id} · {selected.contact}</div>
              </div>
              <StatusPill status={selected.status} />
            </div>
            <div className="row gap-4" style={{ paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 4 }}>Date & time</div>
                <div className="display" style={{ fontSize: 18 }}>{selected.date}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{selected.time}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 4 }}>Guests</div>
                <div className="display" style={{ fontSize: 18 }}>{selected.guests}</div>
              </div>
            </div>
            <div className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>Total</span>
                <span style={{ color: 'var(--gold-2)', fontWeight: 500 }}>{fmtINR(selected.total)}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>Advance received</span>
                <span style={{ color: '#9bc497' }}>{fmtINR(selected.advance)}</span>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, paddingTop: 6, borderTop: '1px solid var(--line)' }}>
                <span style={{ color: 'var(--ink)' }}>Balance due</span>
                <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{fmtINR(selected.total - selected.advance)}</span>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
