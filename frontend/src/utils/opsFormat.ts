/** Today's date as `YYYY-MM-DD` in the user's local timezone (for `<input type="date">`). */
export function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** ISO timestamp -> `YYYY-MM-DDTHH:mm` (local) for `<input type="datetime-local">`. */
export function toDateTimeInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `datetime-local` value -> ISO string, or `null` when empty / invalid. */
export function dateTimeInputToIso(value: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatMoney(amount: number | null | undefined, currency = ''): string {
  if (amount === null || amount === undefined) {
    return '—';
  }
  const formatted = new Intl.NumberFormat('en', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency ? `${currency} ${formatted}` : formatted;
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}

/** Parse a user-entered number; returns `null` for blank / non-finite input. */
export function parseNumberInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function personLabel(person: {
  firstName: string;
  lastName: string;
  studentCode?: string | null;
}): string {
  const name = `${person.firstName} ${person.lastName}`.trim();
  return person.studentCode ? `${name} (${person.studentCode})` : name;
}
