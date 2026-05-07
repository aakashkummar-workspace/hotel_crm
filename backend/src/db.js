import Database from 'better-sqlite3';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH
  ? resolve(process.env.DATABASE_PATH)
  : resolve(__dirname, '..', 'data', 'aurelia.db');

if (!existsSync(dirname(dbPath))) mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS room_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      sqft INTEGER NOT NULL,
      beds TEXT NOT NULL,
      max_guests INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      num TEXT UNIQUE NOT NULL,
      type_id TEXT NOT NULL REFERENCES room_types(id),
      floor INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      guest TEXT,
      checkin TEXT,
      checkout TEXT,
      image TEXT,
      price INTEGER
    );

    CREATE TABLE IF NOT EXISTS guests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      visits INTEGER NOT NULL DEFAULT 0,
      lifetime INTEGER NOT NULL DEFAULT 0,
      last_stay TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      guest TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      room TEXT NOT NULL,
      checkin TEXT NOT NULL,
      checkout TEXT NOT NULL,
      nights INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      source TEXT NOT NULL DEFAULT 'Direct',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coffee_menu (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      emoji TEXT
    );

    CREATE TABLE IF NOT EXISTS coffee_orders (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      items_count INTEGER NOT NULL,
      total INTEGER NOT NULL,
      table_label TEXT NOT NULL,
      payment TEXT NOT NULL,
      items_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hall_bookings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      guests INTEGER NOT NULL,
      advance INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      contact TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      vendor TEXT NOT NULL,
      amount INTEGER NOT NULL,
      method TEXT NOT NULL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      guest TEXT NOT NULL,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      tax INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      method TEXT NOT NULL DEFAULT '—'
    );

    CREATE TABLE IF NOT EXISTS activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT,
      action TEXT NOT NULL,
      target TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// Lightweight migrations for columns added after initial release.
// Idempotent — checks PRAGMA table_info and adds the column only if missing.
export function runMigrations() {
  const cols = db.prepare("PRAGMA table_info(rooms)").all().map(c => c.name);
  if (!cols.includes('price')) {
    db.exec('ALTER TABLE rooms ADD COLUMN price INTEGER');
  }
}

export function logActivity(user_name, action, target) {
  try {
    db.prepare('INSERT INTO activity (user_name, action, target) VALUES (?, ?, ?)').run(user_name || 'System', action, target || null);
  } catch { /* swallow */ }
}
