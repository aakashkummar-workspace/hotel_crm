import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

const VALID_STATUSES = ['available', 'occupied', 'reserved', 'cleaning'];

router.get('/', (_req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY num').all();
  const types = db.prepare('SELECT * FROM room_types').all();
  res.json({ rooms, types });
});

router.get('/types', (_req, res) => {
  res.json(db.prepare('SELECT * FROM room_types').all());
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
