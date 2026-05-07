import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { HttpError } from '../middleware/error.js';

const router = Router();

router.get('/', (req, res) => {
  const search = (req.query.search || '').trim().toLowerCase();
  let rows = db.prepare('SELECT * FROM guests ORDER BY name').all();
  if (search) rows = rows.filter(g => g.name.toLowerCase().includes(search) || (g.email || '').toLowerCase().includes(search));
  res.json(rows);
});

router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
    if (!row) throw new HttpError(404, 'Guest not found');
    res.json(row);
  } catch (e) { next(e); }
});

const upsertSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(['vip', 'regular', 'new']).default('new'),
  note: z.string().optional().nullable(),
});

router.post('/', (req, res, next) => {
  try {
    const body = upsertSchema.parse(req.body);
    const last = db.prepare(`SELECT id FROM guests WHERE id LIKE 'G-%' ORDER BY id DESC LIMIT 1`).get();
    const next = last ? Number(last.id.slice(2)) + 1 : 1;
    const id = `G-${String(next).padStart(3, '0')}`;
    db.prepare(`INSERT INTO guests (id, name, email, phone, status, note) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, body.name, body.email ?? null, body.phone ?? null, body.status, body.note ?? null);
    res.status(201).json(db.prepare('SELECT * FROM guests WHERE id = ?').get(id));
  } catch (e) { next(e); }
});

router.patch('/:id', (req, res, next) => {
  try {
    const body = upsertSchema.partial().parse(req.body);
    const existing = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id);
    if (!existing) throw new HttpError(404, 'Guest not found');
    const merged = { ...existing, ...body };
    db.prepare(`UPDATE guests SET name = ?, email = ?, phone = ?, status = ?, note = ? WHERE id = ?`)
      .run(merged.name, merged.email, merged.phone, merged.status, merged.note, req.params.id);
    res.json(db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id));
  } catch (e) { next(e); }
});

export default router;
