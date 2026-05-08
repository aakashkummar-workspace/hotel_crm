import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/menu', (_req, res) => {
  res.json(db.prepare('SELECT * FROM coffee_menu ORDER BY category, name').all());
});

const menuSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  price: z.number().int().nonnegative(),
  description: z.string().optional().nullable(),
  emoji: z.string().optional().nullable(),
});

router.post('/menu', (req, res, next) => {
  try {
    const body = menuSchema.parse(req.body);
    // Build a deterministic ID like "esp-5", "fil-3" using the category prefix
    const prefix = body.category.toLowerCase().slice(0, 3);
    const last = db.prepare(`SELECT id FROM coffee_menu WHERE id LIKE ? ORDER BY id DESC LIMIT 1`).get(`${prefix}-%`);
    const n = last ? Number(last.id.split('-')[1]) + 1 : 1;
    const id = `${prefix}-${n}`;
    db.prepare('INSERT INTO coffee_menu (id, name, category, price, description, emoji) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, body.name, body.category, body.price, body.description ?? null, body.emoji ?? null);
    res.status(201).json(db.prepare('SELECT * FROM coffee_menu WHERE id = ?').get(id));
  } catch (e) { next(e); }
});

router.patch('/menu/:id', (req, res, next) => {
  try {
    const body = menuSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM coffee_menu WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Menu item not found');
    const m = { ...existing, ...body };
    db.prepare('UPDATE coffee_menu SET name = ?, category = ?, price = ?, description = ?, emoji = ? WHERE id = ?')
      .run(m.name, m.category, m.price, m.description, m.emoji, req.params.id);
    res.json(db.prepare('SELECT * FROM coffee_menu WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
});

router.delete('/menu/:id', (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM coffee_menu WHERE id = ?').run(req.params.id);
    if (r.changes === 0) throw new HttpError(404, 'Menu item not found');
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/orders', (_req, res) => {
  res.json(db.prepare('SELECT * FROM coffee_orders ORDER BY created_at DESC LIMIT 200').all());
});

const orderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().int().nonnegative(),
    qty: z.number().int().positive(),
  })).min(1),
  table_label: z.string().min(1),
  payment: z.string().min(1),
});

router.post('/orders', (req, res, next) => {
  try {
    const body = orderSchema.parse(req.body);
    const subtotal = body.items.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;
    const last = db.prepare(`SELECT id FROM coffee_orders WHERE id LIKE 'C-%' ORDER BY id DESC LIMIT 1`).get();
    const next = last ? Number(last.id.slice(2)) + 1 : 1149;
    const id = `C-${next}`;
    const time = new Date().toISOString().slice(11, 16);
    const items_count = body.items.reduce((s, i) => s + i.qty, 0);
    db.prepare(`INSERT INTO coffee_orders (id, time, items_count, total, table_label, payment, items_json) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, time, items_count, total, body.table_label, body.payment, JSON.stringify(body.items));
    res.status(201).json({ id, time, items_count, total, table_label: body.table_label, payment: body.payment, subtotal, tax });
  } catch (e) { next(e); }
});

export default router;
