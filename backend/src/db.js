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
      price INTEGER,
      max_guests INTEGER,
      image_focus_x INTEGER NOT NULL DEFAULT 50,
      image_focus_y INTEGER NOT NULL DEFAULT 50
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

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plate TEXT,
      capacity INTEGER NOT NULL DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'available',
      image TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS vehicle_trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      booking_id TEXT,
      guest TEXT,
      driver TEXT,
      purpose TEXT,
      depart_at TEXT NOT NULL,
      return_at TEXT NOT NULL,
      fuel_cost INTEGER NOT NULL DEFAULT 0,
      mileage INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kitchen_menu (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT,
      prep_minutes INTEGER NOT NULL DEFAULT 15,
      emoji TEXT
    );

    CREATE TABLE IF NOT EXISTS kitchen_orders (
      id TEXT PRIMARY KEY,
      time TEXT NOT NULL,
      items_count INTEGER NOT NULL,
      total INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'delivery',
      status TEXT NOT NULL DEFAULT 'received',
      customer TEXT,
      address TEXT,
      payment TEXT NOT NULL DEFAULT 'UPI',
      items_json TEXT,
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
  if (!cols.includes('max_guests')) {
    db.exec('ALTER TABLE rooms ADD COLUMN max_guests INTEGER');
  }
  if (!cols.includes('image_focus_x')) {
    db.exec('ALTER TABLE rooms ADD COLUMN image_focus_x INTEGER NOT NULL DEFAULT 50');
  }
  if (!cols.includes('image_focus_y')) {
    db.exec('ALTER TABLE rooms ADD COLUMN image_focus_y INTEGER NOT NULL DEFAULT 50');
  }

  // Booking lifecycle additions
  const bookCols = db.prepare("PRAGMA table_info(bookings)").all().map(c => c.name);
  if (!bookCols.includes('checked_out_at')) {
    db.exec('ALTER TABLE bookings ADD COLUMN checked_out_at TEXT');
  }
  if (!bookCols.includes('late_hours')) {
    db.exec('ALTER TABLE bookings ADD COLUMN late_hours REAL NOT NULL DEFAULT 0');
  }
  if (!bookCols.includes('late_fee')) {
    db.exec('ALTER TABLE bookings ADD COLUMN late_fee INTEGER NOT NULL DEFAULT 0');
  }
  if (!bookCols.includes('vehicle_requested')) {
    db.exec('ALTER TABLE bookings ADD COLUMN vehicle_requested INTEGER NOT NULL DEFAULT 0');
  }

  // Invoice metadata for installment plans
  const invCols = db.prepare("PRAGMA table_info(invoices)").all().map(c => c.name);
  if (!invCols.includes('booking_id')) {
    db.exec("ALTER TABLE invoices ADD COLUMN booking_id TEXT");
  }
  if (!invCols.includes('note')) {
    db.exec("ALTER TABLE invoices ADD COLUMN note TEXT");
  }
}

export function logActivity(user_name, action, target) {
  try {
    db.prepare('INSERT INTO activity (user_name, action, target) VALUES (?, ?, ?)').run(user_name || 'System', action, target || null);
  } catch { /* swallow */ }
}
