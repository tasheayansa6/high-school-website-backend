import { describe, expect, it } from 'vitest';

import amLocale from '@/i18n/locales/am/translation.json';
import enLocale from '@/i18n/locales/en/translation.json';
import omLocale from '@/i18n/locales/om/translation.json';

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (value == null || typeof value !== 'object') {
    return { [prefix]: String(value) };
  }
  if (Array.isArray(value)) {
    return value.reduce<Record<string, string>>((acc, item, index) => {
      Object.assign(acc, flatten(item, prefix ? `${prefix}[${index}]` : `[${index}]`));
      return acc;
    }, {});
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, nested]) => {
      const next = prefix ? `${prefix}.${key}` : key;
      Object.assign(acc, flatten(nested, next));
      return acc;
    },
    {},
  );
}

describe('locale key parity', () => {
  const en = flatten(enLocale);
  const am = flatten(amLocale);
  const om = flatten(omLocale);

  it('en/am/om share the same leaf key set', () => {
    const enKeys = Object.keys(en).sort();
    expect(Object.keys(am).sort()).toEqual(enKeys);
    expect(Object.keys(om).sort()).toEqual(enKeys);
  });

  it('does not leave empty translation values in am or om', () => {
    for (const [key, value] of Object.entries(am)) {
      expect(value.trim().length, `am empty: ${key}`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(om)) {
      expect(value.trim().length, `om empty: ${key}`).toBeGreaterThan(0);
    }
  });
});
