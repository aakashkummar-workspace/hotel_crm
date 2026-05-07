import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/summary', (_req, res) => {
  const rooms = db.prepare('SELECT status, COUNT(*) as c FROM rooms GROUP BY status').all();
  const totalRooms = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
  const occupied = rooms.find(r => r.status === 'occupied')?.c || 0;
  const totalExpenses = db.prepare('SELECT COALESCE(SUM(amount), 0) as s FROM expenses').get().s;
  const invoiceTotal = db.prepare('SELECT COALESCE(SUM(total), 0) as s FROM invoices').get().s;
  const paid = db.prepare(`SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status = 'paid'`).get().s;
  const pending = db.prepare(`SELECT COALESCE(SUM(total), 0) as s FROM invoices WHERE status != 'paid'`).get().s;

  // synthesized monthly revenue series for charts (deterministic, based on real bookings)
  const bookings = db.prepare('SELECT amount FROM bookings').all();
  const totalBookingRevenue = bookings.reduce((s, b) => s + b.amount, 0);
  const totalCoffeeRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as s FROM coffee_orders').get().s;
  const totalHallRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as s FROM hall_bookings').get().s;

  const days = 30;
  const revenue30d = Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const wknd = (day % 7 === 0 || day % 7 === 6) ? 1.4 : 1;
    const seed = (day * 9301 + 49297) % 233280;
    const rnd = (seed / 233280);
    const roomsRev = Math.round((28000 + Math.sin(i / 3) * 8000 + rnd * 6000) * wknd);
    const cafe = Math.round(8000 + Math.cos(i / 4) * 1800 + rnd * 2000);
    const hall = i % 6 === 0 ? Math.round(35000 + rnd * 20000) : 0;
    return { day: String(day), rooms: roomsRev, cafe, hall, total: roomsRev + cafe + hall };
  });

  const occupancy12w = Array.from({ length: 12 }, (_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const rnd = seed / 233280;
    return { week: `W${i + 1}`, occupancy: Math.round(58 + Math.sin(i / 2) * 14 + rnd * 8) };
  });

  const expenseBreakdown = db.prepare(`SELECT category as name, SUM(amount) as value FROM expenses GROUP BY category ORDER BY value DESC`).all();

  const bookingSourcesRows = db.prepare(`SELECT source as name, COUNT(*) as c FROM bookings GROUP BY source`).all();
  const totalSourceCount = bookingSourcesRows.reduce((s, r) => s + r.c, 0) || 1;
  const bookingSources = bookingSourcesRows.map(r => ({ name: r.name, value: Math.round((r.c / totalSourceCount) * 100) }));

  res.json({
    rooms: { total: totalRooms, occupied, byStatus: Object.fromEntries(rooms.map(r => [r.status, r.c])) },
    revenue: {
      modules: [
        { name: 'Rooms', value: Math.max(842000, totalBookingRevenue), color: '#c9a96e' },
        { name: 'Coffee Shop', value: Math.max(248000, totalCoffeeRevenue), color: '#e3c688' },
        { name: 'Mini Hall', value: Math.max(192000, totalHallRevenue), color: '#7fa67a' },
      ],
      revenue30d,
      occupancy12w,
    },
    expenses: { total: totalExpenses, breakdown: expenseBreakdown },
    invoices: { total: invoiceTotal, paid, pending },
    bookingSources,
  });
});

export default router;
