import { Router } from 'express';
import { z } from 'zod';
import { db, logActivity } from '../db.js';
import { HttpError } from '../middleware/error.js';
import { toISO, rangesOverlap } from '../lib/dates.js';

const BLOCKING_STATUSES = ['confirmed', 'checked-in', 'pending'];

function findConflict(room, checkinISO, checkoutISO, ignoreId) {
  if (!checkinISO || !checkoutISO) return null;
  const others = db.prepare(
    `SELECT id, guest, checkin, checkout, status FROM bookings WHERE room = ? AND id != ? AND status IN (${BLOCKING_STATUSES.map(() => '?').join(',')})`
  ).all(room, ignoreId || '', ...BLOCKING_STATUSES);
  for (const b of others) {
    if (rangesOverlap(checkinISO, checkoutISO, toISO(b.checkin), toISO(b.checkout))) return b;
  }
  return null;
}

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

function upsertGuestFromBooking({ guest, email, phone, amount }) {
  if (!guest) return;
  const existing = db.prepare('SELECT * FROM guests WHERE LOWER(name) = LOWER(?)').get(guest);
  if (existing) {
    db.prepare('UPDATE guests SET visits = visits + 1, lifetime = lifetime + ?, email = COALESCE(NULLIF(?, \'\'), email), phone = COALESCE(NULLIF(?, \'\'), phone) WHERE id = ?')
      .run(amount || 0, email ?? '', phone ?? '', existing.id);
  } else {
    const last = db.prepare(`SELECT id FROM guests WHERE id LIKE 'G-%' ORDER BY id DESC LIMIT 1`).get();
    const n = last ? Number(last.id.slice(2)) + 1 : 1;
    const id = `G-${String(n).padStart(3, '0')}`;
    db.prepare('INSERT INTO guests (id, name, email, phone, visits, lifetime, status) VALUES (?, ?, ?, ?, 1, ?, ?)')
      .run(id, guest, email || null, phone || null, amount || 0, 'new');
  }
}

function syncRoomFromBooking(booking) {
  const room = db.prepare('SELECT * FROM rooms WHERE num = ?').get(booking.room);
  if (!room) return;
  let next = { status: room.status, guest: room.guest, checkin: room.checkin, checkout: room.checkout };
  if (booking.status === 'checked-in') {
    next = { status: 'occupied', guest: booking.guest, checkin: booking.checkin, checkout: booking.checkout };
  } else if (booking.status === 'confirmed' || booking.status === 'pending') {
    if (room.status === 'available') {
      next = { status: 'reserved', guest: booking.guest, checkin: booking.checkin, checkout: booking.checkout };
    }
  } else if (booking.status === 'checked-out') {
    next = { status: 'cleaning', guest: null, checkin: null, checkout: null };
  } else if (booking.status === 'cancelled') {
    if (room.status === 'reserved' && room.guest === booking.guest) {
      next = { status: 'available', guest: null, checkin: null, checkout: null };
    }
  }
  db.prepare('UPDATE rooms SET status = ?, guest = ?, checkin = ?, checkout = ? WHERE num = ?')
    .run(next.status, next.guest, next.checkin, next.checkout, booking.room);
}

router.post('/', (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);

    // Reject if the chosen room is already booked overlapping the requested dates.
    if (BLOCKING_STATUSES.includes(body.status || 'confirmed')) {
      const conflict = findConflict(body.room, toISO(body.checkin), toISO(body.checkout));
      if (conflict) {
        throw new HttpError(409, `Room ${body.room} is already booked ${conflict.checkin} → ${conflict.checkout} (${conflict.guest}, ${conflict.id})`);
      }
    }

    const lastNumeric = db.prepare(
      `SELECT id FROM bookings WHERE id LIKE 'BK-%' ORDER BY id DESC LIMIT 1`
    ).get();
    const next = lastNumeric ? Number(lastNumeric.id.slice(3)) + 1 : 2851;
    const id = `BK-${next}`;
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO bookings (id, guest, phone, email, room, checkin, checkout, nights, amount, status, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, body.guest, body.phone ?? null, body.email ?? null, body.room, body.checkin, body.checkout, body.nights, body.amount, body.status, body.source);
      upsertGuestFromBooking({ guest: body.guest, email: body.email, phone: body.phone, amount: body.amount });
      syncRoomFromBooking({ ...body, id });
      logActivity(req.user?.name, 'Created booking', `${id} · ${body.guest}`);
    });
    tx();
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

    // If room or dates changed, check for conflict (skip if booking is already past).
    const datesOrRoomChanged = ['room', 'checkin', 'checkout'].some(k => body[k] !== undefined && body[k] !== existing[k]);
    if (datesOrRoomChanged && BLOCKING_STATUSES.includes(merged.status)) {
      const conflict = findConflict(merged.room, toISO(merged.checkin), toISO(merged.checkout), existing.id);
      if (conflict) {
        throw new HttpError(409, `Room ${merged.room} is already booked ${conflict.checkin} → ${conflict.checkout} (${conflict.guest}, ${conflict.id})`);
      }
    }
    const tx = db.transaction(() => {
      db.prepare(
        `UPDATE bookings SET guest = ?, phone = ?, email = ?, room = ?, checkin = ?, checkout = ?, nights = ?, amount = ?, status = ?, source = ? WHERE id = ?`
      ).run(merged.guest, merged.phone, merged.email, merged.room, merged.checkin, merged.checkout, merged.nights, merged.amount, merged.status, merged.source, req.params.id);
      if (body.status && body.status !== existing.status) {
        syncRoomFromBooking(merged);
        logActivity(req.user?.name, 'Updated booking status', `${req.params.id} → ${body.status}`);
      }
    });
    tx();
    res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Booking not found');
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM bookings WHERE id = ?').run(req.params.id);
      // free the room if it was reserved for this booking
      const room = db.prepare('SELECT * FROM rooms WHERE num = ?').get(existing.room);
      if (room && room.status === 'reserved' && room.guest === existing.guest) {
        db.prepare('UPDATE rooms SET status = ?, guest = NULL, checkin = NULL, checkout = NULL WHERE num = ?')
          .run('available', existing.room);
      }
      logActivity(req.user?.name, 'Deleted booking', `${req.params.id} · ${existing.guest}`);
    });
    tx();
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
