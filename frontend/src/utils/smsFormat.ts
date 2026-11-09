import type { SmsTeacherRef } from '@/types/sms.types';

/** Format a date-only value (ISO string from a DB DATE column) without timezone drift. */
export function formatDateOnly(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Convert an API date/ISO string into the `YYYY-MM-DD` value used by `<input type="date">`. */
export function toDateInputValue(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value.slice(0, 10);
}

export function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function teacherLabel(teacher: SmsTeacherRef): string {
  const name = personName(teacher);
  return teacher.employeeCode ? `${name} (${teacher.employeeCode})` : name;
}

/** Trimmed string, or `null` when empty. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}
