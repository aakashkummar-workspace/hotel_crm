import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ results: [] });

  const like = `%${q}%`;
  const results = [];

  for (const r of db.prepare("SELECT num, status, guest FROM rooms WHERE LOWER(num) LIKE ? OR LOWER(IFNULL(guest, '')) LIKE ? LIMIT 8").all(like, like)) {
    results.push({ kind: 'room', id: r.num, label: `Room ${r.num}`, sub: r.guest || r.status, page: 'rooms' });
  }
  for (const b of db.prepare("SELECT id, guest, room, status FROM bookings WHERE LOWER(id) LIKE ? OR LOWER(guest) LIKE ? OR LOWER(room) LIKE ? LIMIT 8").all(like, like, like)) {
    results.push({ kind: 'booking', id: b.id, label: `${b.id} — ${b.guest}`, sub: `Room ${b.room} · ${b.status}`, page: 'bookings' });
  }
  for (const g of db.prepare("SELECT id, name, email, status FROM guests WHERE LOWER(name) LIKE ? OR LOWER(IFNULL(email, '')) LIKE ? LIMIT 8").all(like, like)) {
    results.push({ kind: 'guest', id: g.id, label: g.name, sub: g.email || g.status, page: 'crm' });
  }
  for (const i of db.prepare("SELECT id, guest, total, status FROM invoices WHERE LOWER(id) LIKE ? OR LOWER(guest) LIKE ? LIMIT 8").all(like, like)) {
    results.push({ kind: 'invoice', id: i.id, label: i.id, sub: `${i.guest} · ${i.status}`, page: 'invoices' });
  }

  res.json({ results });
});

export default router;
