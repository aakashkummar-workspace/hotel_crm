import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { initSchema, runMigrations, db } from './db.js';
import { seed } from './seed.js';
import { errorHandler, notFound } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import roomsRoutes from './routes/rooms.js';
import bookingsRoutes from './routes/bookings.js';
import guestsRoutes from './routes/guests.js';
import coffeeRoutes from './routes/coffee.js';
import hallRoutes from './routes/hall.js';
import expensesRoutes from './routes/expenses.js';
import invoicesRoutes from './routes/invoices.js';
import settingsRoutes from './routes/settings.js';
import reportsRoutes from './routes/reports.js';
import publicRoutes from './routes/public.js';
import activityRoutes from './routes/activity.js';
import searchRoutes from './routes/search.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

initSchema();
runMigrations();
const rowCount = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
if (rowCount === 0) {
  console.log('Empty database; seeding initial data…');
  seed();
}

const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin.split(',').map(s => s.trim()), credentials: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/guests', guestsRoutes);
app.use('/api/coffee', coffeeRoutes);
app.use('/api/hall', hallRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/search', searchRoutes);

// Production: serve frontend build
const distDir = resolve(__dirname, '..', '..', 'frontend', 'dist');
if (isProd && existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '7d', etag: true }));
  app.get(/^\/(?!api).*/, (req, res) => {
    if (req.path === '/booking' || req.path === '/booking/') {
      return res.sendFile(resolve(distDir, 'booking.html'));
    }
    res.sendFile(resolve(distDir, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Aurelia backend listening on http://localhost:${port}`);
  if (!isProd) console.log(`API base: http://localhost:${port}/api`);
});
