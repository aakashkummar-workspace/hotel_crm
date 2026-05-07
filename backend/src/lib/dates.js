// Normalize date strings — accepts ISO ("2026-05-03") or label ("May 03").
// Labels assume current year.
const MONTHS = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };

export function toISO(s) {
  if (!s) return null;
  const str = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // matches "May 03", "May 3", "may 3", "Upcoming May 09" — strips leading words
  const m = str.match(/([A-Za-z]+)\s+(\d{1,2})$/);
  if (!m) return null;
  const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (!mo) return null;
  const yr = new Date().getFullYear();
  const day = Number(m[2]);
  return `${yr}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Two half-open ranges [a1, a2) and [b1, b2) overlap iff a1 < b2 AND b1 < a2.
// (Same-day check-in on someone else's check-out day is allowed.)
export function rangesOverlap(a1, a2, b1, b2) {
  if (!a1 || !a2 || !b1 || !b2) return false;
  return a1 < b2 && b1 < a2;
}
