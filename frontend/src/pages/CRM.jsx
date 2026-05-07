import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Avatar, Modal, SectionHeader, StatusPill } from '../components/primitives.jsx';
import { api, fmtINR, fmtINRk } from '../api.js';

const blankGuest = { name: '', email: '', phone: '', status: 'new', note: '' };

function DetailStat({ label, value, accent }) {
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="display" style={{ fontSize: 22, color: accent || 'var(--ink)' }}>{value}</div>
    </div>
  );
}

function CommItem({ icon, who, msg }) {
  return (
    <div className="row gap-3" style={{ padding: 14, background: 'var(--bg-3)', borderRadius: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--panel)', color: 'var(--gold-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={icon} size={14} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{who}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{msg}</div>
      </div>
    </div>
  );
}

export default function CRM({ onNavigate, onToast }) {
  const [guests, setGuests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(blankGuest);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const rows = await api.guests.list();
    setGuests(rows);
    if (!selected && rows.length) setSelected(rows[0]);
  };
  useEffect(() => { refresh(); }, []);

  const submitGuest = async () => {
    if (!form.name) { onToast?.('Name is required'); return; }
    setBusy(true);
    try {
      const created = await api.guests.create({
        name: form.name,
        email: form.email || null,
        phone: form.phone || null,
        status: form.status,
        note: form.note || null,
      });
      onToast?.(`${created.name} added`);
      setShowNew(false);
      setForm(blankGuest);
      const rows = await api.guests.list();
      setGuests(rows);
      setSelected(created);
    } catch (e) { onToast?.(e.message || 'Could not add guest'); }
    finally { setBusy(false); }
  };

  const sendCampaign = () => {
    const recipients = guests.filter(g => g.email).map(g => g.email).join(',');
    if (!recipients) { onToast?.('No guest emails on file'); return; }
    window.location.href = `mailto:?bcc=${recipients}&subject=${encodeURIComponent('A note from Aurelia')}`;
    onToast?.(`Composing email to ${guests.filter(g => g.email).length} guests`);
  };

  const filtered = guests.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));
  const totalLifetime = guests.reduce((s, g) => s + g.lifetime, 0);
  const vipCount = guests.filter(g => g.status === 'vip').length;

  return (
    <div className="page page-enter">
      <SectionHeader
        eyebrow="Business"
        title="Guests"
        sub={`${guests.length} guests on file · ${vipCount} VIPs · ${fmtINRk(totalLifetime)} lifetime`}
        right={
          <div className="row gap-2">
            <button className="btn" onClick={sendCampaign}><Icon name="mail" size={14} />Send campaign</button>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}><Icon name="plus" size={14} strokeWidth={2.4} />Add guest</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16, height: 'calc(100vh - 200px)' }}>
        <div className="card col" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--line)' }}>
            <div style={{ position: 'relative' }}>
              <Icon name="search" size={14} color="var(--ink-4)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input className="input" placeholder="Search guests…" style={{ paddingLeft: 36 }} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.map(g => (
              <div key={g.id} onClick={() => setSelected(g)}
                style={{
                  padding: '14px 16px', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                  background: selected?.id === g.id ? 'var(--gold-soft)' : 'transparent',
                  borderLeft: selected?.id === g.id ? '2px solid var(--gold)' : '2px solid transparent',
                  transition: 'background .15s',
                }}>
                <div className="row gap-3">
                  <Avatar name={g.name} size={36} tone={g.status === 'vip' ? 'gold' : g.status === 'regular' ? 'green' : 'warm'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</div>
                      {g.status === 'vip' && <Icon name="star" size={12} color="var(--gold)" strokeWidth={2.4} />}
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between', marginTop: 2 }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{g.visits} visits</div>
                      <div style={{ fontSize: 11, color: 'var(--gold-2)' }}>{fmtINRk(g.lifetime)}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No guests match.</div>}
          </div>
        </div>

        {selected && (
          <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '28px 32px', background: 'linear-gradient(135deg, var(--gold-soft), transparent)', borderBottom: '1px solid var(--line)', position: 'relative' }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="row gap-4">
                  <Avatar name={selected.name} size={64} tone={selected.status === 'vip' ? 'gold' : selected.status === 'regular' ? 'green' : 'warm'} />
                  <div>
                    <div className="row gap-2" style={{ alignItems: 'center' }}>
                      <div className="display" style={{ fontSize: 28 }}>{selected.name}</div>
                      <StatusPill status={selected.status} />
                    </div>
                    <div className="row gap-3" style={{ marginTop: 6, color: 'var(--ink-3)', fontSize: 13 }}>
                      {selected.email && <span><Icon name="mail" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{selected.email}</span>}
                      {selected.phone && <span><Icon name="phone" size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />{selected.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="row gap-2">
                  <a className="btn btn-icon" title="WhatsApp" target="_blank" rel="noreferrer"
                    href={selected.phone ? `https://wa.me/${selected.phone.replace(/\D/g, '')}` : '#'}
                    onClick={e => { if (!selected.phone) { e.preventDefault(); onToast?.('No phone on file'); } }}>
                    <Icon name="whatsapp" size={16} />
                  </a>
                  <a className="btn btn-icon" title="Email"
                    href={selected.email ? `mailto:${selected.email}` : '#'}
                    onClick={e => { if (!selected.email) { e.preventDefault(); onToast?.('No email on file'); } }}>
                    <Icon name="mail" size={16} />
                  </a>
                  <a className="btn btn-icon" title="Call"
                    href={selected.phone ? `tel:${selected.phone.replace(/\s+/g, '')}` : '#'}
                    onClick={e => { if (!selected.phone) { e.preventDefault(); onToast?.('No phone on file'); } }}>
                    <Icon name="phone" size={16} />
                  </a>
                  <button className="btn btn-primary" onClick={() => onNavigate?.('bookings')}><Icon name="plus" size={14} />New booking</button>
                </div>
              </div>
            </div>

            <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
                <DetailStat label="Lifetime spend" value={fmtINR(selected.lifetime)} accent="var(--gold-2)" />
                <DetailStat label="Visits" value={selected.visits} />
                <DetailStat label="Avg booking" value={fmtINR(selected.visits ? Math.round(selected.lifetime / selected.visits) : 0)} />
                <DetailStat label="Last stay" value={selected.last_stay || '—'} />
              </div>

              <div className="label" style={{ marginBottom: 10 }}>Concierge note</div>
              <div className="card" style={{ padding: 16, marginBottom: 28, background: 'var(--bg-3)', borderColor: 'var(--gold-line)', display: 'flex', gap: 12 }}>
                <Icon name="sparkle" size={16} color="var(--gold-2)" />
                <div style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5, flex: 1 }}>{selected.note || '—'}</div>
              </div>

              <div style={{ marginTop: 28 }}>
                <div className="label" style={{ marginBottom: 14 }}>Communication</div>
                <div className="col gap-3">
                  <CommItem icon="whatsapp" who="WhatsApp · 2 days ago" msg="Confirmed dietary preference: vegetarian breakfast for the family." />
                  <CommItem icon="mail" who="Email · 5 days ago" msg="Sent pre-arrival concierge welcome with directions and parking info." />
                  <CommItem icon="phone" who="Call · Last month" msg="Discussed availability for upcoming dates; tentative booking placed." />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add guest" width={460}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowNew(false)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submitGuest} disabled={busy}>
            <Icon name="check" size={14} strokeWidth={2.4} />{busy ? 'Saving…' : 'Save guest'}
          </button>
        </>}>
        <div className="col gap-4">
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Full name *</div>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Email</div>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Phone</div>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Tier</div>
            <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="new">New</option>
              <option value="regular">Regular</option>
              <option value="vip">VIP</option>
            </select>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Concierge note</div>
            <textarea className="input" rows="3" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Preferences, allergies, anniversaries…" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
