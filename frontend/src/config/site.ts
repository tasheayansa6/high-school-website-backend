export const SITE = {
  name: 'Abyssinia Academy',
  tagline: 'Addis Ababa • Ethiopia',
  locationLine: 'Addis Ababa, Ethiopia',
  description:
    'Nurturing intellectual leadership, scientific curiosity, and moral integrity in secondary education across Grades 9 through 12.',
  gradesLabel: 'Grades 9–12',
  newsletter: {
    title: 'The Abyssinia Bulletin',
    blurb: 'Receive termly academic updates, student achievements, and campus event invitations.',
  },
  /**
   * Optional contact fields — leave unset until verified.
   * Stitch HTML includes sample phone/emails; do not publish as confirmed facts
   * until the academy confirms them.
   */
  contact: {
    address: undefined as string | undefined,
    phone: undefined as string | undefined,
    admissionsEmail: undefined as string | undefined,
    adminEmail: undefined as string | undefined,
  },
} as const;
