import { Router } from 'express';
import { z } from 'zod';
import { db, logActivity } from '../db.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/', (_req, res) => {
  const vehicles = db.prepare('SELECT * FROM vehicles ORDER BY id').all();
  const trips = db.prepare('SELECT * FROM vehicle_trips ORDER BY depart_at DESC').all();
  res.json({ vehicles, trips });
});

const vehicleSchema = z.object({
  name: z.string().min(1),
  plate: z.string().optional().nullable(),
  capacity: z.number().int().positive().default(4),
  status: z.enum(['available', 'in-use', 'maintenance']).default('available'),
  image: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

router.post('/', (req, res, next) => {
  try {
    const body = vehicleSchema.parse(req.body);
    const last = db.prepare(`SELECT id FROM vehicles WHERE id LIKE 'V-%' ORDER BY id DESC LIMIT 1`).get();
    const n = last ? Number(last.id.slice(2)) + 1 : 1;
    const id = `V-${n}`;
    db.prepare('INSERT INTO vehicles (id, name, plate, capacity, status, image, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, body.name, body.plate ?? null, body.capacity, body.status, body.image ?? null, body.notes ?? null);
    logActivity(req.user?.name, 'Added vehicle', `${id} · ${body.name}`);
    res.status(201).json(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id));
  } catch (e) { next(e); }
});

router.patch('/:id', (req, res, next) => {
  try {
    const body = vehicleSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Vehicle not found');
    const merged = { ...existing, ...body };
    db.prepare('UPDATE vehicles SET name = ?, plate = ?, capacity = ?, status = ?, image = ?, notes = ? WHERE id = ?')
      .run(merged.name, merged.plate, merged.capacity, merged.status, merged.image, merged.notes, req.params.id);
    res.json(db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM vehicles WHERE id = ?').run(req.params.id);
    if (r.changes === 0) throw new HttpError(404, 'Vehicle not found');
    logActivity(req.user?.name, 'Removed vehicle', req.params.id);
    res.status(204).end();
  } catch (e) { next(e); }
});

const tripSchema = z.object({
  vehicle_id: z.string().min(1),
  booking_id: z.string().optional().nullable(),
  guest: z.string().optional().nullable(),
  driver: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  depart_at: z.string().min(1),
  return_at: z.string().min(1),
  fuel_cost: z.number().int().nonnegative().default(0),
  mileage: z.number().int().nonnegative().default(0),
  status: z.enum(['scheduled', 'in-progress', 'completed', 'cancelled']).default('scheduled'),
});

// Detect overlapping trips on the same vehicle for the same time window.
function tripsOverlap(vehicle_id, depart_at, return_at, ignoreId) {
  const others = db.prepare(`SELECT * FROM vehicle_trips WHERE vehicle_id = ? AND id != ? AND status != 'cancelled'`).all(vehicle_id, ignoreId || -1);
  for (const t of others) {
    if (depart_at < t.return_at && t.depart_at < return_at) return t;
  }
  return null;
}

router.post('/trips', (req, res, next) => {
  try {
    const body = tripSchema.parse(req.body);
    if (body.depart_at >= body.return_at) throw new HttpError(400, 'return_at must be after depart_at');
    const conflict = tripsOverlap(body.vehicle_id, body.depart_at, body.return_at);
    if (conflict) throw new HttpError(409, `Vehicle ${body.vehicle_id} is already booked ${conflict.depart_at} → ${conflict.return_at} (${conflict.guest || 'trip #' + conflict.id})`);
    const r = db.prepare(
      `INSERT INTO vehicle_trips (vehicle_id, booking_id, guest, driver, purpose, depart_at, return_at, fuel_cost, mileage, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(body.vehicle_id, body.booking_id ?? null, body.guest ?? null, body.driver ?? null, body.purpose ?? null,
          body.depart_at, body.return_at, body.fuel_cost, body.mileage, body.status);
    if (body.booking_id) {
      db.prepare('UPDATE bookings SET vehicle_requested = 1 WHERE id = ?').run(body.booking_id);
    }
    logActivity(req.user?.name, 'Vehicle trip scheduled', `${body.vehicle_id} · ${body.guest || body.booking_id || ''}`);
    res.status(201).json(db.prepare('SELECT * FROM vehicle_trips WHERE id = ?').get(r.lastInsertRowid));
  } catch (e) { next(e); }
});

router.patch('/trips/:id', (req, res, next) => {
  try {
    const body = tripSchema.partial().parse(req.body);
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM vehicle_trips WHERE id = ?').get(id);
    if (!existing) throw new HttpError(404, 'Trip not found');
    const merged = { ...existing, ...body };
    if (body.depart_at || body.return_at || body.vehicle_id) {
      const conflict = tripsOverlap(merged.vehicle_id, merged.depart_at, merged.return_at, id);
      if (conflict) throw new HttpError(409, `Vehicle ${merged.vehicle_id} is already booked ${conflict.depart_at} → ${conflict.return_at}`);
    }
    db.prepare(
      `UPDATE vehicle_trips SET vehicle_id = ?, booking_id = ?, guest = ?, driver = ?, purpose = ?, depart_at = ?, return_at = ?, fuel_cost = ?, mileage = ?, status = ? WHERE id = ?`
    ).run(merged.vehicle_id, merged.booking_id, merged.guest, merged.driver, merged.purpose, merged.depart_at, merged.return_at, merged.fuel_cost, merged.mileage, merged.status, id);
    res.json(db.prepare('SELECT * FROM vehicle_trips WHERE id = ?').get(id));
  } catch (e) { next(e); }
});

router.delete('/trips/:id', (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM vehicle_trips WHERE id = ?').run(Number(req.params.id));
    if (r.changes === 0) throw new HttpError(404, 'Trip not found');
    res.status(204).end();
  } catch (e) { next(e); }
});

export default router;
