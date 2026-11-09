/**
 * Allowlisted website settings.
 * Public keys may appear on GET /settings/public.
 * Secrets, SMTP, JWT, and other app credentials must never be added here as public.
 */

const SETTING_GROUPS = Object.freeze({
  IDENTITY: 'identity',
  CONTACT: 'contact',
  WEBSITE: 'website',
  SOCIAL: 'social',
  GENERAL: 'general',
  ADMISSIONS: 'admissions',
  INTERNAL: 'internal',
});

const SETTING_TYPES = Object.freeze({
  TEXT: 'text',
  EMAIL: 'email',
  URL: 'url',
  PHONE: 'phone',
  JSON: 'json',
});

/**
 * @typedef {object} SettingDefinition
 * @property {string} group
 * @property {string} label
 * @property {boolean} public
 * @property {'text'|'email'|'url'|'phone'|'json'} type
 * @property {number} maxLength
 * @property {boolean} [deletable]
 * @property {string} [defaultValue]
 */

/** @type {Readonly<Record<string, SettingDefinition>>} */
const SETTING_DEFINITIONS = Object.freeze({
  'school.name': {
    group: SETTING_GROUPS.IDENTITY,
    label: 'School name',
    public: true,
    type: SETTING_TYPES.TEXT,
    maxLength: 150,
    deletable: false,
  },
  'school.tagline': {
    group: SETTING_GROUPS.IDENTITY,
    label: 'School tagline',
    public: true,
    type: SETTING_TYPES.TEXT,
    maxLength: 255,
    deletable: true,
  },
  'school.description': {
    group: SETTING_GROUPS.IDENTITY,
    label: 'School description',
    public: true,
    type: SETTING_TYPES.TEXT,
    maxLength: 2000,
    deletable: true,
  },
  'contact.email': {
    group: SETTING_GROUPS.CONTACT,
    label: 'Contact email',
    public: true,
    type: SETTING_TYPES.EMAIL,
    maxLength: 255,
    deletable: true,
  },
  'contact.phone': {
    group: SETTING_GROUPS.CONTACT,
    label: 'Contact phone',
    public: true,
    type: SETTING_TYPES.PHONE,
    maxLength: 50,
    deletable: true,
  },
  'contact.address': {
    group: SETTING_GROUPS.CONTACT,
    label: 'Physical address',
    public: true,
    type: SETTING_TYPES.TEXT,
    maxLength: 500,
    deletable: true,
  },
  'website.logoUrl': {
    group: SETTING_GROUPS.WEBSITE,
    label: 'Logo URL',
    public: true,
    type: SETTING_TYPES.URL,
    maxLength: 500,
    deletable: true,
  },
  'website.faviconUrl': {
    group: SETTING_GROUPS.WEBSITE,
    label: 'Favicon URL',
    public: true,
    type: SETTING_TYPES.URL,
    maxLength: 500,
    deletable: true,
  },
  'website.primaryLanguage': {
    group: SETTING_GROUPS.WEBSITE,
    label: 'Primary language',
    public: true,
    type: SETTING_TYPES.TEXT,
    maxLength: 20,
    deletable: true,
  },
  'social.facebook': {
    group: SETTING_GROUPS.SOCIAL,
    label: 'Facebook URL',
    public: true,
    type: SETTING_TYPES.URL,
    maxLength: 500,
    deletable: true,
  },
  'social.twitter': {
    group: SETTING_GROUPS.SOCIAL,
    label: 'Twitter / X URL',
    public: true,
    type: SETTING_TYPES.URL,
    maxLength: 500,
    deletable: true,
  },
  'social.instagram': {
    group: SETTING_GROUPS.SOCIAL,
    label: 'Instagram URL',
    public: true,
    type: SETTING_TYPES.URL,
    maxLength: 500,
    deletable: true,
  },
  'social.youtube': {
    group: SETTING_GROUPS.SOCIAL,
    label: 'YouTube URL',
    public: true,
    type: SETTING_TYPES.URL,
    maxLength: 500,
    deletable: true,
  },
  'general.footerText': {
    group: SETTING_GROUPS.GENERAL,
    label: 'Footer text',
    public: true,
    type: SETTING_TYPES.TEXT,
    maxLength: 500,
    deletable: true,
  },
  'general.copyright': {
    group: SETTING_GROUPS.GENERAL,
    label: 'Copyright text',
    public: true,
    type: SETTING_TYPES.TEXT,
    maxLength: 255,
    deletable: true,
  },
  'admissions.inquiryEmail': {
    group: SETTING_GROUPS.ADMISSIONS,
    label: 'Admissions inquiry email',
    public: true,
    type: SETTING_TYPES.EMAIL,
    maxLength: 255,
    deletable: true,
  },
  'admissions.inquiryPhone': {
    group: SETTING_GROUPS.ADMISSIONS,
    label: 'Admissions inquiry phone',
    public: true,
    type: SETTING_TYPES.PHONE,
    maxLength: 50,
    deletable: true,
  },
  'admissions.instructions': {
    group: SETTING_GROUPS.ADMISSIONS,
    label: 'Admissions public instructions',
    public: true,
    type: SETTING_TYPES.TEXT,
    maxLength: 5000,
    deletable: true,
  },
  /** Interactive Amharic alphabet picture book (Academics + home Amharic tile). */
  'website.amharicBook': {
    group: SETTING_GROUPS.WEBSITE,
    label: 'Amharic alphabet book (JSON)',
    public: true,
    type: SETTING_TYPES.JSON,
    maxLength: 12000,
    deletable: true,
    defaultValue: JSON.stringify({
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
    }),
  },
  /** About page overview copy + stats strip. */
  'website.aboutOverview': {
    group: SETTING_GROUPS.WEBSITE,
    label: 'About overview (JSON)',
    public: true,
    type: SETTING_TYPES.JSON,
    maxLength: 12000,
    deletable: true,
    defaultValue: JSON.stringify({
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
    }),
  },
  /** Campus life mosaic images (home + About), including Action on the Field. */
  'website.campusLifeImages': {
    group: SETTING_GROUPS.WEBSITE,
    label: 'Campus life images (JSON)',
    public: true,
    type: SETTING_TYPES.JSON,
    maxLength: 8000,
    deletable: true,
    defaultValue: JSON.stringify({
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
    }),
  },
  // Admin-only operational note — never exposed publicly.
  'internal.adminNotes': {
    group: SETTING_GROUPS.INTERNAL,
    label: 'Internal admin notes',
    public: false,
    type: SETTING_TYPES.TEXT,
    maxLength: 5000,
    deletable: true,
  },
});

const ALLOWED_SETTING_KEYS = Object.freeze(Object.keys(SETTING_DEFINITIONS));
const PUBLIC_SETTING_KEYS = Object.freeze(
  ALLOWED_SETTING_KEYS.filter((key) => SETTING_DEFINITIONS[key].public)
);
const SETTING_GROUP_VALUES = Object.freeze(Object.values(SETTING_GROUPS));

function getSettingDefinition(key) {
  return SETTING_DEFINITIONS[key] || null;
}

function isAllowedSettingKey(key) {
  return Boolean(SETTING_DEFINITIONS[key]);
}

function isPublicSettingKey(key) {
  return Boolean(SETTING_DEFINITIONS[key]?.public);
}

/** Catalog default for a key when no DB row exists (public GET may merge these). */
function getSettingDefaultValue(key) {
  const value = SETTING_DEFINITIONS[key]?.defaultValue;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

module.exports = {
  SETTING_GROUPS,
  SETTING_TYPES,
  SETTING_DEFINITIONS,
  ALLOWED_SETTING_KEYS,
  PUBLIC_SETTING_KEYS,
  SETTING_GROUP_VALUES,
  getSettingDefinition,
  isAllowedSettingKey,
  isPublicSettingKey,
  getSettingDefaultValue,
};
