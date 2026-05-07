import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM hall_bookings ORDER BY date').all());
});

const createSchema = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  guests: z.number().int().positive(),
  advance: z.number().int().nonnegative().default(0),
  total: z.number().int().nonnegative(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).default('pending'),
  contact: z.string().optional().nullable(),
});

router.post('/', (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const last = db.prepare(`SELECT id FROM hall_bookings WHERE id LIKE 'H-%' ORDER BY id DESC LIMIT 1`).get();
    const n = last ? Number(last.id.slice(2)) + 1 : 209;
    const id = `H-${n}`;
    db.prepare(`INSERT INTO hall_bookings (id, title, date, time, guests, advance, total, status, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, body.title, body.date, body.time, body.guests, body.advance, body.total, body.status, body.contact ?? null);
    res.status(201).json(db.prepare('SELECT * FROM hall_bookings WHERE id = ?').get(id));
  } catch (e) { next(e); }
});

router.patch('/:id', (req, res, next) => {
  try {
    const body = createSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM hall_bookings WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Hall booking not found');
    const merged = { ...existing, ...body };
    db.prepare(`UPDATE hall_bookings SET title = ?, date = ?, time = ?, guests = ?, advance = ?, total = ?, status = ?, contact = ? WHERE id = ?`)
      .run(merged.title, merged.date, merged.time, merged.guests, merged.advance, merged.total, merged.status, merged.contact, req.params.id);
    res.json(db.prepare('SELECT * FROM hall_bookings WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
});

export default router;
