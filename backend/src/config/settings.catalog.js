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
});

/**
 * @typedef {object} SettingDefinition
 * @property {string} group
 * @property {string} label
 * @property {boolean} public
 * @property {'text'|'email'|'url'|'phone'} type
 * @property {number} maxLength
 * @property {boolean} [deletable]
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
};
