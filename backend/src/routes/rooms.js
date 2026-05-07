import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { HttpError } from '../middleware/error.js';
import { toISO, rangesOverlap } from '../lib/dates.js';

const router = Router();

const VALID_STATUSES = ['available', 'occupied', 'reserved', 'cleaning'];
const BLOCKING_STATUSES = ['confirmed', 'checked-in', 'pending'];

function typeCounts() {
  return Object.fromEntries(
    db.prepare('SELECT type_id, COUNT(*) as c FROM rooms GROUP BY type_id').all()
      .map(r => [r.type_id, r.c])
  );
}

router.get('/', (_req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY num').all();
  const types = db.prepare('SELECT * FROM room_types').all();
  const counts = typeCounts();
  const typesWithCounts = types.map(t => ({ ...t, count: counts[t.id] || 0 }));
  res.json({ rooms, types: typesWithCounts });
});

router.get('/types', (_req, res) => {
  const types = db.prepare('SELECT * FROM room_types').all();
  const counts = typeCounts();
  res.json(types.map(t => ({ ...t, count: counts[t.id] || 0 })));
});

// Returns rooms that are bookable for the given date range.
// A room is bookable iff it has no booking with a blocking status whose
// [checkin, checkout) overlaps the requested [checkin, checkout).
router.get('/available', (req, res, next) => {
  try {
    const checkin = toISO(req.query.checkin);
    const checkout = toISO(req.query.checkout);
    if (!checkin || !checkout) throw new HttpError(400, 'checkin and checkout query params required (YYYY-MM-DD)');
    if (checkin >= checkout) throw new HttpError(400, 'checkout must be after checkin');

    const rooms = db.prepare('SELECT * FROM rooms ORDER BY num').all();
    const bookings = db.prepare(
      `SELECT room, checkin, checkout, status, id, guest FROM bookings WHERE status IN (${BLOCKING_STATUSES.map(() => '?').join(',')})`
    ).all(...BLOCKING_STATUSES);

    const conflicts = {};
    for (const b of bookings) {
      const bIn = toISO(b.checkin);
      const bOut = toISO(b.checkout);
      if (rangesOverlap(checkin, checkout, bIn, bOut)) {
        (conflicts[b.room] = conflicts[b.room] || []).push({ id: b.id, guest: b.guest });
      }
    }

    const result = rooms.map(r => ({
      ...r,
      bookable: !conflicts[r.num] && r.status !== 'cleaning',
      conflict: conflicts[r.num] || null,
    }));

    const types = db.prepare('SELECT * FROM room_types').all();
    const counts = typeCounts();
    const availableCounts = {};
    for (const r of result) {
      if (r.bookable) availableCounts[r.type_id] = (availableCounts[r.type_id] || 0) + 1;
    }
    const typesWithAvail = types.map(t => ({
      ...t, count: counts[t.id] || 0, available: availableCounts[t.id] || 0,
    }));

    res.json({ rooms: result, types: typesWithAvail, checkin, checkout });
  } catch (e) { next(e); }
});

router.get('/:num', (req, res, next) => {
  try {
    const room = db.prepare('SELECT * FROM rooms WHERE num = ?').get(req.params.num);
    if (!room) throw new HttpError(404, 'Room not found');
    res.json(room);
  } catch (e) { next(e); }
});

const updateSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  guest: z.string().nullish(),
  checkin: z.string().nullish(),
  checkout: z.string().nullish(),
});

const createSchema = z.object({
  num: z.string().min(1),
  type_id: z.string().min(1),
  floor: z.number().int().positive(),
  status: z.enum(VALID_STATUSES).default('available'),
  image: z.string().url().optional().nullable(),
});

router.post('/', (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const exists = db.prepare('SELECT 1 FROM rooms WHERE num = ?').get(body.num);
    if (exists) throw new HttpError(409, 'Room number already exists');
    const typeExists = db.prepare('SELECT 1 FROM room_types WHERE id = ?').get(body.type_id);
    if (!typeExists) throw new HttpError(400, 'Unknown room type');
    db.prepare(`INSERT INTO rooms (id, num, type_id, floor, status, image) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(body.num, body.num, body.type_id, body.floor, body.status, body.image ?? null);
    res.status(201).json(db.prepare('SELECT * FROM rooms WHERE num = ?').get(body.num));
  } catch (e) { next(e); }
});

router.delete('/:num', (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM rooms WHERE num = ?').run(req.params.num);
    if (r.changes === 0) throw new HttpError(404, 'Room not found');
    res.status(204).end();
  } catch (e) { next(e); }
});

router.patch('/:num', (req, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const existing = db.prepare('SELECT * FROM rooms WHERE num = ?').get(req.params.num);
    if (!existing) throw new HttpError(404, 'Room not found');
    const merged = { ...existing, ...body };
    db.prepare(`UPDATE rooms SET status = ?, guest = ?, checkin = ?, checkout = ? WHERE num = ?`)
      .run(merged.status, merged.guest, merged.checkin, merged.checkout, req.params.num);
    res.json(db.prepare('SELECT * FROM rooms WHERE num = ?').get(req.params.num));
  } catch (e) { next(e); }
});

export default router;
