/** Locale-aware date formatting for API ISO timestamps. */
export function formatPublishedDate(
  value: string | null | undefined,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  },
): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatEventRange(
  startsAt: string,
  endsAt: string | null | undefined,
  locale: string,
): string {
  const start = formatPublishedDate(startsAt, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  if (!endsAt) {
    return start;
  }
  const end = formatPublishedDate(endsAt, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return end ? `${start} – ${end}` : start;
}
