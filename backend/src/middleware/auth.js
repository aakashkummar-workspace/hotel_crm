import jwt from 'jsonwebtoken';
import { HttpError } from './error.js';

const SECRET = () => process.env.JWT_SECRET || 'dev-only-secret-change-me';

export function signToken(payload) {
  return jwt.sign(payload, SECRET(), { expiresIn: '7d' });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET());
}

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Authentication required'));
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = verifyToken(token); } catch { /* ignore */ }
  }
  next();
}
