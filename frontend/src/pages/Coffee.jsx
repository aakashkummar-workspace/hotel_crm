import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog, Modal, Pill, SectionHeader } from '../components/primitives.jsx';
import { api, downloadCSV, fmtINR } from '../api.js';

function DailyStat({ label, value, sub }) {
  return (
    <div className="card" style={{ flex: 1, padding: 14 }}>
      <div className="label" style={{ marginBottom: 4 }}>{label}</div>
      <div className="display" style={{ fontSize: 22, color: 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

export default function Coffee({ onToast }) {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [guestNames, setGuestNames] = useState([]);
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [tableNum, setTableNum] = useState('T2');
  const [payment, setPayment] = useState('UPI');
  const [customer, setCustomer] = useState('');
  const [busy, setBusy] = useState(false);
  const [showZReport, setShowZReport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: '', category: 'Espresso', price: 0, description: '' });
  const [confirmDel, setConfirmDel] = useState(null);

  const submitMenuItem = async () => {
    if (!itemForm.name || !itemForm.price) { onToast?.('Name and price required'); return; }
    setBusy(true);
    try {
      const body = { ...itemForm, price: Number(itemForm.price) };
      if (editingItem) await api.coffee.updateMenu(editingItem.id, body);
      else await api.coffee.addMenu(body);
      onToast?.(editingItem ? 'Menu item updated' : 'Menu item added');
      setEditingItem(null);
      setItemForm({ name: '', category: itemForm.category, price: 0, description: '' });
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not save'); }
    finally { setBusy(false); }
  };

  const deleteMenuItem = async () => {
    if (!confirmDel) return;
    try {
      await api.coffee.removeMenu(confirmDel.id);
      onToast?.('Item removed');
      setConfirmDel(null);
      refresh();
    } catch (e) { onToast?.(e.message); }
  };

  const refresh = async () => {
    const [m, o, r, g] = await Promise.all([
      api.coffee.menu(),
      api.coffee.orders(),
      api.rooms.list().catch(() => ({ rooms: [] })),
      api.guests.list().catch(() => []),
    ]);
    setMenu(m);
    setOrders(o);
    setRooms(r.rooms || []);
    // Combine guest names from CRM + bookings (deduped, sorted) for autocomplete.
    const names = new Set((g || []).map(x => x.name).filter(Boolean));
    setGuestNames([...names].sort());
  };
  useEffect(() => { refresh(); }, []);

  const categories = useMemo(() => ['All', ...new Set(menu.map(m => m.category))], [menu]);
  const filtered = menu.filter(m => category === 'All' || m.category === category);

  const addToCart = (item) => {
    setCart(c => {
      const ex = c.find(x => x.id === item.id);
      if (ex) return c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...c, { ...item, qty: 1 }];
    });
  };
  const updateQty = (id, delta) => {
    setCart(c => c.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x).filter(x => x.qty > 0));
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  const todayTotal = orders.reduce((s, o) => s + o.total, 0);

  const charge = async () => {
    if (cart.length === 0) return;
    setBusy(true);
    try {
      const order = await api.coffee.createOrder({
        items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
        table_label: tableNum,
        payment,
      });
      onToast(`Order ${order.id} charged · ${fmtINR(order.total)}${customer ? ` · ${customer}` : ''}`);
      setCart([]);
      setCustomer('');
      refresh();
    } catch (e) {
      onToast(e.message || 'Could not charge order');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-enter" style={{ paddingBottom: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <SectionHeader
        eyebrow="Café"
        title="Coffee Shop"
        sub={`${orders.length} orders today · ${fmtINR(todayTotal)} in sales`}
        right={
          <div className="row gap-2">
            <button className="btn" onClick={() => setShowZReport(true)}><Icon name="receipt" size={14} />Z-report</button>
            <button className="btn" onClick={() => setShowMenu(true)}><Icon name="utensils" size={14} />Menu</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, flex: 1, minHeight: 0 }}>
        <div className="col" style={{ minHeight: 0 }}>
          <div className="row gap-3" style={{ marginBottom: 14, flexShrink: 0 }}>
            <DailyStat label="Orders today" value={orders.length} sub="+18% vs yesterday" />
            <DailyStat label="Revenue today" value={fmtINR(todayTotal)} sub={`Avg ${fmtINR(orders.length ? Math.round(todayTotal / orders.length) : 0)} / order`} />
            <DailyStat label="Top item" value="Cappuccino" sub="14 sold today" />
          </div>

          <div className="row gap-2" style={{ marginBottom: 16, flexShrink: 0, flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button key={c} className="btn btn-sm" onClick={() => setCategory(c)}
                style={category === c ? { background: 'var(--gold-soft)', borderColor: 'var(--gold-line)', color: 'var(--gold-2)' } : {}}>{c}</button>
            ))}
          </div>

          <div style={{ overflowY: 'auto', paddingRight: 8, paddingBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {filtered.map(item => (
                <button key={item.id} onClick={() => addToCart(item)} className="card"
                  style={{ padding: 14, textAlign: 'left', border: '1px solid var(--line)', cursor: 'pointer', transition: 'all .15s', background: 'var(--panel)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-line)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--gold-2)', fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtINR(item.price)}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.category}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>{item.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-elevated col" style={{ minHeight: 0, marginBottom: 24 }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="display" style={{ fontSize: 18 }}>New Order</div>
              <Pill tone="amber">Open</Pill>
            </div>
            <div className="row gap-2" style={{ marginTop: 10 }}>
              <select className="input" style={{ flex: 1 }} value={tableNum}
                onChange={e => {
                  const v = e.target.value;
                  setTableNum(v);
                  // If picking an occupied/reserved room, auto-fill the customer
                  if (v.startsWith('Room ')) {
                    const num = v.replace('Room ', '');
                    const r = rooms.find(x => x.num === num);
                    if (r?.guest && !customer) setCustomer(r.guest);
                  }
                }}>
                <optgroup label="Tables">
                  <option>T1</option><option>T2</option><option>T3</option><option>T4</option><option>T5</option>
                </optgroup>
                <optgroup label="To-go">
                  <option>Takeaway</option>
                </optgroup>
                <optgroup label="Rooms">
                  {rooms.map(r => (
                    <option key={r.num} value={`Room ${r.num}`}>
                      Room {r.num}{r.guest ? ` — ${r.guest}` : (r.status === 'available' ? ' · empty' : ` · ${r.status}`)}
                    </option>
                  ))}
                </optgroup>
              </select>
              <input className="input" placeholder="Customer" list="coffee-customer-suggestions"
                style={{ flex: 1 }} value={customer} onChange={e => setCustomer(e.target.value)} />
              <datalist id="coffee-customer-suggestions">
                {guestNames.map(n => <option key={n} value={n} />)}
              </datalist>
            </div>
          </div>

          {cart.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ textAlign: 'center', color: 'var(--ink-4)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--bg-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Icon name="cup" size={20} />
                </div>
                <div style={{ fontSize: 13 }}>Tap items to add to order</div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {cart.map(item => (
                <div key={item.id} className="row gap-3" style={{ padding: '10px 20px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmtINR(item.price)} × {item.qty} = {fmtINR(item.price * item.qty)}</div>
                  </div>
                  <div className="row gap-1" style={{ background: 'var(--bg-3)', borderRadius: 8, padding: 2 }}>
                    <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => updateQty(item.id, -1)}><Icon name="minus" size={12} /></button>
                    <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13, color: 'var(--ink)', alignSelf: 'center' }}>{item.qty}</span>
                    <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => updateQty(item.id, 1)}><Icon name="plus" size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--line)', padding: 20 }}>
            <div className="col gap-2" style={{ marginBottom: 14 }}>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)' }}><span>Subtotal</span><span>{fmtINR(subtotal)}</span></div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-3)' }}><span>GST (5%)</span><span>{fmtINR(tax)}</span></div>
              <div className="row" style={{ justifyContent: 'space-between', fontSize: 18, color: 'var(--ink)', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                <span className="display">Total</span><span className="display" style={{ color: 'var(--gold-2)' }}>{fmtINR(total)}</span>
              </div>
            </div>
            <div className="row gap-2" style={{ marginBottom: 12 }}>
              {['UPI', 'Card', 'Cash', 'Room'].map(p => (
                <button key={p} className="btn btn-sm" style={{ flex: 1, ...(payment === p ? { background: 'var(--gold-soft)', borderColor: 'var(--gold-line)', color: 'var(--gold-2)' } : {}) }} onClick={() => setPayment(p)}>{p}</button>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={cart.length === 0 || busy} onClick={charge}>
              <Icon name="check" size={14} strokeWidth={2.4} />
              {busy ? 'Charging…' : `Charge ${cart.length > 0 ? fmtINR(total) : ''}`}
            </button>
          </div>
        </div>
      </div>

      <Modal open={showZReport} onClose={() => setShowZReport(false)} title="Z-Report — End of day" width={520}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowZReport(false)}>Close</button>
          <button className="btn btn-primary" onClick={() => {
            downloadCSV(`aurelia-zreport-${new Date().toISOString().slice(0, 10)}.csv`, orders, ['id', 'time', 'items_count', 'total', 'table_label', 'payment']);
            onToast('Z-report exported');
          }}>
            <Icon name="download" size={14} />Export CSV
          </button>
        </>}>
        <div className="col gap-4">
          <div className="row" style={{ justifyContent: 'space-between', padding: 16, background: 'var(--bg-3)', borderRadius: 12 }}>
            <div>
              <div className="label">Total orders</div>
              <div className="display" style={{ fontSize: 28 }}>{orders.length}</div>
            </div>
            <div>
              <div className="label">Total revenue</div>
              <div className="display" style={{ fontSize: 28, color: 'var(--gold-2)' }}>{fmtINR(todayTotal)}</div>
            </div>
            <div>
              <div className="label">Avg order</div>
              <div className="display" style={{ fontSize: 28 }}>{orders.length ? fmtINR(Math.round(todayTotal / orders.length)) : '—'}</div>
            </div>
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Payment method breakdown</div>
            {['UPI', 'Card', 'Cash', 'Room'].map(m => {
              const r = orders.filter(o => o.payment.startsWith(m));
              const total = r.reduce((s, o) => s + o.total, 0);
              return (
                <div key={m} className="row" style={{ justifyContent: 'space-between', fontSize: 13, padding: '6px 0' }}>
                  <span style={{ color: 'var(--ink-2)' }}>{m} <span style={{ color: 'var(--ink-4)' }}>({r.length})</span></span>
                  <span style={{ color: 'var(--gold-2)', fontWeight: 500 }}>{fmtINR(total)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal open={showMenu} onClose={() => { setShowMenu(false); setEditingItem(null); }} title="Manage café menu" width={620}
        footer={<>
          <button className="btn btn-ghost" onClick={() => { setEditingItem(null); setItemForm({ name: '', category: 'Espresso', price: 0, description: '' }); }}>
            {editingItem ? 'New item' : 'Clear'}
          </button>
          <button className="btn btn-primary" onClick={submitMenuItem} disabled={busy}>
            <Icon name="check" size={14} strokeWidth={2.4} />{editingItem ? 'Update item' : 'Add item'}
          </button>
        </>}>
        <div className="col gap-4">
          {/* Add / edit form */}
          <div className="card" style={{ padding: 16, background: 'var(--bg-3)' }}>
            <div className="display" style={{ fontSize: 14, marginBottom: 10 }}>
              {editingItem ? `Edit ${editingItem.id}` : 'Add new item'}
            </div>
            <div className="row gap-3" style={{ marginBottom: 10 }}>
              <div style={{ flex: 2 }}>
                <div className="label" style={{ marginBottom: 4 }}>Name *</div>
                <input className="input" placeholder="Aurelia Espresso"
                  value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="label" style={{ marginBottom: 4 }}>Category</div>
                <select className="input" value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}>
                  {['Espresso','Filter','Tea','Cold','Pastry','All-Day'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="label" style={{ marginBottom: 4 }}>Price (₹) *</div>
              <input className="input" type="number" min="0"
                value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} />
            </div>
            <div style={{ marginTop: 10 }}>
              <div className="label" style={{ marginBottom: 4 }}>Description</div>
              <input className="input" placeholder="House blend, double shot"
                value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          {/* Existing items, grouped by category */}
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Existing items ({menu.length})</div>
            {categories.filter(c => c !== 'All').map(cat => {
              const items = menu.filter(m => m.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{cat}</div>
                  {items.map(item => (
                    <div key={item.id} className="row gap-2" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{item.description || '—'}</div>
                      </div>
                      <span style={{ color: 'var(--gold-2)', fontWeight: 500, fontSize: 13 }}>{fmtINR(item.price)}</span>
                      <button className="btn btn-ghost btn-sm" title="Edit"
                        onClick={() => { setEditingItem(item); setItemForm({ name: item.name, category: item.category, price: item.price, description: item.description || '' }); }}>
                        <Icon name="edit" size={12} />
                      </button>
                      <button className="btn btn-ghost btn-sm" title="Delete" onClick={() => setConfirmDel(item)}>
                        <Icon name="trash" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel}
        title="Delete menu item?"
        body={confirmDel ? `${confirmDel.name} will be removed from the café menu.` : ''}
        confirmLabel="Delete" danger
        onCancel={() => setConfirmDel(null)} onConfirm={deleteMenuItem} />
    </div>
  );
}
