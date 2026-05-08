import { Router } from 'express';
import { z } from 'zod';
import { db, logActivity } from '../db.js';
import { HttpError } from '../middleware/error.js';
import { toISO, rangesOverlap } from '../lib/dates.js';

const BLOCKING_STATUSES = ['confirmed', 'checked-in', 'pending'];

// Compute the late-checkout fee for a booking that's leaving past the
// hotel's standard check-out time. Returns { hours, fee } where hours is
// the number of hours past the grace window (zero if within grace).
function computeLateFee(booking, nowISO) {
  const get = (k) => db.prepare('SELECT value FROM settings WHERE key = ?').get(k)?.value;
  const stdTime = get('std_checkout_time') || '11:00';
  const grace = Number(get('late_grace_hours') || 2);
  const ratePct = Number(get('late_rate_pct') || 25);
  const checkoutISO = toISO(booking.checkout);
  if (!checkoutISO) return { hours: 0, fee: 0 };
  const [hh, mm] = stdTime.split(':').map(Number);
  const stdAt = new Date(`${checkoutISO}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  const left = new Date(nowISO);
  if (Number.isNaN(stdAt.getTime()) || Number.isNaN(left.getTime())) return { hours: 0, fee: 0 };
  const diffMs = left - stdAt;
  if (diffMs <= 0) return { hours: 0, fee: 0 };
  const totalHours = diffMs / (1000 * 60 * 60);
  const billable = Math.max(0, totalHours - grace);
  if (billable <= 0) return { hours: 0, fee: 0 };
  const room = db.prepare('SELECT * FROM rooms WHERE num = ?').get(booking.room);
  const types = db.prepare('SELECT base_price FROM room_types WHERE id = ?').get(room?.type_id);
  const nightly = (room?.price ?? types?.base_price ?? 0) || (booking.amount && booking.nights ? Math.round(booking.amount / booking.nights) : 0);
  const perHour = (nightly * (ratePct / 100));
  const fee = Math.round(billable * perHour);
  return { hours: Number(billable.toFixed(2)), fee };
}

// When a stay qualifies for installments, generate an Advance + Balance
// invoice pair right after the booking is created. Linked back to the
// booking via invoices.booking_id so the staff side can show them together.
function maybeCreateInstallment(booking) {
  const get = (k) => db.prepare('SELECT value FROM settings WHERE key = ?').get(k)?.value;
  const minNights = Number(get('installment_min_nights') || 15);
  if ((booking.nights || 0) < minNights) return null;
  const advancePct = Number(get('installment_advance_pct') || 50);
  const taxRoom = Number(get('tax_room_pct') || 18);
  const prefix = get('invoice_prefix') || 'INV-2026-';
  const nextRow = db.prepare(`SELECT value FROM settings WHERE key = 'invoice_next'`).get();
  let next = nextRow ? Number(nextRow.value) : 425;

  const total = booking.amount;
  const advanceAmount = Math.round(total * (advancePct / 100));
  const balanceAmount = total - advanceAmount;
  const advanceTax = Math.round(advanceAmount * (taxRoom / 100));
  const balanceTax = Math.round(balanceAmount * (taxRoom / 100));

  const advId = `${prefix}${String(next).padStart(4, '0')}`;
  const balId = `${prefix}${String(next + 1).padStart(4, '0')}`;
  db.prepare('INSERT INTO invoices (id, guest, date, amount, tax, total, status, method, booking_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(advId, booking.guest, booking.checkin, advanceAmount, advanceTax, advanceAmount + advanceTax,
         'advance', '—', booking.id, `Advance ${advancePct}% for ${booking.id} (${booking.nights} nights)`);
  db.prepare('INSERT INTO invoices (id, guest, date, amount, tax, total, status, method, booking_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(balId, booking.guest, booking.checkout, balanceAmount, balanceTax, balanceAmount + balanceTax,
         'pending', '—', booking.id, `Balance ${100 - advancePct}% for ${booking.id}, due at check-out`);
  db.prepare(`UPDATE settings SET value = ? WHERE key = 'invoice_next'`).run(String(next + 2));
  return { advance_invoice: advId, balance_invoice: balId, advance_total: advanceAmount + advanceTax, balance_total: balanceAmount + balanceTax };
}

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
    let installmentInfo = null;
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO bookings (id, guest, phone, email, room, checkin, checkout, nights, amount, status, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, body.guest, body.phone ?? null, body.email ?? null, body.room, body.checkin, body.checkout, body.nights, body.amount, body.status, body.source);
      upsertGuestFromBooking({ guest: body.guest, email: body.email, phone: body.phone, amount: body.amount });
      syncRoomFromBooking({ ...body, id });
      installmentInfo = maybeCreateInstallment({ ...body, id });
      if (installmentInfo) {
        logActivity(req.user?.name, 'Auto-installment plan', `${id} · advance ${installmentInfo.advance_invoice} + balance ${installmentInfo.balance_invoice}`);
      }
      logActivity(req.user?.name, 'Created booking', `${id} · ${body.guest}`);
    });
    tx();
    const created = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    res.status(201).json({ ...created, installment: installmentInfo });
  } catch (e) { next(e); }
});

// Bookings whose check-out is today and are still checked-in past the
// hotel's standard check-out time + grace, plus any that left today with a
// late_fee already booked. Used by the dashboard to flag late check-outs.
router.get('/late-today', (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const get = (k) => db.prepare('SELECT value FROM settings WHERE key = ?').get(k)?.value;
  const stdTime = get('std_checkout_time') || '11:00';
  const grace = Number(get('late_grace_hours') || 2);
  const allCurrent = db.prepare(`SELECT * FROM bookings WHERE status = 'checked-in'`).all();
  const nowISO = new Date().toISOString();
  const flagged = allCurrent.map(b => {
    const { hours, fee } = computeLateFee(b, nowISO);
    return { ...b, projected_late_hours: hours, projected_late_fee: fee };
  }).filter(b => {
    const co = toISO(b.checkout);
    return co && co <= today && b.projected_late_hours > 0;
  });
  const departedToday = db.prepare(`SELECT * FROM bookings WHERE status = 'checked-out' AND late_fee > 0 AND substr(checked_out_at, 1, 10) = ?`).all(today);
  res.json({ flagged, departed: departedToday, std_checkout_time: stdTime, grace_hours: grace });
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
        // On checkout, capture the time and compute any late fee.
        if (body.status === 'checked-out') {
          const nowISO = new Date().toISOString();
          const { hours, fee } = computeLateFee(merged, nowISO);
          db.prepare('UPDATE bookings SET checked_out_at = ?, late_hours = ?, late_fee = ? WHERE id = ?')
            .run(nowISO, hours, fee, req.params.id);
          if (fee > 0) {
            logActivity(req.user?.name, 'Late check-out fee', `${req.params.id} · ${hours.toFixed(1)}h · ₹${fee}`);
          }
        }
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
