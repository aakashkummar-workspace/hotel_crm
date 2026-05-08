import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog, Drawer, Modal, SectionHeader, StatusPill } from '../components/primitives.jsx';
import { api, fmtINR } from '../api.js';

const blankVehicle = { name: '', plate: '', capacity: 4, status: 'available', image: '', notes: '' };
const blankTrip = { vehicle_id: '', booking_id: '', guest: '', driver: '', purpose: 'Sightseeing', depart_at: '', return_at: '', fuel_cost: 0, mileage: 0 };

export default function Vehicles({ onToast }) {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [eligible, setEligible] = useState([]); // bookings with nights >= vehicle_min_nights
  const [showNewVehicle, setShowNewVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(blankVehicle);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [tripForm, setTripForm] = useState(blankTrip);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [openVehicle, setOpenVehicle] = useState(null);

  const refresh = async () => {
    const v = await api.vehicles.list();
    setVehicles(v.vehicles); setTrips(v.trips);
    const tax = await api.settings.tax();
    const minNights = tax.vehicle_min_nights || 15;
    const all = await api.bookings.list();
    setEligible(all.filter(b => (b.nights || 0) >= minNights && b.status !== 'checked-out' && b.status !== 'cancelled'));
  };
  useEffect(() => { refresh(); }, []);

  const submitVehicle = async () => {
    if (!vehicleForm.name) { onToast?.('Vehicle name is required'); return; }
    setBusy(true);
    try {
      await api.vehicles.create({ ...vehicleForm, capacity: Number(vehicleForm.capacity) });
      onToast?.('Vehicle added');
      setShowNewVehicle(false); setVehicleForm(blankVehicle);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not add vehicle'); }
    finally { setBusy(false); }
  };

  const submitTrip = async () => {
    if (!tripForm.vehicle_id || !tripForm.depart_at || !tripForm.return_at) {
      onToast?.('Vehicle, departure and return time are required'); return;
    }
    setBusy(true);
    try {
      await api.vehicles.createTrip({
        ...tripForm,
        fuel_cost: Number(tripForm.fuel_cost),
        mileage: Number(tripForm.mileage),
      });
      onToast?.('Trip scheduled');
      setShowNewTrip(false); setTripForm(blankTrip);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not schedule'); }
    finally { setBusy(false); }
  };

  const deleteVehicle = async () => {
    if (!confirmDel) return;
    try {
      await api.vehicles.remove(confirmDel.id);
      onToast?.('Vehicle removed');
      setConfirmDel(null);
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not delete'); }
  };

  const updateTripStatus = async (id, status) => {
    try {
      await api.vehicles.updateTrip(id, { status });
      onToast?.(`Trip → ${status}`);
      refresh();
    } catch (e) { onToast?.(e.message); }
  };

  const totalFuel = trips.reduce((s, t) => s + (t.fuel_cost || 0), 0);
  const totalMileage = trips.reduce((s, t) => s + (t.mileage || 0), 0);
  const upcomingTrips = trips.filter(t => t.status === 'scheduled' || t.status === 'in-progress');

  return (
    <div className="page page-enter">
      <SectionHeader
        eyebrow="Operations"
        title="Vehicles"
        sub={`${vehicles.length} vehicles · ${upcomingTrips.length} upcoming trip${upcomingTrips.length !== 1 ? 's' : ''} · ${eligible.length} long-stay guest${eligible.length !== 1 ? 's' : ''} eligible`}
        right={
          <div className="row gap-2">
            <button className="btn" onClick={() => { setTripForm({ ...blankTrip, vehicle_id: vehicles[0]?.id || '' }); setShowNewTrip(true); }}>
              <Icon name="plus" size={14} />Schedule trip
            </button>
            <button className="btn btn-primary" onClick={() => { setVehicleForm(blankVehicle); setShowNewVehicle(true); }}>
              <Icon name="plus" size={14} strokeWidth={2.4} />Add vehicle
            </button>
          </div>
        }
      />

      {/* Long-stay eligible callout */}
      {eligible.length > 0 && (
        <div className="card" style={{ padding: 18, marginBottom: 22, background: 'var(--gold-soft)', borderColor: 'var(--gold-line)' }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="row gap-2" style={{ alignItems: 'center' }}>
                <Icon name="sparkle" size={16} color="var(--gold-2)" />
                <div className="display" style={{ fontSize: 16, color: 'var(--gold-2)' }}>Long-stay guests eligible for a complimentary car</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
                Stays of 15+ nights qualify. Click to schedule a trip in their name.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {eligible.map(b => (
              <button key={b.id} className="btn btn-sm" style={{ background: 'var(--panel)' }}
                onClick={() => { setTripForm({ ...blankTrip, vehicle_id: vehicles[0]?.id || '', booking_id: b.id, guest: b.guest, purpose: 'Long-stay courtesy ride' }); setShowNewTrip(true); }}>
                {b.guest} <span style={{ color: 'var(--ink-4)', marginLeft: 4 }}>· {b.nights} nights · {b.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="row gap-3" style={{ marginBottom: 22, flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 180, padding: 16 }}>
          <div className="label">Vehicles available</div>
          <div className="display" style={{ fontSize: 26 }}>{vehicles.filter(v => v.status === 'available').length}<span style={{ fontSize: 14, color: 'var(--ink-4)' }}>/{vehicles.length}</span></div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 180, padding: 16 }}>
          <div className="label">Upcoming trips</div>
          <div className="display" style={{ fontSize: 26 }}>{upcomingTrips.length}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 180, padding: 16 }}>
          <div className="label">Fuel spend (all trips)</div>
          <div className="display" style={{ fontSize: 26, color: 'var(--gold-2)' }}>{fmtINR(totalFuel)}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 180, padding: 16 }}>
          <div className="label">Total mileage</div>
          <div className="display" style={{ fontSize: 26 }}>{totalMileage} <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>km</span></div>
        </div>
      </div>

      {/* Fleet grid */}
      <div className="display" style={{ fontSize: 18, marginBottom: 12 }}>Fleet</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
        {vehicles.map(v => (
          <div key={v.id} className="card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setOpenVehicle(v)}>
            <div style={{ aspectRatio: '4/3', background: 'var(--bg-3)', position: 'relative' }}>
              {v.image && <img src={v.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              <div style={{ position: 'absolute', top: 12, left: 12 }}>
                <StatusPill status={v.status === 'in-use' ? 'occupied' : v.status === 'maintenance' ? 'cleaning' : 'available'} />
              </div>
              <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 10px', borderRadius: 8, background: 'rgba(21,17,12,0.7)', fontSize: 11, fontFamily: 'var(--font-mono)', color: '#f4ede0', backdropFilter: 'blur(8px)' }}>{v.id}</div>
            </div>
            <div style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="display" style={{ fontSize: 17 }}>{v.name}</div>
                <span className="badge">{v.capacity} seats</span>
              </div>
              {v.plate && <div style={{ fontSize: 12, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{v.plate}</div>}
              {v.notes && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>{v.notes}</div>}
            </div>
          </div>
        ))}
        {vehicles.length === 0 && <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>No vehicles yet. Click "Add vehicle" to get started.</div>}
      </div>

      {/* Trips list */}
      <div className="card">
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 17 }}>All trips</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Vehicle</th><th>Guest / Booking</th><th>Driver</th><th>Purpose</th>
              <th>Departure</th><th>Return</th><th>Fuel</th><th>Status</th><th />
            </tr>
          </thead>
          <tbody>
            {trips.map(t => {
              const v = vehicles.find(x => x.id === t.vehicle_id);
              return (
                <tr key={t.id}>
                  <td style={{ color: 'var(--ink)', fontWeight: 500 }}>{v?.name || t.vehicle_id}</td>
                  <td>{t.guest || '—'}{t.booking_id && <span style={{ color: 'var(--ink-4)', fontSize: 11, marginLeft: 6, fontFamily: 'var(--font-mono)' }}>{t.booking_id}</span>}</td>
                  <td>{t.driver || '—'}</td>
                  <td style={{ color: 'var(--ink-3)' }}>{t.purpose || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{t.depart_at}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{t.return_at}</td>
                  <td style={{ color: 'var(--gold-2)' }}>{fmtINR(t.fuel_cost || 0)}</td>
                  <td>
                    <select value={t.status} onChange={e => updateTripStatus(t.id, e.target.value)}
                      className="input" style={{ padding: '4px 8px', fontSize: 11, width: 'auto' }}>
                      <option value="scheduled">scheduled</option>
                      <option value="in-progress">in-progress</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                  <td><span style={{ color: 'var(--ink-4)', fontSize: 11 }}>{t.mileage} km</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {trips.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>No trips logged yet.</div>}
      </div>

      <Modal open={showNewVehicle} onClose={() => setShowNewVehicle(false)} title="Add vehicle" width={460}
        footer={<><button className="btn btn-ghost" onClick={() => setShowNewVehicle(false)} disabled={busy}>Cancel</button><button className="btn btn-primary" onClick={submitVehicle} disabled={busy}><Icon name="check" size={14} strokeWidth={2.4} />Save</button></>}>
        <div className="col gap-4">
          <div><div className="label" style={{ marginBottom: 6 }}>Name *</div><input className="input" placeholder="Sedan — Honda City" value={vehicleForm.name} onChange={e => setVehicleForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Plate</div><input className="input" placeholder="TN05 BK 0000" value={vehicleForm.plate} onChange={e => setVehicleForm(f => ({ ...f, plate: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Capacity</div><input className="input" type="number" min="1" value={vehicleForm.capacity} onChange={e => setVehicleForm(f => ({ ...f, capacity: e.target.value }))} /></div>
          </div>
          <div><div className="label" style={{ marginBottom: 6 }}>Image URL (optional)</div><input className="input" value={vehicleForm.image} onChange={e => setVehicleForm(f => ({ ...f, image: e.target.value }))} /></div>
          <div><div className="label" style={{ marginBottom: 6 }}>Notes</div><textarea className="input" rows="2" value={vehicleForm.notes} onChange={e => setVehicleForm(f => ({ ...f, notes: e.target.value }))} /></div>
        </div>
      </Modal>

      <Modal open={showNewTrip} onClose={() => setShowNewTrip(false)} title="Schedule a trip" width={520}
        footer={<><button className="btn btn-ghost" onClick={() => setShowNewTrip(false)} disabled={busy}>Cancel</button><button className="btn btn-primary" onClick={submitTrip} disabled={busy}><Icon name="check" size={14} strokeWidth={2.4} />Schedule</button></>}>
        <div className="col gap-4">
          <div className="row gap-3">
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Vehicle *</div>
              <select className="input" value={tripForm.vehicle_id} onChange={e => setTripForm(f => ({ ...f, vehicle_id: e.target.value }))}>
                <option value="">Select…</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Driver</div>
              <input className="input" placeholder="Suresh / Mani" value={tripForm.driver} onChange={e => setTripForm(f => ({ ...f, driver: e.target.value }))} />
            </div>
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Guest</div>
              <input className="input" value={tripForm.guest} onChange={e => setTripForm(f => ({ ...f, guest: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label" style={{ marginBottom: 6 }}>Booking ID (if linked)</div>
              <input className="input" placeholder="BK-2851" value={tripForm.booking_id} onChange={e => setTripForm(f => ({ ...f, booking_id: e.target.value }))} />
            </div>
          </div>
          <div><div className="label" style={{ marginBottom: 6 }}>Purpose</div><input className="input" value={tripForm.purpose} onChange={e => setTripForm(f => ({ ...f, purpose: e.target.value }))} /></div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Departure *</div><input className="input" type="datetime-local" value={tripForm.depart_at} onChange={e => setTripForm(f => ({ ...f, depart_at: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Return *</div><input className="input" type="datetime-local" value={tripForm.return_at} onChange={e => setTripForm(f => ({ ...f, return_at: e.target.value }))} /></div>
          </div>
          <div className="row gap-3">
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Fuel cost (₹)</div><input className="input" type="number" min="0" value={tripForm.fuel_cost} onChange={e => setTripForm(f => ({ ...f, fuel_cost: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 6 }}>Mileage (km)</div><input className="input" type="number" min="0" value={tripForm.mileage} onChange={e => setTripForm(f => ({ ...f, mileage: e.target.value }))} /></div>
          </div>
        </div>
      </Modal>

      <Drawer open={!!openVehicle} onClose={() => setOpenVehicle(null)} title={openVehicle?.name || ''} width={460}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setOpenVehicle(null)}>Close</button>
          <button className="btn" onClick={() => setConfirmDel(openVehicle)}>Remove vehicle</button>
        </>}>
        {openVehicle && (
          <div>
            {openVehicle.image && <img src={openVehicle.image} alt="" style={{ width: '100%', borderRadius: 14, marginBottom: 16 }} />}
            <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{openVehicle.plate || 'No plate on file'}</div>
            <div style={{ fontSize: 13, marginTop: 8 }}>{openVehicle.notes}</div>
            <div className="display" style={{ fontSize: 16, marginTop: 18 }}>Recent trips</div>
            {trips.filter(t => t.vehicle_id === openVehicle.id).slice(0, 5).map(t => (
              <div key={t.id} style={{ padding: 12, background: 'var(--bg-3)', borderRadius: 10, marginTop: 8, fontSize: 12 }}>
                <div style={{ color: 'var(--ink)', fontWeight: 500 }}>{t.guest || 'Trip'}</div>
                <div style={{ color: 'var(--ink-3)' }}>{t.depart_at} → {t.return_at}</div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={!!confirmDel}
        title="Remove vehicle?"
        body={confirmDel ? `${confirmDel.name} will be removed from the fleet.` : ''}
        confirmLabel="Remove" danger
        onCancel={() => setConfirmDel(null)} onConfirm={() => { deleteVehicle(); setOpenVehicle(null); }} />
    </div>
  );
}
