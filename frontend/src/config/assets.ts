/**
 * School photography — prefer clear, high-resolution student faces
 * over distant crowd shots. Unsplash crops keep focus on people.
 */
const u = (id: string, w = 1600, h?: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=80`;

export const ASSETS = {
  /** Primary campus / student identity (clear close group). */
  students: {
    src: u('photo-1594608661623-aa0bd3a69d98', 1800, 1200),
    alt: 'Abyssinia Academy students in class',
  },
  /** Full-bleed hero — faces readable on the right half. */
  heroStudents: {
    src: u('photo-1524178232363-1fb2b075b655', 2000, 1200),
    alt: 'Students learning together in a bright classroom',
  },
  /** About “Shaping the Future” — portraits visible. */
  shapingFuture: {
    src: u('photo-1523240795612-9a054b0db644', 1400, 1600),
    alt: 'Students collaborating on campus',
  },
  /** Home “Shaping the Future” — leadership / boardroom style. */
  leadershipMeeting: {
    src: u('photo-1556761175-5973dc0f32e7', 1400, 1000),
    alt: 'School leadership meeting around a conference table',
  },
  /** Admissions — smaller group, clear faces. */
  admissions: {
    src: u('photo-1577896851221-b927014d1f1a', 1800, 1000),
    alt: 'Students gathered on campus during admissions season',
  },
  /** Admission page hero — drone campus pan (webm). */
  admissionsHeroVideo: {
    src: 'https://www.shutterstock.com/shutterstock/videos/3888338135/preview/stock-footage-cheshunt-hertfordshire-united-kingdom-uk-drone-pans-right-to-left-across-the.webm',
    poster: u('photo-1577896851221-b927014d1f1a', 1800, 1000),
    alt: 'Aerial campus view for Abyssinia Academy admissions',
  },
  admissionsSide: {
    src: u('photo-1509062522246-3755977927d7', 900, 1200),
    alt: 'Teacher and students in a classroom',
  },
  campus: {
    morning: {
      src: u('photo-1588072432836-e10032774350', 900, 700),
      alt: 'Students starting the school day in class',
    },
    friends: {
      src: u('photo-1529156069898-49953e39b3ac', 900, 700),
      alt: 'Students together outdoors on campus',
    },
    /** Prefer `website.campusLifeImages` from public settings; kept as offline fallback. */
    sports: {
      src: '/images/action-on-the-field.png',
      alt: 'Students playing soccer on the sports field',
    },
    evening: {
      src: u('photo-1427504494785-3a9ca7044f45', 900, 700),
      alt: 'Students studying as the school day ends',
    },
  },
  subjects: {
    amharic: u('photo-1456513080800-7d93dbe9b098', 800, 600),
    english: u('photo-1497633762265-9d179a990aa6', 800, 600),
    mathematics: u('photo-1635070041078-e363dbe005cb', 800, 600),
    physics: u('photo-1636466497217-26a8cbeaf0aa', 800, 600),
    chemistry: u('photo-1532094349884-543bc11b234d', 800, 600),
    biology: u('photo-1530026405186-ed1f139313f8', 800, 600),
    geography: u('photo-1524661135-423995f22d0b', 800, 600),
    it: u('photo-1516321318423-f06f85e504b3', 800, 600),
  },
  campusTour: {
    src: u('photo-1562774053-701939374585', 1400, 900),
    alt: 'Abyssinia Academy campus exterior',
  },
} as const;
