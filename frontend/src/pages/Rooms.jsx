import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Avatar, Drawer, Modal, SectionHeader, StatusPill } from '../components/primitives.jsx';
import { api, fmtINR } from '../api.js';

const AMENITIES = ['King Bed', 'Air Conditioning', 'Rain Shower', 'Coffee Press', 'Smart TV', 'Mini Bar', 'Workspace', 'Balcony', 'Garden View', 'Sea Glimpse', 'Heritage Furniture', 'Daily Housekeeping'];
const STATUSES = ['available', 'occupied', 'reserved', 'cleaning'];

function Stat({ label, value, sub }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="display" style={{ fontSize: 18, color: 'var(--ink)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{sub}</div>}
    </div>
  );
}

function RoomCard({ room, type, onClick, onBook }) {
  return (
    <div className="room-card" onClick={onClick}>
      <div className="room-img">
        {room.image && <img src={room.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <StatusPill status={room.status} />
        </div>
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(21,17,12,0.7)', backdropFilter: 'blur(8px)',
          padding: '6px 10px', borderRadius: 8, fontSize: 11, color: '#f4ede0',
          fontFamily: 'var(--font-mono)', border: '1px solid rgba(255,255,255,0.1)',
        }}>{room.num}</div>
      </div>
      <div style={{ padding: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div className="display" style={{ fontSize: 17 }}>{type?.name || 'Room'}</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, color: 'var(--gold-2)', fontWeight: 500 }}>{fmtINR(type?.base_price || 0)}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-4)' }}>per night</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 10 }}>
          Floor {room.floor} · {type?.beds || ''} bed · {type?.sqft || ''} sqft
        </div>
        {room.guest ? (
          <div className="row gap-2" style={{ padding: '8px 10px', background: 'var(--bg-3)', borderRadius: 8, fontSize: 12 }}>
            <Avatar name={room.guest} size={22} />
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink-2)' }}>{room.guest}</div>
            <div style={{ color: 'var(--ink-4)', fontSize: 11, whiteSpace: 'nowrap' }}>
              {room.checkout ? `out ${room.checkout}` : `in ${room.checkin}`}
            </div>
          </div>
        ) : room.status === 'available' ? (
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '8px 10px', fontSize: 12 }}
            onClick={(e) => { e.stopPropagation(); onBook?.(room); }}
          >
            <Icon name="plus" size={12} strokeWidth={2.4} />Book this room
          </button>
        ) : (
          <div className="row gap-2" style={{ padding: '8px 10px', background: 'var(--bg-3)', borderRadius: 8, fontSize: 12, color: 'var(--ink-3)' }}>
            <Icon name="sparkle" size={14} />
            Housekeeping in progress
          </div>
        )}
      </div>
    </div>
  );
}

function RoomTable({ rooms, types, onSelect }) {
  return (
    <div className="card">
      <table className="table">
        <thead>
          <tr><th>Room</th><th>Type</th><th>Floor</th><th>Status</th><th>Guest</th><th>Rate</th><th /></tr>
        </thead>
        <tbody>
          {rooms.map(r => {
            const type = types.find(t => t.id === r.type_id);
            return (
              <tr key={r.id} onClick={() => onSelect(r)} style={{ cursor: 'pointer' }}>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{r.num}</td>
                <td style={{ color: 'var(--ink)' }}>{type?.name}</td>
                <td>F{r.floor}</td>
                <td><StatusPill status={r.status} /></td>
                <td>{r.guest || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                <td style={{ color: 'var(--gold-2)' }}>{fmtINR(type?.base_price || 0)}</td>
                <td><Icon name="chevronRight" size={14} color="var(--ink-4)" /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RoomCalendar({ rooms, bookings }) {
  const [offset, setOffset] = useState(0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + offset * 14);
    return d;
  });
  const colW = 92;

  // synthesize bookings on grid for each room
  const dayLabel = (d) => `${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]} ${String(d.getDate()).padStart(2, '0')}`;
  const fmtRange = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${days[days.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // map bookings to a starting day index in the visible window using their checkin label
  const monthAbbrev = (s) => s?.split(' ')?.[0]; // e.g. "May" from "May 03"
  const dayNum = (s) => Number(s?.split(' ')?.[1]); // e.g. 3
  const bookingsByRoom = {};
  for (const b of bookings) {
    const startD = dayNum(b.checkin);
    const startMo = monthAbbrev(b.checkin);
    const visibleIdx = days.findIndex(d => d.getDate() === startD && d.toLocaleDateString('en-US', { month: 'short' }) === startMo);
    if (visibleIdx === -1) continue;
    bookingsByRoom[b.room] = bookingsByRoom[b.room] || [];
    bookingsByRoom[b.room].push({
      start: visibleIdx,
      len: Math.max(1, Math.min(b.nights, 14 - visibleIdx)),
      label: b.guest,
      tone: b.status === 'checked-in' ? 'gold' : b.status === 'confirmed' ? 'green' : 'blue',
    });
  }

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', justifyContent: 'space-between' }}>
        <div className="display" style={{ fontSize: 18 }}>{fmtRange}</div>
        <div className="row gap-2">
          <button className="btn btn-icon" onClick={() => setOffset(o => o - 1)}><Icon name="chevronLeft" size={14} /></button>
          <button className="btn btn-sm" onClick={() => setOffset(0)}>Today</button>
          <button className="btn btn-icon" onClick={() => setOffset(o => o + 1)}><Icon name="chevronRight" size={14} /></button>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 80 + days.length * colW }}>
          <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${days.length}, ${colW}px)`, borderBottom: '1px solid var(--line)' }}>
            <div />
            {days.map((d, i) => (
              <div key={i} style={{
                padding: '10px 8px', fontSize: 11, color: 'var(--ink-3)',
                textAlign: 'center',
                background: (d.getDay() === 0 || d.getDay() === 6) ? 'var(--bg-3)' : 'transparent',
                borderLeft: '1px solid var(--line)',
              }}>{dayLabel(d)}</div>
            ))}
          </div>
          {rooms.map(r => (
            <div key={r.id} style={{
              display: 'grid', gridTemplateColumns: `80px repeat(${days.length}, ${colW}px)`,
              borderBottom: '1px solid var(--line)',
              position: 'relative', minHeight: 48,
            }}>
              <div style={{ padding: '14px 12px', fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{r.num}</div>
              {days.map((d, i) => (
                <div key={i} style={{
                  borderLeft: '1px solid var(--line)',
                  background: (d.getDay() === 0 || d.getDay() === 6) ? 'rgba(201,169,110,0.025)' : 'transparent',
                }} />
              ))}
              {(bookingsByRoom[r.num] || []).map((b, i) => (
                <div key={i} style={{
                  position: 'absolute',
                  left: 80 + b.start * colW + 4,
                  width: b.len * colW - 8,
                  top: 8, height: 32,
                  background: b.tone === 'gold' ? 'linear-gradient(90deg, rgba(201,169,110,0.3), rgba(201,169,110,0.18))' : b.tone === 'green' ? 'rgba(127,166,122,0.2)' : 'rgba(122,147,201,0.2)',
                  border: `1px solid ${b.tone === 'gold' ? 'var(--gold-line)' : b.tone === 'green' ? 'rgba(127,166,122,0.4)' : 'rgba(122,147,201,0.4)'}`,
                  borderRadius: 7,
                  padding: '6px 10px',
                  fontSize: 12,
                  color: b.tone === 'gold' ? 'var(--gold-2)' : b.tone === 'green' ? '#9bc497' : '#98aedb',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  cursor: 'pointer',
                }}>{b.label}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomDetail({ room, type, onChangeStatus, busy }) {
  return (
    <div>
      <div style={{ aspectRatio: '16/10', borderRadius: 14, overflow: 'hidden', marginBottom: 18, background: 'var(--bg-3)' }}>
        {room.image && <img src={room.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div className="display" style={{ fontSize: 26 }}>{type?.name || 'Room'}</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 13 }}>Room {room.num} · Floor {room.floor}</div>
        </div>
        <StatusPill status={room.status} />
      </div>
      <div className="row gap-4" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
        <Stat label="Rate" value={fmtINR(type?.base_price || 0)} sub="per night" />
        <Stat label="Beds" value={type?.beds} />
        <Stat label="Size" value={`${type?.sqft || 0} sqft`} />
        <Stat label="Max guests" value={type?.max_guests} />
      </div>
      <div style={{ marginTop: 22 }}>
        <div className="label" style={{ marginBottom: 10 }}>Update status</div>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          {STATUSES.map(s => (
            <button key={s} className="btn btn-sm" disabled={busy || s === room.status}
              onClick={() => onChangeStatus(s)}
              style={s === room.status ? { background: 'var(--gold-soft)', borderColor: 'var(--gold-line)', color: 'var(--gold-2)' } : {}}>
              <span className={`status-dot status-${s}`} style={{ width: 6, height: 6 }} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 22 }}>
        <div className="label" style={{ marginBottom: 10 }}>Amenities</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {AMENITIES.slice(0, 8).map(a => <span key={a} className="badge">{a}</span>)}
        </div>
      </div>
      {room.guest && (
        <div style={{ marginTop: 22, padding: 16, background: 'var(--bg-3)', borderRadius: 12 }}>
          <div className="label" style={{ marginBottom: 10 }}>Current guest</div>
          <div className="row gap-3">
            <Avatar name={room.guest} size={42} />
            <div>
              <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{room.guest}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Checking out {room.checkout}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const blankRoom = { num: '', type_id: '', floor: 1, status: 'available', image: '' };

export default function Rooms({ onToast, onNavigateWithPrefill }) {
  const [view, setView] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [floorFilter, setFloorFilter] = useState('all');
  const [rooms, setRooms] = useState([]);
  const [types, setTypes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newRoom, setNewRoom] = useState(blankRoom);
  const [busy, setBusy] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({ name: '', base_price: 0, sqft: 0, beds: '', max_guests: 1 });

  const refresh = async () => {
    const { rooms, types } = await api.rooms.list();
    setRooms(rooms); setTypes(types);
    const bk = await api.bookings.list();
    setBookings(bk);
  };
  useEffect(() => { refresh(); }, []);

  const counts = {
    all: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    reserved: rooms.filter(r => r.status === 'reserved').length,
    cleaning: rooms.filter(r => r.status === 'cleaning').length,
  };

  const filtered = rooms.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (floorFilter !== 'all' && r.floor !== Number(floorFilter)) return false;
    return true;
  });
  const typeFor = (id) => types.find(t => t.id === id);
  const floors = [...new Set(rooms.map(r => r.floor))].sort();

  const changeStatus = async (status) => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await api.rooms.update(selected.num, {
        status,
        guest: status === 'available' || status === 'cleaning' ? null : selected.guest,
        checkin: status === 'available' ? null : selected.checkin,
        checkout: status === 'available' ? null : selected.checkout,
      });
      setSelected(updated);
      onToast?.(`Room ${selected.num} → ${status}`);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not update'); }
    finally { setBusy(false); }
  };

  const openEditType = (t) => {
    setEditingType(t);
    setTypeForm({ name: t.name, base_price: t.base_price, sqft: t.sqft, beds: t.beds, max_guests: t.max_guests });
  };

  const saveType = async () => {
    if (!editingType) return;
    setBusy(true);
    try {
      await api.rooms.updateType(editingType.id, {
        name: typeForm.name,
        base_price: Number(typeForm.base_price),
        sqft: Number(typeForm.sqft),
        beds: typeForm.beds,
        max_guests: Number(typeForm.max_guests),
      });
      onToast?.(`${typeForm.name} rate updated to ${fmtINR(Number(typeForm.base_price))}/night`);
      setEditingType(null);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not save'); }
    finally { setBusy(false); }
  };

  const submitNewRoom = async () => {
    if (!newRoom.num || !newRoom.type_id) { onToast?.('Room number and type are required'); return; }
    setBusy(true);
    try {
      await api.rooms.create({ ...newRoom, floor: Number(newRoom.floor) });
      onToast?.(`Room ${newRoom.num} added`);
      setShowNew(false); setNewRoom(blankRoom);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not add room'); }
    finally { setBusy(false); }
  };

  const shareLink = () => {
    navigator.clipboard?.writeText(window.location.origin + '/booking.html');
    onToast?.('Booking link copied');
  };

  return (
    <div className="page page-enter">
      <SectionHeader
        eyebrow="Operations"
        title="Rooms"
        sub={`${rooms.length} rooms · ${counts.occupied} occupied tonight`}
        right={
          <div className="row gap-2">
            <button className="btn" onClick={shareLink}><Icon name="qr" size={14} />QR menu</button>
            <button className="btn" onClick={shareLink}><Icon name="link" size={14} />Share booking link</button>
            <button className="btn btn-primary" onClick={() => { setNewRoom({ ...blankRoom, type_id: types[0]?.id || '' }); setShowNew(true); }}>
              <Icon name="plus" size={14} strokeWidth={2.4} />Add room
            </button>
          </div>
        }
      />

      {/* Per-type inventory — click to edit rate */}
      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {types.map(t => {
          const total = t.count || rooms.filter(r => r.type_id === t.id).length;
          const occupied = rooms.filter(r => r.type_id === t.id && (r.status === 'occupied' || r.status === 'reserved')).length;
          const free = total - occupied;
          return (
            <div key={t.id} className="card" style={{ padding: '10px 14px', minWidth: 200, cursor: 'pointer', transition: 'border-color .15s, transform .15s' }}
              onClick={() => openEditType(t)}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold-line)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              title="Click to edit rate">
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row gap-2" style={{ alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <Icon name="edit" size={11} color="var(--ink-4)" />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gold-2)', marginTop: 2, fontWeight: 500 }}>{fmtINR(t.base_price)}<span style={{ color: 'var(--ink-4)', fontWeight: 400 }}> / night</span></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="display" style={{ fontSize: 18, color: free > 0 ? 'var(--gold-2)' : 'var(--ink-4)', lineHeight: 1 }}>
                    {free}<span style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-body)' }}>/{total}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>free</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          {[{ id: 'all', label: 'All' }, { id: 'available', label: 'Available', status: 'available' }, { id: 'occupied', label: 'Occupied', status: 'occupied' }, { id: 'reserved', label: 'Reserved', status: 'reserved' }, { id: 'cleaning', label: 'Cleaning', status: 'cleaning' }].map(f => (
            <button key={f.id} className="btn btn-sm" onClick={() => setFilter(f.id)}
              style={filter === f.id ? { background: 'var(--gold-soft)', borderColor: 'var(--gold-line)', color: 'var(--gold-2)' } : {}}>
              {f.status && <span className={`status-dot status-${f.status}`} style={{ width: 6, height: 6 }} />}
              {f.label}
              <span style={{ color: 'var(--ink-4)', marginLeft: 2 }}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="row gap-2">
          <select className="input" style={{ width: 140 }} value={floorFilter} onChange={e => setFloorFilter(e.target.value)}>
            <option value="all">All floors</option>
            {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
          </select>
          <div className="seg">
            <button data-active={view === 'grid'} onClick={() => setView('grid')} title="Grid"><Icon name="grid" size={12} /></button>
            <button data-active={view === 'list'} onClick={() => setView('list')} title="List"><Icon name="list" size={12} /></button>
            <button data-active={view === 'calendar'} onClick={() => setView('calendar')} title="Calendar"><Icon name="calendar" size={12} /></button>
          </div>
        </div>
      </div>

      {view === 'grid' && (
        <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map(r => (
            <RoomCard
              key={r.id}
              room={r}
              type={typeFor(r.type_id)}
              onClick={() => setSelected(r)}
              onBook={(room) => onNavigateWithPrefill?.('bookings', { room: room.num })}
            />
          ))}
        </div>
      )}
      {view === 'list' && <RoomTable rooms={filtered} types={types} onSelect={setSelected} />}
      {view === 'calendar' && <RoomCalendar rooms={filtered} bookings={bookings} />}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Room ${selected.num}` : ''}
        width={520}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSelected(null)}>Close</button>
            <button className="btn" onClick={() => { shareLink(); setSelected(null); }}>
              <Icon name="link" size={14} />Copy link
            </button>
            <button
              className="btn btn-primary"
              disabled={selected?.status !== 'available'}
              title={selected?.status !== 'available' ? `Room is ${selected?.status}` : ''}
              onClick={() => {
                onNavigateWithPrefill?.('bookings', { room: selected.num });
                setSelected(null);
              }}>
              <Icon name="plus" size={14} strokeWidth={2.4} />Book this room
            </button>
          </>
        }
      >
        {selected && <RoomDetail room={selected} type={typeFor(selected.type_id)} onChangeStatus={changeStatus} busy={busy} />}
      </Drawer>

      <Modal open={!!editingType} onClose={() => setEditingType(null)} title={editingType ? `Edit ${editingType.name}` : ''} width={460}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setEditingType(null)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={saveType} disabled={busy}>
            <Icon name="check" size={14} strokeWidth={2.4} />{busy ? 'Saving…' : 'Save changes'}
          </button>
        </>}>
        {editingType && (
          <div className="col gap-4">
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Type name</div>
              <input className="input" value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Rate per night (₹) *</div>
              <input className="input" type="number" min="0" value={typeForm.base_price} onChange={e => setTypeForm(f => ({ ...f, base_price: e.target.value }))} />
              <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6 }}>
                Applies to all {rooms.filter(r => r.type_id === editingType.id).length} {editingType.name} room(s). Future bookings will use this rate; existing bookings keep their stored amount.
              </div>
            </div>
            <div className="row gap-3">
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 6 }}>Bed type</div>
                <select className="input" value={typeForm.beds} onChange={e => setTypeForm(f => ({ ...f, beds: e.target.value }))}>
                  <option>King</option><option>Queen</option><option>Twin</option><option>Double</option><option>Single</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 6 }}>Size (sqft)</div>
                <input className="input" type="number" min="0" value={typeForm.sqft} onChange={e => setTypeForm(f => ({ ...f, sqft: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 6 }}>Max guests</div>
                <input className="input" type="number" min="1" value={typeForm.max_guests} onChange={e => setTypeForm(f => ({ ...f, max_guests: e.target.value }))} />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add room" width={460}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowNew(false)} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submitNewRoom} disabled={busy}><Icon name="check" size={14} strokeWidth={2.4} />{busy ? 'Adding…' : 'Add room'}</button>
        </>}>
        <div className="col gap-4">
          <div className="row gap-3">
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Room number *</div>
              <input className="input" value={newRoom.num} onChange={e => setNewRoom(r => ({ ...r, num: e.target.value }))} placeholder="304" />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Floor</div>
              <input className="input" type="number" min="1" value={newRoom.floor} onChange={e => setNewRoom(r => ({ ...r, floor: Number(e.target.value) }))} />
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Room type *</div>
            <select className="input" value={newRoom.type_id} onChange={e => setNewRoom(r => ({ ...r, type_id: e.target.value }))}>
              <option value="">Select…</option>
              {types.map(t => <option key={t.id} value={t.id}>{t.name} · {fmtINR(t.base_price)}/night</option>)}
            </select>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 6 }}>Image URL (optional)</div>
            <input className="input" value={newRoom.image} onChange={e => setNewRoom(r => ({ ...r, image: e.target.value }))} placeholder="https://…" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
