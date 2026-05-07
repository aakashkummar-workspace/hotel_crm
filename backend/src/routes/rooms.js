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
  const typeMap = Object.fromEntries(types.map(t => [t.id, t]));
  const roomsWithRate = rooms.map(r => ({
    ...r,
    effective_price: r.price ?? typeMap[r.type_id]?.base_price ?? 0,
    rate_overridden: r.price != null,
  }));
  res.json({ rooms: roomsWithRate, types: typesWithCounts });
});

router.get('/types', (_req, res) => {
  const types = db.prepare('SELECT * FROM room_types').all();
  const counts = typeCounts();
  res.json(types.map(t => ({ ...t, count: counts[t.id] || 0 })));
});

const typeUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  base_price: z.number().int().nonnegative().optional(),
  sqft: z.number().int().positive().optional(),
  beds: z.string().min(1).optional(),
  max_guests: z.number().int().positive().optional(),
});

router.patch('/types/:id', (req, res, next) => {
  try {
    const body = typeUpdateSchema.parse(req.body);
    const existing = db.prepare('SELECT * FROM room_types WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Room type not found');
    const merged = { ...existing, ...body };
    db.prepare('UPDATE room_types SET name = ?, base_price = ?, sqft = ?, beds = ?, max_guests = ? WHERE id = ?')
      .run(merged.name, merged.base_price, merged.sqft, merged.beds, merged.max_guests, req.params.id);
    res.json(db.prepare('SELECT * FROM room_types WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
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

    const typeMap = Object.fromEntries(db.prepare('SELECT * FROM room_types').all().map(t => [t.id, t]));
    const result = rooms.map(r => ({
      ...r,
      effective_price: r.price ?? typeMap[r.type_id]?.base_price ?? 0,
      rate_overridden: r.price != null,
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
  price: z.number().int().nonnegative().nullable().optional(),
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
    // For nullable price: only override if key present in body (allow setting to null = revert to type rate)
    const nextPrice = ('price' in body) ? body.price : existing.price;
    const merged = { ...existing, ...body };
    db.prepare(`UPDATE rooms SET status = ?, guest = ?, checkin = ?, checkout = ?, price = ? WHERE num = ?`)
      .run(merged.status, merged.guest, merged.checkin, merged.checkout, nextPrice, req.params.num);
    res.json(db.prepare('SELECT * FROM rooms WHERE num = ?').get(req.params.num));
  } catch (e) { next(e); }
});

export default router;
