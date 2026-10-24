import type { Lang } from './config';
import { localeOf } from './config';

/** fa için Jalali (شمسی) takvim ve Fars rakamları, tr için Gregoryen. */
export function formatDateTime(date: Date | string, lang: Lang): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const locale = lang === 'fa' ? 'fa-IR-u-ca-persian-nu-arabext' : 'tr-TR';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Tehran',
  }).format(d);
}

export function formatRelative(date: Date | string, lang: Lang): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec / 1), 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(diffSec / 86400), 'day');
  return formatDateTime(d, lang);
}

export function formatNumber(value: number, lang: Lang, digits = 0): string {
  return new Intl.NumberFormat(localeOf(lang), {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}
