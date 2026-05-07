import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT 100').all();
  res.json(rows);
});

export default router;
