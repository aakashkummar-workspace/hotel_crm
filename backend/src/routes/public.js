import { Router } from 'express';
import { z } from 'zod';
import { db, logActivity } from '../db.js';

const router = Router();

router.get('/rooms', (_req, res) => {
  const types = db.prepare('SELECT * FROM room_types').all();
  const sample = db.prepare('SELECT image, image_focus_x, image_focus_y, type_id FROM rooms WHERE image IS NOT NULL').all();
  const byType = {};
  for (const r of sample) {
    if (!byType[r.type_id]) byType[r.type_id] = r;
  }
  const rows = types.map(t => ({
    id: t.id,
    name: t.name,
    price: t.base_price,
    sqft: t.sqft,
    beds: t.beds,
    guests: t.max_guests,
    image: byType[t.id]?.image || null,
    image_focus_x: byType[t.id]?.image_focus_x ?? 50,
    image_focus_y: byType[t.id]?.image_focus_y ?? 50,
  }));
  res.json(rows);
});

router.get('/profile', (_req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'hotel_profile'`).get();
  res.json(row ? JSON.parse(row.value) : {});
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
