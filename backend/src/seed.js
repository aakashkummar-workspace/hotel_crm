import 'dotenv/config';
import { db, initSchema } from './db.js';
import crypto from 'node:crypto';

const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1551776235-dde6d482980b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
];

const ROOM_TYPES = [
  { id: 'heritage-suite', name: 'Heritage Suite', base_price: 8400, sqft: 540, beds: 'King', max_guests: 3 },
  { id: 'courtyard-deluxe', name: 'Courtyard Deluxe', base_price: 5200, sqft: 380, beds: 'Queen', max_guests: 2 },
  { id: 'garden-twin', name: 'Garden Twin', base_price: 4400, sqft: 320, beds: 'Twin', max_guests: 2 },
  { id: 'balcony-king', name: 'Balcony King', base_price: 6200, sqft: 420, beds: 'King', max_guests: 2 },
];

const ROOMS = [
  { num: '101', type_id: 'heritage-suite', floor: 1, status: 'occupied', guest: 'Aanya Krishnamurthy', checkout: 'May 09' },
  { num: '102', type_id: 'courtyard-deluxe', floor: 1, status: 'available' },
  { num: '103', type_id: 'garden-twin', floor: 1, status: 'cleaning' },
  { num: '104', type_id: 'courtyard-deluxe', floor: 1, status: 'reserved', guest: 'Marcus Bell', checkin: 'May 07' },
  { num: '201', type_id: 'heritage-suite', floor: 2, status: 'occupied', guest: 'The Choudhury Family', checkout: 'May 11' },
  { num: '202', type_id: 'balcony-king', floor: 2, status: 'available' },
  { num: '203', type_id: 'balcony-king', floor: 2, status: 'occupied', guest: 'Sarah & David Lin', checkout: 'May 08' },
  { num: '204', type_id: 'courtyard-deluxe', floor: 2, status: 'reserved', guest: 'Imran Shaikh', checkin: 'May 06' },
  { num: '301', type_id: 'heritage-suite', floor: 3, status: 'available' },
  { num: '302', type_id: 'balcony-king', floor: 3, status: 'occupied', guest: 'Léa Martin', checkout: 'May 10' },
  { num: '303', type_id: 'garden-twin', floor: 3, status: 'available' },
];

const BOOKINGS = [];

const COFFEE_MENU = [
  { id: 'esp-1', name: 'Aurelia Espresso', category: 'Espresso', price: 180, description: 'House blend, double shot', emoji: '☕' },
  { id: 'esp-2', name: 'Cortado', category: 'Espresso', price: 220, description: 'Equal parts espresso + warm milk', emoji: '☕' },
  { id: 'esp-3', name: 'Cappuccino', category: 'Espresso', price: 240, description: 'Velvet foam, cocoa dust', emoji: '☕' },
  { id: 'esp-4', name: 'Flat White', category: 'Espresso', price: 240, description: 'Microfoam over a double', emoji: '☕' },
  { id: 'fil-1', name: 'South Indian Filter', category: 'Filter', price: 140, description: 'Davara-tumbler service', emoji: '☕' },
  { id: 'fil-2', name: 'V60 Pour Over', category: 'Filter', price: 280, description: 'Single origin, light roast', emoji: '☕' },
  { id: 'tea-1', name: 'Masala Chai', category: 'Tea', price: 120, description: 'Cardamom + ginger forward', emoji: '🫖' },
  { id: 'tea-2', name: 'Nilgiri White', category: 'Tea', price: 220, description: 'Estate-loose leaf', emoji: '🫖' },
  { id: 'cold-1', name: 'Cold Brew', category: 'Cold', price: 260, description: '20-hour steep, served black', emoji: '🧋' },
  { id: 'cold-2', name: 'Iced Latte', category: 'Cold', price: 280, description: 'Over slow-melt ice', emoji: '🧋' },
  { id: 'cold-3', name: 'Mango Lassi', category: 'Cold', price: 220, description: 'Alphonso, hung curd', emoji: '🥭' },
  { id: 'pas-1', name: 'Almond Croissant', category: 'Pastry', price: 240, description: 'Baked at dawn', emoji: '🥐' },
  { id: 'pas-2', name: 'Cardamom Bun', category: 'Pastry', price: 180, description: 'Knotted, sugar-glazed', emoji: '🥐' },
  { id: 'pas-3', name: 'Banana Bread', category: 'Pastry', price: 160, description: 'Walnut, brown butter', emoji: '🍞' },
  { id: 'all-1', name: 'Avocado Sourdough', category: 'All-Day', price: 380, description: 'Chilli oil, lime, dukkah', emoji: '🥑' },
  { id: 'all-2', name: 'Masala Omelette', category: 'All-Day', price: 280, description: 'Tomato, onion, green chilli', emoji: '🍳' },
  { id: 'all-3', name: 'Idli Sambar', category: 'All-Day', price: 220, description: 'Three idlis, coconut chutney', emoji: '🍚' },
];

const COFFEE_ORDERS = [
  { id: 'C-1142', time: '08:14', items_count: 3, total: 580, table_label: 'T2', payment: 'UPI' },
  { id: 'C-1143', time: '08:32', items_count: 2, total: 460, table_label: 'T5', payment: 'Card' },
  { id: 'C-1144', time: '09:01', items_count: 4, total: 920, table_label: 'Takeaway', payment: 'Cash' },
  { id: 'C-1145', time: '09:18', items_count: 1, total: 240, table_label: 'T1', payment: 'Room 201' },
  { id: 'C-1146', time: '09:45', items_count: 5, total: 1340, table_label: 'T3', payment: 'UPI' },
  { id: 'C-1147', time: '10:02', items_count: 2, total: 520, table_label: 'T4', payment: 'UPI' },
  { id: 'C-1148', time: '10:24', items_count: 3, total: 740, table_label: 'T2', payment: 'Card' },
];

const HALL_BOOKINGS = [
  { id: 'H-204', title: 'Aanya × Rohan — Engagement', date: 'May 12', time: '18:00 – 23:00', guests: 60, advance: 25000, total: 85000, status: 'confirmed', contact: 'Mrs. Krishnamurthy' },
  { id: 'H-205', title: 'Quarterly Board Sync — Vellore Co.', date: 'May 16', time: '10:00 – 16:00', guests: 22, advance: 15000, total: 42000, status: 'confirmed', contact: 'Vikram Pillai' },
  { id: 'H-206', title: "Saanvi's First Birthday", date: 'May 19', time: '16:00 – 20:00', guests: 45, advance: 20000, total: 62000, status: 'confirmed', contact: 'Mr. Iyer' },
  { id: 'H-207', title: 'Yoga Retreat Welcome', date: 'May 22', time: '08:00 – 12:00', guests: 30, advance: 0, total: 28000, status: 'pending', contact: 'Anjali Devi' },
  { id: 'H-208', title: 'Whitfield × Anand Wedding Reception', date: 'May 28', time: '19:00 – 23:30', guests: 75, advance: 40000, total: 115000, status: 'confirmed', contact: 'Mrs. Anand' },
];

const EXPENSES = [
  { id: 'E-3201', date: 'May 05', category: 'Salaries', vendor: 'Staff Payroll — May Adv', amount: 142000, method: 'Bank', note: 'Advance to 12 staff' },
  { id: 'E-3202', date: 'May 05', category: 'Coffee Purchases', vendor: 'Blue Tokai Roasters', amount: 28400, method: 'UPI', note: 'House blend, 8kg' },
  { id: 'E-3203', date: 'May 04', category: 'Utilities', vendor: 'TNEB — Electricity', amount: 18650, method: 'Bank', note: 'April bill' },
  { id: 'E-3204', date: 'May 04', category: 'Cleaning', vendor: 'Procter Supplies', amount: 6200, method: 'Cash', note: 'Linens, detergent' },
  { id: 'E-3205', date: 'May 03', category: 'Maintenance', vendor: 'AC Servicing — CoolAir', amount: 9800, method: 'UPI', note: 'Quarterly, 11 units' },
  { id: 'E-3206', date: 'May 02', category: 'Coffee Purchases', vendor: 'Akshaya Bakery', amount: 4400, method: 'Cash', note: 'Daily pastries — 7 days' },
  { id: 'E-3207', date: 'May 02', category: 'Misc', vendor: 'Florist — Pondi Blooms', amount: 2800, method: 'UPI', note: 'Lobby arrangements' },
  { id: 'E-3208', date: 'May 01', category: 'Utilities', vendor: 'Jio Fiber — Internet', amount: 3200, method: 'Bank', note: 'Monthly' },
];

const GUESTS = [
  { id: 'G-001', name: 'Aanya Krishnamurthy', email: 'aanya.k@gmail.com', phone: '+91 98765 43210', visits: 4, lifetime: 142000, last_stay: 'May 03', status: 'vip', note: 'Prefers Heritage Suite, jasmine on pillow.' },
  { id: 'G-002', name: 'Léa Martin', email: 'lea.m@orange.fr', phone: '+33 6 12 34 56 78', visits: 2, lifetime: 88200, last_stay: 'May 02', status: 'regular', note: 'French speaker, vegetarian breakfast.' },
  { id: 'G-003', name: 'Marcus Bell', email: 'mbell@hey.com', phone: '+1 415 555 0142', visits: 1, lifetime: 15600, last_stay: 'May 07', status: 'new', note: 'First visit. Travel writer.' },
  { id: 'G-004', name: 'The Choudhury Family', email: 'choudhury.s@yahoo.in', phone: '+91 98220 11122', visits: 3, lifetime: 124000, last_stay: 'May 05', status: 'vip', note: 'Family of 5, needs extra cot.' },
  { id: 'G-005', name: 'Sarah & David Lin', email: 'sd.lin@outlook.sg', phone: '+65 9123 4567', visits: 2, lifetime: 49200, last_stay: 'May 04', status: 'regular', note: 'Anniversary couple. Allergic to nuts.' },
  { id: 'G-006', name: 'Tom Whitfield', email: 'twhit@protonmail.com', phone: '+44 7700 900123', visits: 1, lifetime: 18600, last_stay: 'Upcoming May 14', status: 'new', note: 'Wedding party member.' },
  { id: 'G-007', name: 'Priya Iyer', email: 'priya.i@gmail.com', phone: '+91 98888 12345', visits: 5, lifetime: 62400, last_stay: 'Upcoming May 09', status: 'vip', note: 'Local. Always books Courtyard Deluxe.' },
  { id: 'G-008', name: 'Imran Shaikh', email: 'imran.s@gmail.com', phone: '+91 99877 65432', visits: 2, lifetime: 31200, last_stay: 'Upcoming May 06', status: 'regular', note: 'Halal breakfast.' },
];

const INVOICES = [
  { id: 'INV-2024-0418', guest: 'Aanya Krishnamurthy', date: 'May 03', amount: 50400, tax: 9072, total: 59472, status: 'paid', method: 'Card' },
  { id: 'INV-2024-0419', guest: 'Sarah & David Lin', date: 'May 04', amount: 24800, tax: 4464, total: 29264, status: 'paid', method: 'UPI' },
  { id: 'INV-2024-0420', guest: 'The Choudhury Family', date: 'May 05', amount: 50400, tax: 9072, total: 59472, status: 'partial', method: 'Cash' },
  { id: 'INV-2024-0421', guest: 'Léa Martin', date: 'May 02', amount: 49600, tax: 8928, total: 58528, status: 'paid', method: 'Card' },
  { id: 'INV-2024-0422', guest: 'Vellore Co. (Hall)', date: 'May 16', amount: 42000, tax: 7560, total: 49560, status: 'advance', method: 'Bank' },
  { id: 'INV-2024-0423', guest: 'Marcus Bell', date: 'May 07', amount: 15600, tax: 2808, total: 18408, status: 'pending', method: '—' },
  { id: 'INV-2024-0424', guest: 'Imran Shaikh', date: 'May 06', amount: 15600, tax: 2808, total: 18408, status: 'advance', method: 'UPI' },
];

const HOTEL_PROFILE = {
  name: 'Aurelia',
  tagline: 'Heritage Stay & Coffee House',
  location: 'Pondicherry, India',
  email: 'concierge@aurelia.in',
  phone: '+91 98400 12345',
  gstin: '33AAACA1234B1ZE',
  currency: 'INR',
  about: "Aurelia is an 11-room heritage stay tucked into Pondicherry's French Quarter, with an in-house specialty coffee bar and an event hall opening onto a private courtyard.",
};

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function seed({ force = false } = {}) {
  initSchema();

  const existing = db.prepare('SELECT COUNT(*) as c FROM rooms').get();
  if (existing.c > 0 && !force) {
    console.log('Database already seeded; skipping. Pass --force to re-seed.');
    return;
  }

  if (force) {
    db.exec(`
      DELETE FROM invoices;
      DELETE FROM expenses;
      DELETE FROM hall_bookings;
      DELETE FROM coffee_orders;
      DELETE FROM coffee_menu;
      DELETE FROM kitchen_orders;
      DELETE FROM kitchen_menu;
      DELETE FROM vehicle_trips;
      DELETE FROM vehicles;
      DELETE FROM bookings;
      DELETE FROM guests;
      DELETE FROM rooms;
      DELETE FROM room_types;
      DELETE FROM activity;
      DELETE FROM settings;
      DELETE FROM users;
    `);
  }

  const insertType = db.prepare(`INSERT INTO room_types (id, name, base_price, sqft, beds, max_guests) VALUES (@id, @name, @base_price, @sqft, @beds, @max_guests)`);
  const insertRoom = db.prepare(`INSERT INTO rooms (id, num, type_id, floor, status, guest, checkin, checkout, image) VALUES (@id, @num, @type_id, @floor, @status, @guest, @checkin, @checkout, @image)`);
  const insertGuest = db.prepare(`INSERT INTO guests (id, name, email, phone, visits, lifetime, last_stay, status, note) VALUES (@id, @name, @email, @phone, @visits, @lifetime, @last_stay, @status, @note)`);
  const insertBooking = db.prepare(`INSERT INTO bookings (id, guest, phone, room, checkin, checkout, nights, amount, status, source) VALUES (@id, @guest, @phone, @room, @checkin, @checkout, @nights, @amount, @status, @source)`);
  const insertCoffeeMenu = db.prepare(`INSERT INTO coffee_menu (id, name, category, price, description, emoji) VALUES (@id, @name, @category, @price, @description, @emoji)`);
  const insertCoffeeOrder = db.prepare(`INSERT INTO coffee_orders (id, time, items_count, total, table_label, payment) VALUES (@id, @time, @items_count, @total, @table_label, @payment)`);
  const insertHall = db.prepare(`INSERT INTO hall_bookings (id, title, date, time, guests, advance, total, status, contact) VALUES (@id, @title, @date, @time, @guests, @advance, @total, @status, @contact)`);
  const insertExpense = db.prepare(`INSERT INTO expenses (id, date, category, vendor, amount, method, note) VALUES (@id, @date, @category, @vendor, @amount, @method, @note)`);
  const insertInvoice = db.prepare(`INSERT INTO invoices (id, guest, date, amount, tax, total, status, method) VALUES (@id, @guest, @date, @amount, @tax, @total, @status, @method)`);
  const setSetting = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
  const insertUser = db.prepare(`INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)`);

  const seedActivity = [
    { user_name: 'Vikram Pillai', action: 'Updated room rate', target: 'Heritage Suite ₹8,000 → ₹8,400' },
    { user_name: 'Meera Anand', action: 'Created booking', target: 'BK-2850 · Kavya Reddy' },
    { user_name: 'Karthik R.', action: 'Closed café shift', target: '₹14,640 · 27 orders' },
    { user_name: 'Vikram Pillai', action: 'Approved expense', target: 'E-3201 · Salaries ₹1,42,000' },
    { user_name: 'Meera Anand', action: 'Sent invoice', target: 'INV-2024-0419 to S & D Lin' },
    { user_name: 'System', action: 'Synced channel manager', target: '11 rooms · 14 days' },
  ];

  const tx = db.transaction(() => {
    for (const t of ROOM_TYPES) insertType.run(t);
    ROOMS.forEach((r, i) => insertRoom.run({
      id: r.num,
      num: r.num,
      type_id: r.type_id,
      floor: r.floor,
      status: r.status,
      guest: r.guest ?? null,
      checkin: r.checkin ?? null,
      checkout: r.checkout ?? null,
      image: ROOM_IMAGES[i % ROOM_IMAGES.length],
    }));
    for (const g of GUESTS) insertGuest.run(g);
    for (const b of BOOKINGS) insertBooking.run({ ...b, email: null });
    for (const m of COFFEE_MENU) insertCoffeeMenu.run(m);
    for (const o of COFFEE_ORDERS) insertCoffeeOrder.run(o);
    for (const h of HALL_BOOKINGS) insertHall.run(h);
    for (const e of EXPENSES) insertExpense.run(e);
    for (const i of INVOICES) insertInvoice.run(i);

    setSetting.run('hotel_profile', JSON.stringify(HOTEL_PROFILE));
    setSetting.run('tax_room_pct', '18');
    setSetting.run('tax_cafe_pct', '5');
    setSetting.run('tax_hall_pct', '18');
    setSetting.run('invoice_prefix', 'INV-2026-');
    setSetting.run('invoice_next', '0425');
    setSetting.run('late_grace_hours', '2');
    setSetting.run('late_rate_pct', '25');
    setSetting.run('std_checkout_time', '11:00');
    setSetting.run('installment_min_nights', '15');
    setSetting.run('installment_advance_pct', '50');
    setSetting.run('vehicle_min_nights', '15');

    const insertVehicle = db.prepare('INSERT INTO vehicles (id, name, plate, capacity, status, image, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertVehicle.run('V-1', 'Sedan — Honda City', 'TN05 BK 2841', 4, 'available', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80', 'White, automatic. Driver: Suresh.');
    insertVehicle.run('V-2', 'SUV — Toyota Innova', 'TN05 BK 5612', 7, 'available', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=80', 'Black, manual. Driver: Mani.');

    const insertKitchenItem = db.prepare('INSERT INTO kitchen_menu (id, name, category, price, description, prep_minutes, emoji) VALUES (?, ?, ?, ?, ?, ?, ?)');
    [
      { id: 'k-1', name: 'Andhra Chicken Biryani', category: 'Mains', price: 420, description: 'Dum-cooked, served with raita & gravy', prep_minutes: 25, emoji: '🍛' },
      { id: 'k-2', name: 'Paneer Tikka Masala', category: 'Mains', price: 360, description: 'Smoked paneer in tomato-cashew gravy', prep_minutes: 20, emoji: '🍲' },
      { id: 'k-3', name: 'Mutton Pepper Fry', category: 'Mains', price: 480, description: 'Chettinad-style, slow-cooked', prep_minutes: 30, emoji: '🥘' },
      { id: 'k-4', name: 'Garlic Naan', category: 'Breads', price: 90, description: 'Tandoor-baked, brushed with butter', prep_minutes: 8, emoji: '🥖' },
      { id: 'k-5', name: 'Ghee Roast Dosa', category: 'South Indian', price: 220, description: 'Crisp, with three chutneys & sambar', prep_minutes: 12, emoji: '🥞' },
      { id: 'k-6', name: 'Hyderabadi Veg Biryani', category: 'Mains', price: 320, description: 'Vegetable dum biryani with mirchi salan', prep_minutes: 22, emoji: '🍚' },
      { id: 'k-7', name: 'Dal Makhani', category: 'Mains', price: 280, description: 'Slow-simmered black dal, finished with cream', prep_minutes: 18, emoji: '🍲' },
      { id: 'k-8', name: 'Gulab Jamun (2 pc)', category: 'Desserts', price: 120, description: 'Warm, with rabri', prep_minutes: 5, emoji: '🍮' },
    ].forEach(it => insertKitchenItem.run(it.id, it.name, it.category, it.price, it.description, it.prep_minutes, it.emoji));

    const adminEmail = process.env.ADMIN_EMAIL || 'concierge@aurelia.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345';
    insertUser.run(adminEmail, hashPassword(adminPassword), 'Vikram Pillai', 'admin');

    const insertActivity = db.prepare(`INSERT INTO activity (user_name, action, target) VALUES (?, ?, ?)`);
    for (const a of seedActivity) insertActivity.run(a.user_name, a.action, a.target);
  });

  tx();
  console.log('Seed complete.');
}

const argv1 = process.argv[1] || '';
if (argv1 && import.meta.url.endsWith(argv1.replace(/\\/g, '/').split('/').slice(-2).join('/'))) {
  const force = process.argv.includes('--force');
  seed({ force });
}
