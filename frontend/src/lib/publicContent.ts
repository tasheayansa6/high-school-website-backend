import { env } from '@/lib/env';
import { endpoints } from '@/services/api/endpoints';

export interface AmharicLesson {
  id: string;
  focus: string;
  wordAm: string;
  wordEn: string;
  image: string;
  imageAlt: string;
  family: readonly string[];
  accent: string;
}

export interface AmharicBookContent {
  coverUrl: string;
  lessons: AmharicLesson[];
}

export interface CampusLifePhoto {
  src: string;
  alt: string;
}

export interface CampusLifeImages {
  morning: CampusLifePhoto;
  friends: CampusLifePhoto;
  sports: CampusLifePhoto;
  evening: CampusLifePhoto;
}

export interface AboutStat {
  value: string;
  label: string;
}

export interface AboutOverviewContent {
  title: string;
  tagline: string;
  paragraph1: string;
  paragraph2: string;
  mission: { label: string; body: string };
  vision: { label: string; body: string };
  campusBlock: { title: string; body: string };
  stats: AboutStat[];
}

const FALLBACK_AMHARIC_BOOK: AmharicBookContent = {
  coverUrl: '/images/amharic-alphabets-book.png',
  lessons: [
    {
      id: 'ho',
      focus: 'ሆ',
      wordAm: 'ዝሆን',
      wordEn: 'Elephant',
      image:
        'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?auto=format&fit=crop&w=800&h=600&q=80',
      imageAlt: 'African elephant',
      family: ['ሀ', 'ሁ', 'ሂ', 'ሃ', 'ሄ', 'ህ', 'ሆ'],
      accent: '#e87722',
    },
    {
      id: 'lo',
      focus: 'ሎ',
      wordAm: 'ሎሚ',
      wordEn: 'Lemon',
      image:
        'https://images.unsplash.com/photo-1572635148818-39b7dde14536?auto=format&fit=crop&w=800&h=600&q=80',
      imageAlt: 'Fresh lemons',
      family: ['ለ', 'ሉ', 'ሊ', 'ላ', 'ሌ', 'ል', 'ሎ'],
      accent: '#2eb8c7',
    },
  ],
};

const FALLBACK_CAMPUS_LIFE: CampusLifeImages = {
  morning: {
    src: 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=900&h=700&q=80',
    alt: 'Students starting the school day in class',
  },
  friends: {
    src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&h=700&q=80',
    alt: 'Students together outdoors on campus',
  },
  sports: {
    src: '/images/action-on-the-field.png',
    alt: 'Students playing soccer on the sports field',
  },
  evening: {
    src: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=900&h=700&q=80',
    alt: 'Students studying as the school day ends',
  },
};

/** Resolve site path, absolute URL, or media publicId to a browser-usable src. */
export function resolvePublicAssetUrl(src: string | undefined | null): string {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('/images/')) return trimmed;
  if (trimmed.startsWith('/media/')) {
    return `${env.apiBaseUrl.replace(/\/$/, '')}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
  }
  if (trimmed.startsWith('/api/v1/media/')) {
    const origin = new URL(env.apiBaseUrl).origin;
    return `${origin}${trimmed}`;
  }
  // Unguessable MediaAsset publicId (32-char hex)
  if (/^[a-f0-9]{32}$/i.test(trimmed)) {
    return `${env.apiBaseUrl.replace(/\/$/, '')}${endpoints.media.content(trimmed)}`;
  }
  return trimmed;
}

function parseJsonObject(raw: string | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asPhoto(value: unknown, fallback: CampusLifePhoto): CampusLifePhoto {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  const src = typeof record.src === 'string' ? resolvePublicAssetUrl(record.src) : fallback.src;
  const alt = typeof record.alt === 'string' && record.alt.trim() ? record.alt : fallback.alt;
  return { src: src || fallback.src, alt };
}

function asLesson(value: unknown, fallback: AmharicLesson): AmharicLesson | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : fallback.id;
  const focus = typeof record.focus === 'string' ? record.focus : fallback.focus;
  const wordAm = typeof record.wordAm === 'string' ? record.wordAm : fallback.wordAm;
  const wordEn = typeof record.wordEn === 'string' ? record.wordEn : fallback.wordEn;
  const image =
    typeof record.image === 'string'
      ? resolvePublicAssetUrl(record.image) || fallback.image
      : fallback.image;
  const imageAlt =
    typeof record.imageAlt === 'string' && record.imageAlt.trim()
      ? record.imageAlt
      : fallback.imageAlt;
  const accent = typeof record.accent === 'string' ? record.accent : fallback.accent;
  const family = Array.isArray(record.family)
    ? record.family.filter((item): item is string => typeof item === 'string')
    : [...fallback.family];
  if (!id || !focus || family.length === 0) return null;
  return { id, focus, wordAm, wordEn, image, imageAlt, family, accent };
}

export function parseAmharicBook(raw: string | undefined): AmharicBookContent {
  const data = parseJsonObject(raw);
  if (!data) return FALLBACK_AMHARIC_BOOK;

  const coverUrl =
    typeof data.coverUrl === 'string'
      ? resolvePublicAssetUrl(data.coverUrl) || FALLBACK_AMHARIC_BOOK.coverUrl
      : FALLBACK_AMHARIC_BOOK.coverUrl;

  const lessonsRaw = Array.isArray(data.lessons) ? data.lessons : null;
  const lessons =
    lessonsRaw
      ?.map((item, index) =>
        asLesson(item, FALLBACK_AMHARIC_BOOK.lessons[index] ?? FALLBACK_AMHARIC_BOOK.lessons[0]!),
      )
      .filter((item): item is AmharicLesson => Boolean(item)) ?? [];

  return {
    coverUrl,
    lessons: lessons.length > 0 ? lessons : FALLBACK_AMHARIC_BOOK.lessons,
  };
}

export function parseCampusLifeImages(raw: string | undefined): CampusLifeImages {
  const data = parseJsonObject(raw);
  if (!data) return FALLBACK_CAMPUS_LIFE;

  return {
    morning: asPhoto(data.morning, FALLBACK_CAMPUS_LIFE.morning),
    friends: asPhoto(data.friends, FALLBACK_CAMPUS_LIFE.friends),
    sports: asPhoto(data.sports, FALLBACK_CAMPUS_LIFE.sports),
    evening: asPhoto(data.evening, FALLBACK_CAMPUS_LIFE.evening),
  };
}

const FALLBACK_ABOUT_OVERVIEW: AboutOverviewContent = {
  title: 'About Abyssinia Academy',
  tagline:
    'Cultivating intellectual rigor, cultural heritage, and ethical leadership in the heart of Addis Ababa.',
  paragraph1:
    'Abyssinia Academy is an independent Ethiopian secondary institution ({{grades}}) founded on the conviction that high-level scholarship must remain inseparable from ethical character and national duty. Situated in Addis Ababa, the Academy prepares scholars through a demanding curriculum that pairs rigorous natural sciences and mathematics with humane inquiry in literature, history, and civic ethics.',
  paragraph2:
    'We reject educational short-cuts and rote compliance. Our scholars are taught to read deliberately, challenge conclusions methodically, articulate viewpoints in both Amharic and English, and honor the historical legacy of our homeland while preparing for university study.',
  mission: {
    label: 'Mission',
    body: '“To provide rigorous, inquiry-led secondary education that nurtures analytical clarity, ethical character, and cultural stewardship, equipping students to contribute meaningfully to Ethiopian society and the wider world.”',
  },
  vision: {
    label: 'Vision',
    body: '“To stand as an exemplary Ethiopian secondary institution where tradition and forward-looking scholarship meet, graduating reflective scholars who lead with empathy, humility, and intellectual purpose.”',
  },
  campusBlock: {
    title: "Abyssinia Academy's Campus",
    body: 'A vibrant environment for students to learn, grow, and connect — classrooms, labs, grounds, and community spaces designed for academic excellence.',
  },
  stats: [
    { value: '2014', label: 'Established' },
    { value: '1,200+', label: 'Students' },
    { value: '85+', label: 'Staff' },
    { value: '2,500+', label: 'Alumni' },
    { value: '9–12', label: 'Grades' },
  ],
};

function asLabeledBody(
  value: unknown,
  fallback: { label: string; body: string },
): { label: string; body: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  return {
    label: typeof record.label === 'string' && record.label.trim() ? record.label : fallback.label,
    body: typeof record.body === 'string' && record.body.trim() ? record.body : fallback.body,
  };
}

function applyGrades(text: string, grades: string): string {
  return text.split('{{grades}}').join(grades);
}

function localizeAboutOverview(
  overview: AboutOverviewContent,
  grades: string,
): AboutOverviewContent {
  return {
    ...overview,
    title: applyGrades(overview.title, grades),
    tagline: applyGrades(overview.tagline, grades),
    paragraph1: applyGrades(overview.paragraph1, grades),
    paragraph2: applyGrades(overview.paragraph2, grades),
    campusBlock: {
      title: applyGrades(overview.campusBlock.title, grades),
      body: applyGrades(overview.campusBlock.body, grades),
    },
  };
}

export function parseAboutOverview(
  raw: string | undefined,
  grades = 'Grades 9–12',
): AboutOverviewContent {
  const data = parseJsonObject(raw);
  if (!data) return localizeAboutOverview(FALLBACK_ABOUT_OVERVIEW, grades);

  const fallback = FALLBACK_ABOUT_OVERVIEW;
  const title =
    typeof data.title === 'string' && data.title.trim() ? data.title : fallback.title;
  const tagline =
    typeof data.tagline === 'string' && data.tagline.trim() ? data.tagline : fallback.tagline;
  const paragraph1 =
    typeof data.paragraph1 === 'string' && data.paragraph1.trim()
      ? data.paragraph1
      : fallback.paragraph1;
  const paragraph2 =
    typeof data.paragraph2 === 'string' && data.paragraph2.trim()
      ? data.paragraph2
      : fallback.paragraph2;

  let campusBlock = fallback.campusBlock;
  if (data.campusBlock && typeof data.campusBlock === 'object' && !Array.isArray(data.campusBlock)) {
    const record = data.campusBlock as Record<string, unknown>;
    campusBlock = {
      title:
        typeof record.title === 'string' && record.title.trim()
          ? record.title
          : fallback.campusBlock.title,
      body:
        typeof record.body === 'string' && record.body.trim()
          ? record.body
          : fallback.campusBlock.body,
    };
  }

  const statsRaw = Array.isArray(data.stats) ? data.stats : null;
  const stats =
    statsRaw
      ?.map((item, index) => {
        const fb = fallback.stats[index] ?? fallback.stats[0]!;
        if (!item || typeof item !== 'object' || Array.isArray(item)) return fb;
        const record = item as Record<string, unknown>;
        return {
          value:
            typeof record.value === 'string' && record.value.trim() ? record.value : fb.value,
          label:
            typeof record.label === 'string' && record.label.trim() ? record.label : fb.label,
        };
      })
      .filter((item): item is AboutStat => Boolean(item.value && item.label)) ?? fallback.stats;

  return localizeAboutOverview(
    {
      title,
      tagline,
      paragraph1,
      paragraph2,
      mission: asLabeledBody(data.mission, fallback.mission),
      vision: asLabeledBody(data.vision, fallback.vision),
      campusBlock,
      stats: stats.length > 0 ? stats : fallback.stats,
    },
    grades,
  );
}

export const PUBLIC_CONTENT_KEYS = {
  amharicBook: 'website.amharicBook',
  campusLifeImages: 'website.campusLifeImages',
  aboutOverview: 'website.aboutOverview',
} as const;
