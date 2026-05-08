import { useEffect, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { Avatar, Metric, Modal, Pill, StatusPill } from '../components/primitives.jsx';
import { ExpenseBars } from '../components/charts.jsx';
import { RevenueChart } from '../components/charts.jsx';
import { api, downloadCSV, fmtINR, fmtINRk } from '../api.js';

function KpiCard({ children, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', transition: 'transform .15s, border-color .15s', borderRadius: 'var(--radius)' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.firstChild.style.borderColor = 'var(--gold-line)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.firstChild.style.borderColor = 'var(--line)'; }}>
      {children}
    </div>
  );
}

function KpiSparkBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--ink-2)' }}>{label}</span>
        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{fmtINR(value)}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${max ? (value / max) * 100 : 0}%`, background: color, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

function KpiDetailModal({ kind, onClose, data, bookings, invoices, coffee, hall }) {
  if (!kind || !data) return null;

  const revenue30 = data.revenue.revenue30d || [];
  const todayRow = revenue30[revenue30.length - 1] || { rooms: 0, cafe: 0, hall: 0, total: 0 };
  const yesterdayRow = revenue30[revenue30.length - 2] || { rooms: 0, cafe: 0, hall: 0, total: 0 };
  const monthRevenue = revenue30.reduce((s, d) => s + d.total, 0);
  const totalExpenses = data.expenses.total;
  const expenseBreakdown = data.expenses.breakdown || [];

  const titles = {
    today: { title: "Today's revenue", sub: 'Live breakdown of today\'s earnings across all modules', icon: 'arrowUp' },
    month: { title: 'Monthly revenue', sub: 'Month-to-date performance and daily trend', icon: 'chart' },
    expenses: { title: 'Total expenses', sub: 'Spending across all categories', icon: 'receipt' },
    profit: { title: 'Net profit', sub: 'Revenue minus expenses, with margin', icon: 'trendUp' },
  };
  const t = titles[kind];

  return (
    <Modal open={!!kind} onClose={onClose} title={t.title} width={620}>
      <div style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: -12, marginBottom: 22 }}>{t.sub}</div>

      {kind === 'today' && (
        <div className="col gap-5">
          <div className="row gap-4" style={{ padding: 18, background: 'var(--bg-3)', borderRadius: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="label">Today</div>
              <div className="display" style={{ fontSize: 32, color: 'var(--gold-2)', lineHeight: 1.05 }}>{fmtINR(todayRow.total)}</div>
            </div>
            <div className="vdivider" />
            <div style={{ flex: 1 }}>
              <div className="label">Yesterday</div>
              <div className="display" style={{ fontSize: 22 }}>{fmtINR(yesterdayRow.total)}</div>
              <div style={{ fontSize: 12, color: todayRow.total >= yesterdayRow.total ? '#9bc497' : '#db9088', marginTop: 4 }}>
                {todayRow.total >= yesterdayRow.total ? '↑' : '↓'} {yesterdayRow.total ? Math.abs(Math.round(((todayRow.total - yesterdayRow.total) / yesterdayRow.total) * 100)) : 0}% vs yesterday
              </div>
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 12 }}>Module breakdown</div>
            <KpiSparkBar label="Rooms" value={todayRow.rooms} max={todayRow.total} color="#c9a96e" />
            <KpiSparkBar label="Coffee Shop" value={todayRow.cafe} max={todayRow.total} color="#e3c688" />
            <KpiSparkBar label="Mini Hall" value={todayRow.hall} max={todayRow.total} color="#7fa67a" />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Recent café orders</div>
            {coffee.slice(0, 4).map(o => (
              <div key={o.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-2)' }}>{o.id} · {o.time} · {o.table_label}</span>
                <span style={{ color: 'var(--gold-2)', fontWeight: 500 }}>{fmtINR(o.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {kind === 'month' && (
        <div className="col gap-5">
          <div className="row gap-4" style={{ padding: 18, background: 'var(--bg-3)', borderRadius: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="label">Month-to-date</div>
              <div className="display" style={{ fontSize: 32, color: 'var(--gold-2)', lineHeight: 1.05 }}>{fmtINR(monthRevenue)}</div>
            </div>
            <div className="vdivider" />
            <div style={{ flex: 1 }}>
              <div className="label">Daily average</div>
              <div className="display" style={{ fontSize: 22 }}>{fmtINR(Math.round(monthRevenue / Math.max(1, revenue30.length)))}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>across {revenue30.length} day{revenue30.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="vdivider" />
            <div style={{ flex: 1 }}>
              <div className="label">Best day</div>
              <div className="display" style={{ fontSize: 22 }}>{fmtINR(Math.max(0, ...revenue30.map(d => d.total)))}</div>
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Top 5 days this month</div>
            {[...revenue30].sort((a, b) => b.total - a.total).slice(0, 5).map(d => (
              <div key={d.day} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-2)' }}>Day {d.day}</span>
                <div className="row gap-3" style={{ fontSize: 12, color: 'var(--ink-4)' }}>
                  <span>R {fmtINRk(d.rooms)}</span>
                  <span>C {fmtINRk(d.cafe)}</span>
                  {d.hall > 0 && <span style={{ color: '#9bc497' }}>H {fmtINRk(d.hall)}</span>}
                  <span style={{ color: 'var(--gold-2)', fontWeight: 500, minWidth: 80, textAlign: 'right' }}>{fmtINR(d.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {kind === 'expenses' && (
        <div className="col gap-5">
          <div className="row gap-4" style={{ padding: 18, background: 'var(--bg-3)', borderRadius: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="label">This month</div>
              <div className="display" style={{ fontSize: 32, color: '#e8c266', lineHeight: 1.05 }}>{fmtINR(totalExpenses)}</div>
            </div>
            <div className="vdivider" />
            <div style={{ flex: 1 }}>
              <div className="label">Largest category</div>
              <div className="display" style={{ fontSize: 18 }}>{expenseBreakdown[0]?.name || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>{expenseBreakdown[0] ? fmtINR(expenseBreakdown[0].value) : ''}</div>
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 12 }}>By category</div>
            {expenseBreakdown.map(b => (
              <KpiSparkBar key={b.name} label={b.name} value={b.value} max={expenseBreakdown[0]?.value || 1} color="#c9a96e" />
            ))}
          </div>
        </div>
      )}

      {kind === 'profit' && (
        <div className="col gap-5">
          <div className="row gap-4" style={{ padding: 18, background: 'var(--bg-3)', borderRadius: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="label">Net profit</div>
              <div className="display" style={{ fontSize: 32, color: '#9bc497', lineHeight: 1.05 }}>{fmtINR(monthRevenue - totalExpenses)}</div>
            </div>
            <div className="vdivider" />
            <div style={{ flex: 1 }}>
              <div className="label">Margin</div>
              <div className="display" style={{ fontSize: 32, color: 'var(--ink)', lineHeight: 1.05 }}>{monthRevenue ? Math.round(((monthRevenue - totalExpenses) / monthRevenue) * 100) : 0}%</div>
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 12 }}>Profit waterfall</div>
            <KpiSparkBar label="+ Total revenue" value={monthRevenue} max={monthRevenue} color="#7fa67a" />
            <KpiSparkBar label="− Total expenses" value={totalExpenses} max={monthRevenue} color="#c97a6e" />
            <div className="divider" style={{ margin: '12px 0' }} />
            <div className="row" style={{ justifyContent: 'space-between', fontSize: 14 }}>
              <span className="display" style={{ fontSize: 18 }}>= Net profit</span>
              <span className="display" style={{ fontSize: 22, color: '#9bc497' }}>{fmtINR(monthRevenue - totalExpenses)}</span>
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Recent paid invoices</div>
            {invoices.filter(i => i.status === 'paid').slice(0, 4).map(i => (
              <div key={i.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{ color: 'var(--ink-2)' }}>{i.id} · {i.guest}</span>
                <span style={{ color: '#9bc497', fontWeight: 500 }}>{fmtINR(i.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function LegendDot({ color, label, value }) {
  return (
    <div className="row gap-2" style={{ fontSize: 12 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span style={{ color: 'var(--ink-3)' }}>{label}</span>
      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function RingGauge({ percent }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180">
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--line)" strokeWidth="14" />
      <circle cx="90" cy="90" r={r} fill="none"
        stroke="url(#ring-grad)" strokeWidth="14"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        transform="rotate(-90 90 90)"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e3c688" />
          <stop offset="100%" stopColor="#c9a96e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function RoomStatBox({ label, count, status }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 10 }}>
      <div className="row gap-2" style={{ marginBottom: 4 }}>
        <span className={`status-dot status-${status}`} style={{ width: 6, height: 6 }} />
        <span style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div className="display" style={{ fontSize: 22, color: 'var(--ink)' }}>{count}</div>
    </div>
  );
}

function ModuleCard({ title, icon, revenue, sub, onClick }) {
  return (
    <div className="card" style={{ padding: 20, cursor: 'pointer', transition: 'all .2s' }}
      onClick={onClick}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-line)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--gold-soft)', color: 'var(--gold-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} />
        </div>
        <Icon name="arrowUpRight" size={16} color="var(--ink-4)" />
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 4 }}>{title}</div>
      <div className="display" style={{ fontSize: 28, color: 'var(--ink)', lineHeight: 1.1 }}>{fmtINRk(revenue)}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>{sub}</div>
    </div>
  );
}

export default function Dashboard({ onNavigate, onToast }) {
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [coffee, setCoffee] = useState([]);
  const [hall, setHall] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [busyId, setBusyId] = useState(null);
  const [kpiOpen, setKpiOpen] = useState(null);

  const [lateCheckouts, setLateCheckouts] = useState({ flagged: [], departed: [], std_checkout_time: '11:00', grace_hours: 2 });

  const refresh = () => Promise.all([
    api.reports.summary(),
    api.bookings.list(),
    api.invoices.list(),
    api.coffee.orders(),
    api.hall.list(),
    api.bookings.lateToday().catch(() => null),
  ]).then(([summary, b, inv, c, h, lt]) => {
    setData(summary); setBookings(b); setInvoices(inv); setCoffee(c); setHall(h);
    if (lt) setLateCheckouts(lt);
  });
  useEffect(() => { refresh(); }, []);

  const checkIn = async (b) => {
    setBusyId(b.id);
    try {
      // Backend now syncs room status automatically when booking status changes
      await api.bookings.update(b.id, { status: 'checked-in' });
      onToast?.(`${b.guest} checked into Room ${b.room}`);
      await refresh();
    } catch (e) { onToast?.(e.message || 'Could not check in'); }
    finally { setBusyId(null); }
  };

  const exportCSV = () => {
    const rev = data?.revenue?.revenue30d || [];
    downloadCSV(`aurelia-dashboard-${new Date().toISOString().slice(0, 10)}.csv`, rev, ['day', 'rooms', 'cafe', 'hall', 'total']);
    onToast?.('Dashboard exported as CSV');
  };

  const periodSlice = (rows) => {
    if (!rows) return [];
    if (period === '90d') return rows;
    if (period === 'ytd') return rows;
    return rows.slice(-30);
  };

  if (!data) return <div className="page" style={{ color: 'var(--ink-3)' }}>Loading dashboard…</div>;

  const totalRooms = data.rooms.total;
  const occupiedCount = data.rooms.byStatus.occupied || 0;
  const availableCount = data.rooms.byStatus.available || 0;
  const reservedCount = data.rooms.byStatus.reserved || 0;
  const cleaningCount = data.rooms.byStatus.cleaning || 0;
  const occupancyPct = totalRooms ? Math.round((occupiedCount / totalRooms) * 100) : 0;

  const upcomingCheckins = bookings.filter(b => b.status === 'confirmed').slice(0, 4);

  const revenue30 = periodSlice(data.revenue.revenue30d || []);
  const todayRevenue = revenue30.length ? revenue30[revenue30.length - 1].total : 0;
  const monthRevenue = revenue30.reduce((s, d) => s + d.total, 0);
  const totalExpenses = data.expenses.total;
  const expenseBreakdown = data.expenses.breakdown.map(b => ({ name: b.name, value: b.value }));
  const revenueModules = data.revenue.modules;
  const todayCoffee = coffee.reduce((s, o) => s + o.total, 0);

  return (
    <div className="page page-enter">
      <div className="row stagger" style={{ alignItems: 'flex-end', marginBottom: 28, gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ marginBottom: 10 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</div>
          <div className="display" style={{ fontSize: 38, lineHeight: 1.05, color: 'var(--ink)' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, <span style={{ fontStyle: 'italic', color: 'var(--gold-2)' }}>Vikram</span>.
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 15, marginTop: 8, maxWidth: 540 }}>
            {occupiedCount} of {totalRooms} rooms are occupied. {hall.length} events on the calendar this week.
          </div>
        </div>
        <div className="row gap-2">
          <button className="btn" onClick={exportCSV}><Icon name="download" size={14} />Export</button>
          <button className="btn btn-primary" onClick={() => onNavigate('bookings')}>
            <Icon name="plus" size={14} strokeWidth={2.4} />New booking
          </button>
        </div>
      </div>

      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <KpiCard onClick={() => setKpiOpen('today')}>
          <Metric label="Today's revenue" value={fmtINRk(todayRevenue)} sub="Rooms, café, hall combined · click for breakdown" trend={12} accent="var(--gold-2)" sparkData={revenue30.slice(-14).map(d => d.total)} />
        </KpiCard>
        <KpiCard onClick={() => setKpiOpen('month')}>
          <Metric label="Monthly revenue" value={fmtINRk(monthRevenue)} sub="Month-to-date · click for daily trend" trend={8} sparkData={revenue30.map(d => d.total)} />
        </KpiCard>
        <KpiCard onClick={() => setKpiOpen('expenses')}>
          <Metric label="Total expenses" value={fmtINRk(totalExpenses)} sub={`${expenseBreakdown.length} categories · click for breakdown`} trend={-3} sparkData={[14, 18, 12, 16, 20, 15, 18, 22, 19, 24]} />
        </KpiCard>
        <KpiCard onClick={() => setKpiOpen('profit')}>
          <Metric label="Net profit" value={fmtINRk(monthRevenue - totalExpenses)} sub={`Margin ${monthRevenue ? Math.round(((monthRevenue - totalExpenses) / monthRevenue) * 100) : 0}% · click for waterfall`} trend={14} accent="#9bc497" sparkData={[8, 10, 12, 9, 14, 18, 15, 20, 22, 24]} />
        </KpiCard>
      </div>

      <KpiDetailModal kind={kpiOpen} onClose={() => setKpiOpen(null)} data={data} bookings={bookings} invoices={invoices} coffee={coffee} hall={hall} />

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div className="display" style={{ fontSize: 20 }}>Revenue, last 30 days</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2 }}>Stacked: rooms · café · hall</div>
            </div>
            <div className="seg">
              <button data-active={period === '30d'} onClick={() => setPeriod('30d')}>30d</button>
              <button data-active={period === '90d'} onClick={() => setPeriod('90d')}>90d</button>
              <button data-active={period === 'ytd'} onClick={() => setPeriod('ytd')}>YTD</button>
            </div>
          </div>
          <RevenueChart data={revenue30} height={260} />
          <div className="row gap-4" style={{ marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <LegendDot color="#c9a96e" label="Rooms" value={fmtINRk(revenueModules[0]?.value || 0)} />
            <LegendDot color="#e3c688" label="Coffee Shop" value={fmtINRk(revenueModules[1]?.value || 0)} />
            <LegendDot color="#7fa67a" label="Mini Hall" value={fmtINRk(revenueModules[2]?.value || 0)} />
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="display" style={{ fontSize: 20 }}>Occupancy</div>
            <Pill tone="gold">{occupancyPct}% today</Pill>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', height: 180 }}>
            <RingGauge percent={occupancyPct} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
              <div className="display" style={{ fontSize: 38, lineHeight: 1, color: 'var(--ink)' }}>{occupancyPct}<span style={{ fontSize: 18, color: 'var(--ink-3)' }}>%</span></div>
              <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Occupied</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
            <RoomStatBox label="Available" count={availableCount} status="available" />
            <RoomStatBox label="Occupied" count={occupiedCount} status="occupied" />
            <RoomStatBox label="Reserved" count={reservedCount} status="reserved" />
            <RoomStatBox label="Cleaning" count={cleaningCount} status="cleaning" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <ModuleCard title="Rooms" icon="bed" revenue={revenueModules[0]?.value || 0} sub={`${occupiedCount}/${totalRooms} rooms occupied`} onClick={() => onNavigate('rooms')} />
        <ModuleCard title="Coffee Shop" icon="coffee" revenue={revenueModules[1]?.value || 0} sub={`${coffee.length} orders today · ${fmtINR(todayCoffee)}`} onClick={() => onNavigate('coffee')} />
        <ModuleCard title="Mini Hall" icon="users" revenue={revenueModules[2]?.value || 0} sub={`${hall.length} events booked`} onClick={() => onNavigate('hall')} />
      </div>

      {/* Late check-outs today (only when there are any) */}
      {(lateCheckouts.flagged.length > 0 || lateCheckouts.departed.length > 0) && (
        <div className="card" style={{ padding: 18, marginBottom: 16, background: 'rgba(212,168,71,0.08)', borderColor: 'rgba(212,168,71,0.3)' }}>
          <div className="row gap-2" style={{ alignItems: 'center', marginBottom: 10 }}>
            <Icon name="flame" size={16} color="#e8c266" />
            <div className="display" style={{ fontSize: 16, color: '#e8c266' }}>Late check-outs today</div>
            <span className="badge badge-amber">{lateCheckouts.flagged.length + lateCheckouts.departed.length}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-4)' }}>
              Standard: {lateCheckouts.std_checkout_time} · {lateCheckouts.grace_hours}h grace
            </span>
          </div>
          {lateCheckouts.flagged.map(b => (
            <div key={b.id} className="row gap-3" style={{ padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>
              <span style={{ color: 'var(--ink)', fontWeight: 500, flex: 1 }}>{b.guest} <span style={{ color: 'var(--ink-4)', fontSize: 11, marginLeft: 6 }}>{b.id} · Room {b.room}</span></span>
              <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{b.projected_late_hours.toFixed(1)}h past grace</span>
              <span style={{ color: '#e8c266', fontWeight: 500 }}>{fmtINR(b.projected_late_fee)} due</span>
            </div>
          ))}
          {lateCheckouts.departed.map(b => (
            <div key={b.id} className="row gap-3" style={{ padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 13 }}>
              <span style={{ color: 'var(--ink)', fontWeight: 500, flex: 1 }}>{b.guest} <span style={{ color: 'var(--ink-4)', fontSize: 11, marginLeft: 6 }}>{b.id} · Room {b.room}</span> <span style={{ marginLeft: 6, fontSize: 11, color: '#9bc497' }}>departed</span></span>
              <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{(b.late_hours || 0).toFixed(1)}h late</span>
              <span style={{ color: '#9bc497', fontWeight: 500 }}>{fmtINR(b.late_fee)} charged</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="row" style={{ padding: '18px 20px 12px', justifyContent: 'space-between' }}>
            <div className="display" style={{ fontSize: 18 }}>Upcoming check-ins</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('bookings')}>View all<Icon name="arrowRight" size={12} /></button>
          </div>
          <div>
            {upcomingCheckins.map(b => (
              <div key={b.id} className="row gap-3" style={{ padding: '12px 20px', borderTop: '1px solid var(--line)' }}>
                <Avatar name={b.guest} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{b.guest}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{b.checkin}</div>
                  </div>
                  <div className="row gap-3" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                    <span>Room {b.room}</span><span>·</span>
                    <span>{b.nights} nights</span><span>·</span>
                    <span style={{ color: 'var(--gold-2)' }}>{fmtINR(b.amount)}</span>
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => checkIn(b)} disabled={busyId === b.id}>{busyId === b.id ? 'Checking in…' : 'Check in'}</button>
              </div>
            ))}
            {upcomingCheckins.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>No upcoming check-ins.</div>}
          </div>
        </div>

        <div className="card">
          <div className="row" style={{ padding: '18px 20px 12px', justifyContent: 'space-between' }}>
            <div className="display" style={{ fontSize: 18 }}>Recent transactions</div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('invoices')}>View all<Icon name="arrowRight" size={12} /></button>
          </div>
          <div>
            {invoices.slice(0, 4).map(inv => (
              <div key={inv.id} className="row gap-3" style={{ padding: '12px 20px', borderTop: '1px solid var(--line)' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: inv.status === 'paid' ? 'rgba(127,166,122,0.12)' : 'var(--gold-soft)',
                  color: inv.status === 'paid' ? '#9bc497' : 'var(--gold-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon name={inv.status === 'paid' ? 'check' : 'arrowDown'} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{inv.guest}</div>
                    <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{fmtINR(inv.total)}</div>
                  </div>
                  <div className="row gap-3" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                    <span>{inv.id}</span><span>·</span>
                    <span>{inv.method}</span><span>·</span>
                    <StatusPill status={inv.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div className="display" style={{ fontSize: 18, marginBottom: 6 }}>Booking sources</div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, marginBottom: 18 }}>This month</div>
          <div className="col gap-3">
            {data.bookingSources.map((s, i) => (
              <div key={s.name}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <div className="row gap-2" style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: ['#c9a96e', '#e3c688', '#7fa67a', '#7a93c9'][i % 4] }} />
                    {s.name}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{s.value}%</div>
                </div>
                <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${s.value}%`, background: ['#c9a96e', '#e3c688', '#7fa67a', '#7a93c9'][i % 4], borderRadius: 3, transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <div>
              <div className="display" style={{ fontSize: 18 }}>Expense breakdown</div>
              <div style={{ color: 'var(--ink-3)', fontSize: 12, marginTop: 2 }}>{expenseBreakdown.length} categories</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('expenses')}>Manage<Icon name="arrowRight" size={12} /></button>
          </div>
          <ExpenseBars data={expenseBreakdown} height={240} />
        </div>
      </div>
    </div>
  );
}
