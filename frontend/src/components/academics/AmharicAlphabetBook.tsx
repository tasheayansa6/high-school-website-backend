import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePublicAmharicBook } from '@/hooks/usePublicSettings';
import { cn } from '@/lib/utils';

/** Interactive “My First Amharic Alphabets” lesson — content from `GET /settings/public`. */
export function AmharicAlphabetBook() {
  const { t } = useTranslation();
  const { book } = usePublicAmharicBook();
  const [activeLesson, setActiveLesson] = useState(0);
  const [activeFidel, setActiveFidel] = useState<string | null>(null);
  const lessons = book.lessons;
  const lesson = lessons[activeLesson] ?? lessons[0]!;

  return (
    <div className="overflow-hidden rounded-2xl border border-outline-variant/40 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-[#4aa3d9] px-5 py-6 text-center sm:px-8 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, #fff 0 2px, transparent 3px), radial-gradient(circle at 70% 20%, #fff 0 1.5px, transparent 2.5px), radial-gradient(circle at 85% 60%, #fff 0 2px, transparent 3px)',
          }}
          aria-hidden
        />
        <p className="relative font-sans text-lg font-bold text-[#3cb878] sm:text-xl">
          {t('amharicBook.kicker')}
        </p>
        <h3 className="relative mt-1 font-display text-3xl font-semibold tracking-tight text-[#1e5aa8] sm:text-4xl">
          <span className="text-[#f4d03f]">{t('amharicBook.titleHighlight')}</span>
        </h3>
        <p className="relative mt-3 inline-block rounded-full bg-[#2b7bb8] px-4 py-1.5 font-sans text-caption text-white sm:text-sm">
          {t('amharicBook.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
        <div className="border-b border-outline-variant/40 p-4 lg:col-span-4 lg:border-r lg:border-b-0 lg:p-5">
          <img
            src={book.coverUrl}
            alt={t('amharicBook.coverAlt')}
            className="mx-auto w-full max-w-sm rounded-xl object-contain"
            loading="lazy"
          />
          <p className="mt-4 font-sans text-body-sm leading-relaxed text-on-surface-variant">
            {t('amharicBook.blurb')}
          </p>
        </div>

        <div className="lg:col-span-8">
          <div className="flex gap-2 border-b border-outline-variant/40 px-4 pt-4 sm:px-6">
            {lessons.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveLesson(index);
                  setActiveFidel(null);
                }}
                className={cn(
                  'rounded-t-lg px-4 py-2.5 font-display text-2xl transition-colors',
                  index === activeLesson
                    ? 'bg-brand-ivory text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low',
                )}
                aria-pressed={index === activeLesson}
                style={index === activeLesson ? { color: item.accent } : undefined}
              >
                {item.focus}
              </button>
            ))}
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <p
                className="font-display text-6xl font-semibold leading-none sm:text-7xl"
                style={{ color: lesson.accent }}
                lang="am"
              >
                {activeFidel ?? lesson.focus}
              </p>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <img
                  src={lesson.image}
                  alt={lesson.imageAlt}
                  className="mx-auto aspect-[5/4] w-full max-w-xs rounded-xl object-cover sm:mx-0"
                  loading="lazy"
                />
                <p className="mt-3 font-display text-3xl font-semibold text-on-surface" lang="am">
                  {lesson.wordAm}
                </p>
                <p className="mt-1 font-sans text-body-sm text-on-surface-variant">
                  ({lesson.wordEn})
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 font-sans text-caption font-semibold tracking-wide text-on-surface-variant uppercase">
                {t('amharicBook.familyLabel')}
              </p>
              <ul className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {lesson.family.map((char) => {
                  const selected = (activeFidel ?? lesson.focus) === char;
                  return (
                    <li key={char}>
                      <button
                        type="button"
                        onClick={() => setActiveFidel(char)}
                        className={cn(
                          'flex aspect-square w-full items-center justify-center rounded-lg border font-display text-xl transition-colors sm:text-2xl',
                          selected
                            ? 'border-error bg-error/10 text-error'
                            : 'border-outline-variant/50 bg-brand-ivory text-on-surface hover:border-primary hover:text-primary',
                        )}
                        lang="am"
                        aria-pressed={selected}
                        aria-label={t('amharicBook.selectFidel', { char })}
                      >
                        {char}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
