import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM expenses ORDER BY date DESC').all());
});

const schema = z.object({
  date: z.string().min(1),
  category: z.string().min(1),
  vendor: z.string().min(1),
  amount: z.number().int().nonnegative(),
  method: z.string().min(1),
  note: z.string().optional().nullable(),
});

router.post('/', (req, res, next) => {
  try {
    const body = schema.parse(req.body);
    const last = db.prepare(`SELECT id FROM expenses WHERE id LIKE 'E-%' ORDER BY id DESC LIMIT 1`).get();
    const n = last ? Number(last.id.slice(2)) + 1 : 3209;
    const id = `E-${n}`;
    db.prepare(`INSERT INTO expenses (id, date, category, vendor, amount, method, note) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, body.date, body.category, body.vendor, body.amount, body.method, body.note ?? null);
    res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(id));
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    if (r.changes === 0) {
      const err = new Error('Expense not found');
      err.status = 404;
      throw err;
    }
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
