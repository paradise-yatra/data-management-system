const DEFAULT_TIME_ZONE = 'Asia/Kolkata';
const DEFAULT_LOCALE = 'en-IN';

export function clampNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

export function toSafeString(value, fallback = '') {
  if (value == null) return fallback;
  return String(value).trim();
}

export function truncateText(value, maxLength) {
  const text = toSafeString(value);
  if (!maxLength || text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

export function formatDateLabel(dateValue, { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE } = {}) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(date);
}

export function formatDateTimeLabel(dateValue, { locale = DEFAULT_LOCALE, timeZone = DEFAULT_TIME_ZONE } = {}) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).format(date);
}

export function formatCurrency(value, currencyCode = 'INR', locale = DEFAULT_LOCALE) {
  const amount = clampNumber(value, { min: 0, fallback: 0 });
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDurationMinutes(totalMinutes) {
  const safe = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (!hours) return `${minutes} min`;
  if (!minutes) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export function ensureArray(value) {
  if (!Array.isArray(value)) return [];
  return value;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(value, fallback = 'file') {
  const slug = String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}
