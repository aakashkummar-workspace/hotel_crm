import { Router } from 'express';
import { z } from 'zod';
import { db, logActivity } from '../db.js';

const router = Router();

router.get('/rooms', (_req, res) => {
  const types = db.prepare('SELECT * FROM room_types').all();
  const typeMap = Object.fromEntries(types.map(t => [t.id, t]));
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY num').all();
  const rows = rooms.map(r => {
    const t = typeMap[r.type_id] || {};
    return {
      id: r.num,
      num: r.num,
      type_id: r.type_id,
      name: t.name || 'Room',
      floor: r.floor,
      price: r.price ?? t.base_price ?? 0,
      sqft: t.sqft || 0,
      beds: t.beds || '',
      guests: r.max_guests ?? t.max_guests ?? 1,
      image: r.image || null,
      image_focus_x: r.image_focus_x ?? 50,
      image_focus_y: r.image_focus_y ?? 50,
      status: r.status,
    };
  });
  res.json(rows);
});

router.get('/profile', (_req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'hotel_profile'`).get();
  res.json(row ? JSON.parse(row.value) : {});
});

// Public-safe view of the hotel's fleet — only fields a guest should see
// (no driver names, no internal notes, no plate). Plus the policy thresholds
// so the page can show "free for stays of N+ nights".
router.get('/vehicles', (_req, res) => {
  const get = (k) => db.prepare('SELECT value FROM settings WHERE key = ?').get(k)?.value;
  const rows = db.prepare("SELECT id, name, capacity, image, status FROM vehicles ORDER BY id").all();
  res.json({
    vehicles: rows,
    free_from_nights: Number(get('vehicle_min_nights') || 15),
  });
});

const enquirySchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().min(1),
  checkin: z.string().min(1),
  checkout: z.string().min(1),
  nights: z.number().int().positive(),
  guests: z.number().int().positive(),
  rooms: z.number().int().positive().default(1),
  room_type: z.string().optional(),
  amount: z.number().int().nonnegative().optional(),
});

// Lookup a single booking by reference + last 4 digits of phone (or email).
// Lets returning guests see the live status of their reservation without login.
router.get('/lookup', (req, res) => {
  const ref = String(req.query.ref || '').trim().toUpperCase();
  const phone = String(req.query.phone || '').replace(/\D/g, '');
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!ref) return res.json({ found: false, error: 'Booking reference required' });

  const b = db.prepare('SELECT * FROM bookings WHERE id = ?').get(ref);
  if (!b) return res.json({ found: false, error: 'No booking with that reference' });

  // Light verification — match either last 4 digits of phone OR the email
  const bookingPhone = (b.phone || '').replace(/\D/g, '');
  const phoneMatches = phone && bookingPhone && bookingPhone.endsWith(phone.slice(-4));
  const emailMatches = email && (b.email || '').toLowerCase() === email;
  if (!phoneMatches && !emailMatches) {
    return res.json({ found: false, error: "We couldn't verify that booking. Check the phone or email used to book." });
  }

  res.json({
    found: true,
    booking: {
      id: b.id, guest: b.guest, room: b.room,
      checkin: b.checkin, checkout: b.checkout,
      nights: b.nights, amount: b.amount,
      status: b.status, source: b.source,
      created_at: b.created_at,
      late_hours: b.late_hours || 0, late_fee: b.late_fee || 0,
    },
  });
});

// All bookings for a phone or email — guest-facing booking history with filters.
router.get('/history', (req, res) => {
  const phone = String(req.query.phone || '').replace(/\D/g, '');
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!phone && !email) return res.json({ bookings: [] });

  const all = db.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
  const matches = all.filter(b => {
    const bp = (b.phone || '').replace(/\D/g, '');
    const be = (b.email || '').toLowerCase();
    return (phone && bp && bp.endsWith(phone.slice(-4))) || (email && be === email);
  });

  // Filters
  const status = String(req.query.status || '').trim();
  const room = String(req.query.room || '').trim();
  const since = String(req.query.since || '').trim();
  const filtered = matches.filter(b => {
    if (status && status !== 'all' && b.status !== status) return false;
    if (room && room !== 'all' && b.room !== room) return false;
    if (since) {
      const t = (b.created_at || '').slice(0, 10);
      if (t && t < since) return false;
    }
    return true;
  });

  res.json({
    count: filtered.length,
    bookings: filtered.map(b => ({
      id: b.id, room: b.room, checkin: b.checkin, checkout: b.checkout,
      nights: b.nights, amount: b.amount, status: b.status, source: b.source,
      created_at: b.created_at,
    })),
  });
});

router.post('/enquiries', (req, res, next) => {
  try {
    const body = enquirySchema.parse(req.body);
    const last = db.prepare(`SELECT id FROM bookings WHERE id LIKE 'BK-%' ORDER BY id DESC LIMIT 1`).get();
    const next = last ? Number(last.id.slice(3)) + 1 : 2851;
    const id = `BK-${next}`;
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO bookings (id, guest, phone, email, room, checkin, checkout, nights, amount, status, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id, body.name, body.phone, body.email ?? null, body.room_type || 'TBD',
        body.checkin, body.checkout, body.nights, body.amount ?? 0, 'pending', 'Direct'
      );
      // upsert guest
      const existing = db.prepare('SELECT id FROM guests WHERE LOWER(name) = LOWER(?)').get(body.name);
      if (!existing) {
        const lastG = db.prepare(`SELECT id FROM guests WHERE id LIKE 'G-%' ORDER BY id DESC LIMIT 1`).get();
        const n = lastG ? Number(lastG.id.slice(2)) + 1 : 1;
        const gid = `G-${String(n).padStart(3, '0')}`;
        db.prepare('INSERT INTO guests (id, name, email, phone, visits, lifetime, status, note) VALUES (?, ?, ?, ?, 0, 0, ?, ?)')
          .run(gid, body.name, body.email ?? null, body.phone, 'new', 'Submitted enquiry from public booking page.');
      }
      logActivity('Public site', 'New booking enquiry', `${id} · ${body.name}`);
    });
    tx();
    res.status(201).json({ id, message: 'We will be in touch within 12 hours.' });
  } catch (e) { next(e); }
});

export default router;
