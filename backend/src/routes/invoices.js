import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM invoices ORDER BY date DESC').all());
});

const schema = z.object({
  guest: z.string().min(1),
  date: z.string().min(1),
  amount: z.number().int().nonnegative(),
  tax: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  status: z.enum(['paid', 'pending', 'partial', 'advance']).default('pending'),
  method: z.string().default('—'),
});

router.patch('/:id', (req, res, next) => {
  try {
    const body = schema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!existing) {
      const err = new Error('Invoice not found');
      err.status = 404;
      throw err;
    }
    const merged = { ...existing, ...body };
    db.prepare(`UPDATE invoices SET guest = ?, date = ?, amount = ?, tax = ?, total = ?, status = ?, method = ? WHERE id = ?`)
      .run(merged.guest, merged.date, merged.amount, merged.tax, merged.total, merged.status, merged.method, req.params.id);
    res.json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
});

router.post('/', (req, res, next) => {
  try {
    const body = schema.parse(req.body);
    const prefix = (db.prepare(`SELECT value FROM settings WHERE key = 'invoice_prefix'`).get()?.value) || 'INV-2026-';
    const nextRow = db.prepare(`SELECT value FROM settings WHERE key = 'invoice_next'`).get();
    const nextNum = nextRow ? Number(nextRow.value) : 425;
    const id = `${prefix}${String(nextNum).padStart(4, '0')}`;
    db.prepare(`INSERT INTO invoices (id, guest, date, amount, tax, total, status, method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, body.guest, body.date, body.amount, body.tax, body.total, body.status, body.method);
    db.prepare(`UPDATE settings SET value = ? WHERE key = 'invoice_next'`).run(String(nextNum + 1));
    res.status(201).json(db.prepare('SELECT * FROM invoices WHERE id = ?').get(id));
  } catch (e) { next(e); }
});

export default router;
