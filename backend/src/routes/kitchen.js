import { Router } from 'express';
import { z } from 'zod';
import { db, logActivity } from '../db.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/menu', (_req, res) => {
  res.json(db.prepare('SELECT * FROM kitchen_menu ORDER BY category, name').all());
});

const menuSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().int().nonnegative(),
  description: z.string().optional().nullable(),
  prep_minutes: z.number().int().positive().default(15),
  emoji: z.string().optional().nullable(),
});

router.post('/menu', (req, res, next) => {
  try {
    const body = menuSchema.parse(req.body);
    const last = db.prepare(`SELECT id FROM kitchen_menu WHERE id LIKE 'k-%' ORDER BY id DESC LIMIT 1`).get();
    const n = last ? Number(last.id.slice(2)) + 1 : 1;
    const id = `k-${n}`;
    db.prepare('INSERT INTO kitchen_menu (id, name, category, price, description, prep_minutes, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, body.name, body.category, body.price, body.description ?? null, body.prep_minutes, body.emoji ?? null);
    res.status(201).json(db.prepare('SELECT * FROM kitchen_menu WHERE id = ?').get(id));
  } catch (e) { next(e); }
});

router.patch('/menu/:id', (req, res, next) => {
  try {
    const body = menuSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM kitchen_menu WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Menu item not found');
    const m = { ...existing, ...body };
    db.prepare('UPDATE kitchen_menu SET name = ?, category = ?, price = ?, description = ?, prep_minutes = ?, emoji = ? WHERE id = ?')
      .run(m.name, m.category, m.price, m.description, m.prep_minutes, m.emoji, req.params.id);
    res.json(db.prepare('SELECT * FROM kitchen_menu WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
});

router.delete('/menu/:id', (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM kitchen_menu WHERE id = ?').run(req.params.id);
    if (r.changes === 0) throw new HttpError(404, 'Menu item not found');
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/orders', (_req, res) => {
  res.json(db.prepare('SELECT * FROM kitchen_orders ORDER BY created_at DESC LIMIT 200').all());
});

const orderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().int().nonnegative(),
    qty: z.number().int().positive(),
  })).min(1),
  type: z.enum(['delivery', 'dine-in', 'pickup']).default('delivery'),
  customer: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  payment: z.string().default('UPI'),
});

router.post('/orders', (req, res, next) => {
  try {
    const body = orderSchema.parse(req.body);
    const subtotal = body.items.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;
    const last = db.prepare(`SELECT id FROM kitchen_orders WHERE id LIKE 'K-%' ORDER BY id DESC LIMIT 1`).get();
    const next = last ? Number(last.id.slice(2)) + 1 : 1001;
    const id = `K-${next}`;
    const time = new Date().toISOString().slice(11, 16);
    const items_count = body.items.reduce((s, i) => s + i.qty, 0);
    db.prepare(
      `INSERT INTO kitchen_orders (id, time, items_count, total, type, status, customer, address, payment, items_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, time, items_count, total, body.type, 'received', body.customer ?? null, body.address ?? null, body.payment, JSON.stringify(body.items));
    logActivity(req.user?.name, 'Kitchen order received', `${id} · ₹${total}`);
    res.status(201).json({ id, time, items_count, total, status: 'received', subtotal, tax });
  } catch (e) { next(e); }
});

const STATUS_FLOW = ['received', 'preparing', 'ready', 'dispatched'];

router.patch('/orders/:id', (req, res, next) => {
  try {
    const body = z.object({ status: z.enum(['received', 'preparing', 'ready', 'dispatched', 'cancelled']) }).parse(req.body);
    const existing = db.prepare('SELECT * FROM kitchen_orders WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Order not found');
    db.prepare('UPDATE kitchen_orders SET status = ? WHERE id = ?').run(body.status, req.params.id);
    logActivity(req.user?.name, 'Kitchen order status', `${req.params.id} → ${body.status}`);
    res.json(db.prepare('SELECT * FROM kitchen_orders WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
});

export default router;
