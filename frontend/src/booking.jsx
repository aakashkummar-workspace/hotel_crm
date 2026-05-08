import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { api } from './api.js';
import './styles/booking.css';

const REVIEWS = [
  { quote: '"The kind of place that ruins other hotels for you. The morning filter coffee on the balcony alone is worth the trip."', name: 'Léa Martin', meta: 'Paris · Stayed 8 nights', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', stars: 5 },
  { quote: '"Felt like staying at a friend\'s ancestral home — but with espresso. The staff remembered our anniversary on day two."', name: 'Sarah & David Lin', meta: 'Singapore · Returning guests', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', stars: 5 },
  { quote: '"I came for two nights to write. Stayed eleven. The courtyard, the chai, the silence — exactly the work I needed."', name: 'Marcus Bell', meta: 'San Francisco · Travel writer', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', stars: 5 },
];

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dowNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const fmtDate = (d) => d ? `${monthNames[d.getMonth()].slice(0, 3)} ${d.getDate()}` : '';
const fmtDateLong = (d) => d ? `${monthNames[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}` : '';
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const inRange = (d, a, b) => a && b && d > a && d < b;
const dayOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const toYMD = (d) => d ? d.toISOString().slice(0, 10) : '';

function Calendar({ month, checkin, checkout, onPick, hover, setHover }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDow = first.getDay();
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = dayOnly(new Date());
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(<div key={'p' + i} className="cal-cell muted" />);
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(month.getFullYear(), month.getMonth(), d);
    const past = date < today;
    const isStart = sameDay(date, checkin);
    const isEnd = sameDay(date, checkout);
    const tentativeEnd = checkin && !checkout && hover && date > checkin && sameDay(date, hover);
    const inR = (checkin && checkout && inRange(date, checkin, checkout)) || (checkin && !checkout && hover && date > checkin && date < hover);
    const cls = ['cal-cell'];
    if (past) cls.push('muted');
    if (isStart) cls.push('range-start');
    if (isEnd || tentativeEnd) cls.push('range-end');
    if (inR) cls.push('in-range');
    cells.push(
      <div key={d} className={cls.join(' ')}
        onClick={() => !past && onPick(date)}
        onMouseEnter={() => !past && setHover(date)}>
        {d}
      </div>
    );
  }
  return (
    <div>
      <div className="cal-head">
        <div className="month">{monthNames[month.getMonth()]} {month.getFullYear()}</div>
      </div>
      <div className="cal">
        {dowNames.map((d, i) => <div key={i} className="cal-cell dow">{d}</div>)}
        {cells}
      </div>
    </div>
  );
}

function DateRangePopover({ checkin, checkout, onChange, onClose }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', fn); };
  }, [onClose]);

  const pick = (d) => {
    if (!checkin || (checkin && checkout)) onChange({ checkin: d, checkout: null });
    else if (d > checkin) onChange({ checkin, checkout: d });
    else onChange({ checkin: d, checkout: null });
  };
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);

  return (
    <div ref={ref} className="popover popover-daterange" style={{ left: 0, top: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <button className="cal-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
        <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--ink-3)', flex: 1, justifyContent: 'center' }}>
          {checkin && <span><strong style={{ color: 'var(--ink)' }}>{fmtDateLong(checkin)}</strong> → {checkout ? <strong style={{ color: 'var(--ink)' }}>{fmtDateLong(checkout)}</strong> : 'select check-out'}</span>}
          {!checkin && <span>Select your check-in date</span>}
        </div>
        <button className="cal-nav" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
      </div>
      <div className="cal-pair" onMouseLeave={() => setHover(null)}>
        <Calendar month={month} checkin={checkin} checkout={checkout} onPick={pick} hover={hover} setHover={setHover} />
        <Calendar month={next} checkin={checkin} checkout={checkout} onPick={pick} hover={hover} setHover={setHover} />
      </div>
    </div>
  );
}

function GuestsPopover({ guests, onChange, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', fn); };
  }, [onClose]);
  const Row = ({ label, sub, k, min = 0, max = 8 }) => (
    <div className="guest-row">
      <div>
        <div className="ttl">{label}</div>
        <div className="sub">{sub}</div>
      </div>
      <div className="stepper">
        <button disabled={guests[k] <= min} onClick={() => onChange({ ...guests, [k]: guests[k] - 1 })}>−</button>
        <span className="count">{guests[k]}</span>
        <button disabled={guests[k] >= max} onClick={() => onChange({ ...guests, [k]: guests[k] + 1 })}>+</button>
      </div>
    </div>
  );
  return (
    <div ref={ref} className="popover" style={{ right: 0, top: '100%', width: 320 }}>
      <Row label="Adults" sub="Ages 13+" k="adults" min={1} />
      <Row label="Children" sub="Ages 2 – 12" k="children" />
      <Row label="Infants" sub="Under 2" k="infants" max={4} />
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

function RoomsPopover({ rooms, onChange, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const t = setTimeout(() => document.addEventListener('mousedown', fn), 0);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', fn); };
  }, [onClose]);
  return (
    <div ref={ref} className="popover" style={{ right: 0, top: '100%', width: 240 }}>
      <div className="guest-row">
        <div>
          <div className="ttl">Rooms</div>
          <div className="sub">Number of rooms</div>
        </div>
        <div className="stepper">
          <button disabled={rooms <= 1} onClick={() => onChange(rooms - 1)}>−</button>
          <span className="count">{rooms}</span>
          <button disabled={rooms >= 5} onClick={() => onChange(rooms + 1)}>+</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ msg, onDismiss }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [msg, onDismiss]);
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--ink)', color: 'var(--bg)', padding: '14px 22px',
      borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,.25)',
      display: 'flex', alignItems: 'center', gap: 12, zIndex: 200, fontSize: 14,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 50, background: 'var(--gold-2)' }} />
      {msg}
    </div>
  );
}

function App() {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const dayAfter = new Date(today.getTime() + 4 * 86400000);

  const [rooms, setRooms] = useState([]);
  const [profile, setProfile] = useState(null);
  const [fleet, setFleet] = useState({ vehicles: [], free_from_nights: 15 });
  const [checkin, setCheckin] = useState(tomorrow);
  const [checkout, setCheckout] = useState(dayAfter);
  const [guests, setGuests] = useState({ adults: 2, children: 0, infants: 0 });
  const [roomsCount, setRoomsCount] = useState(1);
  const [openField, setOpenField] = useState(null);
  const [toast, setToast] = useState('');
  const [reserving, setReserving] = useState(null);
  const [resForm, setResForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [resBusy, setResBusy] = useState(false);
  const [confirmedId, setConfirmedId] = useState(null);
  // Manage-your-booking lookup + history state
  const [mode, setMode] = useState('book'); // 'book' | 'lookup' | 'history'
  const [lookupForm, setLookupForm] = useState({ ref: '', phone: '', email: '' });
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [history, setHistory] = useState(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({ phone: '', email: '', status: 'all', room: 'all', since: '' });

  useEffect(() => {
    const TYPE_DESCS = {
      'heritage-suite': "A colonial-era room restored with antique teak, Athangudi tiles and a private courtyard reading nook.",
      'balcony-king': 'Wake to filtered morning light from a wrought-iron balcony with a glimpse of the Bay of Bengal.',
      'courtyard-deluxe': 'Quiet inward-facing room overlooking the frangipani courtyard. Loved by writers and slow travellers.',
      'garden-twin': 'Two single beds in a softly-lit room opening onto the herb garden. Ideal for friends travelling together.',
    };
    const TYPE_TAGS = {
      'heritage-suite': 'Most loved',
      'balcony-king': 'Sea glimpse',
      'courtyard-deluxe': 'Best value',
      'garden-twin': 'Twin beds',
    };
    api.publicSite.rooms().then(rows => setRooms(rows.map((r) => ({
      ...r,
      tag: TYPE_TAGS[r.type_id] || 'Featured',
      desc: TYPE_DESCS[r.type_id] || 'A thoughtfully restored room in the main residence.',
    }))));
    api.publicSite.profile().then(setProfile);
    api.publicSite.vehicles().then(setFleet).catch(() => { /* no-op */ });
  }, []);

  // Keep the browser tab title in sync with the hotel name (so renaming the
  // hotel in Settings flows all the way out to the public site too).
  useEffect(() => {
    const name = profile?.name?.trim();
    document.title = name ? `Book your stay — ${name}` : 'Book your stay';
  }, [profile?.name]);

  const guestSum = guests.adults + guests.children;
  const guestLabel = `${guestSum} guest${guestSum !== 1 ? 's' : ''}`;
  const nights = checkin && checkout ? Math.round((checkout - checkin) / 86400000) : 0;

  const handleSearch = () => {
    if (!checkin || !checkout) {
      setToast('Please pick your check-in and check-out dates');
      return;
    }
    setToast(`Showing ${nights} night${nights !== 1 ? 's' : ''} for ${guestSum} guest${guestSum !== 1 ? 's' : ''}…`);
    setTimeout(() => {
      document.getElementById('rooms-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
  };

  const reserve = (room) => {
    if (!checkin || !checkout) {
      setToast('Pick your check-in and check-out dates first');
      document.getElementById('rooms-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setReserving(room);
    setResForm({ name: '', email: '', phone: '', notes: '' });
  };

  const submitLookup = async () => {
    if (!lookupForm.ref) { setToast('Booking reference is required'); return; }
    if (!lookupForm.phone && !lookupForm.email) { setToast('Phone or email needed to verify'); return; }
    setLookupBusy(true);
    try {
      const r = await api.publicSite.lookup(lookupForm);
      setLookupResult(r);
    } catch (e) { setToast(e.message || 'Lookup failed'); }
    finally { setLookupBusy(false); }
  };

  const submitHistory = async () => {
    if (!historyFilters.phone && !historyFilters.email) { setToast('Enter the phone or email used to book'); return; }
    setHistoryBusy(true);
    try {
      const r = await api.publicSite.history(historyFilters);
      setHistory(r);
    } catch (e) { setToast(e.message || 'Could not fetch history'); }
    finally { setHistoryBusy(false); }
  };

  const submitReservation = async () => {
    if (!resForm.name || !resForm.phone) {
      setToast('Name and phone are required');
      return;
    }
    setResBusy(true);
    try {
      const res = await api.publicSite.enquire({
        name: resForm.name,
        email: resForm.email || null,
        phone: resForm.phone,
        checkin: toYMD(checkin),
        checkout: toYMD(checkout),
        nights: Math.max(1, nights || 1),
        guests: guestSum,
        rooms: roomsCount,
        // The booking backend stores `room` as the actual room number;
        // for individual-room cards on the public site we send the room num,
        // and pass the type id along too for clarity in any future logic.
        room_type: reserving.num || reserving.id,
        amount: reserving.price * Math.max(1, nights || 1),
      });
      setConfirmedId(res.id);
      setReserving(null);
    } catch (e) {
      setToast(e.message || 'Could not submit, please try again');
    } finally {
      setResBusy(false);
    }
  };

  return (
    <div>
      <nav className="nav">
        <div className="brand">
          <span className="brand-mark display">{profile?.name || 'Aurelia'}</span>
          <span className="brand-sub">{profile?.location?.split(',')[0] || 'Pondicherry'}</span>
        </div>
        <div className="nav-links">
          <a href="#rooms-section">Rooms</a>
          <a href="#manage" onClick={() => { setMode('lookup'); setLookupResult(null); }}>Manage booking</a>
          <a href="#experiences">Experiences</a>
          <a href="#transport">Transport</a>
          <a href="#story">Our Story</a>
          <a href="#reviews">Reviews</a>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={`tel:${(profile?.phone || '').replace(/\s+/g, '')}`} className="btn btn-ghost">{profile?.phone || '+91 98400 12345'}</a>
          <button className="btn btn-primary" onClick={handleSearch}>Reserve</button>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-text">
          <span className="hero-tag">Heritage Stay · Est. 1923</span>
          <h1 className="hero-title">A quiet century<br />by the <em>Bay of Bengal</em>.</h1>
          <p className="hero-sub">Eleven restored rooms, one filter-coffee bar, and a frangipani courtyard. Five minutes from the promenade in White Town, Pondicherry.</p>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <div className="num">11</div><div className="lbl">restored rooms</div>
            </div>
            <div className="hero-meta-item">
              <div className="num">4.9</div><div className="lbl">★ from 312 stays</div>
            </div>
            <div className="hero-meta-item">
              <div className="num">3 min</div><div className="lbl">walk to the sea</div>
            </div>
          </div>
        </div>
        <div className="hero-img-wrap">
          <div className="hero-img" />
          <div className="hero-badge">
            <div>
              <div className="stars">★★★★★</div>
              <div className="quote">"It feels like a secret you want to keep."</div>
              <div className="author">Condé Nast Traveller</div>
            </div>
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '0 18px' }}>
        <div className="booking-widget">
          <div className="bw-field" onClick={() => setOpenField('dates')}>
            <span className="lbl">Check-in</span>
            <span className="val">{fmtDate(checkin)}</span>
            <span className="hint">{checkin ? checkin.getFullYear() : 'Pick a date'}</span>
            {openField === 'dates' && (
              <DateRangePopover checkin={checkin} checkout={checkout}
                onChange={({ checkin: ci, checkout: co }) => { setCheckin(ci); setCheckout(co); if (co) setOpenField(null); }}
                onClose={() => setOpenField(null)} />
            )}
          </div>
          <div className="bw-field" onClick={() => setOpenField('dates')}>
            <span className="lbl">Check-out</span>
            <span className="val">{checkout ? fmtDate(checkout) : '—'}</span>
            <span className="hint">{nights ? `${nights} night${nights !== 1 ? 's' : ''}` : 'Pick a date'}</span>
          </div>
          <div className="bw-field" onClick={() => setOpenField('guests')}>
            <span className="lbl">Guests</span>
            <span className="val">{guestLabel}</span>
            <span className="hint">{guests.children ? `${guests.children} child${guests.children !== 1 ? 'ren' : ''}` : 'adults & children'}</span>
            {openField === 'guests' && <GuestsPopover guests={guests} onChange={setGuests} onClose={() => setOpenField(null)} />}
          </div>
          <div className="bw-field" onClick={() => setOpenField('rooms')}>
            <span className="lbl">Rooms</span>
            <span className="val">{roomsCount} {roomsCount === 1 ? 'room' : 'rooms'}</span>
            <span className="hint">how many keys</span>
            {openField === 'rooms' && <RoomsPopover rooms={roomsCount} onChange={setRoomsCount} onClose={() => setOpenField(null)} />}
          </div>
          <div className="bw-cta">
            <button className="btn btn-gold" onClick={handleSearch}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
              Search rooms
            </button>
          </div>
        </div>
      </div>

      <section id="rooms-section">
        <div className="section-head">
          <div>
            <div className="eyebrow">The Rooms</div>
            <h2>Eleven keys.<br />No two alike.</h2>
          </div>
          <p>Each room was restored by hand over four years — original Athangudi tile floors, refurbished teak shutters, and locally-loomed cotton.</p>
        </div>
        <div className="rooms-grid">
          {rooms.map(r => (
            <article key={r.id} className="room">
              <div className="room-img" style={{ backgroundImage: `url(${r.image})`, backgroundPosition: `${r.image_focus_x ?? 50}% ${r.image_focus_y ?? 50}%` }}>
                <span className="room-tag">{r.tag}</span>
                <button className="room-fav" title="Save">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" /></svg>
                </button>
              </div>
              <div className="room-body">
                <h3 className="room-name">{r.name}</h3>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: -6, marginBottom: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>
                  Room {r.num} · Floor {r.floor}
                </div>
                <div className="room-meta">
                  <span>{r.beds} bed</span><span className="dot" />
                  <span>{r.sqft} sq ft</span><span className="dot" />
                  <span>up to {r.guests} guests</span>
                </div>
                <p className="room-desc">{r.desc}</p>
                <div className="room-foot">
                  <div className="room-price">
                    <div className="num">₹{r.price.toLocaleString('en-IN')}</div>
                    <div className="per">per night, incl. taxes</div>
                  </div>
                  <button className="btn btn-primary" onClick={() => reserve(r)}>Reserve</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="manage" className="manage" style={{ maxWidth: 'none' }}>
        <div className="manage-inner">
          <div className="section-head">
            <div>
              <div className="eyebrow">Manage your booking</div>
              <h2>Already booked?<br />Check your status or history.</h2>
            </div>
            <p>No login needed. Look up a single booking by reference, or pull up every stay you've had with us using the phone or email you booked with.</p>
          </div>

          <div className="manage-tabs">
            <button className={mode === 'lookup' ? 'btn btn-primary' : 'btn'} onClick={() => { setMode('lookup'); setHistory(null); }}>
              Look up a booking
            </button>
            <button className={mode === 'history' ? 'btn btn-primary' : 'btn'} onClick={() => { setMode('history'); setLookupResult(null); }}>
              View my history
            </button>
          </div>

          {mode === 'lookup' && (
            <div className="public-card" style={{ maxWidth: 720 }}>
              <div className="manage-form-row">
                <div>
                  <span className="manage-field-label">Booking reference *</span>
                  <input className="public-input" placeholder="BK-2851"
                    value={lookupForm.ref} onChange={e => setLookupForm(f => ({ ...f, ref: e.target.value }))} />
                </div>
                <div>
                  <span className="manage-field-label">Phone (last 4 ok) or email</span>
                  <input className="public-input" placeholder="9876543210 or you@example.com"
                    value={lookupForm.phone || lookupForm.email}
                    onChange={e => {
                      const v = e.target.value;
                      if (v.includes('@')) setLookupForm(f => ({ ...f, email: v, phone: '' }));
                      else setLookupForm(f => ({ ...f, phone: v, email: '' }));
                    }} />
                </div>
              </div>
              <button className="btn btn-gold" onClick={submitLookup} disabled={lookupBusy}>
                {lookupBusy ? 'Looking up…' : 'Find my booking'}
              </button>

              {lookupResult && !lookupResult.found && (
                <div style={{ marginTop: 20, padding: 14, background: 'rgba(176,74,61,0.10)', border: '1px solid rgba(176,74,61,0.3)', borderRadius: 12, color: 'var(--red)', fontSize: 14 }}>
                  {lookupResult.error}
                </div>
              )}
              {lookupResult?.found && (
                <div className="lookup-result">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 14, flexWrap: 'wrap' }}>
                    <div>
                      <div className="display" style={{ fontSize: 24, lineHeight: 1.1 }}>{lookupResult.booking.guest}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{lookupResult.booking.id} · Room {lookupResult.booking.room}</div>
                    </div>
                    <span style={{
                      padding: '6px 12px', borderRadius: 999,
                      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
                      background: lookupResult.booking.status === 'checked-in' ? 'rgba(138,111,60,0.15)' : lookupResult.booking.status === 'confirmed' ? 'rgba(79,125,74,0.15)' : lookupResult.booking.status === 'checked-out' ? 'rgba(110,100,80,0.15)' : 'rgba(176,74,61,0.15)',
                      color: lookupResult.booking.status === 'checked-in' ? 'var(--gold)' : lookupResult.booking.status === 'confirmed' ? 'var(--green)' : lookupResult.booking.status === 'checked-out' ? 'var(--ink-3)' : 'var(--red)',
                    }}>{lookupResult.booking.status}</span>
                  </div>
                  <div className="lookup-result-grid">
                    <div><span className="manage-field-label">Check-in</span><div style={{ fontSize: 15, marginTop: 2 }}>{lookupResult.booking.checkin}</div></div>
                    <div><span className="manage-field-label">Check-out</span><div style={{ fontSize: 15, marginTop: 2 }}>{lookupResult.booking.checkout}</div></div>
                    <div><span className="manage-field-label">Nights</span><div style={{ fontSize: 15, marginTop: 2 }}>{lookupResult.booking.nights}</div></div>
                    <div><span className="manage-field-label">Total</span><div style={{ fontSize: 15, marginTop: 2, color: 'var(--gold)', fontWeight: 600 }}>₹{(lookupResult.booking.amount || 0).toLocaleString('en-IN')}</div></div>
                  </div>
                  {lookupResult.booking.late_fee > 0 && (
                    <div style={{ marginTop: 18, padding: '10px 14px', background: 'rgba(212,168,71,0.12)', borderRadius: 8, fontSize: 12, color: 'var(--gold)' }}>
                      Late check-out fee: ₹{lookupResult.booking.late_fee.toLocaleString('en-IN')} ({lookupResult.booking.late_hours.toFixed(1)} hours past grace window)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'history' && (
            <div className="public-card" style={{ maxWidth: 1100 }}>
              <div className="manage-history-row">
                <div>
                  <span className="manage-field-label">Phone (last 4 ok)</span>
                  <input className="public-input" placeholder="9876543210" value={historyFilters.phone}
                    onChange={e => setHistoryFilters(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <span className="manage-field-label">or Email</span>
                  <input className="public-input" placeholder="you@example.com" value={historyFilters.email}
                    onChange={e => setHistoryFilters(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <span className="manage-field-label">Status</span>
                  <select className="public-input" value={historyFilters.status} onChange={e => setHistoryFilters(f => ({ ...f, status: e.target.value }))}>
                    <option value="all">All statuses</option>
                    <option value="pending">Pending</option><option value="confirmed">Confirmed</option>
                    <option value="checked-in">Checked-in</option><option value="checked-out">Checked-out</option>
                  </select>
                </div>
                <div>
                  <span className="manage-field-label">Since</span>
                  <input className="public-input" type="date" value={historyFilters.since}
                    onChange={e => setHistoryFilters(f => ({ ...f, since: e.target.value }))} />
                </div>
                <button className="btn btn-gold" onClick={submitHistory} disabled={historyBusy}>
                  {historyBusy ? 'Searching…' : 'Show history'}
                </button>
              </div>
              {history && (
                <div style={{ marginTop: 22 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>{history.count} booking{history.count !== 1 ? 's' : ''} found</div>
                  {history.bookings.map(b => (
                    <div key={b.id} className="history-row">
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>{b.id} · Room {b.room}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{b.checkin} → {b.checkout} · {b.nights} night{b.nights !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, background: b.status === 'checked-out' ? 'rgba(110,100,80,0.15)' : 'rgba(138,111,60,0.15)', color: b.status === 'checked-out' ? 'var(--ink-3)' : 'var(--gold)' }}>{b.status}</span>
                        <span style={{ color: 'var(--gold)', fontWeight: 600 }}>₹{(b.amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                  {history.count === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-4)' }}>No bookings found.</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section id="experiences" className="experiences" style={{ maxWidth: 'none' }}>
        <div className="experiences-inner">
          <div className="section-head">
            <div>
              <div className="eyebrow">Experiences</div>
              <h2>The slow side<br />of Pondicherry.</h2>
            </div>
            <p>Curated by us, hosted by the people who actually live here. All bookable from your room with a small WhatsApp.</p>
          </div>
          <div className="exp-grid">
            <div className="exp exp-1"><h3>Sunrise on the rocks</h3><p>4:50am pickup · French quarter · Auroville chai stop</p></div>
            <div className="exp exp-2"><h3>Filter-coffee craft</h3><p>With our barista Ravi · 90 mins</p></div>
            <div className="exp exp-3"><h3>Old town walk</h3><p>Architecture & ghost stories · 2 hr</p></div>
            <div className="exp exp-4"><h3>Ayurvedic supper</h3><p>Hosted at the courtyard · Wed & Sat</p></div>
            <div className="exp exp-5"><h3>Bicycle the headland</h3><p>Pre-loaded route · helmets included</p></div>
          </div>
        </div>
      </section>

      {fleet.vehicles.length > 0 && (
        <section id="transport">
          <div className="section-head">
            <div>
              <div className="eyebrow">Hotel transport</div>
              <h2>From the airport,<br />or just down the coast.</h2>
            </div>
            <p>
              Our drivers know every shortcut in Pondicherry. Rides can be booked from the front desk on arrival.
              <br /><br />
              <strong style={{ color: 'var(--gold)' }}>Stays of {fleet.free_from_nights} nights or more</strong> include a complimentary hotel car for sightseeing, the airport, or wherever the day takes you.
            </p>
          </div>
          <div className="fleet-grid">
            {fleet.vehicles.map(v => (
              <article key={v.id} className="fleet-card">
                <div className="fleet-card-img" style={{ backgroundImage: v.image ? `url(${v.image})` : 'none' }}>
                  <span className="fleet-status-pill" style={{ color: v.status === 'available' ? 'var(--green)' : 'var(--ink-3)' }}>
                    {v.status === 'available' ? 'Available' : v.status}
                  </span>
                </div>
                <div className="fleet-card-body">
                  <h3 className="fleet-card-name">{v.name}</h3>
                  <div className="fleet-card-meta">
                    <span>{v.capacity} seats</span>
                    <span className="dot" />
                    <span>Driver included</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section id="story">
        <div className="story">
          <div className="story-img" />
          <div className="story-text">
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--gold)', marginBottom: 12 }}>Our Story</div>
            <h2>A doctor's house. A grandmother's recipes. A century of slow afternoons.</h2>
            <p>{profile?.about || "Aurelia was first the home of Dr. Marie-Louise Aurelia, a French-Tamil physician who arrived in Pondicherry in 1923. The house passed through three generations before we found it, half-asleep, in 2019."}</p>
            <p>Four years of restoration later — limewashed walls, Athangudi tile by tile, the original brass fans rewired — we opened with eleven rooms, a coffee bar, and a single rule: nothing should feel rushed.</p>
            <div className="story-stats">
              <div><div className="num">1923</div><div className="lbl">Originally built</div></div>
              <div><div className="num">94%</div><div className="lbl">Materials sourced locally</div></div>
              <div><div className="num">B Corp</div><div className="lbl">Certified since 2024</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="reviews" className="reviews" style={{ maxWidth: 'none' }}>
        <div className="reviews-inner">
          <div className="section-head">
            <div>
              <div className="eyebrow">Guest reviews</div>
              <h2>312 stays.<br />4.9 ★ average.</h2>
            </div>
            <p>From handwritten notes left on the welcome desk to TripAdvisor and Booking.com.</p>
          </div>
          <div className="review-grid">
            {REVIEWS.map((r, i) => (
              <div key={i} className="review">
                <div className="review-stars">{'★'.repeat(r.stars)}</div>
                <div className="review-quote">{r.quote}</div>
                <div className="review-author">
                  <div className="review-avatar" style={{ backgroundImage: `url(${r.avatar})` }} />
                  <div>
                    <div className="review-name">{r.name}</div>
                    <div className="review-meta">{r.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand"><span className="brand-mark display">{profile?.name || 'Aurelia'}</span></div>
            <p>{profile?.tagline || 'Heritage Stay & Coffee House.'}<br />{profile?.location || '15 Rue Suffren, White Town, Pondicherry 605001.'}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <a className="btn" href="#">Get directions</a>
              <a className="btn btn-ghost" href={`https://wa.me/${(profile?.phone || '+919840012345').replace(/\D/g, '')}`}>WhatsApp us</a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Stay</h4>
            <a href="#rooms-section">Rooms</a>
            <a href="#experiences">Experiences</a>
            <a href="#">Long stays</a>
            <a href="#">Private buyout</a>
          </div>
          <div className="footer-col">
            <h4>House</h4>
            <a href="#story">Our story</a>
            <a href="#">Coffee bar</a>
            <a href="#">Mini hall events</a>
            <a href="#">Press kit</a>
          </div>
          <div className="footer-col">
            <h4>Help</h4>
            <a href={`mailto:${profile?.email || 'concierge@aurelia.in'}`}>{profile?.email || 'concierge@aurelia.in'}</a>
            <a href={`tel:${(profile?.phone || '').replace(/\s+/g, '')}`}>{profile?.phone || '+91 98400 12345'}</a>
            <a href="#">Cancellation policy</a>
            <a href="#">Privacy</a>
          </div>
        </div>
        <div className="footer-bot">
          <span>© {new Date().getFullYear()} {profile?.name || 'Aurelia'} Heritage Stay Pvt. Ltd. · GSTIN {profile?.gstin || '33AAACA1234B1ZE'}</span>
          <span>Made slowly in Pondicherry.</span>
        </div>
      </footer>

      {(reserving || confirmedId) && (
        <div onClick={() => { setReserving(null); setConfirmedId(null); }} style={{
          position: 'fixed', inset: 0, background: 'transparent', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 22,
            width: 520, maxWidth: '92vw', maxHeight: '90vh', overflow: 'auto',
            boxShadow: '0 30px 80px rgba(0,0,0,.25)',
          }}>
            {confirmedId ? (
              <div style={{ padding: 36, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(127,166,122,0.15)', color: '#4f7d4a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <div className="display" style={{ fontSize: 28, marginBottom: 8 }}>Reservation received</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 20 }}>
                  Reference <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{confirmedId}</span>. We'll be in touch within 12 hours to confirm your dates and take a deposit.
                </div>
                <button className="btn btn-primary" onClick={() => setConfirmedId(null)} style={{ padding: '12px 28px' }}>Close</button>
              </div>
            ) : (
              <div style={{ padding: 36 }}>
                <div className="display" style={{ fontSize: 26, marginBottom: 6 }}>Reserve {reserving.name}</div>
                <div style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 22 }}>
                  {fmtDateLong(checkin)} → {fmtDateLong(checkout)} · {nights} night{nights !== 1 ? 's' : ''} · {guestSum} guest{guestSum !== 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Full name *</div>
                    <input value={resForm.name} onChange={e => setResForm(f => ({ ...f, name: e.target.value }))}
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--line-2)', borderRadius: 12, background: 'var(--bg-3)', color: 'var(--ink)', fontSize: 15, outline: 'none' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phone *</div>
                      <input value={resForm.phone} onChange={e => setResForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+91 …"
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--line-2)', borderRadius: 12, background: 'var(--bg-3)', color: 'var(--ink)', fontSize: 15, outline: 'none' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Email</div>
                      <input type="email" value={resForm.email} onChange={e => setResForm(f => ({ ...f, email: e.target.value }))}
                        style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--line-2)', borderRadius: 12, background: 'var(--bg-3)', color: 'var(--ink)', fontSize: 15, outline: 'none' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Anything we should know?</div>
                    <textarea rows="3" value={resForm.notes} onChange={e => setResForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Allergies, preferences, anniversary, ETA…"
                      style={{ width: '100%', padding: '12px 14px', border: '1px solid var(--line-2)', borderRadius: 12, background: 'var(--bg-3)', color: 'var(--ink)', fontSize: 15, outline: 'none', resize: 'vertical' }} />
                  </div>
                </div>
                <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-3)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Estimated total</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>₹{reserving.price.toLocaleString('en-IN')} × {nights} nights · taxes included</div>
                  </div>
                  <div className="display" style={{ fontSize: 28, color: 'var(--gold)' }}>₹{(reserving.price * Math.max(1, nights || 1)).toLocaleString('en-IN')}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                  <button className="btn" onClick={() => setReserving(null)} disabled={resBusy}>Cancel</button>
                  <button className="btn btn-gold" onClick={submitReservation} disabled={resBusy}>
                    {resBusy ? 'Submitting…' : 'Confirm reservation'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Toast msg={toast} onDismiss={() => setToast('')} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
