import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';

const router = Router();

router.get('/menu', (_req, res) => {
  res.json(db.prepare('SELECT * FROM coffee_menu ORDER BY category, name').all());
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
