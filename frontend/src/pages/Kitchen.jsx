import { useEffect, useMemo, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { ConfirmDialog, Modal, Pill, SectionHeader, StatusPill } from '../components/primitives.jsx';
import { api, fmtINR } from '../api.js';

const STAGES = ['received', 'preparing', 'ready', 'dispatched'];
const STAGE_LABELS = { received: 'Received', preparing: 'Preparing', ready: 'Ready', dispatched: 'Out for delivery' };
const STAGE_COLORS = { received: 'amber', preparing: 'gold', ready: 'green', dispatched: 'blue' };

const blankItem = { name: '', category: 'Mains', price: 0, description: '', prep_minutes: 15 };

export default function Kitchen({ onToast }) {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('delivery');
  const [customer, setCustomer] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('UPI');
  const [busy, setBusy] = useState(false);
  const [showMenuMgr, setShowMenuMgr] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState(blankItem);
  const [confirmDel, setConfirmDel] = useState(null);
  const [guestNames, setGuestNames] = useState([]);

  const refresh = async () => {
    const [m, o, g] = await Promise.all([
      api.kitchen.menu(),
      api.kitchen.orders(),
      api.guests.list().catch(() => []),
    ]);
    setMenu(m); setOrders(o);
    const names = new Set((g || []).map(x => x.name).filter(Boolean));
    setGuestNames([...names].sort());
  };
  useEffect(() => { refresh(); }, []);

  const categories = useMemo(() => ['All', ...new Set(menu.map(m => m.category))], [menu]);
  const filtered = menu.filter(m => category === 'All' || m.category === category);
  const todaysOrders = orders.filter(o => o.status !== 'cancelled');

  const addToCart = (item) => setCart(c => {
    const ex = c.find(x => x.id === item.id);
    if (ex) return c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
    return [...c, { ...item, qty: 1 }];
  });
  const updateQty = (id, delta) => setCart(c => c.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x).filter(x => x.qty > 0));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  const todayTotal = todaysOrders.reduce((s, o) => s + o.total, 0);

  const charge = async () => {
    if (cart.length === 0) return;
    setBusy(true);
    try {
      const order = await api.kitchen.createOrder({
        items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
        type: orderType, customer, address, payment,
      });
      onToast?.(`Kitchen order ${order.id} · ${fmtINR(order.total)}`);
      setCart([]); setCustomer(''); setAddress('');
      refresh();
    } catch (e) { onToast?.(e.message || 'Could not place order'); }
    finally { setBusy(false); }
  };

  const advance = async (order) => {
    const idx = STAGES.indexOf(order.status);
    if (idx === -1 || idx === STAGES.length - 1) return;
    const next = STAGES[idx + 1];
    try {
      await api.kitchen.updateOrder(order.id, { status: next });
      onToast?.(`${order.id} → ${STAGE_LABELS[next]}`);
      refresh();
    } catch (e) { onToast?.(e.message); }
  };

  const cancel = async (order) => {
    try {
      await api.kitchen.updateOrder(order.id, { status: 'cancelled' });
      onToast?.(`${order.id} cancelled`);
      refresh();
    } catch (e) { onToast?.(e.message); }
  };

  const ordersByStage = STAGES.map(s => ({ stage: s, orders: todaysOrders.filter(o => o.status === s) }));

  const submitItem = async () => {
    if (!itemForm.name || !itemForm.price) { onToast?.('Name and price required'); return; }
    setBusy(true);
    try {
      const body = { ...itemForm, price: Number(itemForm.price), prep_minutes: Number(itemForm.prep_minutes) };
      if (editingItem) await api.kitchen.updateMenu(editingItem.id, body);
      else await api.kitchen.addMenu(body);
      onToast?.('Saved');
      setEditingItem(null); setItemForm(blankItem);
      refresh();
    } catch (e) { onToast?.(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="page page-enter">
      <SectionHeader
        eyebrow="Cloud Kitchen"
        title="Cloud Kitchen"
        sub={`${todaysOrders.length} live order${todaysOrders.length !== 1 ? 's' : ''} · ${fmtINR(todayTotal)} today`}
        right={
          <div className="row gap-2">
            <button className="btn" onClick={() => { setShowMenuMgr(true); setEditingItem(null); setItemForm(blankItem); }}>
              <Icon name="utensils" size={14} />Manage menu
            </button>
          </div>
        }
      />

      {/* Order board (4 columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16, flexShrink: 0 }}>
        {ordersByStage.map(({ stage, orders }) => (
          <div key={stage} className="card" style={{ padding: 14, minHeight: 200 }}>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
              <div className="display" style={{ fontSize: 14 }}>{STAGE_LABELS[stage]}</div>
              <Pill tone={STAGE_COLORS[stage]}>{orders.length}</Pill>
            </div>
            <div className="col gap-2">
              {orders.map(o => (
                <div key={o.id} style={{ background: 'var(--bg-3)', borderRadius: 10, padding: 10, fontSize: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>{o.id}</span>
                    <span style={{ color: 'var(--gold-2)', fontWeight: 500 }}>{fmtINR(o.total)}</span>
                  </div>
                  <div style={{ color: 'var(--ink)', marginTop: 4, fontWeight: 500 }}>{o.customer || o.type}</div>
                  <div style={{ color: 'var(--ink-4)', fontSize: 11, marginTop: 2 }}>{o.items_count} items · {o.time}</div>
                  <div className="row gap-1" style={{ marginTop: 8 }}>
                    {stage !== 'dispatched' && <button className="btn btn-sm btn-primary" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => advance(o)}>Advance →</button>}
                    <button className="btn btn-sm" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => cancel(o)}>Cancel</button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <div style={{ padding: 12, textAlign: 'center', color: 'var(--ink-4)', fontSize: 11 }}>—</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Take an order — page scrolls naturally; cart sticks on the right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
        <div className="col">
          <div className="row gap-2" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            {categories.map(c => (
              <button key={c} className="btn btn-sm" onClick={() => setCategory(c)}
                style={category === c ? { background: 'var(--gold-soft)', borderColor: 'var(--gold-line)', color: 'var(--gold-2)' } : {}}>{c}</button>
            ))}
          </div>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {filtered.map(item => (
                <button key={item.id} onClick={() => addToCart(item)} className="card"
                  style={{ padding: 14, textAlign: 'left', cursor: 'pointer', background: 'var(--panel)' }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--gold-2)', fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtINR(item.price)}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.category}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.4 }}>{item.description}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 8 }}>~{item.prep_minutes} min prep</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card-elevated col" style={{ position: 'sticky', top: 16, alignSelf: 'start', maxHeight: 'calc(100vh - 100px)' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div className="display" style={{ fontSize: 18 }}>New Order</div>
              <select value={orderType} onChange={e => setOrderType(e.target.value)} className="input" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }}>
                <option value="delivery">Delivery</option>
                <option value="pickup">Pickup</option>
                <option value="dine-in">Dine-in</option>
              </select>
            </div>
            <div className="col gap-2" style={{ marginTop: 10 }}>
              <input className="input" placeholder="Customer name" list="kitchen-customer-suggestions" value={customer} onChange={e => setCustomer(e.target.value)} />
              <datalist id="kitchen-customer-suggestions">
                {guestNames.map(n => <option key={n} value={n} />)}
              </datalist>
              {orderType === 'delivery' && <input className="input" placeholder="Delivery address" value={address} onChange={e => setAddress(e.target.value)} />}
            </div>
          </div>

          {cart.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
              <div style={{ textAlign: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Tap items to add to order</div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', minHeight: 0 }}>
              {cart.map(item => (
                <div key={item.id} className="row gap-3" style={{ padding: '10px 20px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{fmtINR(item.price)} × {item.qty} = {fmtINR(item.price * item.qty)}</div>
                  </div>
                  <div className="row gap-1" style={{ background: 'var(--bg-3)', borderRadius: 8, padding: 2 }}>
                    <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => updateQty(item.id, -1)}><Icon name="minus" size={12} /></button>
                    <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13, alignSelf: 'center' }}>{item.qty}</span>
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
              {['UPI', 'Card', 'Cash'].map(p => (
                <button key={p} className="btn btn-sm" style={{ flex: 1, ...(payment === p ? { background: 'var(--gold-soft)', borderColor: 'var(--gold-line)', color: 'var(--gold-2)' } : {}) }} onClick={() => setPayment(p)}>{p}</button>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} disabled={cart.length === 0 || busy} onClick={charge}>
              <Icon name="check" size={14} strokeWidth={2.4} />
              {busy ? 'Placing…' : `Place order ${cart.length > 0 ? fmtINR(total) : ''}`}
            </button>
          </div>
        </div>
      </div>

      {/* Menu manager modal */}
      <Modal open={showMenuMgr} onClose={() => setShowMenuMgr(false)} title="Manage kitchen menu" width={620}
        footer={<>
          <button className="btn btn-ghost" onClick={() => { setEditingItem(null); setItemForm(blankItem); }}>{editingItem ? 'New item' : 'Clear'}</button>
          <button className="btn btn-primary" onClick={submitItem} disabled={busy}><Icon name="check" size={14} strokeWidth={2.4} />{editingItem ? 'Update' : 'Add'}</button>
        </>}>
        <div className="col gap-4">
          <div className="card" style={{ padding: 16, background: 'var(--bg-3)' }}>
            <div className="display" style={{ fontSize: 14, marginBottom: 10 }}>{editingItem ? `Edit ${editingItem.id}` : 'Add new item'}</div>
            <div className="row gap-3" style={{ marginBottom: 10 }}>
              <div style={{ flex: 2 }}><div className="label" style={{ marginBottom: 4 }}>Name *</div><input className="input" value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 4 }}>Category</div><input className="input" value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} /></div>
            </div>
            <div className="row gap-3">
              <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 4 }}>Price (₹) *</div><input className="input" type="number" min="0" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div style={{ flex: 1 }}><div className="label" style={{ marginBottom: 4 }}>Prep mins</div><input className="input" type="number" min="1" value={itemForm.prep_minutes} onChange={e => setItemForm(f => ({ ...f, prep_minutes: e.target.value }))} /></div>
            </div>
            <div style={{ marginTop: 10 }}><div className="label" style={{ marginBottom: 4 }}>Description</div><input className="input" value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>

          <div>
            <div className="label" style={{ marginBottom: 8 }}>Existing items ({menu.length})</div>
            {menu.map(m => (
              <div key={m.id} className="row gap-2" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>{m.category} · ~{m.prep_minutes} min</div>
                </div>
                <span style={{ color: 'var(--gold-2)', fontWeight: 500, fontSize: 13 }}>{fmtINR(m.price)}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditingItem(m); setItemForm({ name: m.name, category: m.category, price: m.price, description: m.description || '', prep_minutes: m.prep_minutes }); }}>
                  <Icon name="edit" size={12} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(m)}>
                  <Icon name="trash" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDel}
        title="Delete menu item?"
        body={confirmDel ? `${confirmDel.name} will be removed from the menu.` : ''}
        confirmLabel="Delete" danger
        onCancel={() => setConfirmDel(null)}
        onConfirm={async () => {
          try { await api.kitchen.removeMenu(confirmDel.id); onToast?.('Item removed'); setConfirmDel(null); refresh(); }
          catch (e) { onToast?.(e.message); }
        }} />
    </div>
  );
}
