import { Router } from 'express';
import { z } from 'zod';
import { db, logActivity } from '../db.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  let rows;
  if (status) {
    rows = db.prepare('SELECT * FROM bookings WHERE status = ? ORDER BY created_at DESC').all(status);
  } else {
    rows = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
  }
  res.json(rows);
});

const createSchema = z.object({
  guest: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  room: z.string().min(1),
  checkin: z.string().min(1),
  checkout: z.string().min(1),
  nights: z.number().int().positive(),
  amount: z.number().int().nonnegative(),
  source: z.string().default('Direct'),
  status: z.enum(['pending', 'confirmed', 'checked-in', 'checked-out', 'cancelled']).default('confirmed'),
});

router.post('/', (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const lastNumeric = db.prepare(
      `SELECT id FROM bookings WHERE id LIKE 'BK-%' ORDER BY id DESC LIMIT 1`
    ).get();
    const next = lastNumeric ? Number(lastNumeric.id.slice(3)) + 1 : 2851;
    const id = `BK-${next}`;
    db.prepare(
      `INSERT INTO bookings (id, guest, phone, email, room, checkin, checkout, nights, amount, status, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, body.guest, body.phone ?? null, body.email ?? null, body.room, body.checkin, body.checkout, body.nights, body.amount, body.status, body.source);
    logActivity(req.user?.name, 'Created booking', `${id} · ${body.guest}`);
    res.status(201).json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(id));
  } catch (e) { next(e); }
});

router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!row) throw new HttpError(404, 'Booking not found');
    res.json(row);
  } catch (e) { next(e); }
});

const updateSchema = createSchema.partial();

router.patch('/:id', (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Booking not found');
    const merged = { ...existing, ...body };
    db.prepare(
      `UPDATE bookings SET guest = ?, phone = ?, email = ?, room = ?, checkin = ?, checkout = ?, nights = ?, amount = ?, status = ?, source = ? WHERE id = ?`
    ).run(merged.guest, merged.phone, merged.email, merged.room, merged.checkin, merged.checkout, merged.nights, merged.amount, merged.status, merged.source, req.params.id);
    res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
    if (r.changes === 0) throw new HttpError(404, 'Booking not found');
    logActivity(req.user?.name, 'Deleted booking', req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
