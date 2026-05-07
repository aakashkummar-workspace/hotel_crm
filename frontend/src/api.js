const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'aurelia.token';

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t) {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request('/health'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),

  rooms: {
    list: () => request('/rooms'),
    get: (num) => request(`/rooms/${num}`),
    available: (checkin, checkout) => request(`/rooms/available?checkin=${encodeURIComponent(checkin)}&checkout=${encodeURIComponent(checkout)}`),
    create: (body) => request('/rooms', { method: 'POST', body }),
    update: (num, body) => request(`/rooms/${num}`, { method: 'PATCH', body }),
    remove: (num) => request(`/rooms/${num}`, { method: 'DELETE' }),
  },
  bookings: {
    list: (status) => request(`/bookings${status ? `?status=${encodeURIComponent(status)}` : ''}`),
    get: (id) => request(`/bookings/${id}`),
    create: (body) => request('/bookings', { method: 'POST', body }),
    update: (id, body) => request(`/bookings/${id}`, { method: 'PATCH', body }),
    remove: (id) => request(`/bookings/${id}`, { method: 'DELETE' }),
  },
  guests: {
    list: (search) => request(`/guests${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    create: (body) => request('/guests', { method: 'POST', body }),
    update: (id, body) => request(`/guests/${id}`, { method: 'PATCH', body }),
  },
  coffee: {
    menu: () => request('/coffee/menu'),
    orders: () => request('/coffee/orders'),
    createOrder: (body) => request('/coffee/orders', { method: 'POST', body }),
  },
  hall: {
    list: () => request('/hall'),
    create: (body) => request('/hall', { method: 'POST', body }),
    update: (id, body) => request(`/hall/${id}`, { method: 'PATCH', body }),
  },
  expenses: {
    list: () => request('/expenses'),
    create: (body) => request('/expenses', { method: 'POST', body }),
    remove: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
  },
  invoices: {
    list: () => request('/invoices'),
    create: (body) => request('/invoices', { method: 'POST', body }),
    update: (id, body) => request(`/invoices/${id}`, { method: 'PATCH', body }),
  },
  activity: {
    list: () => request('/activity'),
  },
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),
  settings: {
    profile: () => request('/settings/profile'),
    updateProfile: (body) => request('/settings/profile', { method: 'PUT', body }),
    tax: () => request('/settings/tax'),
    updateTax: (body) => request('/settings/tax', { method: 'PUT', body }),
  },
  reports: {
    summary: () => request('/reports/summary'),
  },
  publicSite: {
    rooms: () => request('/public/rooms'),
    profile: () => request('/public/profile'),
    enquire: (body) => request('/public/enquiries', { method: 'POST', body }),
  },
};

export const fmtINR = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const fmtINRk = (n) => {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'k';
  return '₹' + n;
};

export function downloadCSV(filename, rows, columns) {
  const cols = columns || (rows.length ? Object.keys(rows[0]) : []);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [cols.join(',')];
  for (const r of rows) lines.push(cols.map(c => escape(r[c])).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
