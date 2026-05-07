import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';

const router = Router();

const profileSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional().default(''),
  location: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().default(''),
  gstin: z.string().optional().default(''),
  currency: z.string().optional().default('INR'),
  about: z.string().optional().default(''),
});

router.get('/profile', (_req, res) => {
  const row = db.prepare(`SELECT value FROM settings WHERE key = 'hotel_profile'`).get();
  res.json(row ? JSON.parse(row.value) : {});
});

router.put('/profile', (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('hotel_profile', ?)`).run(JSON.stringify(body));
    res.json(body);
  } catch (e) { next(e); }
});

router.get('/tax', (_req, res) => {
  const get = (k) => db.prepare('SELECT value FROM settings WHERE key = ?').get(k)?.value;
  res.json({
    room: Number(get('tax_room_pct') || 18),
    cafe: Number(get('tax_cafe_pct') || 5),
    hall: Number(get('tax_hall_pct') || 18),
    invoice_prefix: get('invoice_prefix') || 'INV-2026-',
    invoice_next: Number(get('invoice_next') || 425),
  });
});

const taxSchema = z.object({
  room: z.number().min(0).max(100).optional(),
  cafe: z.number().min(0).max(100).optional(),
  hall: z.number().min(0).max(100).optional(),
  invoice_prefix: z.string().optional(),
  invoice_next: z.number().int().nonnegative().optional(),
});

router.put('/tax', (req, res, next) => {
  try {
    const body = taxSchema.parse(req.body);
    const set = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
    if (body.room != null) set.run('tax_room_pct', String(body.room));
    if (body.cafe != null) set.run('tax_cafe_pct', String(body.cafe));
    if (body.hall != null) set.run('tax_hall_pct', String(body.hall));
    if (body.invoice_prefix) set.run('invoice_prefix', body.invoice_prefix);
    if (body.invoice_next != null) set.run('invoice_next', String(body.invoice_next));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
